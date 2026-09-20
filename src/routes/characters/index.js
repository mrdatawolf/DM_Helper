const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');
const { authenticate, isDMOrAdmin, requireCampaignMembership } = require('../../middleware/auth');
const { serializeFamiliar } = require('../../utils/familiars');
const { asyncHandler } = require('../../middleware/errorHandler');
const { buildUpdateQuery } = require('../../utils/buildUpdateQuery');
const { canModifyCharacter, requireCampaignCharacter } = require('./shared');
const { UNIVERSAL_CHARACTER_UPDATE_FIELDS } = require('./fields');
const { percentileFromScore } = require('../../../public/js/ability-conversion');
const { getSystemForCampaign } = require('../../systems/registry');
const { getUniverseForCampaign, hydrateCharacterForCampaign } = require('../../universes/registry');

router.use(authenticate, requireCampaignMembership);
router.use('/:id', requireCampaignCharacter);

// Get all characters
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const characters = db.prepare(`
        SELECT
            c.*,
            so.name as shadow_origin_name,
            cs.name as current_shadow_name
        FROM characters c
        JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = ?
        LEFT JOIN shadows so ON c.shadow_origin_id = so.id
        LEFT JOIN shadows cs ON c.current_shadow_id = cs.id
        ORDER BY c.created_at DESC
    `).all(req.campaign.id);

    const system = getSystemForCampaign(db, req.campaign.id);
    res.json(characters.map(character => hydrateCharacterForCampaign(
        db, req.campaign.id, system.sheet.hydrateSheet(db, character, system))));
}));

// Get single character by ID
router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const character = db.prepare(`
        SELECT
            c.*,
            so.name as shadow_origin_name,
            cs.name as current_shadow_name
        FROM characters c
        LEFT JOIN shadows so ON c.shadow_origin_id = so.id
        LEFT JOIN shadows cs ON c.current_shadow_id = cs.id
        JOIN campaign_characters cc ON cc.character_id = c.id
        WHERE c.id = ? AND cc.campaign_id = ?
    `).get(req.params.id, req.campaign.id);

    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }

    const system = getSystemForCampaign(db, req.campaign.id);
    const hydrated = hydrateCharacterForCampaign(db, req.campaign.id,
        system.sheet.hydrateCharacter(db, character, system));

    // Get character's familiars
    const familiars = db.prepare('SELECT * FROM familiars WHERE character_id = ? AND is_active = 1').all(req.params.id);

    // Get character's recent progress
    const progress = db.prepare(`
        SELECT cp.*, s.name as shadow_name, cs.session_title, cs.session_date
        FROM character_progress cp
        LEFT JOIN shadows s ON cp.shadow_id = s.id
        LEFT JOIN campaign_sessions cs ON cp.session_id = cs.id
        WHERE cp.character_id = ? AND cp.campaign_id = ?
        ORDER BY cs.session_date DESC
        LIMIT 10
    `).all(req.params.id, req.campaign.id);

    res.json({
        ...hydrated,
        familiars: familiars.map(f => serializeFamiliar(f, character.level, isDMOrAdmin(req.user))),
        recent_progress: progress
    });
}));

// Create new character
router.post('/', asyncHandler((req, res) => {
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
    const universe = getUniverseForCampaign(db, req.campaign.id);
    const hasPattern = pattern_imprint ? 1 : 0;
    const hasLogrus  = logrus_imprint  ? 1 : 0;
    const logrusLevel = { Basic: 1, Advanced: 2, Master: 3 }[logrus_imprint] ?? 0;

    const createCharacter = db.transaction(() => {
    const stmt = db.prepare(`
        INSERT INTO characters (
            name, player_name, species, class_type, level,
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            backstory, character_notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        name, player_name, finalSpecies, class_type, level,
        percentileFromScore(strength), percentileFromScore(dexterity),
        percentileFromScore(constitution), percentileFromScore(intelligence),
        percentileFromScore(wisdom), percentileFromScore(charisma),
        backstory, character_notes, finalUserId
    );

    const characterId = result.lastInsertRowid;

    // Initialize claim pool for new character with 10 starting points
    db.prepare('INSERT INTO campaign_characters (campaign_id, character_id) VALUES (?, ?)').run(req.campaign.id, characterId);
    db.prepare(`INSERT INTO claim_point_pools (character_id, total_points, spent_points, campaign_id) VALUES (?, 10, 0, ?)`)
        .run(characterId, req.campaign.id);
    const system = getSystemForCampaign(db, req.campaign.id);
    system.sheet.writeDocument(db, characterId, system.sheet.createDocument({ max_hp, current_hp }));
    if (universe) {
        universe.character.writeDocument(db, characterId, universe.character.createDocument({
            shadow_origin_id: shadow_origin_id || null,
            blood_purity, order_chaos_value,
            pattern_imprint: hasPattern, pattern_type,
            logrus_imprint: hasLogrus, logrus_mastery_level: logrusLevel,
            trump_artist: trump_artist ? 1 : 0, broken_imprint: broken_imprint ? 1 : 0,
            amber_flaws: amber_flaws ? JSON.stringify(amber_flaws) : null,
            amber_traits: amber_traits ? JSON.stringify(amber_traits) : null
        }));
    }
    return { characterId, system };
    });

    const { characterId, system } = createCharacter();
    const newCharacter = hydrateCharacterForCampaign(db, req.campaign.id, system.sheet.hydrateSheet(
        db, db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId), system));
    res.status(201).json(newCharacter);
}));

// Update character
router.put('/:id', asyncHandler((req, res) => {
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

    const system = getSystemForCampaign(db, req.campaign.id);
    const universe = getUniverseForCampaign(db, req.campaign.id);
    const systemUpdates = Object.fromEntries(Object.entries(req.body)
        .filter(([field]) => system.sheet.fields.includes(field)));
    const query = buildUpdateQuery('characters', UNIVERSAL_CHARACTER_UPDATE_FIELDS, req.body, characterId);
    const universeUpdates = universe ? Object.fromEntries(Object.entries(req.body)
        .filter(([field]) => universe.character.fields.includes(field))) : {};
    if (!query && !Object.keys(systemUpdates).length && !Object.keys(universeUpdates).length) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }
    db.transaction(() => {
        if (query) db.prepare(query.sql).run(...query.values);
        if (Object.keys(systemUpdates).length) system.sheet.update(db, characterId, systemUpdates, system);
        if (Object.keys(universeUpdates).length) universe.character.update(db, characterId, universeUpdates, universe);
    })();

    const updated = hydrateCharacterForCampaign(db, req.campaign.id, system.sheet.hydrateSheet(
        db, db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId), system));
    res.json(updated);
}));

// Delete character
router.delete('/:id', asyncHandler((req, res) => {
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
router.use(require('./weapons'));
router.use(require('./spells'));
router.use(require('./feats'));
router.use(require('./image'));
router.use(require('./story'));

module.exports = router;
