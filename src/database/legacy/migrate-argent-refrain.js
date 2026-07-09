const { getDatabase } = require('./connection');

// Updates the live Argent Refrain pattern record with:
// - spirit_animal: Morrí (The Crow)
// - spirit_animal_role: liminal
// - also_known_as: includes Silver Road and legacy names
// - spirit_animal section: full Morrí lore (DM notes + player content)
// - secrets section: full DM lore for Morrí
// - mechanics section: updated name reference
// Run once: node src/database/migrate-argent-refrain.js

function migrate() {
    const db = getDatabase();

    const pattern = db.prepare(
        "SELECT id, name FROM primal_patterns WHERE origin_figure = 'Corwin of Amber'"
    ).get();

    if (!pattern) {
        console.log('No pattern found with origin_figure = "Corwin of Amber". Aborting.');
        return;
    }

    console.log(`Found pattern: "${pattern.name}" (id=${pattern.id})`);

    db.prepare(`
        UPDATE primal_patterns
        SET spirit_animal      = 'Morrí (The Crow)',
            spirit_animal_role = 'threshold',
            also_known_as      = 'The Silver Road, Corwin''s Pattern, The New Pattern, The Shadow Pattern',
            updated_at         = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(pattern.id);
    console.log('  Updated pattern meta (spirit_animal, spirit_animal_role, also_known_as).');

    const spiritSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'spirit_animal'"
    ).get(pattern.id);

    if (spiritSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET title          = 'Morrí — The Crow',
                content        = ?,
                player_content = ?,
                updated_at     = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            `MORRÍ — THE CROW
The primal being woven into the Argent Refrain's first line.

THE FORGOTTEN THIRD
Before the Serpent coiled the first Chaos, before the Unicorn traced the Pattern, a crow sat on the branch of the First Tree. It watched. It remembered. It did not choose Order. It did not choose Chaos. It chose freedom.

When the Serpent and Unicorn accepted their cosmic roles, the Crow refused. It flew into the shadows between realities — into the dreams of sleeping gods, into the hearts of mortals who refused their fates. It became the first dreamwalker. The first psychopomp. The first rebel. The first witness. And it waited for someone who would choose the third path. It found Corwin.

THE COSMOLOGICAL TRIAD
Pattern (Amber)   | Unicorn           | Order, lineage, destiny
Logrus (Chaos)    | The Serpent       | Chaos, recursion, infinite possibility
Argent Refrain    | Morrí (The Crow)  | Choice, rebellion, liminality

ROLE IN THE INSCRIPTION
The crow that shadowed Corwin during his wounded journey did not do so by accident. Morrí recognized a kindred spirit — a being who would refuse both Order and Chaos, who would carve a third axis of reality through suffering and defiance. Its final act — allowing Corwin to eat it — was not death. It was transference. A primal being giving its essence to a mortal so he could create a new reality. The Crow's life-force is woven into the Refrain's first line.

PERSONALITY
Sarcastic. Dry humor. World-weary. Loyal to those who deserve it. Sharp-tongued. Compassionate beneath the snark. Hates bullies. Hates tyrants. Loves stories. Remembers everything. Sees through lies instantly. Speaks in riddles when annoyed. Blunt when it matters.

POWERS — WAKING WORLD
- Appears as a literal crow; can vanish into shadow
- Can guide initiates through dangerous shadows
- Can sense death, fate, and betrayal; can deliver omens
- Can mimic voices
- Can temporarily animate corpses (rare, dramatic — reserved for moments of high consequence)

POWERS — THE DREAMING
- Takes on a larger, raven-like form and speaks fluently
- Can enter any dream; can guide souls; can retrieve lost memories
- Can confront nightmares; can deliver messages across realms
- Can appear to sleeping Argent Refrain initiates as a guide or warning

RELATIONSHIP TO THE UNICORN AND SERPENT
Unicorn: Respects her, but thinks she is too rigid.
Serpent: Fears him a little, but mocks him constantly.
Crow: "I'm not here to rule. I'm here to remind."

A crow appears near the Argent Refrain site from time to time. Whether it is the same crow, an echo, or a manifestation of the Refrain itself is unknown — but it watches. It remembers.`,
            `Every Pattern is bound to a primal animal.

During Corwin's wounded journey to the place where he inscribed the Argent Refrain, a crow followed him for days — keeping him awake, feeding him, giving him warmth. When Corwin began the inscription, the crow died. Its essence was woven into the Pattern's first line.

The crow is not a normal animal. It appears near the Argent Refrain site on occasion. It has been seen in the dreams of those who have walked the Refrain.

Those who know the old stories call it Morrí — a being that chose freedom when the other primal forces chose their cosmic roles. It is said to be the patron of those who refuse their fate, the guide of those who walk a third path.

It remembers everything. It watches.

Follow the crow.`,
            spiritSection.id
        );
        console.log('  Updated spirit_animal section content.');
    } else {
        console.log('  WARNING: spirit_animal section not found — skipping section update.');
    }

    const secretsSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'secrets'"
    ).get(pattern.id);

    if (secretsSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET content    = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            `THE CROW IS MORRÍ
Morrí is not merely a primal animal — it is a primal being that predates both the Unicorn and the Serpent. It refused cosmic roles when the others accepted them, spending uncounted ages in the spaces between realities, waiting for a champion who would choose the third path.

Corwin was not chosen at random. Morrí watched the Amber family for a long time. It chose Corwin precisely because of his rebellion, his willingness to suffer, his refusal to simply inherit power. In the same way Dworkin was the Unicorn's vessel, Corwin was the Crow's.

THE TRANSFERENCE
When Morrí allowed Corwin to eat it, this was a deliberate cosmological act. It gave its physical form so the Argent Refrain's first line could be inscribed with primal essence — not merely blood. This is why the Refrain has a depth and weight that a mortal's Pattern should not possess. Morrí is not dead; it is the Pattern. The Pattern is its new body.

THE NAME "MORRÍ"
Echoes: Morrígan (Irish fate-crows and battle), Morpheus (Dream), "morrow" (rebirth), "mori" (Latin: death). The name carries all of these resonances intentionally. The Crow does not volunteer its name — it must be learned or earned.

THE DREAMING ASPECT
Morrí can appear in dreams far from the Argent Refrain's physical location. This is how it first began contacting mortals in the long ages before Corwin. Characters deeply attuned to the Refrain may encounter Morrí in dreams before ever meeting it in the waking world. In the Dreaming it takes a larger, raven-like form — articulate, knowing, carrying the accumulated weight of watching the cosmos since before Order and Chaos separated.

THE PATRON OF THE WRONGED
Morrí is also the patron of those wronged by fate — those who died with unfinished business, those betrayed by the powerful, those who refused to stay dead. The Refrain's character as the underdog's power, the rebel's power, is tied directly to this. Characters who walk the Argent Refrain and carry genuine grievances may find Morrí takes a particular interest in them.

THE CROW'S PRICE — THE DREAMING SACRIFICE
To stabilize Corwin's creation, Morrí did something with permanent consequences: it bound part of the Dreaming itself — the primal layer of symbolic reality that predates both Pattern and Logrus — to the Argent Refrain.

This is why Deirdre is real. This is why dream-shadows near Deirdre are stable. Morrí paid for that stability with a piece of itself.

The consequences the players will never fully understand unless they dig deep:
- The Dreaming is now "tilted" toward the Argent Refrain. Dream entities — beings native to the Dreaming — know this. Some revere the Refrain. Others are actively hostile toward it, and by extension toward those who walk it.
- Morrí is changed by the sacrifice. The version that exists within the Refrain is different from what it was before — older, more anchored, simultaneously more powerful in dream-shadows and less free than it once was.
- Dream-shadows at the far edges of the Refrain's influence exist only because Morrí is constantly working to hold the Dreaming's bond to Corwin's creation. If Morrí were ever fully destroyed or the Refrain damaged, those far shadows would collapse.
- The Unicorn and Serpent are aware a third axis now exists. Neither knows yet what to do about it. The Unicorn is wary. The Serpent is watching.

RELATIONSHIP TO THE OTHER PRIMALS
Morrí respects the Unicorn but finds her too rigid. It fears the Serpent a little — and mocks him constantly. Its line: "I'm not here to rule. I'm here to remind."`,
            secretsSection.id
        );
        console.log('  Updated secrets section content.');
    } else {
        console.log('  WARNING: secrets section not found — skipping secrets update.');
    }

    const legendSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'legend'"
    ).get(pattern.id);

    const legendText = `When Corwin began to inscribe his new Pattern, the Crow came to him in the flesh.

It cawed at him,
pecked at him,
tempted him with rest,
taunted him with failure.

Some say it was trying to stop him.
Others say it was trying to keep him alive.
Still others claim it was fulfilling a duty older than the Serpent's coils.

But all agree on this:

When Corwin faltered,
when his strength failed,
when the new Pattern demanded more than mortal flesh could give,
the Crow made its choice.

It offered itself.

Corwin ate the Crow,
and the Crow entered him —
not as meat,
but as memory,
as will,
as the echo of a primal freedom older than Order or Chaos.

And with that strength,
Corwin finished the work.`;

    if (legendSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET player_content = ?,
                updated_at     = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(legendText, legendSection.id);
        console.log('  Updated legend section player content.');
    } else {
        const maxOrder = db.prepare(
            'SELECT MAX(section_order) as m FROM primal_pattern_sections WHERE pattern_id = ?'
        ).get(pattern.id).m ?? 0;
        db.prepare(`
            INSERT INTO primal_pattern_sections (pattern_id, section_key, title, content, player_content, section_order)
            VALUES (?, 'legend', 'The Legend of the Crow', null, ?, ?)
        `).run(pattern.id, legendText, maxOrder + 1);
        console.log('  Inserted legend section.');
    }

    const mechanicsSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'mechanics'"
    ).get(pattern.id);

    if (mechanicsSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET title          = 'Walking the Argent Refrain',
                content        = ?,
                player_content = ?,
                updated_at     = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            `THE THREE COSMIC POWERS — WHAT EACH GIVES

Pattern = Movement
The Pattern initiate walks through Shadow. They impose Order, choose their destination, navigate the gradient between Amber and Chaos. They are the navigator.

Logrus = Reach
The Logrus initiate stays still and extends. They search for objects, people, or energies; they pull things from Shadow; they anchor themselves in Chaos and let the world come to them. The Logrus is not a navigation tool — it is a reach, not a road. A Logrus initiate cannot shadow-walk. They need a focus, a target, or a guide.

Argent Refrain = Dream
The Argent Refrain initiate navigates dream-shadows — the perpendicular axis of reality, shaped by memory, story, emotion, and belief rather than by physics. They are the dreamer.

AN ARGENT REFRAIN INITIATE CAN:
- Walk through dream-shadows (the axis perpendicular to Order/Chaos)
- Sense the emotional, narrative, and symbolic layer of any shadow
- Shape the story-logic of dream-shadows (what feels true becomes true; physical law is secondary)
- Navigate by resonance — toward places that feel right, that call to memory or purpose
- Perceive the dream-history of a location: what was felt or believed there, not merely what happened
- Communicate with dream entities and those who exist between waking and sleep
- Operate with unusual clarity in dreams, and enter the dreams of others near the Refrain's influence

AN ARGENT REFRAIN INITIATE CANNOT (without mastery):
- Navigate Pattern-shadows the way a Pattern initiate does — dream-walking is a different motion entirely
- Extend tendrils through Shadow the way a Logrus initiate does
- Guarantee stability in far dream-shadows, which grow mutable and dangerous with distance from Deirdre

THE THREE-WAY CONTRAST
Power            | Mode      | Metaphor
Pattern    | Movement  | You walk; the world stays still
Logrus           | Reach     | You stay; the world comes to you
Argent Refrain   | Dream     | You dream; the world becomes what it means`,
            `Walking the Argent Refrain lets you slip through dream-shadows by moving between symbolic moments, finding the feeling of what you seek rather than its exact form.

— Morrí, on the subject:
"Listen close, featherless one. The Pattern bends Shadow to its walker. The Logrus claws through it like a beast through brush. But the Argent Refrain? Ah… that's a different song entirely.
You don't force anything. You follow the pull of meaning.
You slip between moments — a door here, a memory there, a dream that isn't yours but might as well be. You chase the feeling of what you want, and the Dreaming gives you something close enough to matter. Not perfect. Never perfect. But true in its own way.
Walk the Refrain, and you walk the places between stories. Just don't expect them to stay the same when you look away."

WHAT YOU CAN DO

Movement Through Dream-Shadows: Travel between dream-shadows by performing a symbolic transition (opening a door, crossing a threshold, stepping into a memory). Each transition moves you closer to the emotional or conceptual goal you seek.

Dream Navigation: Describe the feeling or concept you are pursuing. The GM sequences symbolic scenes you must navigate. Each scene may require Wisdom (Insight), Charisma (Persuasion), or Intelligence (Investigation) depending on its nature.

Dream Retrieval: Call an object, person, or information from the Dreaming. What arrives is symbolic — useful, but not exact. (Asking for a sword might give you a blade made of moonlight that cuts dreams but not steel.)

Dream Exit: At the end of a dream-sequence, step out into the waking world — possibly in a different Shadow if the dream-path supported that transition.

RISKS: Failure on key checks may result in becoming lost in a dream / gaining or losing memories / attracting dream-entities / emerging in an unintended Shadow / temporary confusion or altered personality traits.

AXIS ALIGNMENT: You are aligned with the Argent Refrain — a new, untested axis of Power. Pattern and Logrus effects may behave unpredictably around you.`,
            mechanicsSection.id
        );
        console.log('  Updated mechanics section content.');
    }

    const loreSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'lore'"
    ).get(pattern.id);

    if (loreSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET title      = 'Lore & History — The Three Axes',
                content    = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            `BEFORE THE ARGENT REFRAIN: TWO-AXIS REALITY

Canonically, the cosmos was a gradient:
  Amber (Order) → Shadow → Courts of Chaos

Everything existed on that single line. Stability meant proximity to Pattern; instability meant proximity to Logrus.

AFTER THE ARGENT REFRAIN: THREE-AXIS REALITY

The Argent Refrain introduced a perpendicular dimension — Dream. The cosmos is now three-dimensional:
  Order (Pattern) — Chaos (Logrus) — Dream (Argent Refrain)

Shadows are no longer on a line. They exist in a field. This changes everything about how reality is structured.

THE THREE SHADOW TYPES

Pattern Shadows: stable, logical, deterministic. Physical laws hold. Time is consistent. What you see is what is there.

Logrus Shadows: unstable, chaotic, mutable. Probability-driven. Time is fluid. What exists can be different tomorrow.

Dream-Shadows (Argent Refrain): symbolic, narrative-driven, shaped by memory and emotion. Near Deirdre they are almost real. Moving outward they become mutable, then surreal, then ephemeral. At the far edges they are dangerous — places where the story consumes the traveller if they lose their sense of self.

DEIRDRE AS THE ANCHOR OF DREAM

Just as Amber anchors Order and the Courts anchor Chaos, Deirdre anchors Dream. It is the most stable dream-shadow — as close to solid reality as the Refrain can produce. The price for this stability was paid by Morrí.

THE NEW STRUGGLE

This is not a war. It is a cosmic rebalancing.
Pattern fears the instability of dream-shadows bleeding into ordered shadow.
Logrus fears symbolic logic — a narrative coherence that resists pure chaos.
The Argent Refrain fears the collapse of dream-shadows at the far edges, far from Deirdre's stabilizing anchor.

Each power has something to lose. None can destroy the others without shattering the field that makes Shadow possible.`,
            loreSection.id
        );
        console.log('  Updated lore section content.');
    } else {
        console.log('  WARNING: lore section not found — skipping lore update.');
    }

    // Walking section — insert if missing, update if present
    const walkingSection = db.prepare(
        "SELECT id FROM primal_pattern_sections WHERE pattern_id = ? AND section_key = 'walking'"
    ).get(pattern.id);

    const walkingDM = `THE WALK — NARRATIVE, NOT GEOMETRY

The Refrain is not a maze. It is a story.

Pattern = geometry (a path you follow with discipline and will)
Logrus = chaos (a gauntlet you survive by force and endurance)
Refrain = narrative (a story you survive by choice and identity)

Walking the Refrain means entering a dream, confronting symbolic truths, facing memories (your own or others'), navigating archetypes, and making choices that define your identity. It is not a path you follow. It is a story you survive.

THE VEILS
Pattern veils test memory — they strip away distraction and force the walker to hold their sense of self against the Pattern's pressure.

Refrain veils are decision points. At each veil, the walker must do one of:
- choose between two symbolic paths
- confront a fear
- reject a false identity
- accept a truth
- sacrifice something
- refuse a destiny

Each choice shapes the walker, their dream-shadow resonance, and their future dreamwalking ability. The number and nature of veils scales with the DM's intent for the scene.

THE DANGER
The danger is not physical — it is psychological. If you fail:
- you may be trapped in a dream
- you may lose memories
- you may gain memories that aren't yours
- you may become a dream-shadow of yourself
- you may awaken changed
- you may not awaken at all

THE FINAL REALIZATION
Pattern: "I can walk through Shadow."
Logrus: "I can reach through Shadow."
Refrain: "I can walk through Dreams."

The walker emerges with dreamwalking ability, symbolic insight, a connection to Morrí, a resonance with Deirdre, and the ability to navigate dream-shadows.

MORRÍ'S ROLE DURING THE WALK
Just as the Unicorn appears to Pattern initiates in moments of crisis, and the Serpent appears to Logrus initiates in moments of madness, Morrí appears when the walker is about to lose themselves.

But Morrí does not save them. Morrí offers a choice. And the walker must choose correctly.

This is the Crow's influence: identity through choice, not destiny.`;

    const walkingPlayer = `The world around you softens — not blurring, but loosening, like a painting whose edges have begun to breathe. You feel the Argent Refrain humming beneath your thoughts, a silver-bright thread tugging at your awareness.

A door appears. It wasn't there a moment ago. It doesn't belong here. It belongs to the feeling you're holding.

A memory of a childhood bedroom? A fear you've never spoken aloud? A longing you barely admit to yourself?

The door matches that emotion. When you open it, you step not into another Shadow, but into a moment — someone's dream, or a memory, or a symbolic echo of what you seek.

The scene shifts as you move:
  a hallway becomes a forest
  a forest becomes a train station
  a train station becomes a battlefield made of paper and ink

Each transition pulls you closer to the emotional truth of your destination.

You do not walk in straight lines. You walk in meaning.

And when you reach the place you need — or the idea of it — the Dreaming lets you step back into the waking world.

Changed. Or having changed something else.`;

    if (walkingSection) {
        db.prepare(`
            UPDATE primal_pattern_sections
            SET title          = 'The Walk — Surviving the Story',
                content        = ?,
                player_content = ?,
                section_order  = 4,
                updated_at     = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(walkingDM, walkingPlayer, walkingSection.id);
        console.log('  Updated walking section.');
    } else {
        db.prepare(`
            INSERT INTO primal_pattern_sections
                (pattern_id, section_key, title, content, player_content, section_order)
            VALUES (?, 'walking', 'The Walk — Surviving the Story', ?, ?, 4)
        `).run(pattern.id, walkingDM, walkingPlayer);
        console.log('  Inserted walking section.');
    }

    // Fix section ordering: lore=5, legend=6, secrets=7
    db.prepare(
        "UPDATE primal_pattern_sections SET section_order=5, updated_at=CURRENT_TIMESTAMP WHERE pattern_id=? AND section_key='lore'"
    ).run(pattern.id);
    db.prepare(
        "UPDATE primal_pattern_sections SET section_order=6, updated_at=CURRENT_TIMESTAMP WHERE pattern_id=? AND section_key='legend'"
    ).run(pattern.id);
    db.prepare(
        "UPDATE primal_pattern_sections SET section_order=7, updated_at=CURRENT_TIMESTAMP WHERE pattern_id=? AND section_key='secrets'"
    ).run(pattern.id);
    console.log('  Fixed section ordering (lore=5, legend=6, secrets=7).');

    console.log('Migration complete.');
}

migrate();
