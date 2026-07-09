const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate } = require('../middleware/auth');
const {
    isDM, ownsCharacter, canWriteToParent, visibleParent,
    recordVisible, parentIsVisibleDraftSafe,
} = require('./tracker-shared');

router.use(authenticate);

const NOTE_SELECT = `
    SELECT n.*, c.name AS character_name, u.username AS author_username
    FROM session_notes n
    LEFT JOIN characters c ON c.id = n.character_id
    JOIN users u ON u.id = n.user_id
`;

function filterVisible(db, user, notes) {
    return notes.filter(n =>
        parentIsVisibleDraftSafe(db, user, n) && recordVisible(db, user, n)
    );
}

// List notes for a session, a scene, or a character's whole timeline
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const { session_id, scene_id, character_id } = req.query;

        let rows;
        if (session_id) {
            rows = db.prepare(`${NOTE_SELECT} WHERE n.session_id = ? ORDER BY n.created_at ASC`).all(session_id);
        } else if (scene_id) {
            rows = db.prepare(`${NOTE_SELECT} WHERE n.scene_id = ? ORDER BY n.created_at ASC`).all(scene_id);
        } else if (character_id) {
            rows = db.prepare(`${NOTE_SELECT} WHERE n.character_id = ? ORDER BY n.created_at ASC`).all(character_id);
        } else {
            return res.status(400).json({ error: 'session_id, scene_id, or character_id is required' });
        }

        res.json(filterVisible(db, req.user, rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a note in a session or scene the requester participates in
router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const { session_id = null, scene_id = null, character_id = null, content, visibility = 'session' } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'content is required' });
        }
        if (!session_id === !scene_id) {
            return res.status(400).json({ error: 'Provide exactly one of session_id or scene_id' });
        }
        if (!visibleParent(db, req.user, { session_id, scene_id })) {
            return res.status(404).json({ error: 'Session or scene not found' });
        }
        if (!canWriteToParent(db, req.user, { session_id, scene_id })) {
            return res.status(403).json({ error: 'Your character is not part of this session or scene' });
        }
        if (character_id && !isDM(req.user) && !ownsCharacter(db, req.user, character_id)) {
            return res.status(403).json({ error: 'You can only write notes as your own character' });
        }

        const result = db.prepare(`
            INSERT INTO session_notes (session_id, scene_id, character_id, user_id, content, visibility)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(session_id, scene_id, character_id, req.user.userId, content.trim(), visibility);

        res.status(201).json(db.prepare(`${NOTE_SELECT} WHERE n.id = ?`).get(result.lastInsertRowid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a note (author or DM) — content and visibility only
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const note = db.prepare('SELECT * FROM session_notes WHERE id = ?').get(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (!isDM(req.user) && note.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'You can only edit your own notes' });
        }

        const updates = [];
        const values = [];
        if (req.body.hasOwnProperty('content')) { updates.push('content = ?'); values.push(req.body.content); }
        if (req.body.hasOwnProperty('visibility')) { updates.push('visibility = ?'); values.push(req.body.visibility); }
        if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);
        db.prepare(`UPDATE session_notes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        res.json(db.prepare(`${NOTE_SELECT} WHERE n.id = ?`).get(req.params.id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a note (author or DM)
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const note = db.prepare('SELECT * FROM session_notes WHERE id = ?').get(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (!isDM(req.user) && note.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'You can only delete your own notes' });
        }
        db.prepare('DELETE FROM session_notes WHERE id = ?').run(req.params.id);
        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
