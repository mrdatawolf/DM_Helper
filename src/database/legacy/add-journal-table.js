const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Adding journal_entries table...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,

            -- Entry content
            title TEXT NOT NULL,
            content TEXT NOT NULL,

            -- Timeline tracking
            story_timestamp TEXT, -- When this happened in the story (for async play)
            session_id INTEGER, -- Which session this is from (if any)

            -- Visibility
            is_public BOOLEAN DEFAULT 0, -- Can other players see this?

            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE SET NULL
        )
    `);

    // Create indexes for common queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_journal_character ON journal_entries(character_id);
        CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_journal_public ON journal_entries(is_public);
        CREATE INDEX IF NOT EXISTS idx_journal_session ON journal_entries(session_id);
    `);

    console.log('✓ Successfully created journal_entries table');
    console.log('✓ Created indexes for efficient queries');

} catch (error) {
    console.error('Error creating journal table:', error);
    process.exit(1);
} finally {
    db.close();
}
