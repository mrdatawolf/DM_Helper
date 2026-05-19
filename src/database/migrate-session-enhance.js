const { getDatabase } = require('./connection');

// Enhances campaign_sessions:
//   - Adds chapter_id, session_status, opening_notes, mid_notes, closing_notes
//   - Creates session_characters, session_beats, session_npcs junction tables
// Run once: node src/database/migrate-session-enhance.js

function migrate() {
    const db = getDatabase();

    const cols = db.prepare('PRAGMA table_info(campaign_sessions)').all().map(c => c.name);

    const addCol = (col, def) => {
        if (!cols.includes(col)) {
            db.prepare(`ALTER TABLE campaign_sessions ADD COLUMN ${col} ${def}`).run();
            console.log(`  + Added ${col} to campaign_sessions`);
        } else {
            console.log(`  = ${col} already exists, skipping`);
        }
    };

    addCol('chapter_id',      'INTEGER REFERENCES chapters(id)');
    addCol('session_status',  "TEXT DEFAULT 'planned'");
    addCol('opening_notes',   'TEXT');
    addCol('mid_notes',       'TEXT');
    addCol('closing_notes',   'TEXT');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS session_characters (
            session_id   INTEGER NOT NULL,
            character_id INTEGER NOT NULL,
            attendance   TEXT DEFAULT 'expected'
                         CHECK(attendance IN ('expected','attended','absent')),
            PRIMARY KEY (session_id, character_id),
            FOREIGN KEY (session_id)   REFERENCES campaign_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (character_id) REFERENCES characters(id)        ON DELETE CASCADE
        )
    `).run();
    console.log('  + session_characters table ready');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS session_beats (
            session_id INTEGER NOT NULL,
            beat_id    INTEGER NOT NULL,
            PRIMARY KEY (session_id, beat_id),
            FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (beat_id)    REFERENCES beats(id)             ON DELETE CASCADE
        )
    `).run();
    console.log('  + session_beats table ready');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS session_npcs (
            session_id INTEGER NOT NULL,
            npc_id     INTEGER NOT NULL,
            context    TEXT,
            PRIMARY KEY (session_id, npc_id),
            FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (npc_id)     REFERENCES npcs(id)              ON DELETE CASCADE
        )
    `).run();
    console.log('  + session_npcs table ready');

    console.log('Migration complete.');
}

migrate();
