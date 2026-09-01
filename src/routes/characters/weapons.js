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

router.post('/:id/weapons', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const { name, attack_bonus = 0, damage_type, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'Weapon name is required' });
    const result = db.prepare(`
        INSERT INTO character_weapons (character_id, name, attack_bonus, damage_type, sort_order)
        VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, name, attack_bonus, damage_type, sort_order);
    res.status(201).json(db.prepare('SELECT * FROM character_weapons WHERE id = ?').get(result.lastInsertRowid));
}));

router.put('/:id/weapons/:weaponId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const weapon = db.prepare('SELECT id FROM character_weapons WHERE id = ? AND character_id = ?').get(req.params.weaponId, req.params.id);
    if (!weapon) return res.status(404).json({ error: 'Weapon not found' });
    const { setClauses, values } = collectUpdateFields(['name', 'attack_bonus', 'damage_type', 'sort_order'], req.body);
    if (!setClauses.length) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(req.params.weaponId);
    db.prepare(`UPDATE character_weapons SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM character_weapons WHERE id = ?').get(req.params.weaponId));
}));

router.delete('/:id/weapons/:weaponId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const result = db.prepare('DELETE FROM character_weapons WHERE id = ? AND character_id = ?').run(req.params.weaponId, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Weapon not found' });
    res.json({ message: 'Weapon deleted' });
}));

module.exports = router;
