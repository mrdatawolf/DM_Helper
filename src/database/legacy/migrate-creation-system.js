/**
 * Migration: Add character creation system columns
 * Adds pattern_type, amber_flaws, amber_traits to the characters table.
 */

const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();

    const existing = db.prepare("PRAGMA table_info(characters)").all().map(r => r.name);

    const additions = [
        { col: 'pattern_type',  sql: "ALTER TABLE characters ADD COLUMN pattern_type TEXT" },
        { col: 'amber_flaws',   sql: "ALTER TABLE characters ADD COLUMN amber_flaws TEXT" },
        { col: 'amber_traits',  sql: "ALTER TABLE characters ADD COLUMN amber_traits TEXT" },
    ];

    for (const { col, sql } of additions) {
        if (!existing.includes(col)) {
            db.prepare(sql).run();
            console.log(`  + Added column: ${col}`);
        } else {
            console.log(`  = Column already exists: ${col}`);
        }
    }

    console.log('Migration complete.');
}

migrate();
