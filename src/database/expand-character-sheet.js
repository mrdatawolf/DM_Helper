const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Expanding character sheet with D&D 5e fields...');

try {
    // Add new columns to characters table
    db.exec(`
        -- Basic Info Additions
        ALTER TABLE characters ADD COLUMN subclass TEXT;
        ALTER TABLE characters ADD COLUMN species TEXT; -- Rename/replace race
        ALTER TABLE characters ADD COLUMN background TEXT;
        ALTER TABLE characters ADD COLUMN alignment TEXT;
        ALTER TABLE characters ADD COLUMN size TEXT DEFAULT 'Medium';

        -- Combat & Stats
        ALTER TABLE characters ADD COLUMN proficiency_bonus INTEGER DEFAULT 2;
        ALTER TABLE characters ADD COLUMN initiative_bonus INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN passive_perception INTEGER DEFAULT 10;
        ALTER TABLE characters ADD COLUMN temp_hit_points INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN hit_dice_total TEXT DEFAULT '1d8'; -- e.g., "5d8"
        ALTER TABLE characters ADD COLUMN hit_dice_current TEXT DEFAULT '1d8';

        -- Death Saves
        ALTER TABLE characters ADD COLUMN death_save_successes INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN death_save_failures INTEGER DEFAULT 0;

        -- Inspiration
        ALTER TABLE characters ADD COLUMN heroic_inspiration INTEGER DEFAULT 0;

        -- Skills (proficiency: 0=not proficient, 1=proficient, 2=expertise)
        ALTER TABLE characters ADD COLUMN skill_acrobatics INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_animal_handling INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_arcana INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_athletics INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_deception INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_history INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_insight INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_intimidation INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_investigation INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_medicine INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_nature INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_perception INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_performance INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_persuasion INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_religion INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_sleight_of_hand INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_stealth INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN skill_survival INTEGER DEFAULT 0;

        -- Saving Throw Proficiencies (boolean)
        ALTER TABLE characters ADD COLUMN save_strength INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN save_dexterity INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN save_constitution INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN save_intelligence INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN save_wisdom INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN save_charisma INTEGER DEFAULT 0;

        -- Equipment Training
        ALTER TABLE characters ADD COLUMN armor_light INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN armor_medium INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN armor_heavy INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN armor_shields INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN weapons_simple INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN weapons_martial INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN tools_proficiency TEXT; -- JSON or comma-separated

        -- Spellcasting
        ALTER TABLE characters ADD COLUMN spellcasting_ability TEXT; -- INT, WIS, CHA
        ALTER TABLE characters ADD COLUMN spell_save_dc INTEGER DEFAULT 8;
        ALTER TABLE characters ADD COLUMN spell_attack_bonus INTEGER DEFAULT 0;

        -- Spell Slots (total and expended)
        ALTER TABLE characters ADD COLUMN spell_slots_1_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_1_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_2_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_2_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_3_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_3_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_4_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_4_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_5_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_5_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_6_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_6_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_7_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_7_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_8_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_8_expended INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_9_total INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN spell_slots_9_expended INTEGER DEFAULT 0;

        -- Character Details
        ALTER TABLE characters ADD COLUMN languages TEXT; -- Comma-separated or JSON
        ALTER TABLE characters ADD COLUMN appearance TEXT;
        ALTER TABLE characters ADD COLUMN personality TEXT;
        ALTER TABLE characters ADD COLUMN backstory TEXT;
        ALTER TABLE characters ADD COLUMN class_features TEXT;
        ALTER TABLE characters ADD COLUMN species_traits TEXT;
        ALTER TABLE characters ADD COLUMN feats TEXT; -- JSON array of feat objects

        -- Currency
        ALTER TABLE characters ADD COLUMN copper_pieces INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN silver_pieces INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN electrum_pieces INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN gold_pieces INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN platinum_pieces INTEGER DEFAULT 0;

        -- Magic Item Attunement
        ALTER TABLE characters ADD COLUMN attunement_slots_used INTEGER DEFAULT 0;
        ALTER TABLE characters ADD COLUMN attunement_slots_max INTEGER DEFAULT 3;
    `);

    console.log('✓ Successfully added D&D 5e fields to characters table');

    // Create a new table for spell list (prepared spells)
    db.exec(`
        CREATE TABLE IF NOT EXISTS character_spells (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            spell_name TEXT NOT NULL,
            spell_level INTEGER NOT NULL, -- 0 for cantrips
            casting_time TEXT,
            range TEXT,
            concentration BOOLEAN DEFAULT 0,
            ritual BOOLEAN DEFAULT 0,
            components TEXT, -- "V, S, M"
            material_components TEXT,
            is_prepared BOOLEAN DEFAULT 1,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_character_spells_char ON character_spells(character_id);
        CREATE INDEX IF NOT EXISTS idx_character_spells_level ON character_spells(spell_level);
    `);

    console.log('✓ Successfully created character_spells table');

    // Create feats table for structured feat tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS character_feats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            feat_name TEXT NOT NULL,
            feat_description TEXT,
            source TEXT, -- "Level 1", "Level 4", "Background", etc.
            acquired_at_level INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_character_feats ON character_feats(character_id);
    `);

    console.log('✓ Successfully created character_feats table');

    console.log('\n✅ Character sheet expansion complete!');
    console.log('Note: Existing characters will have default values for new fields.');

} catch (error) {
    console.error('Error expanding character sheet:', error);
    process.exit(1);
} finally {
    db.close();
}
