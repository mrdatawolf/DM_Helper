const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate, isDMOrAdmin } = require('../../middleware/auth');
const { serializeFamiliar } = require('../../utils/familiars');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter, requireDMUser } = require('./shared');

// ── Familiars: DM-bonded companions whose power scales with the character's level ──

const FAMILIAR_DM_FIELDS = [
    'template_npc_id', 'name', 'creature_type', 'bond_type', 'description',
    'armor_class', 'base_hit_points', 'bond_notes', 'dm_notes', 'is_active'
];
const FAMILIAR_OWNER_FIELDS = ['name', 'description'];

// List a character's familiars (owner or DM)
router.get('/:id/familiars', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, level, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to view this character' });
    }
    const familiars = db.prepare('SELECT * FROM familiars WHERE character_id = ? AND is_active = 1').all(req.params.id);
    res.json(familiars.map(f => serializeFamiliar(f, character.level, isDMOrAdmin(req.user))));
}));

// Bond a familiar to a character (DM only)
router.post('/:id/familiars', authenticate, asyncHandler((req, res) => {
    if (!requireDMUser(req, res)) return;
    const db = getDatabase();
    const character = db.prepare('SELECT id, level FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const { name, template_npc_id = null, base_stats = null, growth_table = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    let template = null;
    if (template_npc_id) {
        template = db.prepare('SELECT * FROM npcs WHERE id = ?').get(template_npc_id);
    }

    const columns = ['character_id', 'name'];
    const values = [req.params.id, name];

    for (const field of FAMILIAR_DM_FIELDS) {
        if (field === 'name') continue;
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            columns.push(field);
            values.push(req.body[field]);
        }
    }

    const resolvedArmorClass = Object.prototype.hasOwnProperty.call(req.body, 'armor_class')
        ? req.body.armor_class
        : template?.armor_class ?? null;
    if (!columns.includes('armor_class')) { columns.push('armor_class'); values.push(resolvedArmorClass); }

    const resolvedHp = Object.prototype.hasOwnProperty.call(req.body, 'base_hit_points')
        ? req.body.base_hit_points
        : template?.hit_points ?? null;
    if (!columns.includes('base_hit_points')) { columns.push('base_hit_points'); values.push(resolvedHp); }

    const resolvedStats = base_stats ?? (template?.stats ? JSON.parse(template.stats) : null);
    columns.push('base_stats');
    values.push(resolvedStats ? JSON.stringify(resolvedStats) : null);

    columns.push('growth_table');
    values.push(JSON.stringify(growth_table));

    const placeholders = columns.map(() => '?');
    const result = db.prepare(
        `INSERT INTO familiars (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`
    ).run(...values);

    const created = db.prepare('SELECT * FROM familiars WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(serializeFamiliar(created, character.level, true));
}));

// Update a familiar. DM: full field set. Owner: name + description only.
router.put('/:id/familiars/:familiarId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, level, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    const familiar = db.prepare('SELECT id FROM familiars WHERE id = ? AND character_id = ?').get(req.params.familiarId, req.params.id);
    if (!familiar) return res.status(404).json({ error: 'Familiar not found' });

    const dm = isDMOrAdmin(req.user);
    const allowed = dm ? FAMILIAR_DM_FIELDS : FAMILIAR_OWNER_FIELDS;

    const updates = [];
    const values = [];
    for (const field of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            updates.push(`${field} = ?`);
            values.push(req.body[field]);
        }
    }
    if (dm && Object.prototype.hasOwnProperty.call(req.body, 'base_stats')) {
        updates.push('base_stats = ?');
        values.push(req.body.base_stats ? JSON.stringify(req.body.base_stats) : null);
    }
    if (dm && Object.prototype.hasOwnProperty.call(req.body, 'growth_table')) {
        updates.push('growth_table = ?');
        values.push(JSON.stringify(req.body.growth_table || []));
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.familiarId);
    db.prepare(`UPDATE familiars SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM familiars WHERE id = ?').get(req.params.familiarId);
    res.json(serializeFamiliar(updated, character.level, dm));
}));

// Release a familiar's bond (DM only)
router.delete('/:id/familiars/:familiarId', authenticate, asyncHandler((req, res) => {
    if (!requireDMUser(req, res)) return;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM familiars WHERE id = ? AND character_id = ?').run(req.params.familiarId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Familiar not found' });
    res.json({ message: 'Familiar bond released' });
}));

module.exports = router;
