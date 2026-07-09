const { getDatabase } = require('./connection');

// Adds a `theme` column to story_arcs — a short poetic tagline displayed
// under the arc name and before the description.
// Run once: node src/database/migrate-arc-theme.js

function migrate() {
    const db = getDatabase();

    const cols = db.prepare("PRAGMA table_info(story_arcs)").all().map(c => c.name);
    if (cols.includes('theme')) {
        console.log('  = theme column already exists, skipping.');
    } else {
        db.prepare('ALTER TABLE story_arcs ADD COLUMN theme TEXT').run();
        console.log('  + Added column: story_arcs.theme');
    }

    console.log('Migration complete.');
}

migrate();
