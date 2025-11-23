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
    // Seed Shadows
    const insertShadow = db.prepare(`
        INSERT INTO shadows (name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const shadows = [
        ['Amber (Kolvir)', 'The eternal city, seat of the true Pattern', 100, 0, 'First Pattern', '', 0],
        ['The Courts of Chaos', 'The realm of the Logrus, opposite to Amber', 0, 100, 'Logrus', '', 0],
        ['The Soul Realm', 'An elven shadow near Kolvir, corrupted by the First Pattern and Logrus. Magic users draw Order from beings, creating chaos imbalance.', 60, 40, 'Mixed', '', 1],
        ['Billabong\'s Veil', 'A marsupial shadow where the Djunkai rejected technology after the Mallee Wraith AI disaster. Known for biological abilities and ultrasonic healing.', 55, 45, 'Corwin Pattern', '', 1],
        ['Shadow Earth', 'A shadow similar to our world, where Corwin once dwelt', 50, 50, 'First Pattern', '', 0],
        ['Deidre', 'The first shadow of Corwin\'s Pattern, named in memory of his sister. A noir-tinged reflection of Amber - eternal twilight casts long shadows across art deco spires. Jazz echoes through rain-slicked streets where neon signs flicker in shades of deep crimson and electric blue. The city pulses with a melancholic beauty, order maintained through a web of intrigue and shadowy alliances.', 95, 5, 'Corwin Pattern', '', 0],
        ['Rebma (First Pattern)', 'The underwater mirror of Amber, approached by descending Faiella-bionin\'s grand staircase. A reflection of Kolvir beneath the waves, where everything is reversed and the Pattern runs backward. Ruled by Queen Moire, Rebma serves as both sanctuary and prison.', 98, 2, 'First Pattern', '', 0],
        ['Tir-na Nog\'th (First Pattern)', 'The ghost city in the sky, appearing only on nights of the full moon. A reflection of Amber that floats ethereally above the clouds, reached by climbing an invisible stairway. Everything here exists in shades of silver and shadow, prophecy and memory intertwined. The Pattern here runs in reverse, showing possible futures.', 92, 8, 'First Pattern', 'Temporal instability - prophetic visions may bleed between timelines', 0],
        ['The Depths (Corwin Pattern)', 'Deidre\'s reflection beneath dark waters - not underwater like Rebma, but submerged in a sea of liquid shadow. Accessed through mirrors when rain falls in Deidre. Where Rebma is crystalline and bright, The Depths are obsidian and secretive. The reversed Pattern here pulses with deep indigo light, revealing truths that the surface world hides.', 90, 10, 'Corwin Pattern', '', 0],
        ['The Neon Spire (Corwin Pattern)', 'Deidre\'s ghost twin, manifesting during the new moon as an inverted reflection in the perpetual rain puddles. Where Tir-na Nog\'th is silver and ethereal, The Neon Spire is electric and vivid - a fever dream of what Deidre could become. The Pattern here runs in neon colors, crackling with possibility and forbidden futures. Those who walk it see not prophecy, but choices.', 88, 12, 'Corwin Pattern', 'Choice-flux - decisions made here ripple backward through probability', 0],
        ['The Keep of the Four Worlds', 'A unique nexus shadow where four distinct realities converge at precise geometric angles. The Keep itself stands at the exact center point, its architecture impossibly blending stone, crystal, shadow, and living matter - each quarter reflecting one of the four worlds it bridges. Masters of the Keep gain power rivaling Pattern or Logrus users by drawing on the convergence itself, manipulating the flow between realities without needing to walk either. This makes it a coveted prize and a dangerous responsibility - the Keep demands constant balance, or the four worlds will tear apart at the seams.', 50, 50, 'Nexus', 'Reality strain at convergence point - requires active management to maintain stability', 0]
    ];

    for (const shadow of shadows) {
        insertShadow.run(...shadow);
    }

    console.log(`Inserted ${shadows.length} starting shadows`);

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
