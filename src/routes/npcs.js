const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, isDMOrAdmin, requireCampaignMembership, requireCampaignRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { collectUpdateFields } = require('../utils/buildUpdateQuery');

router.use(authenticate, requireCampaignMembership);

// Writes require a live DM campaign role (or admin-equivalent); campaign
// members may read, with dm_notes stripped below for non-DMs.
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    requireCampaignRole('dm')(req, res, next);
});

function serialize(npc, isDM) {
    const { dm_notes, stats, ...rest } = npc;
    return {
        ...rest,
        stats: stats ? JSON.parse(stats) : null,
        ...(isDM ? { dm_notes } : {})
    };
}

router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const npcs = db.prepare('SELECT * FROM npcs WHERE campaign_id = ? ORDER BY name ASC')
        .all(req.campaign.id);
    res.json(npcs.map(n => serialize(n, isDMOrAdmin(req.user))));
}));

router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const npc = db.prepare('SELECT * FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!npc) return res.status(404).json({ error: 'NPC not found' });
    res.json(serialize(npc, isDMOrAdmin(req.user)));
}));

router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const fields = [
        'name', 'creature_type', 'shadow_id', 'armor_class', 'hit_points',
        'alignment', 'faction', 'relationship_to_party', 'role',
        'order_chaos_value', 'influence', 'description', 'dm_notes',
        'is_important', 'is_spoiler'
    ];

    const columns = ['campaign_id'];
    const placeholders = ['?'];
    const values = [req.campaign.id];
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

    const created = db.prepare('SELECT * FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(result.lastInsertRowid, req.campaign.id);
    res.status(201).json(serialize(created, true));
}));

router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const npc = db.prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    if (!npc) return res.status(404).json({ error: 'NPC not found' });

    const allowedFields = [
        'name', 'creature_type', 'shadow_id', 'armor_class', 'hit_points',
        'description', 'alignment', 'faction', 'relationship_to_party',
        'role', 'order_chaos_value', 'influence', 'dm_notes',
        'is_important', 'is_spoiler'
    ];
    // `stats` needs JSON-encoding before storage, so it's layered on top of
    // the shared field collector rather than passed through buildUpdateQuery.
    const { setClauses, values } = collectUpdateFields(allowedFields, req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, 'stats')) {
        setClauses.push('stats = ?');
        values.push(JSON.stringify(req.body.stats));
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id, req.campaign.id);
    db.prepare(`UPDATE npcs SET ${setClauses.join(', ')} WHERE id = ? AND campaign_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(req.params.id, req.campaign.id);
    res.json(serialize(updated, true));
}));

router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM npcs WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);
    if (result.changes === 0) return res.status(404).json({ error: 'NPC not found' });
    res.json({ message: 'NPC deleted successfully' });
}));

module.exports = router;
