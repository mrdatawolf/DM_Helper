const shadows = [
    ['Amber (Kolvir)', 'The eternal city, seat of the true Pattern', 100, 0, 'Pattern', '', 0],
    ['The Courts of Chaos', 'The realm of the Logrus, opposite to Amber', 0, 100, 'Logrus', '', 0],
    ['The Soul Realm', 'An elven shadow near Kolvir, corrupted by the Pattern and Logrus. Magic users draw Order from beings, creating chaos imbalance.', 60, 40, 'Mixed', '', 1],
    ["Billabong's Veil", 'A marsupial shadow where the Djunkai rejected technology after the Mallee Wraith AI disaster. Known for biological abilities and ultrasonic healing.', 55, 45, 'Argent Refrain', '', 1],
    ['Shadow Earth', 'A shadow similar to our world, where Corwin once dwelt', 50, 50, 'Pattern', '', 0],
    ['Deidre', "The first shadow of Corwin's Pattern, named in memory of his sister. A noir-tinged reflection of Amber - eternal twilight casts long shadows across art deco spires. Jazz echoes through rain-slicked streets where neon signs flicker in shades of deep crimson and electric blue. The city pulses with a melancholic beauty, order maintained through a web of intrigue and shadowy alliances.", 95, 5, 'Argent Refrain', '', 0],
    ['Rebma (Pattern)', "The underwater mirror of Amber, approached by descending Faiella-bionin's grand staircase. A reflection of Kolvir beneath the waves, where everything is reversed and the Pattern runs backward. Ruled by Queen Moire, Rebma serves as both sanctuary and prison.", 98, 2, 'Pattern', '', 0],
    ["Tir-na Nog'th (Pattern)", 'The ghost city in the sky, appearing only on nights of the full moon. A reflection of Amber that floats ethereally above the clouds, reached by climbing an invisible stairway. Everything here exists in shades of silver and shadow, prophecy and memory intertwined. The Pattern here runs in reverse, showing possible futures.', 92, 8, 'Pattern', 'Temporal instability - prophetic visions may bleed between timelines', 0],
    ['The Depths (Argent Refrain)', "Deidre's reflection beneath dark waters - not underwater like Rebma, but submerged in a sea of liquid shadow. Accessed through mirrors when rain falls in Deidre. Where Rebma is crystalline and bright, The Depths are obsidian and secretive. The reversed Pattern here pulses with deep indigo light, revealing truths that the surface world hides.", 90, 10, 'Argent Refrain', '', 0],
    ['The Neon Spire (Argent Refrain)', "Deidre's ghost twin, manifesting during the new moon as an inverted reflection in the perpetual rain puddles. Where Tir-na Nog'th is silver and ethereal, The Neon Spire is electric and vivid - a fever dream of what Deidre could become. The Pattern here runs in neon colors, crackling with possibility and forbidden futures. Those who walk it see not prophecy, but choices.", 88, 12, 'Argent Refrain', 'Choice-flux - decisions made here ripple backward through probability', 0],
    ['The Keep of the Four Worlds', 'A unique nexus shadow where four distinct realities converge at precise geometric angles. The Keep itself stands at the exact center point, its architecture impossibly blending stone, crystal, shadow, and living matter - each quarter reflecting one of the four worlds it bridges. Masters of the Keep gain power rivaling Pattern or Logrus users by drawing on the convergence itself, manipulating the flow between realities without needing to walk either. This makes it a coveted prize and a dangerous responsibility - the Keep demands constant balance, or the four worlds will tear apart at the seams.', 50, 50, 'Nexus', 'Reality strain at convergence point - requires active management to maintain stability', 0]
];

const primalPatterns = [
    ['The Pattern of Amber', 'The Pattern, The Great Pattern, The First Pattern', 'Dworkin Barimen', 'The Unicorn', 'mother', 0, 'Pattern'],
    ['The Logrus of Chaos', "The Logrus, The Serpent's Path, The Primal Chaos", 'The Serpent', 'The Serpent', 'embodiment', 2, 'Pattern'],
    ['Argent Refrain', "The Silver Road, Corwin's Pattern, The New Pattern, The Shadow Pattern", 'Corwin of Amber', 'Morrí (The Crow)', 'threshold', 3, 'Pattern']
];
const primalPatternSections = require('./content/primal-pattern-sections');

function seed(db, campaignId) {
    const insertShadow = db.prepare(`
        INSERT OR IGNORE INTO shadows
            (name, description, order_level, chaos_level, pattern_influence, corruption_status, is_starting_shadow, campaign_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    if (db.prepare('SELECT count(*) AS count FROM shadows WHERE campaign_id = ?').get(campaignId).count === 0) {
        for (const shadow of shadows) insertShadow.run(...shadow, campaignId);
    }

    const insertPattern = db.prepare(`
        INSERT INTO primal_patterns
            (name, also_known_as, origin_figure, spirit_animal, spirit_animal_role, display_order, category, campaign_id)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM primal_patterns WHERE campaign_id = ? AND name = ?)
    `);
    if (db.prepare('SELECT count(*) AS count FROM primal_patterns WHERE campaign_id = ?').get(campaignId).count === 0) {
        for (const pattern of primalPatterns) insertPattern.run(...pattern, campaignId, campaignId, pattern[0]);
    }

    if (db.prepare('SELECT count(*) AS count FROM primal_pattern_sections WHERE campaign_id = ?').get(campaignId).count === 0) {
        const patternId = db.prepare('SELECT id FROM primal_patterns WHERE campaign_id = ? AND name = ?');
        const insertSection = db.prepare(`
            INSERT INTO primal_pattern_sections
                (pattern_id, section_key, title, content, player_content, section_order, campaign_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const section of primalPatternSections) {
            const pattern = patternId.get(campaignId, section.pattern_name);
            if (!pattern) throw new Error(`Missing Amber seed pattern: ${section.pattern_name}`);
            insertSection.run(pattern.id, section.section_key, section.title, section.content,
                section.player_content, section.section_order, campaignId);
        }
    }
}

module.exports = { seed, shadows, primalPatterns, primalPatternSections };
