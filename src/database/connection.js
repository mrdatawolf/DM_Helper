const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';

let db = null;

function getDatabase() {
    if (!db) {
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON'); // Enable foreign key constraints
        console.log('Database connection established');
    }
    return db;
}

function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}

module.exports = {
    getDatabase,
    closeDatabase
};
