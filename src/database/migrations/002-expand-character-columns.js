// Bring fresh databases (created from schema.sql) up to the full character-sheet
// schema. Existing databases already have these columns from the historical
// one-off scripts in src/database/, so every ADD COLUMN is guarded.
// Column list and defaults mirror the live production schema.

const CHARACTER_COLUMNS = [
    ['user_id', 'INTEGER'],
    ['subclass', 'TEXT'],
    ['background', 'TEXT'],
    ['alignment', 'TEXT'],
    ["size", "TEXT DEFAULT 'Medium'"],
    ['proficiency_bonus', 'INTEGER DEFAULT 2'],
    ['initiative_bonus', 'INTEGER DEFAULT 0'],
    ['passive_perception', 'INTEGER DEFAULT 10'],
    ['temp_hit_points', 'INTEGER DEFAULT 0'],
    ["hit_dice_total", "TEXT DEFAULT '1d8'"],
    ["hit_dice_current", "TEXT DEFAULT '1d8'"],
    ['death_save_successes', 'INTEGER DEFAULT 0'],
    ['death_save_failures', 'INTEGER DEFAULT 0'],
    ['heroic_inspiration', 'INTEGER DEFAULT 0'],

    ['skill_acrobatics', 'INTEGER DEFAULT 0'],
    ['skill_animal_handling', 'INTEGER DEFAULT 0'],
    ['skill_arcana', 'INTEGER DEFAULT 0'],
    ['skill_athletics', 'INTEGER DEFAULT 0'],
    ['skill_deception', 'INTEGER DEFAULT 0'],
    ['skill_history', 'INTEGER DEFAULT 0'],
    ['skill_insight', 'INTEGER DEFAULT 0'],
    ['skill_intimidation', 'INTEGER DEFAULT 0'],
    ['skill_investigation', 'INTEGER DEFAULT 0'],
    ['skill_medicine', 'INTEGER DEFAULT 0'],
    ['skill_nature', 'INTEGER DEFAULT 0'],
    ['skill_perception', 'INTEGER DEFAULT 0'],
    ['skill_performance', 'INTEGER DEFAULT 0'],
    ['skill_persuasion', 'INTEGER DEFAULT 0'],
    ['skill_religion', 'INTEGER DEFAULT 0'],
    ['skill_sleight_of_hand', 'INTEGER DEFAULT 0'],
    ['skill_stealth', 'INTEGER DEFAULT 0'],
    ['skill_survival', 'INTEGER DEFAULT 0'],

    ['save_strength', 'INTEGER DEFAULT 0'],
    ['save_dexterity', 'INTEGER DEFAULT 0'],
    ['save_constitution', 'INTEGER DEFAULT 0'],
    ['save_intelligence', 'INTEGER DEFAULT 0'],
    ['save_wisdom', 'INTEGER DEFAULT 0'],
    ['save_charisma', 'INTEGER DEFAULT 0'],

    ['armor_light', 'INTEGER DEFAULT 0'],
    ['armor_medium', 'INTEGER DEFAULT 0'],
    ['armor_heavy', 'INTEGER DEFAULT 0'],
    ['armor_shields', 'INTEGER DEFAULT 0'],
    ['weapons_simple', 'INTEGER DEFAULT 0'],
    ['weapons_martial', 'INTEGER DEFAULT 0'],
    ['tools_proficiency', 'TEXT'],

    ['spellcasting_ability', 'TEXT'],
    ['spell_save_dc', 'INTEGER DEFAULT 8'],
    ['spell_attack_bonus', 'INTEGER DEFAULT 0'],
    ['spell_slots_1_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_1_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_2_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_2_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_3_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_3_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_4_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_4_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_5_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_5_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_6_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_6_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_7_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_7_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_8_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_8_expended', 'INTEGER DEFAULT 0'],
    ['spell_slots_9_total', 'INTEGER DEFAULT 0'],
    ['spell_slots_9_expended', 'INTEGER DEFAULT 0'],

    ['languages', 'TEXT'],
    ['appearance', 'TEXT'],
    ['personality', 'TEXT'],
    ['backstory', 'TEXT'],
    ['class_features', 'TEXT'],
    ['species_traits', 'TEXT'],
    ['feats', 'TEXT'],

    ['copper_pieces', 'INTEGER DEFAULT 0'],
    ['silver_pieces', 'INTEGER DEFAULT 0'],
    ['electrum_pieces', 'INTEGER DEFAULT 0'],
    ['gold_pieces', 'INTEGER DEFAULT 0'],
    ['platinum_pieces', 'INTEGER DEFAULT 0'],

    ['attunement_slots_used', 'INTEGER DEFAULT 0'],
    ['attunement_slots_max', 'INTEGER DEFAULT 3'],

    ['pattern_type', 'TEXT'],
    ['amber_flaws', 'TEXT'],
    ['amber_traits', 'TEXT'],
    ['broken_imprint', 'BOOLEAN DEFAULT 0'],
];

function up(db) {
    const charCols = new Set(db.prepare('PRAGMA table_info(characters)').all().map(c => c.name));
    for (const [name, def] of CHARACTER_COLUMNS) {
        if (!charCols.has(name)) {
            db.prepare(`ALTER TABLE characters ADD COLUMN ${name} ${def}`).run();
        }
    }

    const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
    if (!userCols.has('is_archived')) {
        db.prepare('ALTER TABLE users ADD COLUMN is_archived BOOLEAN DEFAULT 0').run();
    }
}

module.exports = { up };
