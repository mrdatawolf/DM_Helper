const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Adding Authentication system to database...');

try {
    db.exec('BEGIN TRANSACTION');

    // Create users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            is_dm BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Add user_id column to characters table
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(characters)").all();
    const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id');

    if (!hasUserIdColumn) {
        db.exec(`
            ALTER TABLE characters ADD COLUMN user_id INTEGER REFERENCES users(id)
        `);
        console.log('✓ Added user_id column to characters table');
    } else {
        console.log('✓ user_id column already exists in characters table');
    }

    // Create index on username
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

    // Create index on characters.user_id
    db.exec('CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id)');

    db.exec('COMMIT');
    console.log('✓ Authentication tables created successfully');
    console.log('\nNew tables added:');
    console.log('  - users (authentication and user management)');
    console.log('\nColumns added:');
    console.log('  - characters.user_id (links characters to users)');

} catch (error) {
    db.exec('ROLLBACK');
    console.error('Error adding Authentication system:', error);
    process.exit(1);
} finally {
    db.close();
}
