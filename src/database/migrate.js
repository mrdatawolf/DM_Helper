// Migration runner: executes pending migrations from src/database/migrations/
// in filename order, tracking applied ones in the schema_migrations table.
// Runs automatically at server startup, or manually via: npm run migrate

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function runMigrations(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    if (!fs.existsSync(MIGRATIONS_DIR)) return;

    const applied = new Set(
        db.prepare('SELECT name FROM schema_migrations').all().map(r => r.name)
    );

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.js'))
        .sort();

    for (const file of files) {
        if (applied.has(file)) continue;

        const migration = require(path.join(MIGRATIONS_DIR, file));
        console.log(`Applying migration: ${file}`);

        const apply = db.transaction(() => {
            migration.up(db);
            db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
        });
        apply();

        console.log(`Applied migration: ${file}`);
    }
}

module.exports = { runMigrations };

// Allow running directly: node src/database/migrate.js
if (require.main === module) {
    const { getDatabase, closeDatabase } = require('./connection');
    try {
        runMigrations(getDatabase());
        console.log('Migrations up to date.');
    } finally {
        closeDatabase();
    }
}
