const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

// Get all shadows
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const shadows = db.prepare('SELECT * FROM shadows ORDER BY name').all();
        res.json(shadows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single shadow by ID
router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const shadow = db.prepare('SELECT * FROM shadows WHERE id = ?').get(req.params.id);

        if (!shadow) {
            return res.status(404).json({ error: 'Shadow not found' });
        }

        // Get characters currently in this shadow
        const characters = db.prepare(`
            SELECT id, name, player_name, race, class, level
            FROM characters
            WHERE current_shadow_id = ?
        `).all(req.params.id);

        // Get NPCs in this shadow
        const npcs = db.prepare(`
            SELECT * FROM npcs WHERE shadow_id = ?
        `).all(req.params.id);

        res.json({
            ...shadow,
            characters,
            npcs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new shadow
router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const {
            name,
            description = '',
            order_level = 50,
            chaos_level = 50,
            pattern_influence = 'None',
            corruption_status = '',
            is_starting_shadow = 0
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Shadow name is required' });
        }

        const stmt = db.prepare(`
            INSERT INTO shadows (name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow ? 1 : 0);
        const newShadow = db.prepare('SELECT * FROM shadows WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(newShadow);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update shadow
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const shadowId = req.params.id;

        const existing = db.prepare('SELECT id FROM shadows WHERE id = ?').get(shadowId);
        if (!existing) {
            return res.status(404).json({ error: 'Shadow not found' });
        }

        const updateFields = [];
        const values = [];

        const allowedFields = ['name', 'description', 'order_level', 'chaos_level', 'pattern_influence', 'corruption_status', 'is_starting_shadow'];

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
        values.push(shadowId);

        const query = `UPDATE shadows SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare('SELECT * FROM shadows WHERE id = ?').get(shadowId);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete shadow
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM shadows WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Shadow not found' });
        }

        res.json({ message: 'Shadow deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
