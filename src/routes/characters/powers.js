const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate, isDMOrAdmin } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter, requireDMUser } = require('./shared');
const resource = require('./system-resource');

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

    const newPower = resource.create(db, req, 'powers', {
        power_name, power_type: power_type ?? null, description: description ?? null, power_level,
        uses_per_day, current_uses: current_uses ?? uses_per_day, created_at: resource.sqlTimestamp()
    });

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
    const power = resource.list(db, req, 'powers').find(item => String(item.id) === req.params.powerId);
    if (!power) return res.status(404).json({ error: 'Power not found' });

    const dm = isDMOrAdmin(req.user);
    const allowed = dm
        ? ['power_name', 'power_type', 'description', 'power_level', 'uses_per_day', 'current_uses']
        : ['current_uses'];

    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    res.json(resource.update(db, req, 'powers', req.params.powerId, updates));
}));

// Long rest: reset all limited-use powers to full (owner or DM)
router.post('/:id/powers/rest', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }

    const system = resource.activeSystem(req, db);
    const powers = system.sheet.mutateDocument(db, req.params.id, data => {
        for (const power of data.powers || []) if (power.uses_per_day !== null) power.current_uses = power.uses_per_day;
        return data.powers || [];
    });
    res.json(powers);
}));

// Revoke a power (DM only)
router.delete('/:id/powers/:powerId', authenticate, asyncHandler((req, res) => {
    if (!requireDMUser(req, res)) return;
    const db = getDatabase();
    if (!resource.remove(db, req, 'powers', req.params.powerId)) return res.status(404).json({ error: 'Power not found' });
    res.json({ message: 'Power revoked' });
}));

module.exports = router;
