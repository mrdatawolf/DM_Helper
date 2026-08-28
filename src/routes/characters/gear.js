const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { collectUpdateFields } = require('../../utils/buildUpdateQuery');
const { canModifyCharacter } = require('./shared');

// Add gear to character
router.post('/:id/gear', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }

    const { item_name, item_type, description, quantity = 1, is_equipped = 0, magical_properties } = req.body;

    if (!item_name) {
        return res.status(400).json({ error: 'Item name is required' });
    }

    const stmt = db.prepare(`
        INSERT INTO character_gear (character_id, item_name, item_type, description, quantity, is_equipped, magical_properties)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(req.params.id, item_name, item_type, description, quantity, is_equipped ? 1 : 0, magical_properties);
    const newGear = db.prepare('SELECT * FROM character_gear WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newGear);
}));

// Update a gear item (owner or DM)
router.put('/:id/gear/:gearId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    const gear = db.prepare('SELECT id FROM character_gear WHERE id = ? AND character_id = ?').get(req.params.gearId, req.params.id);
    if (!gear) return res.status(404).json({ error: 'Gear item not found' });

    const allowed = ['item_name', 'item_type', 'description', 'quantity'];
    const { setClauses, values } = collectUpdateFields(allowed, req.body);
    if (Object.prototype.hasOwnProperty.call(req.body, 'is_equipped')) {
        setClauses.push('is_equipped = ?');
        values.push(req.body.is_equipped ? 1 : 0);
    }
    const magicalProperties = collectUpdateFields(['magical_properties'], req.body);
    setClauses.push(...magicalProperties.setClauses);
    values.push(...magicalProperties.values);
    if (!setClauses.length) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(req.params.gearId);
    db.prepare(`UPDATE character_gear SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM character_gear WHERE id = ?').get(req.params.gearId));
}));

// Delete a gear item (owner or DM)
router.delete('/:id/gear/:gearId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    const result = db.prepare('DELETE FROM character_gear WHERE id = ? AND character_id = ?').run(req.params.gearId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Gear item not found' });
    res.json({ message: 'Gear item deleted' });
}));

module.exports = router;
