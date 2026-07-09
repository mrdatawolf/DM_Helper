/**
 * Migration: Story Arc system
 * Creates story_arcs, arc_beats, arc_characters, arc_dependencies tables.
 */

const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS story_arcs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT,
            status      TEXT DEFAULT 'planned'
                        CHECK(status IN ('planned', 'active', 'dormant', 'completed')),
            dm_notes    TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
    console.log('  + story_arcs table ready');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS arc_beats (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            arc_id       INTEGER NOT NULL,
            title        TEXT NOT NULL,
            description  TEXT,
            dm_notes     TEXT,
            order_index  INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            completed_at DATETIME,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE
        )
    `).run();
    console.log('  + arc_beats table ready');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS arc_characters (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            arc_id       INTEGER NOT NULL,
            character_id INTEGER NOT NULL,
            role         TEXT DEFAULT 'supporting'
                         CHECK(role IN ('protagonist', 'supporting', 'antagonist', 'unknown')),
            UNIQUE(arc_id, character_id),
            FOREIGN KEY (arc_id)       REFERENCES story_arcs(id) ON DELETE CASCADE,
            FOREIGN KEY (character_id) REFERENCES characters(id)  ON DELETE CASCADE
        )
    `).run();
    console.log('  + arc_characters table ready');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS arc_dependencies (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            arc_id            INTEGER NOT NULL,
            depends_on_arc_id INTEGER NOT NULL,
            UNIQUE(arc_id, depends_on_arc_id),
            FOREIGN KEY (arc_id)            REFERENCES story_arcs(id) ON DELETE CASCADE,
            FOREIGN KEY (depends_on_arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE
        )
    `).run();
    console.log('  + arc_dependencies table ready');

    console.log('Migration complete.');
}

migrate();
