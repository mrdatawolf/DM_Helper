const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate, isDMOrAdmin } = require('../../middleware/auth');
const { serializeFamiliar } = require('../../utils/familiars');
const { asyncHandler } = require('../../middleware/errorHandler');
const { buildUpdateQuery } = require('../../utils/buildUpdateQuery');
const { canModifyCharacter } = require('./shared');
const { CHARACTER_UPDATE_FIELDS } = require('./fields');
const { percentileFromScore } = require('../../../public/js/ability-conversion');

// Get all characters
router.get('/', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const characters = db.prepare(`
        SELECT
            c.*,
            so.name as shadow_origin_name,
            cs.name as current_shadow_name
        FROM characters c
        LEFT JOIN shadows so ON c.shadow_origin_id = so.id
        LEFT JOIN shadows cs ON c.current_shadow_id = cs.id
        ORDER BY c.created_at DESC
    `).all();

    res.json(characters);
}));

// Get single character by ID
router.get('/:id', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare(`
        SELECT
            c.*,
            so.name as shadow_origin_name,
            cs.name as current_shadow_name
        FROM characters c
        LEFT JOIN shadows so ON c.shadow_origin_id = so.id
        LEFT JOIN shadows cs ON c.current_shadow_id = cs.id
        WHERE c.id = ?
    `).get(req.params.id);

    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }

    // Get character's gear
    const gear = db.prepare('SELECT * FROM character_gear WHERE character_id = ?').all(req.params.id);

    // Get character's powers
    const powers = db.prepare('SELECT * FROM character_powers WHERE character_id = ?').all(req.params.id);

    // Get character's familiars
    const familiars = db.prepare('SELECT * FROM familiars WHERE character_id = ? AND is_active = 1').all(req.params.id);

    // Get character's recent progress
    const progress = db.prepare(`
        SELECT cp.*, s.name as shadow_name, cs.session_title, cs.session_date
        FROM character_progress cp
        LEFT JOIN shadows s ON cp.shadow_id = s.id
        LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id
        WHERE cp.character_id = ?
        ORDER BY cs.session_date DESC
        LIMIT 10
    `).all(req.params.id);

    res.json({
        ...character,
        gear,
        powers,
        familiars: familiars.map(f => serializeFamiliar(f, character.level, isDMOrAdmin(req.user))),
        recent_progress: progress
    });
}));

// Create new character
router.post('/', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const {
        name, player_name = null, race, species, class_type, level = 1,
        strength = 10, dexterity = 10, constitution = 10,
        intelligence = 10, wisdom = 10, charisma = 10,
        max_hp = 10, current_hp = 10,
        order_chaos_value = 50,
        pattern_imprint = null, pattern_type = null,
        logrus_imprint = null, blood_purity = 'None',
        trump_artist = 0, broken_imprint = 0, backstory = null,
        character_notes = null,
        amber_flaws = null, amber_traits = null,
        shadow_origin_id = null
    } = req.body;

    // Accept legacy "race" as an alias for species
    const finalSpecies = species || race;

    // Validate required fields
    if (!name || !finalSpecies || !class_type) {
        return res.status(400).json({ error: 'Name, species, and class_type are required' });
    }

    const finalUserId = req.user.userId;

    // Derive imprint booleans and mastery levels from wizard values
    const hasPattern = pattern_imprint ? 1 : 0;
    const hasLogrus  = logrus_imprint  ? 1 : 0;
    const logrusLevel = { Basic: 1, Advanced: 2, Master: 3 }[logrus_imprint] ?? 0;

    const stmt = db.prepare(`
        INSERT INTO characters (
            name, player_name, species, class_type, level,
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            max_hp, current_hp,
            order_chaos_value,
            pattern_imprint, pattern_type,
            logrus_imprint, logrus_mastery_level,
            blood_purity, trump_artist, broken_imprint,
            backstory, character_notes, amber_flaws, amber_traits,
            shadow_origin_id, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        name, player_name, finalSpecies, class_type, level,
        percentileFromScore(strength), percentileFromScore(dexterity),
        percentileFromScore(constitution), percentileFromScore(intelligence),
        percentileFromScore(wisdom), percentileFromScore(charisma),
        max_hp, current_hp,
        order_chaos_value,
        hasPattern, pattern_type,
        hasLogrus, logrusLevel,
        blood_purity, trump_artist ? 1 : 0, broken_imprint ? 1 : 0,
        backstory, character_notes,
        amber_flaws ? JSON.stringify(amber_flaws) : null,
        amber_traits ? JSON.stringify(amber_traits) : null,
        shadow_origin_id || null,
        finalUserId
    );

    const characterId = result.lastInsertRowid;

    // Initialize claim pool for new character with 10 starting points
    db.prepare(`
        INSERT INTO claim_point_pools (character_id, total_points, spent_points)
        VALUES (?, 10, 0)
    `).run(characterId);

    const newCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    res.status(201).json(newCharacter);
}));

// Update character
router.put('/:id', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const characterId = req.params.id;

    // Check if character exists
    const existing = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(characterId);
    if (!existing) {
        return res.status(404).json({ error: 'Character not found' });
    }
    if (!canModifyCharacter(req.user, existing)) {
        return res.status(403).json({ error: 'You do not have permission to edit this character' });
    }

    const query = buildUpdateQuery('characters', CHARACTER_UPDATE_FIELDS, req.body, characterId);
    if (!query) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    db.prepare(query.sql).run(...query.values);

    const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
    res.json(updated);
}));

// Delete character
router.delete('/:id', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT id, user_id FROM characters WHERE id = ?').get(req.params.id);
    if (!existing) {
        return res.status(404).json({ error: 'Character not found' });
    }
    if (!canModifyCharacter(req.user, existing)) {
        return res.status(403).json({ error: 'You do not have permission to delete this character' });
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
    res.json({ message: 'Character deleted successfully' });
}));

// Gear, powers, and familiars each have their own sub-router (see
// docs/DEVELOPMENT.md / TASK-005 handoff for why the split is shaped this
// way). Mounting them here with no path prefix keeps their own route
// patterns (e.g. `/:id/gear`) resolving exactly as they did when this was
// one file.
router.use(require('./gear'));
router.use(require('./powers'));
router.use(require('./familiars'));

module.exports = router;
