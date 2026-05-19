const { getDatabase } = require('./connection');

// Renames pattern_influence values to match the updated display labels:
//   'First Pattern'  → 'Pattern'
//   'Corwin Pattern' → 'Argent Refrain'
// Run once: node src/database/migrate-shadow-influence-labels.js

function migrate() {
    const db = getDatabase();

    const r1 = db.prepare(
        "UPDATE shadows SET pattern_influence = 'Pattern' WHERE pattern_influence = 'First Pattern'"
    ).run();
    console.log(`  Updated 'First Pattern' → 'Pattern': ${r1.changes} row(s)`);

    const r2 = db.prepare(
        "UPDATE shadows SET pattern_influence = 'Argent Refrain' WHERE pattern_influence = 'Corwin Pattern'"
    ).run();
    console.log(`  Updated 'Corwin Pattern' → 'Argent Refrain': ${r2.changes} row(s)`);

    console.log('Migration complete.');
}

migrate();
