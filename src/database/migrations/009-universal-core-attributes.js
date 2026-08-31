const { percentileFromScore } = require('../../../public/js/ability-conversion');

const ABILITY_COLUMNS = [
    'strength', 'dexterity', 'constitution',
    'intelligence', 'wisdom', 'charisma'
];
const MIGRATION_KEY = 'universal-core-attributes-v1';

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS data_migrations (
            name TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS character_system_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            game_system TEXT NOT NULL,
            data JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_character_system_data_character
            ON character_system_data(character_id);
    `);

    const arcColumns = new Set(
        db.prepare('PRAGMA table_info(story_arcs)').all().map(column => column.name)
    );
    if (!arcColumns.has('game_system')) {
        db.prepare("ALTER TABLE story_arcs ADD COLUMN game_system TEXT DEFAULT 'dnd5e'").run();
    }

    if (db.prepare('SELECT 1 FROM data_migrations WHERE name = ?').get(MIGRATION_KEY)) {
        return;
    }

    const rows = db.prepare(`SELECT id, ${ABILITY_COLUMNS.join(', ')} FROM characters`).all();
    const update = db.prepare(`
        UPDATE characters SET ${ABILITY_COLUMNS.map(column => `${column} = ?`).join(', ')}
        WHERE id = ?
    `);

    for (const row of rows) {
        update.run(...ABILITY_COLUMNS.map(column => percentileFromScore(row[column])), row.id);
    }

    db.prepare('INSERT INTO data_migrations (name) VALUES (?)').run(MIGRATION_KEY);
}

module.exports = { up };
