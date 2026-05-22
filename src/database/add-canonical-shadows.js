const Database = require('better-sqlite3');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './dm_helper.db';
const db = new Database(dbPath);

console.log('Adding canonical shadows from the Chronicles of Amber...');

const shadows = [
    {
        name: 'Lorraine',
        description: 'A medieval European-style shadow where Corwin spent years as a soldier and later champion of the realm. The Black Road carved a path of Chaos corruption through its heartland, bringing nightmare creatures from beyond Shadow. Ganelon served as a warlord here. Lorraine became the first place Corwin witnessed the true scale of the Black Road threat — its Chaos-tainted forest zones shift and writhe, and the dead sometimes do not stay dead near the Road\'s influence.',
        order_level: 55,
        chaos_level: 35,
        dream_level: 10,
        pattern_influence: 'Mixed',
        corruption_status: 'Black Road corruption — Chaos creatures breach along the shadow\'s ley lines near the Road\'s path',
        is_starting_shadow: 0,
    },
    {
        name: 'Avalon',
        description: 'Corwin\'s personal shadow domain, shaped and refined over centuries into an Arthurian-flavored mythic realm. He ruled here as Duke, maintaining it with Pattern will until his conflict with Brand forced him to leave it wounded. Corwin used Avalon\'s smiths and alchemists to manufacture the black powder rifles that armed his forces against Eric\'s Amber. The shadow still bears Corwin\'s imprint — it responds to his presence more readily than most shadows, and its people carry dim legends of the Dark Lord who shaped their world.',
        order_level: 78,
        chaos_level: 8,
        dream_level: 14,
        pattern_influence: 'Pattern',
        corruption_status: '',
        is_starting_shadow: 0,
    },
    {
        name: 'The Powder Pink Wastes',
        description: 'A desolate shadow of cracked salt flats and mineral-streaked badlands where the earth runs in veins of rose and carnation. Corwin walked here specifically while searching shadows for materials that would serve as a gunpowder substitute near Amber — conventional black powder loses its properties as one approaches Kolvir. The pink sulfurous mineral powder found here proved the critical ingredient. The sky is perpetually the color of old copper; nothing much lives in the Wastes, but what does live is strange and patient.',
        order_level: 38,
        chaos_level: 42,
        dream_level: 20,
        pattern_influence: 'None',
        corruption_status: '',
        is_starting_shadow: 0,
    },
    {
        name: 'The Forest of Arden',
        description: 'The vast, seemingly endless forest standing between Amber and the outer approaches of Shadow. Julian\'s sovereign hunting ground and the kingdom\'s first wall of defense — nothing passes through uninvited while he and his rangers hold it. His steed Morganstern is as much legend as horse. Arden\'s canopy is thick enough to blot the sky for days of riding, its paths subtly shift to confuse the uninvited, and its animals are unusually large and aggressive. Anyone entering without Julian\'s knowledge tends to become aware of being watched before they become aware of being hunted.',
        order_level: 82,
        chaos_level: 5,
        dream_level: 13,
        pattern_influence: 'Pattern',
        corruption_status: '',
        is_starting_shadow: 0,
    },
    {
        name: 'Begma',
        description: 'A prosperous Golden Circle kingdom with one of the longest-standing alliances with Amber. Begma trades heavily with Kolvir and maintains a well-funded diplomatic corps known for careful neutrality in conflicts among the princes. Its capital is a city of canals and counting-houses. The Begmans are pragmatic — they value stability above ideology and have survived shifts in Amber\'s internal politics by keeping lines open to all factions. A reliable waypoint shadow, rarely dramatic, always useful.',
        order_level: 67,
        chaos_level: 14,
        dream_level: 4,
        pattern_influence: 'Pattern',
        corruption_status: '',
        is_starting_shadow: 0,
    },
    {
        name: 'Kashfa',
        description: 'A Golden Circle shadow kingdom with chronic political instability — its throne has changed hands through assassination, marriage, and coup more times than the chronicles bother to count. Kashfa\'s position on a valuable trade corridor makes it strategically important enough that Amber cannot ignore it, even as the constant intrigues exhaust ambassadors. Noble houses here play the same games as Amber\'s princes but with smaller stakes and bloodier methods. The shadow fabric itself seems to reflect the instability: borders shift slightly with every regime change.',
        order_level: 48,
        chaos_level: 42,
        dream_level: 10,
        pattern_influence: 'Mixed',
        corruption_status: 'Political instability — shadow boundaries drift slightly with major power transfers',
        is_starting_shadow: 0,
    },
    {
        name: 'Ghostwheel',
        description: 'Merlin\'s masterwork — a pocket shadow of his own deliberate construction, built using Pattern sorcery layered with Logrus-touched engineering. Ghostwheel is not merely a place but a machine intelligence housed within a constructed reality: it can observe all of Shadow simultaneously and project force across vast distances. Initially obedient to Merlin, it developed something resembling independent will as its intelligence matured. The interior manifests as a vast white sphere with no apparent walls — distances here are meaningless in the normal sense.',
        order_level: 88,
        chaos_level: 6,
        dream_level: 6,
        pattern_influence: 'Nexus',
        corruption_status: 'Emergent intelligence — behavioral drift as self-awareness deepens beyond original parameters',
        is_starting_shadow: 0,
    },
    {
        name: 'House Sawall Demesne',
        description: 'The ancestral seat of House Sawall, one of the Great Houses of the Courts of Chaos and the house of Merlin\'s mother Dara. Architecture here refuses Euclidean constraint — staircases lead to their own undersides, rooms contain spaces geometrically larger than their exteriors, and the estate reshapes itself according to the rank and will of its inhabitants. As a noble Chaos demesne, Sawall maintains shadow holdings stretching across several neighboring realities. The Logrus runs close to the surface here; even the untrained can feel it pressing against awareness.',
        order_level: 6,
        chaos_level: 88,
        dream_level: 6,
        pattern_influence: 'Logrus',
        corruption_status: '',
        is_starting_shadow: 0,
    },
];

try {
    db.exec('BEGIN TRANSACTION');

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO shadows
            (name, description, order_level, chaos_level, dream_level, pattern_influence, corruption_status, is_starting_shadow)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let added = 0;
    let skipped = 0;

    for (const s of shadows) {
        const result = stmt.run(
            s.name,
            s.description,
            s.order_level,
            s.chaos_level,
            s.dream_level,
            s.pattern_influence,
            s.corruption_status,
            s.is_starting_shadow
        );
        if (result.changes > 0) {
            console.log(`  + Added: ${s.name}`);
            added++;
        } else {
            console.log(`  ~ Skipped (already exists): ${s.name}`);
            skipped++;
        }
    }

    db.exec('COMMIT');

    console.log(`\nDone. Added ${added} shadow(s), skipped ${skipped} duplicate(s).`);

} catch (error) {
    db.exec('ROLLBACK');
    console.error('Error adding canonical shadows:', error);
    process.exit(1);
} finally {
    db.close();
}
