const CHARACTER_COLUMNS = [
    ['age', 'TEXT'],
    ['height', 'TEXT'],
    ['weight', 'TEXT'],
    ['eyes', 'TEXT'],
    ['skin', 'TEXT'],
    ['hair', 'TEXT'],
    ['desires', 'TEXT'],
    ['fears', 'TEXT'],
    ['allies_organizations', 'TEXT'],
    ['treasure', 'TEXT'],
];

function up(db) {
    const columns = new Set(
        db.prepare('PRAGMA table_info(characters)').all().map(column => column.name)
    );
    for (const [name, definition] of CHARACTER_COLUMNS) {
        if (!columns.has(name)) {
            db.prepare(`ALTER TABLE characters ADD COLUMN ${name} ${definition}`).run();
        }
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS character_weapons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            attack_bonus INTEGER DEFAULT 0,
            damage_type TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_character_weapons_character
            ON character_weapons(character_id);
    `);
}

module.exports = { up };
