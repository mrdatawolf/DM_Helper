const NAMESPACE = 'system:dnd5e';

const DND5E_CHARACTER_COLUMNS = [
    'armor_class', 'max_hp', 'current_hp', 'temp_hit_points', 'speed',
    'proficiency_bonus', 'initiative_bonus', 'passive_perception',
    'hit_dice_total', 'hit_dice_current', 'death_save_successes',
    'death_save_failures', 'heroic_inspiration',
    'skill_acrobatics', 'skill_animal_handling', 'skill_arcana',
    'skill_athletics', 'skill_deception', 'skill_history', 'skill_insight',
    'skill_intimidation', 'skill_investigation', 'skill_medicine',
    'skill_nature', 'skill_perception', 'skill_performance',
    'skill_persuasion', 'skill_religion', 'skill_sleight_of_hand',
    'skill_stealth', 'skill_survival',
    'save_strength', 'save_dexterity', 'save_constitution',
    'save_intelligence', 'save_wisdom', 'save_charisma',
    'armor_light', 'armor_medium', 'armor_heavy', 'armor_shields',
    'weapons_simple', 'weapons_martial', 'tools_proficiency',
    'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus',
    ...Array.from({ length: 9 }, (_, index) => index + 1)
        .flatMap(level => [`spell_slots_${level}_total`, `spell_slots_${level}_expended`]),
    'class_features', 'species_traits', 'feats',
    'copper_pieces', 'silver_pieces', 'electrum_pieces', 'gold_pieces',
    'platinum_pieces', 'treasure', 'attunement_slots_used',
    'attunement_slots_max'
];

const RELATED_TABLES = Object.freeze({
    gear: 'character_gear',
    powers: 'character_powers',
    spells: 'character_spells',
    feats: 'character_feats',
    weapons: 'character_weapons'
});

function tableExists(db, table) {
    return Boolean(db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(table));
}

function createExtensionTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS character_extension_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            namespace TEXT NOT NULL,
            data JSON NOT NULL DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            UNIQUE(character_id, namespace),
            CHECK(length(namespace) > 2 AND instr(namespace, ':') > 1),
            CHECK(json_valid(data))
        );
        CREATE INDEX IF NOT EXISTS idx_character_extension_data_character
            ON character_extension_data(character_id);
        CREATE INDEX IF NOT EXISTS idx_character_extension_data_namespace
            ON character_extension_data(namespace);
    `);
}

function migrateOldExtensionRows(db) {
    if (!tableExists(db, 'character_system_data')) return;
    const rows = db.prepare(
        'SELECT character_id, game_system, data, created_at, updated_at FROM character_system_data'
    ).all();
    const insert = db.prepare(`
        INSERT OR IGNORE INTO character_extension_data
            (character_id, namespace, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
        const data = row.data && (() => { try { JSON.parse(row.data); return true; } catch { return false; } })()
            ? row.data
            : '{}';
        insert.run(row.character_id, `system:${row.game_system}`, data, row.created_at, row.updated_at);
    }
}

function dnd5eSnapshot(db, character) {
    const sheet = {};
    for (const column of DND5E_CHARACTER_COLUMNS) sheet[column] = character[column];

    const data = { schema_version: 1, sheet };
    for (const [key, table] of Object.entries(RELATED_TABLES)) {
        data[key] = tableExists(db, table)
            ? db.prepare(`SELECT * FROM ${table} WHERE character_id = ? ORDER BY id`).all(character.id)
            : [];
    }
    return data;
}

function up(db) {
    createExtensionTable(db);
    migrateOldExtensionRows(db);

    const available = new Set(db.prepare('PRAGMA table_info(characters)').all().map(column => column.name));
    const columns = DND5E_CHARACTER_COLUMNS.filter(column => available.has(column));
    const characters = db.prepare(`SELECT id${columns.length ? `, ${columns.join(', ')}` : ''} FROM characters`).all();
    const existingRow = db.prepare(`
        SELECT id, data FROM character_extension_data
        WHERE character_id = ? AND namespace = ?
    `);
    const insert = db.prepare('INSERT INTO character_extension_data (character_id, namespace, data) VALUES (?, ?, ?)');
    const update = db.prepare(`
        UPDATE character_extension_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    for (const character of characters) {
        const existing = existingRow.get(character.id, NAMESPACE);
        const existingData = existing ? JSON.parse(existing.data) : null;
        if (existingData?.schema_version === 1) continue;

        const snapshot = dnd5eSnapshot(db, character);
        if (existingData && Object.keys(existingData).length) snapshot.legacy_data = existingData;
        if (existing) update.run(JSON.stringify(snapshot), existing.id);
        else insert.run(character.id, NAMESPACE, JSON.stringify(snapshot));
    }
}

module.exports = {
    up,
    NAMESPACE,
    DND5E_CHARACTER_COLUMNS,
    RELATED_TABLES,
    dnd5eSnapshot
};
