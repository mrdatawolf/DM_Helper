const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');

// Write operations require a logged-in DM; reads stay open
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    authenticate(req, res, () => requireDM(req, res, next));
});

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const npcs = db.prepare(
            'SELECT id, name, creature_type, alignment, faction, is_spoiler FROM npcs ORDER BY name ASC'
        ).all();
        res.json(npcs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const npc = db.prepare('SELECT id FROM npcs WHERE id = ?').get(req.params.id);
        if (!npc) return res.status(404).json({ error: 'NPC not found' });

        const allowedFields = ['name', 'description', 'alignment', 'faction', 'relationship_to_party', 'is_spoiler'];
        const updateFields = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updateFields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (updateFields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);
        db.prepare(`UPDATE npcs SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT id, name, creature_type, alignment, faction, is_spoiler FROM npcs WHERE id = ?').get(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
