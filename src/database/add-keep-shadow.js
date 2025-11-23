const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Adding Nexus pattern influence and Keep of the Four Worlds shadow...');

try {
    // Disable foreign keys temporarily
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN TRANSACTION');

    // First, we need to recreate the shadows table with the updated CHECK constraint
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table

    console.log('Creating temporary table with new pattern_influence values...');

    // Create new table with updated constraint
    db.exec(`
        CREATE TABLE shadows_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            order_level INTEGER DEFAULT 50,
            chaos_level INTEGER DEFAULT 50,
            pattern_influence TEXT CHECK(pattern_influence IN ('First Pattern', 'Corwin Pattern', 'Logrus', 'Mixed', 'None', 'Nexus')),
            corruption_status TEXT,
            is_starting_shadow BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Copying existing shadow data...');

    // Copy data from old table to new
    db.exec(`
        INSERT INTO shadows_new (id, name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow, created_at)
        SELECT id, name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow, created_at
        FROM shadows
    `);

    console.log('Dropping old table and renaming new table...');

    // Drop old table and rename new one
    db.exec('DROP TABLE shadows');
    db.exec('ALTER TABLE shadows_new RENAME TO shadows');

    console.log('Adding Keep of the Four Worlds...');

    // Now insert the Keep of the Four Worlds
    const stmt = db.prepare(`
        INSERT INTO shadows (name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        'The Keep of the Four Worlds',
        'A unique nexus shadow where four distinct realities converge at precise geometric angles. The Keep itself stands at the exact center point, its architecture impossibly blending stone, crystal, shadow, and living matter - each quarter reflecting one of the four worlds it bridges. Masters of the Keep gain power rivaling Pattern or Logrus users by drawing on the convergence itself, manipulating the flow between realities without needing to walk either. This makes it a coveted prize and a dangerous responsibility - the Keep demands constant balance, or the four worlds will tear apart at the seams.',
        50,  // order_level (balanced)
        50,  // chaos_level (balanced)
        'Nexus',
        'Reality strain at convergence point - requires active management to maintain stability',
        0    // not a starting shadow
    );

    db.exec('COMMIT');

    // Re-enable foreign keys
    db.exec('PRAGMA foreign_keys = ON');

    console.log('✓ Successfully added Nexus pattern influence type');
    console.log('✓ Successfully added Keep of the Four Worlds shadow');
    console.log('\nThe Keep of the Four Worlds is now available in the database!');

} catch (error) {
    db.exec('ROLLBACK');
    db.exec('PRAGMA foreign_keys = ON');
    console.error('Error adding Keep shadow:', error);
    process.exit(1);
} finally {
    db.close();
}
