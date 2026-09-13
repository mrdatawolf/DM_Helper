const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership, requireCampaignRole } = require('../middleware/auth');
const { isDM, ownsCharacter, participatesInScene } = require('./tracker-shared');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

router.use(authenticate, requireCampaignMembership);

// List scenes visible to the requester (optionally filtered by character)
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id } = req.query;

    let rows = db.prepare(`
        SELECT sc.*, c.name AS character_name, u.username AS creator_username
        FROM scenes sc
        JOIN characters c ON c.id = sc.character_id
        JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = ?
        LEFT JOIN users u ON u.id = sc.created_by
        WHERE sc.campaign_id = ?
        ORDER BY sc.scene_date DESC, sc.id DESC
    `).all(req.campaign.id, req.campaign.id);

    if (character_id) {
        rows = rows.filter(s => s.character_id === parseInt(character_id, 10));
    }

    if (!isDM(req.user, req.campaign)) {
        rows = rows.filter(s =>
            participatesInScene(db, req.user, req.campaign.id, s) ||
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
    if (!isDM(req.user, req.campaign) && !ownsCharacter(db, req.user, req.campaign.id, character_id)) {
        return res.status(403).json({ error: 'You can only draft scenes for your own characters' });
    }

    const character = db.prepare(`
        SELECT c.id FROM characters c
        JOIN campaign_characters cc ON cc.character_id = c.id
        WHERE c.id = ? AND cc.campaign_id = ?
    `).get(character_id, req.campaign.id);
    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }

    const status = isDM(req.user, req.campaign) && req.body.status === 'approved' ? 'approved' : 'draft';

    const result = db.prepare(`
        INSERT INTO scenes (character_id, created_by, title, summary, scene_date, status, visibility, campaign_id)
        VALUES (?, ?, ?, ?, COALESCE(?, DATE('now')), ?, ?, ?)
    `).run(character_id, req.user.userId, title, summary, scene_date, status, visibility, req.campaign.id);

    res.status(201).json(db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(result.lastInsertRowid, req.campaign.id));
}));

// Update a scene (creator or DM). Status changes are DM-only.
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    const dm = isDM(req.user, req.campaign);
    if (!dm && scene.created_by !== req.user.userId) {
        return res.status(403).json({ error: 'You can only edit your own scenes' });
    }

    const allowed = ['title', 'summary', 'scene_date', 'visibility'];
    if (dm) allowed.push('status');

    const query = buildUpdateQuery('scenes', allowed, req.body, req.params.id);
    if (!query) return res.status(400).json({ error: 'No valid fields to update' });

    db.prepare(query.sql.replace('WHERE id = ?', 'WHERE id = ? AND campaign_id = ?'))
        .run(...query.values, req.campaign.id);

    res.json(db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id));
}));

// Approve a draft scene into the timeline (DM only)
router.post('/:id/approve', requireCampaignRole('dm'), asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`
        UPDATE scenes SET status = 'approved', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND campaign_id = ?
    `).run(req.params.id, req.campaign.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Scene not found' });
    res.json(db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id));
}));

// Delete a scene (creator or DM)
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!scene) return res.status(404).json({ error: 'Scene not found' });
    if (!isDM(req.user, req.campaign) && scene.created_by !== req.user.userId) {
        return res.status(403).json({ error: 'You can only delete your own scenes' });
    }
    db.prepare('DELETE FROM scenes WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);
    res.json({ message: 'Scene deleted' });
}));

module.exports = router;
