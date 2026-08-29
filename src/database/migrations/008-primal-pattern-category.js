const migration = {
    id: '008-primal-pattern-category',
    up(db) {
        // Create tables if they were never created by earlier migrations
        db.exec(`
            CREATE TABLE IF NOT EXISTS primal_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                also_known_as TEXT,
                origin_figure TEXT,
                spirit_animal TEXT,
                spirit_animal_role TEXT DEFAULT 'unknown',
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS primal_pattern_sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id INTEGER NOT NULL REFERENCES primal_patterns(id) ON DELETE CASCADE,
                section_key TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                player_content TEXT,
                section_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS character_pattern_lore (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
                section_id INTEGER NOT NULL REFERENCES primal_pattern_sections(id) ON DELETE CASCADE,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(character_id, section_id)
            );
        `);

        // Add category column (safe to re-run: ALTER TABLE fails silently if column exists
        // via a separate try/catch — SQLite has no ADD COLUMN IF NOT EXISTS)
        try {
            db.exec(`
                ALTER TABLE primal_patterns ADD COLUMN category TEXT NOT NULL DEFAULT 'Pattern'
                    CHECK(category IN ('Pattern','Logrus','Liminal'));
            `);
        } catch (e) {
            if (!e.message.includes('duplicate column name')) throw e;
        }
    }
};
module.exports = migration;
