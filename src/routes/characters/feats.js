const express = require('express');
const { getDatabase } = require('../../database/connection');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter } = require('./shared');
const resource = require('./system-resource');

const router = express.Router();
const fields = ['feat_name', 'feat_description', 'source', 'acquired_at_level'];

function editableCharacter(req, res) {
    const character = getDatabase().prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!character) res.status(404).json({ error: 'Character not found' });
    else if (!canModifyCharacter(req.user, character)) res.status(403).json({ error: 'You do not have permission to modify this character' });
    else return character;
    return null;
}

router.post('/:id/feats', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    if (!req.body.feat_name) return res.status(400).json({ error: 'Feat name is required' });
    const values = Object.fromEntries(fields.map(field => [field, req.body[field] ?? null]));
    values.feat_name = req.body.feat_name;
    values.created_at = resource.sqlTimestamp();
    res.status(201).json(resource.create(db, req, 'feats', values));
}));

router.put('/:id/feats/:featId', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    if (!resource.list(db, req, 'feats').some(item => String(item.id) === req.params.featId)) {
        return res.status(404).json({ error: 'Feat not found' });
    }
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => fields.includes(key)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    res.json(resource.update(db, req, 'feats', req.params.featId, updates));
}));

router.delete('/:id/feats/:featId', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!editableCharacter(req, res)) return;
    if (!resource.remove(db, req, 'feats', req.params.featId)) return res.status(404).json({ error: 'Feat not found' });
    res.json({ message: 'Feat deleted' });
}));

module.exports = router;
