const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const schemaPath = path.join(__dirname, 'schema.sql');

console.log('Initializing database...');

// Create database connection
const db = new Database(dbPath);

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split by semicolons and execute each statement
const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

try {
    db.exec('BEGIN TRANSACTION');

    for (const statement of statements) {
        db.exec(statement);
    }

    db.exec('COMMIT');
    console.log('Database schema created successfully!');
} catch (error) {
    db.exec('ROLLBACK');
    console.error('Error creating database schema:', error);
    process.exit(1);
}

// Insert seed data
console.log('Inserting seed data...');

try {
    // Create a sample campaign session
    const insertSession = db.prepare(`
        INSERT INTO campaign_sessions (session_number, session_date, session_title, dm_notes)
        VALUES (?, ?, ?, ?)
    `);

    insertSession.run(0, new Date().toISOString().split('T')[0], 'Campaign Start', 'Initial setup session');
    console.log('Created initial campaign session');

    console.log('Seed data inserted successfully!');
    console.log(`Database ready at: ${dbPath}`);

} catch (error) {
    console.error('Error inserting seed data:', error);
    process.exit(1);
} finally {
    db.close();
}
