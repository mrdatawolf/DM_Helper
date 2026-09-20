const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter } = require('./shared');
const resource = require('./system-resource');

function editableCharacter(req, res) {
    const character = getDatabase().prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) res.status(404).json({ error: 'Character not found' });
    else if (!canModifyCharacter(req.user, character)) res.status(403).json({ error: 'You do not have permission to modify this character' });
    else return character;
    return null;
}

const fields = ['spell_name', 'spell_level', 'casting_time', 'range', 'concentration', 'ritual', 'components', 'material_components', 'is_prepared', 'notes'];

router.post('/:id/spells', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const { spell_name, spell_level = 0, casting_time, range, concentration = 0, ritual = 0, components, material_components, is_prepared = 1, notes } = req.body;
    if (!spell_name) return res.status(400).json({ error: 'Spell name is required' });
    res.status(201).json(resource.create(db, req, 'spells', {
        spell_name, spell_level, casting_time: casting_time ?? null, range: range ?? null,
        concentration: concentration ? 1 : 0, ritual: ritual ? 1 : 0,
        components: components ?? null, material_components: material_components ?? null,
        is_prepared: is_prepared ? 1 : 0, notes: notes ?? null, created_at: resource.sqlTimestamp()
    }));
}));

router.put('/:id/spells/:spellId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const spell = resource.list(db, req, 'spells').find(item => String(item.id) === req.params.spellId);
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    const body = { ...req.body };
    for (const field of ['concentration', 'ritual', 'is_prepared']) {
        if (Object.prototype.hasOwnProperty.call(body, field)) body[field] = body[field] ? 1 : 0;
    }
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => fields.includes(key)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    res.json(resource.update(db, req, 'spells', req.params.spellId, updates));
}));

router.delete('/:id/spells/:spellId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    if (!resource.remove(db, req, 'spells', req.params.spellId)) return res.status(404).json({ error: 'Spell not found' });
    res.json({ message: 'Spell deleted' });
}));

module.exports = router;
