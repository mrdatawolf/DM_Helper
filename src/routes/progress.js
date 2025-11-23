const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

// Get all progress entries (optionally filtered by character or session)
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const { character_id, session_id } = req.query;

        let query = `
            SELECT cp.*, c.name as character_name, s.name as shadow_name,
                   cs.session_title, cs.session_date, cs.session_number
            FROM character_progress cp
            JOIN characters c ON cp.character_id = c.id
            LEFT JOIN shadows s ON cp.shadow_id = s.id
            LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id
        `;

        const conditions = [];
        const params = [];

        if (character_id) {
            conditions.push('cp.character_id = ?');
            params.push(character_id);
        }

        if (session_id) {
            conditions.push('cp.session_id = ?');
            params.push(session_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY cs.session_date DESC, cp.created_at DESC';

        const progress = db.prepare(query).all(...params);
        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single progress entry
router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const progress = db.prepare(`
            SELECT cp.*, c.name as character_name, s.name as shadow_name,
                   cs.session_title, cs.session_date, cs.session_number
            FROM character_progress cp
            JOIN characters c ON cp.character_id = c.id
            LEFT JOIN shadows s ON cp.shadow_id = s.id
            LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id
            WHERE cp.id = ?
        `).get(req.params.id);

        if (!progress) {
            return res.status(404).json({ error: 'Progress entry not found' });
        }

        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new progress entry
router.post('/', (req, res) => {
    try {
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

        const stmt = db.prepare(`
            INSERT INTO character_progress (
                character_id, session_id, shadow_id, summary, feats_earned, experience_gained,
                story_beats, npcs_met, items_acquired, order_chaos_shift, pattern_progress,
                is_solo_session, other_characters, dm_private_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            character_id, session_id, shadow_id, summary, feats_earned, experience_gained,
            story_beats, npcs_met, items_acquired, order_chaos_shift, pattern_progress,
            is_solo_session ? 1 : 0, other_characters, dm_private_notes
        );

        // Update character stats based on progress
        if (feats_earned > 0 || experience_gained > 0 || order_chaos_shift !== 0) {
            const updateCharStmt = db.prepare(`
                UPDATE characters
                SET
                    feat_pool = feat_pool + ?,
                    total_feats_earned = total_feats_earned + ?,
                    experience_points = experience_points + ?,
                    order_chaos_balance = MAX(0, MIN(100, order_chaos_balance + ?))
                WHERE id = ?
            `);

            updateCharStmt.run(feats_earned, feats_earned, experience_gained, order_chaos_shift, character_id);
        }

        // Log feats if earned
        if (feats_earned > 0) {
            const featStmt = db.prepare(`
                INSERT INTO feat_log (character_id, session_id, feat_source, description)
                VALUES (?, ?, 'session', ?)
            `);

            featStmt.run(character_id, session_id, `Earned ${feats_earned} feat(s) during session`);
        }

        const newProgress = db.prepare('SELECT * FROM character_progress WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newProgress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update progress entry
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const progressId = req.params.id;

        const existing = db.prepare('SELECT * FROM character_progress WHERE id = ?').get(progressId);
        if (!existing) {
            return res.status(404).json({ error: 'Progress entry not found' });
        }

        const updateFields = [];
        const values = [];

        const allowedFields = [
            'shadow_id', 'summary', 'feats_earned', 'experience_gained',
            'story_beats', 'npcs_met', 'items_acquired', 'order_chaos_shift',
            'pattern_progress', 'is_solo_session', 'other_characters', 'dm_private_notes'
        ];

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
        values.push(progressId);

        const query = `UPDATE character_progress SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare('SELECT * FROM character_progress WHERE id = ?').get(progressId);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete progress entry
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM character_progress WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Progress entry not found' });
        }

        res.json({ message: 'Progress entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get character timeline (all progress chronologically)
router.get('/character/:character_id/timeline', (req, res) => {
    try {
        const db = getDatabase();
        const timeline = db.prepare(`
            SELECT cp.*, s.name as shadow_name,
                   cs.session_title, cs.session_date, cs.session_number
            FROM character_progress cp
            LEFT JOIN shadows s ON cp.shadow_id = s.id
            LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id
            WHERE cp.character_id = ?
            ORDER BY cs.session_date ASC, cp.created_at ASC
        `).all(req.params.character_id);

        res.json(timeline);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
