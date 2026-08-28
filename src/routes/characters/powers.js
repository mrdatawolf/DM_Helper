const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate, isDMOrAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { buildUpdateQuery } = require('../../utils/buildUpdateQuery');
const { canModifyCharacter, requireDMUser } = require('./shared');

// Powers are earned at the table: only the DM grants, edits, or revokes them.
// Players track their own uses (current_uses) and can take a long rest.

// Grant a power (DM only)
router.post('/:id/powers', authenticate, asyncHandler((req, res) => {
    if (!requireDMUser(req, res)) return;
    const db = getDatabase();
    const character = db.prepare('SELECT id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const { power_name, power_type, description, power_level = 1, uses_per_day = null, current_uses = null } = req.body;

    if (!power_name) {
        return res.status(400).json({ error: 'Power name is required' });
    }

    const stmt = db.prepare(`
        INSERT INTO character_powers (character_id, power_name, power_type, description, power_level, uses_per_day, current_uses)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.params.id, power_name, power_type, description, power_level, uses_per_day, current_uses ?? uses_per_day);
    const newPower = db.prepare('SELECT * FROM character_powers WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newPower);
}));

// Update a power. DM: everything. Owner: current_uses only (spending uses).
router.put('/:id/powers/:powerId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    const power = db.prepare('SELECT id FROM character_powers WHERE id = ? AND character_id = ?').get(req.params.powerId, req.params.id);
    if (!power) return res.status(404).json({ error: 'Power not found' });

    const dm = isDMOrAdmin(req.user);
    const allowed = dm
        ? ['power_name', 'power_type', 'description', 'power_level', 'uses_per_day', 'current_uses']
        : ['current_uses'];

    const query = buildUpdateQuery('character_powers', allowed, req.body, req.params.powerId, { touchUpdatedAt: false });
    if (!query) return res.status(400).json({ error: 'No valid fields to update' });

    db.prepare(query.sql).run(...query.values);
    res.json(db.prepare('SELECT * FROM character_powers WHERE id = ?').get(req.params.powerId));
}));

// Long rest: reset all limited-use powers to full (owner or DM)
router.post('/:id/powers/rest', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }

    db.prepare(`
        UPDATE character_powers SET current_uses = uses_per_day
        WHERE character_id = ? AND uses_per_day IS NOT NULL
    `).run(req.params.id);

    res.json(db.prepare('SELECT * FROM character_powers WHERE character_id = ?').all(req.params.id));
}));

// Revoke a power (DM only)
router.delete('/:id/powers/:powerId', authenticate, asyncHandler((req, res) => {
    if (!requireDMUser(req, res)) return;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM character_powers WHERE id = ? AND character_id = ?').run(req.params.powerId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Power not found' });
    res.json({ message: 'Power revoked' });
}));

module.exports = router;
