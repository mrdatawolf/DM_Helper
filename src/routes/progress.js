const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership, requireCampaignRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

router.use(authenticate, requireCampaignMembership);

// Writes require the live DM role; campaign members may read progress.
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    requireCampaignRole('dm')(req, res, next);
});

// Get all progress entries (optionally filtered by character or session)
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, session_id } = req.query;

    let query = `
        SELECT cp.*, c.name as character_name, s.name as shadow_name,
               cs.session_title, cs.session_date, cs.session_number
        FROM character_progress cp
        JOIN characters c ON cp.character_id = c.id
        JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = cp.campaign_id
        LEFT JOIN shadows s ON cp.shadow_id = s.id AND s.campaign_id = cp.campaign_id
        LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id AND cs.campaign_id = cp.campaign_id
    `;

    const conditions = ['cp.campaign_id = ?'];
    const params = [req.campaign.id];

    if (character_id) {
        conditions.push('cp.character_id = ?');
        params.push(character_id);
    }

    if (session_id) {
        conditions.push('cp.session_id = ?');
        params.push(session_id);
    }

    query += ' WHERE ' + conditions.join(' AND ');

    query += ' ORDER BY cs.session_date DESC, cp.created_at DESC';

    const progress = db.prepare(query).all(...params);
    res.json(progress);
}));

// Get single progress entry
router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const progress = db.prepare(`
        SELECT cp.*, c.name as character_name, s.name as shadow_name,
               cs.session_title, cs.session_date, cs.session_number
        FROM character_progress cp
        JOIN characters c ON cp.character_id = c.id
        JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = cp.campaign_id
        LEFT JOIN shadows s ON cp.shadow_id = s.id AND s.campaign_id = cp.campaign_id
        LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id AND cs.campaign_id = cp.campaign_id
        WHERE cp.id = ? AND cp.campaign_id = ?
    `).get(req.params.id, req.campaign.id);

    if (!progress) {
        return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json(progress);
}));

// Create new progress entry
router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const {
        character_id,
        session_id,
        shadow_id,
        summary,
        feats_earned = 0,
        experience_gained = 0,
        story_beats = '',
        npcs_met = '',
        items_acquired = '',
        order_chaos_shift = 0,
        pattern_progress = '',
        is_solo_session = 0,
        other_characters = '',
        dm_private_notes = ''
    } = req.body;

    if (!character_id || !session_id || !summary) {
        return res.status(400).json({ error: 'Character ID, session ID, and summary are required' });
    }

    const character = db.prepare(`SELECT 1 FROM campaign_characters
        WHERE character_id = ? AND campaign_id = ?`).get(character_id, req.campaign.id);
    const session = db.prepare(`SELECT 1 FROM campaign_sessions
        WHERE id = ? AND campaign_id = ?`).get(session_id, req.campaign.id);
    const shadow = shadow_id == null || db.prepare(`SELECT 1 FROM shadows
        WHERE id = ? AND campaign_id = ?`).get(shadow_id, req.campaign.id);
    if (!character || !session || !shadow) {
        return res.status(404).json({ error: 'Character, session, or shadow not found' });
    }

    const stmt = db.prepare(`
        INSERT INTO character_progress (
            character_id, session_id, shadow_id, summary, feats_earned, experience_gained,
            story_beats, npcs_met, items_acquired, order_chaos_shift, pattern_progress,
            is_solo_session, other_characters, dm_private_notes, campaign_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        character_id, session_id, shadow_id, summary, feats_earned, experience_gained,
        story_beats, npcs_met, items_acquired, order_chaos_shift, pattern_progress,
        is_solo_session ? 1 : 0, other_characters, dm_private_notes, req.campaign.id
    );

    // Update character stats based on progress
    if (feats_earned > 0 || experience_gained > 0 || order_chaos_shift !== 0) {
        const updateCharStmt = db.prepare(`
            UPDATE characters
            SET
                feat_pool = feat_pool + ?,
                total_feats_earned = total_feats_earned + ?,
                experience_points = experience_points + ?,
                order_chaos_value = MAX(0, MIN(100, order_chaos_value + ?))
            WHERE id = ? AND EXISTS (
                SELECT 1 FROM campaign_characters cc
                WHERE cc.character_id = characters.id AND cc.campaign_id = ?
            )
        `);

        updateCharStmt.run(feats_earned, feats_earned, experience_gained,
            order_chaos_shift, character_id, req.campaign.id);
    }

    // Log feats if earned
    if (feats_earned > 0) {
        const featStmt = db.prepare(`
            INSERT INTO feat_log (character_id, session_id, feat_source, description, campaign_id)
            VALUES (?, ?, 'session', ?, ?)
        `);

        featStmt.run(character_id, session_id,
            `Earned ${feats_earned} feat(s) during session`, req.campaign.id);
    }

    const newProgress = db.prepare('SELECT * FROM character_progress WHERE id = ? AND campaign_id = ?')
        .get(result.lastInsertRowid, req.campaign.id);
    res.status(201).json(newProgress);
}));

// Update progress entry
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const progressId = req.params.id;

    const existing = db.prepare('SELECT * FROM character_progress WHERE id = ? AND campaign_id = ?')
        .get(progressId, req.campaign.id);
    if (!existing) {
        return res.status(404).json({ error: 'Progress entry not found' });
    }

    const allowedFields = [
        'shadow_id', 'summary', 'feats_earned', 'experience_gained',
        'story_beats', 'npcs_met', 'items_acquired', 'order_chaos_shift',
        'pattern_progress', 'is_solo_session', 'other_characters', 'dm_private_notes'
    ];

    const query = buildUpdateQuery('character_progress', allowedFields, req.body, progressId);
    if (!query) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    db.prepare(query.sql.replace('WHERE id = ?', 'WHERE id = ? AND campaign_id = ?'))
        .run(...query.values, req.campaign.id);

    const updated = db.prepare('SELECT * FROM character_progress WHERE id = ? AND campaign_id = ?')
        .get(progressId, req.campaign.id);
    res.json(updated);
}));

// Delete progress entry
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM character_progress WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Progress entry not found' });
    }

    res.json({ message: 'Progress entry deleted successfully' });
}));

// Get character timeline (all progress chronologically)
router.get('/character/:character_id/timeline', asyncHandler((req, res) => {
    const db = getDatabase();
    const timeline = db.prepare(`
        SELECT cp.*, s.name as shadow_name,
               cs.session_title, cs.session_date, cs.session_number
        FROM character_progress cp
        JOIN campaign_characters cc ON cc.character_id = cp.character_id AND cc.campaign_id = cp.campaign_id
        LEFT JOIN shadows s ON cp.shadow_id = s.id AND s.campaign_id = cp.campaign_id
        LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id AND cs.campaign_id = cp.campaign_id
        WHERE cp.character_id = ? AND cp.campaign_id = ?
        ORDER BY cs.session_date ASC, cp.created_at ASC
    `).all(req.params.character_id, req.campaign.id);

    res.json(timeline);
}));

module.exports = router;
