const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');
const { isDM, ownsCharacter, participatesInScene } = require('./tracker-shared');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

router.use(authenticate);

// List scenes visible to the requester (optionally filtered by character)
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id } = req.query;

    let rows = db.prepare(`
        SELECT sc.*, c.name AS character_name, u.username AS creator_username
        FROM scenes sc
        JOIN characters c ON c.id = sc.character_id
        LEFT JOIN users u ON u.id = sc.created_by
        ORDER BY sc.scene_date DESC, sc.id DESC
    `).all();

    if (character_id) {
        rows = rows.filter(s => s.character_id === parseInt(character_id, 10));
    }

    if (!isDM(req.user)) {
        rows = rows.filter(s =>
            participatesInScene(db, req.user, s) ||
            (s.status === 'approved' && s.visibility === 'public')
        );
    }

    res.json(rows);
}));

// Create a scene. Players draft scenes for their own characters; DM scenes may
// be created pre-approved.
router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, title, summary = null, scene_date = null, visibility = 'session' } = req.body;

    if (!character_id || !title) {
        return res.status(400).json({ error: 'character_id and title are required' });
    }
    if (!isDM(req.user) && !ownsCharacter(db, req.user, character_id)) {
        return res.status(403).json({ error: 'You can only draft scenes for your own characters' });
    }

    const status = isDM(req.user) && req.body.status === 'approved' ? 'approved' : 'draft';

    const result = db.prepare(`
        INSERT INTO scenes (character_id, created_by, title, summary, scene_date, status, visibility)
        VALUES (?, ?, ?, ?, COALESCE(?, DATE('now')), ?, ?)
    `).run(character_id, req.user.userId, title, summary, scene_date, status, visibility);

    res.status(201).json(db.prepare('SELECT * FROM scenes WHERE id = ?').get(result.lastInsertRowid));
}));

// Update a scene (creator or DM). Status changes are DM-only.
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const dm = isDM(req.user);
    if (!dm && scene.created_by !== req.user.userId) {
        return res.status(403).json({ error: 'You can only edit your own scenes' });
    }

    const allowed = ['title', 'summary', 'scene_date', 'visibility'];
    if (dm) allowed.push('status');

    const query = buildUpdateQuery('scenes', allowed, req.body, req.params.id);
    if (!query) return res.status(400).json({ error: 'No valid fields to update' });

    db.prepare(query.sql).run(...query.values);

    res.json(db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id));
}));

// Approve a draft scene into the timeline (DM only)
router.post('/:id/approve', requireDM, asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`
        UPDATE scenes SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Scene not found' });
    res.json(db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id));
}));

// Delete a scene (creator or DM)
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    if (!isDM(req.user) && scene.created_by !== req.user.userId) {
        return res.status(403).json({ error: 'You can only delete your own scenes' });
    }
    db.prepare('DELETE FROM scenes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Scene deleted' });
}));

module.exports = router;
