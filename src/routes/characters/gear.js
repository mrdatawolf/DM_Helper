const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter } = require('./shared');
const resource = require('./system-resource');

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

    const newGear = resource.create(db, req, 'gear', {
        item_name, item_type: item_type ?? null, description: description ?? null, quantity,
        is_equipped: is_equipped ? 1 : 0, magical_properties: magical_properties ?? null,
        created_at: resource.sqlTimestamp()
    });

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
    const gear = resource.list(db, req, 'gear').find(item => String(item.id) === req.params.gearId);
    if (!gear) return res.status(404).json({ error: 'Gear item not found' });

    const allowed = new Set(['item_name', 'item_type', 'description', 'quantity', 'magical_properties']);
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.has(key)));
    if (Object.hasOwn(req.body, 'is_equipped')) updates.is_equipped = req.body.is_equipped ? 1 : 0;
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    res.json(resource.update(db, req, 'gear', req.params.gearId, updates));
}));

// Delete a gear item (owner or DM)
router.delete('/:id/gear/:gearId', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    if (!resource.remove(db, req, 'gear', req.params.gearId)) return res.status(404).json({ error: 'Gear item not found' });
    res.json({ message: 'Gear item deleted' });
}));

module.exports = router;
