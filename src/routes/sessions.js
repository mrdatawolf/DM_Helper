const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

// Get all sessions
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const sessions = db.prepare(`
            SELECT * FROM campaign_sessions
            ORDER BY session_number DESC
        `).all();

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single session by ID
router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const session = db.prepare('SELECT * FROM campaign_sessions WHERE id = ?').get(req.params.id);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Get all character progress for this session
        const progress = db.prepare(`
            SELECT cp.*, c.name as character_name, s.name as shadow_name
            FROM character_progress cp
            JOIN characters c ON cp.character_id = c.id
            LEFT JOIN shadows s ON cp.shadow_id = s.id
            WHERE cp.session_id = ?
        `).all(req.params.id);

        res.json({
            ...session,
            character_progress: progress
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new session
router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const { session_number, session_date, session_title = '', dm_notes = '' } = req.body;

        if (!session_number || !session_date) {
            return res.status(400).json({ error: 'Session number and date are required' });
        }

        const stmt = db.prepare(`
            INSERT INTO campaign_sessions (session_number, session_date, session_title, dm_notes)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(session_number, session_date, session_title, dm_notes);
        const newSession = db.prepare('SELECT * FROM campaign_sessions WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(newSession);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const sessionId = req.params.id;

        const existing = db.prepare('SELECT id FROM campaign_sessions WHERE id = ?').get(sessionId);
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const updateFields = [];
        const values = [];

        const allowedFields = ['session_number', 'session_date', 'session_title', 'dm_notes'];

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(sessionId);

        const query = `UPDATE campaign_sessions SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare('SELECT * FROM campaign_sessions WHERE id = ?').get(sessionId);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete session
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM campaign_sessions WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
