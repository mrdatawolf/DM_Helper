const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
    isDM, ownsCharacter, canWriteToParent, visibleParent,
    recordVisible, parentIsVisibleDraftSafe,
} = require('./tracker-shared');

router.use(authenticate, requireCampaignMembership);

const NOTE_SELECT = `
    SELECT n.*, c.name AS character_name, u.username AS author_username
    FROM session_notes n
    LEFT JOIN characters c ON c.id = n.character_id
        AND EXISTS (SELECT 1 FROM campaign_characters cc
                    WHERE cc.character_id = c.id AND cc.campaign_id = n.campaign_id)
    JOIN users u ON u.id = n.user_id
`;

function filterVisible(db, user, campaign, notes) {
    return notes.filter(n =>
        parentIsVisibleDraftSafe(db, user, campaign, n) && recordVisible(db, user, campaign, n)
    );
}

// List notes for a session, a scene, or a character's whole timeline
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { session_id, scene_id, character_id } = req.query;

    let rows;
    if (session_id) {
        rows = db.prepare(`${NOTE_SELECT} WHERE n.session_id = ? AND n.campaign_id = ? ORDER BY n.created_at ASC`)
            .all(session_id, req.campaign.id);
    } else if (scene_id) {
        rows = db.prepare(`${NOTE_SELECT} WHERE n.scene_id = ? AND n.campaign_id = ? ORDER BY n.created_at ASC`)
            .all(scene_id, req.campaign.id);
    } else if (character_id) {
        rows = db.prepare(`${NOTE_SELECT} WHERE n.character_id = ? AND n.campaign_id = ? ORDER BY n.created_at ASC`)
            .all(character_id, req.campaign.id);
    } else {
        return res.status(400).json({ error: 'session_id, scene_id, or character_id is required' });
    }

    res.json(filterVisible(db, req.user, req.campaign, rows));
}));

// Create a note in a session or scene the requester participates in
router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { session_id = null, scene_id = null, character_id = null, content, visibility = 'session' } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'content is required' });
    }
    if (!session_id === !scene_id) {
        return res.status(400).json({ error: 'Provide exactly one of session_id or scene_id' });
    }
    if (!visibleParent(db, req.user, req.campaign, { session_id, scene_id })) {
        return res.status(404).json({ error: 'Session or scene not found' });
    }
    if (!canWriteToParent(db, req.user, req.campaign, { session_id, scene_id })) {
        return res.status(403).json({ error: 'Your character is not part of this session or scene' });
    }
    if (character_id && !ownsCharacter(db, req.user, req.campaign.id, character_id)) {
        const linked = db.prepare(`
            SELECT 1 FROM campaign_characters WHERE character_id = ? AND campaign_id = ?
        `).get(character_id, req.campaign.id);
        if (!linked) return res.status(404).json({ error: 'Character not found' });
    }
    if (character_id && !isDM(req.user, req.campaign) &&
        !ownsCharacter(db, req.user, req.campaign.id, character_id)) {
        return res.status(403).json({ error: 'You can only write notes as your own character' });
    }

    const result = db.prepare(`
        INSERT INTO session_notes (session_id, scene_id, character_id, user_id, content, visibility, campaign_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session_id, scene_id, character_id, req.user.userId, content.trim(), visibility, req.campaign.id);

    res.status(201).json(db.prepare(`${NOTE_SELECT} WHERE n.id = ? AND n.campaign_id = ?`)
        .get(result.lastInsertRowid, req.campaign.id));
}));

// Update a note (author or DM) — content and visibility only
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const note = db.prepare('SELECT * FROM session_notes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!isDM(req.user, req.campaign) && note.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'You can only edit your own notes' });
    }

    const updates = [];
    const values = [];
    if (req.body.hasOwnProperty('content')) { updates.push('content = ?'); values.push(req.body.content); }
    if (req.body.hasOwnProperty('visibility')) { updates.push('visibility = ?'); values.push(req.body.visibility); }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    values.push(req.campaign.id);
    db.prepare(`UPDATE session_notes SET ${updates.join(', ')} WHERE id = ? AND campaign_id = ?`).run(...values);

    res.json(db.prepare(`${NOTE_SELECT} WHERE n.id = ? AND n.campaign_id = ?`)
        .get(req.params.id, req.campaign.id));
}));

// Delete a note (author or DM)
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const note = db.prepare('SELECT * FROM session_notes WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!isDM(req.user, req.campaign) && note.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'You can only delete your own notes' });
    }
    db.prepare('DELETE FROM session_notes WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);
    res.json({ message: 'Note deleted' });
}));

module.exports = router;
