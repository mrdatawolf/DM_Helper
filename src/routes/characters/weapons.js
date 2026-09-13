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

router.post('/:id/weapons', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const { name, attack_bonus = 0, damage_type, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'Weapon name is required' });
    res.status(201).json(resource.create(db, req, 'weapons', {
        name, attack_bonus, damage_type: damage_type ?? null, sort_order
    }));
}));

router.put('/:id/weapons/:weaponId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    const weapon = resource.list(db, req, 'weapons').find(item => String(item.id) === req.params.weaponId);
    if (!weapon) return res.status(404).json({ error: 'Weapon not found' });
    const allowed = ['name', 'attack_bonus', 'damage_type', 'sort_order'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    res.json(resource.update(db, req, 'weapons', req.params.weaponId, updates));
}));

router.delete('/:id/weapons/:weaponId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    if (!resource.remove(db, req, 'weapons', req.params.weaponId)) return res.status(404).json({ error: 'Weapon not found' });
    res.json({ message: 'Weapon deleted' });
}));

module.exports = router;
