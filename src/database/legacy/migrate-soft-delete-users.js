/**
 * Migration: Add is_archived column to users table for soft-delete support.
 */

const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();
    const existing = db.prepare("PRAGMA table_info(users)").all().map(r => r.name);

    if (!existing.includes('is_archived')) {
        db.prepare("ALTER TABLE users ADD COLUMN is_archived BOOLEAN DEFAULT 0").run();
        console.log('  + Added column: is_archived');
    } else {
        console.log('  = Column already exists: is_archived');
    }

    console.log('Migration complete.');
}

migrate();
