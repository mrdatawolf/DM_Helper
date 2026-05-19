const { getDatabase } = require('./connection');

// Fixes the pattern_influence CHECK constraint (old DB still had 'First Pattern'/'Corwin Pattern')
// and adds dream_level column.
// SQLite can't ALTER a CHECK constraint, so we recreate the table.
// Run once: node src/database/migrate-shadow-dream.js

function migrate() {
    const db = getDatabase();

    db.prepare('PRAGMA foreign_keys = OFF').run();

    db.transaction(() => {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS shadows_new (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                name              TEXT NOT NULL UNIQUE,
                description       TEXT,
                order_level       INTEGER DEFAULT 50,
                chaos_level       INTEGER DEFAULT 50,
                dream_level       INTEGER DEFAULT 0,
                pattern_influence TEXT CHECK(pattern_influence IN
                                    ('Pattern','Argent Refrain','Logrus','Mixed','None','Nexus')),
                corruption_status TEXT,
                is_starting_shadow BOOLEAN DEFAULT 0,
                created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Discover which optional columns exist in the old table
        const cols = db.prepare('PRAGMA table_info(shadows)').all().map(c => c.name);
        const hasCreatedAt = cols.includes('created_at');
        const hasUpdatedAt = cols.includes('updated_at');

        const insertCols = [
            'id','name','description','order_level','chaos_level','dream_level',
            'pattern_influence','corruption_status','is_starting_shadow',
            ...(hasCreatedAt ? ['created_at'] : []),
            ...(hasUpdatedAt ? ['updated_at'] : []),
        ].join(', ');

        const selectCols = [
            'id','name','description','order_level','chaos_level','0',
            `CASE pattern_influence
                WHEN 'First Pattern'  THEN 'Pattern'
                WHEN 'Corwin Pattern' THEN 'Argent Refrain'
                ELSE COALESCE(pattern_influence, 'None')
             END`,
            'corruption_status','is_starting_shadow',
            ...(hasCreatedAt ? ['created_at'] : []),
            ...(hasUpdatedAt ? ['updated_at'] : []),
        ].join(', ');

        db.prepare(`INSERT INTO shadows_new (${insertCols}) SELECT ${selectCols} FROM shadows`).run();

        db.prepare('DROP TABLE shadows').run();
        db.prepare('ALTER TABLE shadows_new RENAME TO shadows').run();

        console.log('  + Rebuilt shadows table with dream_level and updated CHECK constraint');
    })();

    db.prepare('PRAGMA foreign_keys = ON').run();
    console.log('Migration complete.');
}

migrate();
