const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Initializing claim point pools for existing characters...');

try {
    // Get all characters that don't have a claim pool yet
    const charactersWithoutPool = db.prepare(`
        SELECT c.id, c.name
        FROM characters c
        LEFT JOIN claim_point_pools cpp ON c.id = cpp.character_id
        WHERE cpp.character_id IS NULL
    `).all();

    console.log(`Found ${charactersWithoutPool.length} characters without claim pools`);

    if (charactersWithoutPool.length > 0) {
        const insertStmt = db.prepare(`
            INSERT INTO claim_point_pools (character_id, total_points, spent_points)
            VALUES (?, ?, ?)
        `);

        db.exec('BEGIN TRANSACTION');

        try {
            for (const char of charactersWithoutPool) {
                insertStmt.run(char.id, 10, 0); // Start with 10 points
                console.log(`✓ Initialized claim pool for ${char.name} (ID: ${char.id}) with 10 points`);
            }

            db.exec('COMMIT');
            console.log(`\n✅ Successfully initialized ${charactersWithoutPool.length} claim pools!`);
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    } else {
        console.log('All characters already have claim pools initialized.');
    }

} catch (error) {
    console.error('Error initializing claim pools:', error);
    process.exit(1);
} finally {
    db.close();
}
