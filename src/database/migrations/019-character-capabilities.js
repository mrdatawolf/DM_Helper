const { CAPABILITY_KEYS, profileFromLegacyAbilities, validateProfile } = require('../../capabilities/profile');
const KEY_SQL = CAPABILITY_KEYS.map(key => `'${key}'`).join(', ');

function up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS character_capabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        capability_key TEXT NOT NULL CHECK(capability_key IN (${KEY_SQL})),
        value INTEGER NOT NULL CHECK(value >= 0 AND value <= 100),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, capability_key)
    ); CREATE INDEX IF NOT EXISTS idx_character_capabilities_character ON character_capabilities(character_id);`);
    const count = db.prepare('SELECT COUNT(*) AS count FROM character_capabilities WHERE character_id = ?');
    const rows = db.prepare('SELECT capability_key, value FROM character_capabilities WHERE character_id = ?');
    const insert = db.prepare('INSERT INTO character_capabilities (character_id, capability_key, value) VALUES (?, ?, ?)');
    const characters = db.prepare('SELECT id, strength, dexterity, constitution, intelligence, wisdom, charisma FROM characters').all();
    for (const character of characters) {
        const existing = count.get(character.id).count;
        if (existing) {
            if (existing !== CAPABILITY_KEYS.length) throw new Error(`Character ${character.id} has a partial capability profile; repair is required`);
            validateProfile(Object.fromEntries(rows.all(character.id).map(row => [row.capability_key, row.value])));
            continue;
        }
        const profile = profileFromLegacyAbilities(character);
        for (const key of CAPABILITY_KEYS) insert.run(character.id, key, profile[key]);
    }
}
module.exports = { up };
