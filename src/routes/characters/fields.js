// Columns a client may set via PUT /api/characters/:id. Pulled out of
// index.js purely to keep that file's actual route logic readable — this
// array carries no behavior of its own.
const CHARACTER_UPDATE_FIELDS = [
    // Basic Info
    'name', 'player_name', 'species', 'class_type', 'subclass', 'level', 'background', 'alignment', 'size', 'speed',

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
    'armor_class', 'max_hp', 'current_hp', 'temp_hit_points',
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
    'age', 'height', 'weight', 'eyes', 'skin', 'hair', 'desires', 'fears',
    'allies_organizations', 'treasure',
    'class_features', 'species_traits', 'feats',

    // Currency
    'copper_pieces', 'silver_pieces', 'electrum_pieces', 'gold_pieces', 'platinum_pieces',

    // Attunement
    'attunement_slots_used', 'attunement_slots_max',

    // Amber-specific
    'shadow_origin_id', 'blood_purity', 'order_chaos_value',
    'pattern_imprint', 'pattern_type',
    'logrus_imprint',
    'pattern_mastery_level', 'logrus_mastery_level', 'trump_artist', 'trump_mastery_level',
    'amber_flaws', 'amber_traits', 'broken_imprint',

    // Other
    'feat_pool', 'total_feats_earned', 'experience_points', 'points_to_next_level',
    'current_shadow_id', 'current_story_timestamp', 'is_active'
];

module.exports = { CHARACTER_UPDATE_FIELDS };
