const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership, requireCampaignRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Write operations require a logged-in DM; reads stay open
router.use(authenticate, requireCampaignMembership);
router.use((req, res, next) => req.method === 'GET'
    ? next()
    : requireCampaignRole('dm')(req, res, next));

function withAssignments(db, campaignId, beat) {
    beat.assignments = db.prepare(`
        SELECT bc.chapter_id, ch.title AS chapter_title, a.title AS arc_title, a.id AS arc_id
        FROM beat_chapters bc
        JOIN chapters ch ON ch.id = bc.chapter_id
        JOIN story_arcs a ON a.id = ch.arc_id
        WHERE bc.beat_id = ? AND bc.campaign_id = ?
          AND ch.campaign_id = ? AND a.campaign_id = ?
        ORDER BY a.title ASC, ch.order_index ASC
    `).all(beat.id, campaignId, campaignId, campaignId);
    return beat;
}

// List all beats with chapter assignments
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const beats = db.prepare('SELECT * FROM beats WHERE campaign_id = ? ORDER BY is_completed ASC, created_at DESC')
        .all(req.campaign.id);
    res.json(beats.map(b => withAssignments(db, req.campaign.id, b)));
}));

// Create beat (optionally assign to a chapter immediately)
router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { title, description, dm_notes, chapter_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = db.prepare(
        'INSERT INTO beats (title, description, dm_notes, campaign_id) VALUES (?, ?, ?, ?)'
    ).run(title, description || null, dm_notes || null, req.campaign.id);

    if (chapter_id && db.prepare('SELECT id FROM chapters WHERE id = ? AND campaign_id = ?')
        .get(chapter_id, req.campaign.id)) {
        db.prepare('INSERT OR IGNORE INTO beat_chapters (beat_id, chapter_id, campaign_id) VALUES (?, ?, ?)')
            .run(result.lastInsertRowid, chapter_id, req.campaign.id);
    }

    const beat = db.prepare('SELECT * FROM beats WHERE id = ? AND campaign_id = ?')
        .get(result.lastInsertRowid, req.campaign.id);
    res.status(201).json(withAssignments(db, req.campaign.id, beat));
}));

// Update beat
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const beat = db.prepare('SELECT * FROM beats WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!beat) return res.status(404).json({ error: 'Beat not found' });

    const { title, description, dm_notes, is_completed } = req.body;
    const completed = is_completed ? 1 : 0;
    const completedAt = completed && !beat.is_completed
        ? 'CURRENT_TIMESTAMP'
        : beat.completed_at ? `'${beat.completed_at}'` : 'NULL';

    db.prepare(`
        UPDATE beats
        SET title = ?, description = ?, dm_notes = ?, is_completed = ?,
            completed_at = ${completedAt}
        WHERE id = ? AND campaign_id = ?
    `).run(
        title ?? beat.title, description ?? beat.description,
        dm_notes ?? beat.dm_notes, completed,
        req.params.id, req.campaign.id
    );
    res.json(db.prepare('SELECT * FROM beats WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id));
}));

// Delete beat
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!db.prepare('SELECT id FROM beats WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id)) {
        return res.status(404).json({ error: 'Beat not found' });
    }
    db.prepare('DELETE FROM beats WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);
    res.json({ message: 'Beat deleted' });
}));

// Clone beat (new unassigned, uncompleted copy)
router.post('/:id/clone', asyncHandler((req, res) => {
    const db = getDatabase();
    const original = db.prepare('SELECT * FROM beats WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!original) return res.status(404).json({ error: 'Beat not found' });

    const result = db.prepare(
        'INSERT INTO beats (title, description, dm_notes, campaign_id) VALUES (?, ?, ?, ?)'
    ).run(`${original.title} (copy)`, original.description, original.dm_notes, req.campaign.id);

    const clone = db.prepare('SELECT * FROM beats WHERE id = ? AND campaign_id = ?')
        .get(result.lastInsertRowid, req.campaign.id);
    clone.assignments = [];
    res.status(201).json(clone);
}));

// Assign beat to a chapter
router.post('/:id/assign', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!db.prepare('SELECT id FROM beats WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id)) {
        return res.status(404).json({ error: 'Beat not found' });
    }
    const { chapter_id } = req.body;
    if (!chapter_id) return res.status(400).json({ error: 'chapter_id required' });
    if (!db.prepare('SELECT id FROM chapters WHERE id = ? AND campaign_id = ?')
        .get(chapter_id, req.campaign.id)) {
        return res.status(404).json({ error: 'Chapter not found' });
    }
    db.prepare('INSERT OR IGNORE INTO beat_chapters (beat_id, chapter_id, campaign_id) VALUES (?, ?, ?)')
        .run(req.params.id, chapter_id, req.campaign.id);
    res.status(201).json({ message: 'Beat assigned' });
}));

// Unassign beat from a chapter
router.delete('/:id/chapters/:chapterId', asyncHandler((req, res) => {
    const db = getDatabase();
    db.prepare('DELETE FROM beat_chapters WHERE beat_id = ? AND chapter_id = ? AND campaign_id = ?')
        .run(req.params.id, req.params.chapterId, req.campaign.id);
    res.json({ message: 'Beat unassigned' });
}));

module.exports = router;
