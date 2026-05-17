/**
 * Migration: Add broken_imprint column to characters table.
 * Tracks whether a character walked a broken/imperfect version of a Pattern or Logrus.
 * No stat effect — DM-facing narrative flag only.
 */

const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();
    const existing = db.prepare("PRAGMA table_info(characters)").all().map(r => r.name);

    if (!existing.includes('broken_imprint')) {
        db.prepare("ALTER TABLE characters ADD COLUMN broken_imprint BOOLEAN DEFAULT 0").run();
        console.log('  + Added column: broken_imprint');
    } else {
        console.log('  = Column already exists: broken_imprint');
    }

    console.log('Migration complete.');
}

migrate();
