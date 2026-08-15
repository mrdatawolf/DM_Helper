const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

// Writes require a logged-in DM; reads stay open (dm_notes is stripped below for non-DMs)
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!req.user.isDM) return res.status(403).json({ error: 'DM access required' });
    next();
});

function serialize(npc, isDM) {
    const { dm_notes, stats, ...rest } = npc;
    return {
        ...rest,
        stats: stats ? JSON.parse(stats) : null,
        ...(isDM ? { dm_notes } : {})
    };
}

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const npcs = db.prepare('SELECT * FROM npcs ORDER BY name ASC').all();
        res.json(npcs.map(n => serialize(n, req.user?.isDM)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const npc = db.prepare('SELECT * FROM npcs WHERE id = ?').get(req.params.id);
        if (!npc) return res.status(404).json({ error: 'NPC not found' });
        res.json(serialize(npc, req.user?.isDM));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const fields = [
            'name', 'creature_type', 'shadow_id', 'armor_class', 'hit_points',
            'alignment', 'faction', 'relationship_to_party', 'role',
            'order_chaos_value', 'influence', 'description', 'dm_notes',
            'is_important', 'is_spoiler'
        ];

        const columns = [];
        const placeholders = [];
        const values = [];
        for (const field of fields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                columns.push(field);
                placeholders.push('?');
                values.push(req.body[field]);
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'stats')) {
            columns.push('stats');
            placeholders.push('?');
            values.push(JSON.stringify(req.body.stats));
        }

        const result = db.prepare(
            `INSERT INTO npcs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
        ).run(...values);

        const created = db.prepare('SELECT * FROM npcs WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(serialize(created, true));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const npc = db.prepare('SELECT id FROM npcs WHERE id = ?').get(req.params.id);
        if (!npc) return res.status(404).json({ error: 'NPC not found' });

        const allowedFields = [
            'name', 'creature_type', 'shadow_id', 'armor_class', 'hit_points',
            'description', 'alignment', 'faction', 'relationship_to_party',
            'role', 'order_chaos_value', 'influence', 'dm_notes',
            'is_important', 'is_spoiler'
        ];
        const updateFields = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updateFields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'stats')) {
            updateFields.push('stats = ?');
            values.push(JSON.stringify(req.body.stats));
        }

        if (updateFields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);
        db.prepare(`UPDATE npcs SET ${updateFields.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM npcs WHERE id = ?').get(req.params.id);
        res.json(serialize(updated, true));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM npcs WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'NPC not found' });
        res.json({ message: 'NPC deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
