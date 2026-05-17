const { getDatabase } = require('./connection');

function migrate() {
    const db = getDatabase();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS primal_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            also_known_as TEXT,
            origin_figure TEXT,
            spirit_animal TEXT,
            spirit_animal_role TEXT DEFAULT 'unknown',
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS primal_pattern_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_id INTEGER NOT NULL REFERENCES primal_patterns(id) ON DELETE CASCADE,
            section_key TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            player_content TEXT,
            section_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS character_pattern_lore (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            section_id INTEGER NOT NULL REFERENCES primal_pattern_sections(id) ON DELETE CASCADE,
            granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(character_id, section_id)
        )
    `).run();

    console.log('Primal patterns tables created.');

    const count = db.prepare('SELECT COUNT(*) as n FROM primal_patterns').get().n;
    if (count > 0) {
        console.log('Patterns already seeded, skipping.');
        console.log('Migration complete.');
        return;
    }

    const insertPattern = db.prepare(`
        INSERT INTO primal_patterns (name, also_known_as, origin_figure, spirit_animal, spirit_animal_role, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertSection = db.prepare(`
        INSERT INTO primal_pattern_sections (pattern_id, section_key, title, content, player_content, section_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // ── The Pattern of Amber ──
    const p1 = insertPattern.run(
        'The Pattern of Amber',
        'The Pattern, The Great Pattern, The First Pattern',
        'Dworkin Barimen',
        'The Unicorn',
        'mother',
        1
    );
    insertSection.run(p1.lastInsertRowid, 'origin', 'Origin & Creation',
        'Dworkin Barimen traced the Pattern in the Eye of the Serpent — a jewel of immense power taken from the Courts of Chaos. The act defined Order itself, creating the first stable shadow and anchoring reality against the infinite flux of the Logrus. Dworkin\'s bloodline became bound to the Pattern, granting his descendants the ability to walk it and travel through Shadow.',
        'The Pattern was inscribed by Dworkin Barimen in the depths of Amber. Walking the Pattern aligns the walker with Order and grants the ability to travel through Shadow.',
        1
    );
    insertSection.run(p1.lastInsertRowid, 'spirit_animal', 'The Unicorn',
        'The Unicorn is the primal animal bound to the Pattern — perhaps its mother, perhaps its guardian, perhaps its embodiment of pure Order. She appeared to Corwin during the final battle and intervened in ways no mortal could, suggesting a will and purpose beyond simple symbolism. Some theorize the Unicorn and the Pattern share a soul: that to walk the Pattern is, in some sense, to walk through the Unicorn herself.',
        'The Unicorn is a sacred creature to Amber, considered a divine messenger of Order. She has appeared at pivotal moments in the history of the Pattern and is believed to be intimately tied to its power.',
        2
    );
    insertSection.run(p1.lastInsertRowid, 'mechanics', 'Walking the Pattern',
        'The Pattern can be walked by those of Amber blood. Successful completion grants shadow travel and mental discipline. Logrus initiates suffer pain and disorientation near the Pattern. The Pattern can be used to summon an image of itself in shadow, allowing remote use of its power. Damage to the Pattern (e.g. Corwin\'s blood) weakens shadow barriers.',
        'Those with Amber blood can walk the Pattern. Completing the walk grants the ability to travel through Shadow at will. The Pattern and the Logrus are opposing forces — proximity to one harms initiates of the other.',
        3
    );
    insertSection.run(p1.lastInsertRowid, 'lore', 'Lore & History',
        'The Pattern has been damaged at least once, by Corwin\'s blood spilled upon it. The Jewel of Judgment is attuned to the Pattern, and its full power requires an Amberite to attune themselves by walking the Pattern while holding the Jewel. The Pattern\'s location in Amber is its anchor point but it can project influence across all of Shadow.',
        null,
        4
    );
    insertSection.run(p1.lastInsertRowid, 'secrets', 'DM Secrets',
        'The Unicorn and the Serpent were once one — the original being that existed before the split into Pattern and Logrus. The Eye of the Serpent (Jewel of Judgment) is the crystallized point where that original being divided itself. Dworkin may not have "created" the Pattern so much as been used as a vessel by the Unicorn to establish Order against the encroachment of Chaos. The Unicorn chose the Barimen line deliberately.',
        null,
        5
    );

    // ── The Logrus ──
    const p2 = insertPattern.run(
        'The Logrus of Chaos',
        'The Logrus, The Serpent\'s Path, The Primal Chaos',
        'The Serpent',
        'The Serpent',
        'embodiment',
        2
    );
    insertSection.run(p2.lastInsertRowid, 'origin', 'Origin & Creation',
        'The Logrus is the primal power of Chaos — older than the Pattern, or perhaps its twin, depending on which side tells the tale. It is maintained by the Serpent itself, a being of mythic scale whose eye (the Jewel of Judgment) was taken by Dworkin to inscribe the Pattern. The Logrus exists at the center of the Courts of Chaos; those who would wield its power must navigate its shifting, ever-changing tendrils.',
        'The Logrus is the primal power of Chaos, housed in the Courts. Those who walk it gain the ability to extend their will through Shadow in ways the Pattern cannot match — reaching across vast distances to retrieve or manipulate objects and people.',
        1
    );
    insertSection.run(p2.lastInsertRowid, 'spirit_animal', 'The Serpent',
        'Unlike the Pattern\'s Unicorn — a separate being who embodies Order — the Serpent may be the Logrus itself given form. The Serpent is the father of Chaos, the source of the Logrus\'s power, and the original owner of the Eye. It does not appear to mortals often, but those who walk the Logrus walk something that is, in a sense, alive and aware. The Serpent watches.',
        'The Serpent is a being of immense power tied to the Courts of Chaos. It is considered the father of the Logrus and is not merely symbolic — the Serpent is believed to be a living presence within Chaos itself.',
        2
    );
    insertSection.run(p2.lastInsertRowid, 'mechanics', 'Walking the Logrus',
        'The Logrus is walked by those of Chaos blood. It is significantly more dangerous than the Pattern — many initiates do not survive. Successful completion grants the ability to extend Logrus tendrils through Shadow to retrieve objects or people. Advanced mastery allows greater manipulation and projection. Logrus wielders experience sanity strain and disorientation near the Pattern.',
        'The Logrus is walked by those with Chaos blood. It is dangerous but grants the ability to reach through Shadow: retrieving objects, projecting force, and sensing across great distances. The cost is mental strain and a fundamental opposition to the Pattern.',
        3
    );
    insertSection.run(p2.lastInsertRowid, 'lore', 'Lore & History',
        'The Logrus predates Amber as a concept, or at least so the Courts claim. The war between Pattern and Logrus is the defining conflict of the Amber cosmos. Logrus initiates and Pattern walkers are natural enemies at a metaphysical level, though individuals can and do cooperate — it is the powers themselves that conflict, not necessarily their wielders.',
        null,
        4
    );
    insertSection.run(p2.lastInsertRowid, 'secrets', 'DM Secrets',
        'The Serpent is not malevolent — it is simply the other half of the original being. The conflict between Pattern and Logrus may be a false dichotomy imposed by those who benefit from the war continuing. The Serpent knows exactly where the Jewel of Judgment is at all times, and has allowed events to proceed for its own reasons. It is waiting for something — possibly a reunification that neither Amber nor the Courts would willingly allow.',
        null,
        5
    );

    // ── Corwin's Pattern ──
    const p3 = insertPattern.run(
        "Corwin's Pattern",
        "The New Pattern, The Shadow Pattern, The Pattern of Corwin",
        "Corwin of Amber",
        "Unknown — perhaps the Crow",
        'unknown',
        3
    );
    insertSection.run(p3.lastInsertRowid, 'origin', 'Origin & Creation',
        'Corwin inscribed his own Pattern in a distant shadow, using his own blood to fuel the inscription after being grievously wounded. The act was unprecedented — a Pattern created not by a Dworkin-level power but by a Prince of Amber acting on instinct and desperation. Its implications are still unfolding. It may represent a new axis of Order, independent of both Amber\'s Pattern and the Jewel of Judgment.',
        'A new Pattern was inscribed by Corwin in a distant shadow. It is functional — characters who walk it gain the ability to travel Shadow — but its full implications and relationship to the original Pattern are unknown.',
        1
    );
    insertSection.run(p3.lastInsertRowid, 'spirit_animal', 'The Primal Animal — The Crow?',
        'Every Pattern appears bound to a primal animal: Amber\'s to the Unicorn, the Logrus to the Serpent. What primal animal is bound to Corwin\'s Pattern?\n\nThe Crow theory: During Corwin\'s wounded journey to the place where he inscribed the Pattern, a crow shadowed him for days — feeding him, keeping him awake, giving him warmth. At the moment Corwin began the inscription, the crow died, its life-force bleeding into the Pattern\'s foundation. If true, the Crow is the blood-price of the new Pattern, woven into its first line.\n\nAlternate theories: The Unicorn again (Order recognizing its own); Corwin himself (a mortal who became something more in the act); nothing yet (a Pattern that has not yet found or created its primal being).\n\nThe Crow appears occasionally near the Pattern site. Whether it is the same crow, an echo, or a manifestation of the Pattern itself is unknown.',
        null,
        2
    );
    insertSection.run(p3.lastInsertRowid, 'mechanics', "Walking Corwin's Pattern",
        'The mechanics are presumably identical to the original Pattern. However, it may grant travel specifically through shadows adjacent to its location rather than the full shadow-travel of Amber\'s Pattern. Characters who walk it gain a Pattern imprint tied to Corwin\'s lineage rather than Dworkin\'s original. The long-term metaphysical consequences of two competing Patterns in the same cosmos are not yet understood.',
        "Walking Corwin's Pattern grants the same fundamental abilities as Amber's Pattern. Its range and relationship to specific shadows may differ from the original. Characters who walk it are aligned with a newer, less-tested axis of Order.",
        3
    );
    insertSection.run(p3.lastInsertRowid, 'lore', 'Lore & History',
        'The existence of a second Pattern changes everything. If one Prince can create a Pattern, others could theoretically do the same — given sufficient power, blood, and will. The political implications for Amber and the Courts are seismic. Neither side knows quite how to respond. Corwin himself may not fully understand what he has done or what it will mean for the long-term structure of reality.',
        null,
        4
    );
    insertSection.run(p3.lastInsertRowid, 'secrets', 'DM Secrets',
        "The Crow is real — it fed Corwin during his wounded journey, and its life-force is woven into the Pattern's foundation at the first inscription point. It is the primal animal of Corwin's Pattern, though no one knows this yet. A crow (or crows) appears near the Pattern site from time to time. Characters who are deeply attuned to Corwin's Pattern may sense a presence — watchful, patient, not hostile. The Crow can serve as a messenger or omen from the Pattern itself, appearing at moments of significance. It remembers everything that Corwin went through to inscribe the Pattern.",
        null,
        5
    );

    console.log('Seeded 3 canonical primal patterns with sections.');
    console.log('Migration complete.');
}

migrate();
