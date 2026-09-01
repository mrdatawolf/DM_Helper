const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { collectUpdateFields } = require('../../utils/buildUpdateQuery');
const { canModifyCharacter } = require('./shared');

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
    const result = db.prepare(`
        INSERT INTO character_spells (character_id, spell_name, spell_level, casting_time, range, concentration, ritual, components, material_components, is_prepared, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, spell_name, spell_level, casting_time, range, concentration ? 1 : 0, ritual ? 1 : 0, components, material_components, is_prepared ? 1 : 0, notes);
    res.status(201).json(db.prepare('SELECT * FROM character_spells WHERE id = ?').get(result.lastInsertRowid));
}));

router.put('/:id/spells/:spellId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const spell = db.prepare('SELECT id FROM character_spells WHERE id = ? AND character_id = ?').get(req.params.spellId, req.params.id);
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    const body = { ...req.body };
    for (const field of ['concentration', 'ritual', 'is_prepared']) {
        if (Object.prototype.hasOwnProperty.call(body, field)) body[field] = body[field] ? 1 : 0;
    }
    const { setClauses, values } = collectUpdateFields(fields, body);
    if (!setClauses.length) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(req.params.spellId);
    db.prepare(`UPDATE character_spells SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM character_spells WHERE id = ?').get(req.params.spellId));
}));

router.delete('/:id/spells/:spellId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const result = db.prepare('DELETE FROM character_spells WHERE id = ? AND character_id = ?').run(req.params.spellId, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Spell not found' });
    res.json({ message: 'Spell deleted' });
}));

module.exports = router;
