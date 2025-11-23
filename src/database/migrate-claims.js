const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Adding Attribute Claims system to database...');

try {
    db.exec('BEGIN TRANSACTION');

    // Create attribute_claims table
    db.exec(`
        CREATE TABLE IF NOT EXISTS attribute_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            attribute_name TEXT NOT NULL,
            points_spent INTEGER NOT NULL DEFAULT 0,
            justification TEXT,
            claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            UNIQUE(character_id, attribute_name)
        )
    `);

    // Create perceived_rankings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS perceived_rankings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            observer_character_id INTEGER NOT NULL,
            target_character_id INTEGER NOT NULL,
            attribute_name TEXT NOT NULL,
            perceived_points INTEGER NOT NULL,
            perception_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (observer_character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (target_character_id) REFERENCES characters(id) ON DELETE CASCADE,
            UNIQUE(observer_character_id, target_character_id, attribute_name)
        )
    `);

    // Create claim_point_pools table
    db.exec(`
        CREATE TABLE IF NOT EXISTS claim_point_pools (
            character_id INTEGER PRIMARY KEY,
            total_points INTEGER DEFAULT 10,
            spent_points INTEGER DEFAULT 0,
            available_points INTEGER GENERATED ALWAYS AS (total_points - spent_points) STORED,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        )
    `);

    // Create claim_history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS claim_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            attribute_name TEXT NOT NULL,
            points_change INTEGER NOT NULL,
            justification TEXT NOT NULL,
            session_id INTEGER,
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES campaign_sessions(id)
        )
    `);

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_attribute_claims_character ON attribute_claims(character_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_attribute_claims_attribute ON attribute_claims(attribute_name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_perceived_rankings_observer ON perceived_rankings(observer_character_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_perceived_rankings_target ON perceived_rankings(target_character_id)');

    // Initialize claim pools for existing characters
    const existingCharacters = db.prepare('SELECT id FROM characters').all();
    const insertPool = db.prepare(`
        INSERT OR IGNORE INTO claim_point_pools (character_id, total_points, spent_points)
        VALUES (?, 10, 0)
    `);

    for (const char of existingCharacters) {
        insertPool.run(char.id);
    }

    db.exec('COMMIT');
    console.log('✓ Attribute Claims tables created successfully');
    console.log(`✓ Initialized claim pools for ${existingCharacters.length} existing character(s)`);
    console.log('\nNew tables added:');
    console.log('  - attribute_claims (character attribute rankings)');
    console.log('  - perceived_rankings (what characters think about each other)');
    console.log('  - claim_point_pools (available points per character)');
    console.log('  - claim_history (audit trail of changes)');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('Error adding Attribute Claims system:', error);
    process.exit(1);
} finally {
    db.close();
}
