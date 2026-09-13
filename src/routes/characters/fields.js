// Columns a client may set via PUT /api/characters/:id. Pulled out of
// index.js purely to keep that file's actual route logic readable — this
// array carries no behavior of its own.
const UNIVERSAL_CHARACTER_UPDATE_FIELDS = [
    // Basic Info
    'name', 'player_name', 'species', 'class_type', 'subclass', 'level', 'background', 'alignment', 'size',

    // Ability Scores
    'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',

    // Character Details
    'languages', 'appearance', 'personality', 'backstory', 'character_notes',
    'age', 'height', 'weight', 'eyes', 'skin', 'hair', 'desires', 'fears',
    'allies_organizations',

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

module.exports = { UNIVERSAL_CHARACTER_UPDATE_FIELDS };
