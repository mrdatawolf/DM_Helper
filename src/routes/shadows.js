const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/connection');
const { authenticate, isDMOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

const LORE_DIR = path.join(__dirname, '..', '..', 'Shadow Lore');

// Get a shadow's deep lore markdown, if a file matching its name exists
router.get('/:id/lore', asyncHandler((req, res) => {
    const db = getDatabase();
    const shadow = db.prepare('SELECT name FROM shadows WHERE id = ?').get(req.params.id);
    if (!shadow) {
        return res.status(404).json({ error: 'Shadow not found' });
    }

    const lorePath = path.resolve(LORE_DIR, `${shadow.name}.md`);
    if (!lorePath.startsWith(LORE_DIR) || !fs.existsSync(lorePath)) {
        return res.status(404).json({ error: 'No lore file for this shadow' });
    }

    const content = fs.readFileSync(lorePath, 'utf8');
    res.json({ name: shadow.name, content });
}));

// Get all shadows
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const shadows = db.prepare('SELECT * FROM shadows ORDER BY name').all();
    res.json(shadows);
}));

// Shadows a character has visited (player-facing)
// Only counts completed or in-progress sessions — enough time to truly feel the world.
router.get('/character/:characterId/visited', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const characterId = parseInt(req.params.characterId, 10);

    // Verify the character belongs to the requesting user
    const character = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(characterId);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (character.user_id !== req.user.userId && !isDMOrAdmin(req.user)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const visited = db.prepare(`
        SELECT
            s.id, s.name, s.description,
            s.order_level, s.chaos_level, s.dream_level,
            s.pattern_influence, s.corruption_status, s.is_starting_shadow, s.is_spoiler,
            COUNT(DISTINCT cp.session_id)  AS visit_count,
            MIN(cs.session_date)           AS first_visit_date,
            MAX(cs.session_date)           AS last_visit_date,
            MIN(cs.session_number)         AS first_session_number,
            MAX(cs.session_number)         AS last_session_number
        FROM shadows s
        JOIN character_progress cp ON cp.shadow_id = s.id
        JOIN campaign_sessions cs  ON cs.id = cp.session_id
        WHERE cp.character_id = ?
          AND cs.session_status IN ('completed', 'in-progress')
        GROUP BY s.id
        ORDER BY MIN(cs.session_date) ASC
    `).all(characterId);

    res.json(visited);
}));

// Get single shadow by ID
router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const shadow = db.prepare('SELECT * FROM shadows WHERE id = ?').get(req.params.id);

    if (!shadow) {
        return res.status(404).json({ error: 'Shadow not found' });
    }

    // Get characters currently in this shadow
    const characters = db.prepare(`
        SELECT id, name, player_name, species, class_type, level
        FROM characters
        WHERE current_shadow_id = ?
    `).all(req.params.id);

    // Get NPCs in this shadow
    const npcs = db.prepare(`
        SELECT * FROM npcs WHERE shadow_id = ?
    `).all(req.params.id);

    res.json({
        ...shadow,
        characters,
        npcs
    });
}));

// Create new shadow (players may create one for their home shadow)
router.post('/', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const {
        name,
        description = '',
        order_level = 50,
        chaos_level = 50,
        dream_level = 0,
        pattern_influence = 'None',
        corruption_status = '',
        is_starting_shadow = 0
    } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Shadow name is required' });
    }

    const stmt = db.prepare(`
        INSERT INTO shadows (name, description, order_level, chaos_level, dream_level, pattern_influence, corruption_status, is_starting_shadow, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, description, order_level, chaos_level, dream_level, pattern_influence, corruption_status, is_starting_shadow ? 1 : 0, req.user.userId);
    const newShadow = db.prepare('SELECT * FROM shadows WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newShadow);
}));

// Update shadow
router.put('/:id', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const shadowId = req.params.id;

    const existing = db.prepare('SELECT id, created_by FROM shadows WHERE id = ?').get(shadowId);
    if (!existing) {
        return res.status(404).json({ error: 'Shadow not found' });
    }

    if (existing.created_by !== req.user.userId && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Only this shadow\'s creator or a super admin can edit it' });
    }

    const allowedFields = ['name', 'description', 'order_level', 'chaos_level', 'dream_level', 'pattern_influence', 'corruption_status', 'is_starting_shadow', 'is_spoiler'];

    const query = buildUpdateQuery('shadows', allowedFields, req.body, shadowId);
    if (!query) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    db.prepare(query.sql).run(...query.values);

    const updated = db.prepare('SELECT * FROM shadows WHERE id = ?').get(shadowId);
    res.json(updated);
}));

// Delete shadow
router.delete('/:id', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();

    const existing = db.prepare('SELECT id, created_by FROM shadows WHERE id = ?').get(req.params.id);
    if (!existing) {
        return res.status(404).json({ error: 'Shadow not found' });
    }

    if (existing.created_by !== req.user.userId && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Only this shadow\'s creator or a super admin can delete it' });
    }

    const result = db.prepare('DELETE FROM shadows WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Shadow not found' });
    }

    res.json({ message: 'Shadow deleted successfully' });
}));

module.exports = router;
