const { getDatabase } = require('./connection');

// Replaces the single chapter_id column on campaign_sessions with a proper
// session_chapters junction table, enabling crossover sessions.
// Run once: node src/database/migrate-session-chapters.js

function migrate() {
    const db = getDatabase();

    // Drop the single chapter_id column if it exists (SQLite 3.35+)
    const cols = db.prepare('PRAGMA table_info(campaign_sessions)').all().map(c => c.name);
    if (cols.includes('chapter_id')) {
        try {
            db.prepare('ALTER TABLE campaign_sessions DROP COLUMN chapter_id').run();
            console.log('  - Dropped chapter_id from campaign_sessions');
        } catch (e) {
            console.log('  ! Could not drop chapter_id (SQLite < 3.35) — column left unused');
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS session_chapters (
            session_id INTEGER NOT NULL,
            chapter_id INTEGER NOT NULL,
            PRIMARY KEY (session_id, chapter_id),
            FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters(id)          ON DELETE CASCADE
        )
    `).run();
    console.log('  + session_chapters table ready');

    console.log('Migration complete.');
}

migrate();
