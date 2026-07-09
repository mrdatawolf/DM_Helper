/**
 * Migration v2: Restructure story arc system.
 * Grand Narrative → Story Arcs (per character) → Chapters → Beats (global pool)
 * Drops: arc_beats, arc_characters, arc_dependencies
 * Adds: grand_narrative, chapters, beats, beat_chapters
 * Modifies: story_arcs (adds character_id, order_index; drops old columns)
 */

const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();

    // Drop old junction/child tables first (FK order)
    db.prepare('DROP TABLE IF EXISTS arc_dependencies').run();
    db.prepare('DROP TABLE IF EXISTS arc_characters').run();
    db.prepare('DROP TABLE IF EXISTS arc_beats').run();
    console.log('  - dropped old arc_beats, arc_characters, arc_dependencies');

    // Rebuild story_arcs with new columns
    db.prepare(`
        CREATE TABLE IF NOT EXISTS story_arcs_v2 (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
            title        TEXT NOT NULL,
            description  TEXT,
            status       TEXT DEFAULT 'planned'
                         CHECK(status IN ('planned', 'active', 'dormant', 'completed')),
            order_index  INTEGER DEFAULT 0,
            dm_notes     TEXT,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        INSERT INTO story_arcs_v2 (id, title, description, status, dm_notes, created_at, updated_at)
        SELECT id, title, description, status, dm_notes, created_at, updated_at
        FROM story_arcs
    `).run();

    db.prepare('DROP TABLE IF EXISTS story_arcs').run();
    db.prepare('ALTER TABLE story_arcs_v2 RENAME TO story_arcs').run();
    console.log('  + story_arcs rebuilt with character_id and order_index');

    // Grand narrative singleton
    db.prepare(`
        CREATE TABLE IF NOT EXISTS grand_narrative (
            id         INTEGER PRIMARY KEY CHECK(id = 1),
            title      TEXT DEFAULT 'The Grand Narrative',
            summary    TEXT,
            factions   TEXT,
            dm_notes   TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    db.prepare(`INSERT OR IGNORE INTO grand_narrative (id) VALUES (1)`).run();
    console.log('  + grand_narrative table ready');

    // Chapters (sequential episodes within a story arc)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS chapters (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            arc_id      INTEGER NOT NULL,
            title       TEXT NOT NULL,
            description TEXT,
            dm_notes    TEXT,
            status      TEXT DEFAULT 'planned'
                        CHECK(status IN ('planned', 'active', 'completed')),
            order_index INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE
        )
    `).run();
    console.log('  + chapters table ready');

    // Beats — global pool of plot events
    db.prepare(`
        CREATE TABLE IF NOT EXISTS beats (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            description  TEXT,
            dm_notes     TEXT,
            is_completed BOOLEAN DEFAULT 0,
            completed_at DATETIME,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    console.log('  + beats table ready');

    // Beat ↔ Chapter assignments (many-to-many)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS beat_chapters (
            beat_id    INTEGER NOT NULL,
            chapter_id INTEGER NOT NULL,
            PRIMARY KEY (beat_id, chapter_id),
            FOREIGN KEY (beat_id)    REFERENCES beats(id)    ON DELETE CASCADE,
            FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        )
    `).run();
    console.log('  + beat_chapters table ready');

    console.log('Migration v2 complete.');
}

migrate();
