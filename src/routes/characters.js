const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { optionalAuth, authenticate, requireDM } = require('../middleware/auth');

// Get all characters
router.get('/', (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single character by ID
router.get('/:id', (req, res) => {
    try {
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
            recent_progress: progress
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new character
router.post('/', optionalAuth, (req, res) => {
    try {
        const db = getDatabase();
        const {
            name, race, class_type, level = 1,
            strength = 10, dexterity = 10, constitution = 10,
            intelligence = 10, wisdom = 10, charisma = 10,
            max_hp = 10, current_hp = 10,
            order_chaos_value = 50, pattern_imprint = null,
            logrus_imprint = null, blood_purity = 0,
            trump_artist = 0, backstory = null,
            user_id = null
        } = req.body;

        // Validate required fields
        if (!name || !race || !class_type) {
            return res.status(400).json({ error: 'Name, race, and class_type are required' });
        }

        // If user is authenticated, use their user_id
        const finalUserId = req.user ? req.user.userId : user_id;

        const stmt = db.prepare(`
            INSERT INTO characters (
                name, race, class, level,
                strength, dexterity, constitution, intelligence, wisdom, charisma,
                max_hit_points, current_hit_points,
                order_chaos_balance, has_pattern_imprint, has_logrus_imprint,
                blood_purity, has_trump_artistry, character_notes, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            name, race, class_type, level,
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            max_hp, current_hp,
            order_chaos_value, pattern_imprint, logrus_imprint,
            blood_purity, trump_artist ? 1 : 0, backstory, finalUserId
        );

        const characterId = result.lastInsertRowid;

        // Initialize claim pool for new character with 10 starting points
        db.prepare(`
            INSERT INTO claim_point_pools (character_id, total_points, spent_points)
            VALUES (?, 10, 0)
        `).run(characterId);

        const newCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
        res.status(201).json(newCharacter);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update character
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const characterId = req.params.id;

        // Check if character exists
        const existing = db.prepare('SELECT id FROM characters WHERE id = ?').get(characterId);
        if (!existing) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Build dynamic update query based on provided fields
        const updateFields = [];
        const values = [];

        const allowedFields = [
            // Basic Info
            'name', 'player_name', 'race', 'species', 'class', 'class_type', 'subclass', 'level', 'background', 'alignment', 'size', 'speed',

            // Ability Scores
            'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',

            // Saving Throws
            'save_strength', 'save_dexterity', 'save_constitution', 'save_intelligence', 'save_wisdom', 'save_charisma',

            // Skills
            'skill_acrobatics', 'skill_animal_handling', 'skill_arcana', 'skill_athletics', 'skill_deception',
            'skill_history', 'skill_insight', 'skill_intimidation', 'skill_investigation', 'skill_medicine',
            'skill_nature', 'skill_perception', 'skill_performance', 'skill_persuasion', 'skill_religion',
            'skill_sleight_of_hand', 'skill_stealth', 'skill_survival',

            // Combat & HP
            'armor_class', 'max_hp', 'max_hit_points', 'current_hp', 'current_hit_points', 'temp_hit_points',
            'hit_dice_total', 'hit_dice_current', 'death_save_successes', 'death_save_failures',
            'proficiency_bonus', 'initiative_bonus', 'passive_perception', 'heroic_inspiration',

            // Equipment Training
            'armor_light', 'armor_medium', 'armor_heavy', 'armor_shields',
            'weapons_simple', 'weapons_martial', 'tools_proficiency',

            // Spellcasting
            'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus',
            'spell_slots_1_total', 'spell_slots_1_expended', 'spell_slots_2_total', 'spell_slots_2_expended',
            'spell_slots_3_total', 'spell_slots_3_expended', 'spell_slots_4_total', 'spell_slots_4_expended',
            'spell_slots_5_total', 'spell_slots_5_expended', 'spell_slots_6_total', 'spell_slots_6_expended',
            'spell_slots_7_total', 'spell_slots_7_expended', 'spell_slots_8_total', 'spell_slots_8_expended',
            'spell_slots_9_total', 'spell_slots_9_expended',

            // Character Details
            'languages', 'appearance', 'personality', 'backstory', 'character_notes',
            'class_features', 'species_traits', 'feats',

            // Currency
            'copper_pieces', 'silver_pieces', 'electrum_pieces', 'gold_pieces', 'platinum_pieces',

            // Attunement
            'attunement_slots_used', 'attunement_slots_max',

            // Amber-specific
            'shadow_origin_id', 'blood_purity', 'order_chaos_value', 'order_chaos_balance',
            'pattern_imprint', 'has_pattern_imprint', 'logrus_imprint', 'has_logrus_imprint',
            'pattern_mastery_level', 'logrus_mastery_level', 'trump_artist', 'has_trump_artistry', 'trump_mastery_level',

            // Other
            'feat_pool', 'total_feats_earned', 'experience_points', 'points_to_next_level',
            'current_shadow_id', 'current_story_timestamp', 'is_active'
        ];

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(characterId);

        const query = `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete character
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }

        res.json({ message: 'Character deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add gear to character
router.post('/:id/gear', (req, res) => {
    try {
        const db = getDatabase();
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add power/ability to character
router.post('/:id/powers', (req, res) => {
    try {
        const db = getDatabase();
        const { power_name, power_type, description, power_level = 1, uses_per_day, current_uses } = req.body;

        if (!power_name) {
            return res.status(400).json({ error: 'Power name is required' });
        }

        const stmt = db.prepare(`
            INSERT INTO character_powers (character_id, power_name, power_type, description, power_level, uses_per_day, current_uses)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(req.params.id, power_name, power_type, description, power_level, uses_per_day, current_uses);
        const newPower = db.prepare('SELECT * FROM character_powers WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(newPower);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
