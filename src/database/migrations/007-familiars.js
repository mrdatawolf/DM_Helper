// Familiars: animal companions psychically bonded to a specific character.
// Power scales automatically with the bonded character's level via a
// DM-authored growth_table (see src/utils/familiars.js for the formula),
// rather than being hand-edited each session.

const DDL = `
CREATE TABLE IF NOT EXISTS familiars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    template_npc_id INTEGER REFERENCES npcs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    creature_type TEXT,
    bond_type TEXT DEFAULT 'Psychic',
    description TEXT,
    armor_class INTEGER,
    base_hit_points INTEGER,
    base_stats TEXT,
    growth_table TEXT,
    bond_notes TEXT,
    dm_notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_familiars_character ON familiars(character_id);
`;

function up(db) {
    db.exec(DDL);

    const combatantCols = new Set(db.prepare('PRAGMA table_info(combatants)').all().map(c => c.name));
    if (!combatantCols.has('familiar_id')) {
        db.prepare('ALTER TABLE combatants ADD COLUMN familiar_id INTEGER REFERENCES familiars(id) ON DELETE SET NULL').run();
    }
}

module.exports = { up };
