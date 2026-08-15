// Adds creature-specific columns to npcs (role, order_chaos_value, influence —
// see Creature Index/TEMPLATE.md) and seeds the 8 creatures already written up
// in Creature Index/Billabongs Veil.md and Creature Index/Soul Realm.md.

const CREATURES = [
    {
        name: 'Gorvoth', shadow: "Billabong's Veil", role: 'Predator',
        order_chaos_value: 50, influence: 'None',
        armor_class: 13, hit_points: 60, alignment: 'Unaligned',
        description: 'Large bear-bodied jungle ambush predator with a kangaroo tail; mottled camouflage, bone-crushing jaws.',
        stats: {
            size_type: 'Large beast', speed: '40 ft.',
            abilities: { str: 18, dex: 12, con: 15, int: 2, wis: 12, cha: 7 },
            senses: 'darkvision 60 ft., passive Perception 11', languages: '—',
            challenge_rating: '3 (700 XP)',
            traits: [
                'Undergrowth Camouflage. The Gorvoth has advantage on Dexterity (Stealth) checks made to hide in jungle terrain, its mottled brown-and-green fur breaking up its outline against foliage.',
                'Bone-Crushing Jaws. A creature grappled by the Gorvoth takes 1d6 piercing damage at the start of each of its turns.'
            ],
            actions: [
                'Multiattack. The Gorvoth makes one bite attack and one claw attack.',
                'Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 15 (2d8 + 4) piercing damage.',
                'Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 4) slashing damage.'
            ],
            reactions: [],
            lore: [
                "Bear-bodied with a kangaroo's heavy tail, used both for balance mid-strike and as a weight-bearing \"tripod\" when rearing up to intimidate.",
                "Ambush predator by nature — the camouflage does the work before the fight starts, and a Gorvoth that's been spotted early will often disengage rather than press a losing chase.",
                'The Djunkai give Gorvoth territory a wide berth rather than trying to clear it; treated as a natural hazard to route around, not a monster to hunt.'
            ]
        }
    },
    {
        name: 'Korvath', shadow: "Billabong's Veil", role: 'Predator',
        order_chaos_value: 50, influence: 'None',
        armor_class: 14, hit_points: 45, alignment: 'Unaligned',
        description: 'Sleek panther/wallaby hybrid predator; iridescent camouflage, pounce-and-finish hunter.',
        stats: {
            size_type: 'Medium beast', speed: '50 ft.',
            abilities: { str: 15, dex: 18, con: 16, int: 3, wis: 13, cha: 8 },
            skills: 'Perception +3, Stealth +7',
            senses: 'darkvision 60 ft., passive Perception 13', languages: '—',
            challenge_rating: '2 (450 XP)',
            traits: [
                'Iridescent Camouflage. The Korvath has advantage on Dexterity (Stealth) checks made to hide in dim light or shadow.',
                'Pounce. If the Korvath moves at least 20 feet straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 14 Strength save or be knocked prone. If the target is prone, the Korvath can make one bite attack against it as a bonus action.'
            ],
            actions: [
                'Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.',
                'Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) slashing damage.'
            ],
            reactions: [],
            lore: [
                "Panther-bodied with a wallaby's spring in its hindquarters — Korvaths hunt by covering ground fast and low, then finishing with a single decisive pounce rather than a prolonged chase.",
                "Blue-green shimmering fur gives them near-total concealment in the Veil's dappled canopy light; most sightings are after the fact, from tracks or a kill.",
                'More dangerous to a lone traveler than a Gorvoth pound-for-pound, precisely because you rarely see it coming.'
            ]
        }
    },
    {
        name: 'Bulwurra', shadow: "Billabong's Veil", role: 'Ally',
        order_chaos_value: 50, influence: 'None',
        armor_class: 16, hit_points: 105, alignment: 'Unaligned',
        description: 'Massive armored rhino/opossum hybrid herbivore; gentle guardian ally of the Djunkai.',
        stats: {
            size_type: 'Large beast', speed: '40 ft.',
            abilities: { str: 20, dex: 10, con: 20, int: 4, wis: 14, cha: 9 },
            senses: 'passive Perception 12', languages: '—',
            challenge_rating: '5 (1,800 XP)',
            traits: [
                'Guardian Instinct. The Bulwurra has advantage on melee attack rolls against any creature that has damaged a Djunkai within the last minute.',
                'Trampling Charge. If the Bulwurra moves at least 20 feet straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 17 Strength save or be knocked prone. If the target is prone, the Bulwurra can make one stomp attack against it as a bonus action.'
            ],
            actions: [
                'Gore. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 23 (4d8 + 5) piercing damage.',
                'Stomp. Melee Weapon Attack: +8 to hit, reach 5 ft., one prone target. Hit: 27 (4d10 + 5) bludgeoning damage.'
            ],
            reactions: [],
            lore: [
                'Rhino-bodied with an opossum\'s tail; the thick armored hide that protects it from predators also makes it nearly impossible for the Djunkai to hurt by accident, which is part of why the relationship works.',
                'Herbivorous and genuinely gentle unless a Djunkai (or its own kin) is threatened — treat it as a living early-warning system and shield, not a mount or beast of burden, unless the campaign wants to introduce that relationship deliberately.',
                'Djunkai settlements near Bulwurra herds are considered safer than most; the animals will interpose themselves against predators like Gorvoth without being asked.'
            ]
        }
    },
    {
        name: 'Luminari', shadow: "Billabong's Veil", role: 'Pet',
        order_chaos_value: 50, influence: 'None',
        armor_class: 12, hit_points: 3, alignment: 'Unaligned',
        description: "Tiny bioluminescent mouse/sugar-glider hybrid kept as a pet and living lantern by the Djunkai; unrelated to the Soul Realm's Glimmerwings beyond the shared nickname.",
        stats: {
            size_type: 'Tiny beast', speed: "20 ft., fly 30 ft. (glide only — can't gain altitude)",
            abilities: { str: 2, dex: 16, con: 10, int: 3, wis: 12, cha: 10 },
            senses: 'darkvision 30 ft. (bioluminescent), passive Perception 11', languages: '—',
            challenge_rating: '0 (10 XP)',
            traits: [
                "Bioluminescent Fur. A Luminari's fur glows in response to ultrasonic frequencies. The color and pattern of the glow visibly signal its emotional/physiological state, and the light is bright enough to serve as a torch-equivalent light source in a 10-ft. radius.",
                "Ultrasonic Resonance. While within 5 feet of a Djunkai using an ultrasonic-based ability, the Luminari's resonance enhances that ability's effectiveness (DM's call on the exact bonus). Older, more-attuned individuals produce a stronger effect; attunement quality also varies by genetics.",
                "Glide. A Luminari can't gain altitude in flight, only glide, losing 5 feet of height for every foot moved horizontally unless it's climbed somewhere high first."
            ],
            actions: [
                'Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage.'
            ],
            reactions: [],
            lore: [
                'Mouse-bodied with a sugar glider\'s membrane, kept as pets by the Djunkai both for companionship and for their practical use as living lanterns on nighttime journeys.',
                "The resonance bond runs both directions: a Djunkai's ultrasonic communication is clearer and more effective with an attuned Luminari nearby, and the bond has been used for navigation, communication, and even rudimentary healing support in the field.",
                'Curious and playful rather than skittish — a Luminari that likes its bonded Djunkai will often glow steadily just from proximity, independent of any active ultrasonic use.'
            ]
        }
    },
    {
        name: 'Shadow Eater', shadow: 'The Soul Realm', role: 'Monster',
        order_chaos_value: 80, influence: 'Argent Refrain',
        armor_class: 17, hit_points: 135, alignment: 'Chaotic Neutral',
        description: "Sentient fiend created by Corwin's Pattern to cut Logrus corruption out of the Soul Realm; Order-born but hungers for Chaos.",
        stats: {
            size_type: 'Medium fiend', speed: '30 ft., fly 60 ft.',
            abilities: { str: 16, dex: 18, con: 14, int: 6, wis: 13, cha: 15 },
            damage_immunities: 'Poison',
            condition_immunities: 'Charmed, Frightened, Paralyzed, Petrified, Poisoned',
            senses: 'darkvision 60 ft., passive Perception 14',
            languages: 'understands all languages it can hear; telepathic communication with creatures of the same reality',
            challenge_rating: '8 (3,900 XP)',
            traits: [
                'Resonant Translocation. As a bonus action, the Shadow Eater can teleport up to 30 feet to an unoccupied space, moving through shadow itself to re-emerge elsewhere.'
            ],
            actions: [
                'Chaos Consumption. Melee Spell Attack: +5 to hit, reach 10 ft., one target. Hit: 13 (2d6 + 3) psychic damage, plus the Bite of Shadow effect below.',
                "Bite of Shadow. When Chaos Consumption hits, the Shadow Eater may consume a portion of the target's chaos, dealing an additional 1d8 force damage. If the target is a creature, it must succeed on a DC 15 Constitution save or become confused for 1 minute. If the target is an object, it becomes infused with a subtle shimmering quality, granting resistance to psychic damage for 1 hour."
            ],
            reactions: [
                'Reality Rend. When hit by an attack, the Shadow Eater can use its reaction to attempt a DC 15 Dexterity save. On success, the attacker must succeed on a DC 15 Constitution save or be teleported to a random location within 30 feet of the Shadow Eater.'
            ],
            lore: [
                'Shadow Eaters are not mindless predators — they are sentient, and they know exactly what they are: instruments of Corwin\'s Pattern, sent to cut the corruption out of this shadow before it spreads further. "I am a servant of the pattern, elf. My purpose is to maintain the harmony of Order."',
                'They genuinely believe they are restoring balance, not destroying it: "I do not destroy, I restore. The balance must be maintained." What they tear open with each bite exposes "something" beyond the world they\'re eating from — a glimpse of a deeper structure underlying all of shadow.',
                'Despite being agents of Order, they are drawn to Chaos like a craving they can\'t fully explain or resist — "I am drawn to the chaos that seeps into these worlds. It is a siren\'s call I cannot resist." This tension is the whole point of the creature and should read as unsettling rather than contradictory.',
                'A player who draws power from a Shadow Eater can do so, but the Chaos touching an agent of Order causes an explosion — a real mechanical/narrative hook, not just flavor.',
                'Good adventure seed: the party\'s first encounter should reveal, gradually, that the "monster" is intelligent, self-aware, and not evil — just executing a mandate they may come to sympathize with, oppose, or exploit.'
            ]
        }
    },
    {
        name: 'Eggari', shadow: 'The Soul Realm', role: 'Fae',
        order_chaos_value: 15, influence: 'Logrus',
        armor_class: 16, hit_points: 45, alignment: 'Chaotic Neutral',
        description: 'Winged serpentine beast born of chaotic energy; nests at Soul Realm nexus points and feeds on ambient chaos.',
        stats: {
            size_type: 'Medium beast', speed: '30 ft., fly 60 ft.',
            abilities: { str: 14, dex: 18, con: 16, int: 2, wis: 10, cha: 6 },
            damage_immunities: 'Poison',
            condition_immunities: 'Charmed, Frightened, Paralyzed, Petrified, Poisoned',
            senses: 'darkvision 60 ft., passive Perception 12',
            languages: 'understands Eggari clicks and chirps; telepathic communication with other Eggari',
            challenge_rating: '3 (700 XP)',
            traits: [
                'Chaos Attraction. Eggari sense disturbances of intense chaos — the aftermath of a powerful spell, a magical cataclysm — from up to 1 mile away.',
                'Nexus Lairs. Eggari seek out nexus points in the Soul Realm to build lairs, often along ley lines, where they can siphon accumulated chaotic energy over time.'
            ],
            actions: [
                'Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) piercing damage.',
                'Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 2) slashing damage.'
            ],
            reactions: [
                'Chaos Feeding. When within 5 feet of a nexus point or a concentrated area of chaos, an Eggari can make a DC 15 Wisdom (Perception) check to feed. On a success, it regains 10 hit points and gains advantage on its next attack roll.',
                "Social Behavior. Eggari don't cooperate, but they also don't fight each other over territory — they simply ignore one another unless directly competing for the same chaos-rich site."
            ],
            lore: [
                "Elevi legend holds that Eggari were once mere eggs, imbued with chaotic energy by the whims of the Soul Realm's ruling power, the Pattern. Over time the eggs hatched into the winged, serpentine creatures known today.",
                'As Eggari grew in power and number, they began sensing the disturbances caused by Elevi magic itself, drawn to concentrated chaos like moths to a flame.',
                "Unbeknownst to the Pattern or the Elevi, Eggari have a symbiotic relationship with the Soul Realm: by feeding on chaos at nexus points, they strengthen themselves and slowly increase in number — a natural consequence of the ruling power's continued extraction of Order from sentient beings.",
                'The Elevi regard Eggari with a kind of weary respect: solitary, inscrutable, but a genuine force of balance rather than a threat to be exterminated.'
            ]
        }
    },
    {
        name: 'Glimmerwing', shadow: 'The Soul Realm', role: 'Fae',
        order_chaos_value: 50, influence: 'None',
        armor_class: 15, hit_points: 7, alignment: 'Neutral',
        description: "Tiny iridescent fae also called \"Luminari\" locally; flits between light and dark on the fringes of Soul Realm settlements. Unrelated to Billabong's Veil's Luminari pet species beyond the shared name.",
        stats: {
            size_type: 'Tiny fey', speed: '10 ft., fly 40 ft. (hover)',
            abilities: { str: 2, dex: 20, con: 10, int: 8, wis: 14, cha: 16 },
            senses: 'darkvision 30 ft., passive Perception 12',
            languages: "Sylvan, understands Elevi but can't speak it",
            challenge_rating: '1/8 (25 XP)',
            traits: [
                'Light/Dark Affinity. A Glimmerwing can, as part of its movement, pass between areas of bright and dim light without provoking opportunity attacks, its crystalline body refracting to match the ambient light.',
                'Evasive Flight. A Glimmerwing has advantage on Dexterity saving throws against effects it can see coming.'
            ],
            actions: [
                'Dazzling Nip. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 1 piercing damage, and the target must succeed on a DC 12 Constitution save or be blinded until the end of its next turn as its crystalline body flares with refracted light.'
            ],
            reactions: [],
            lore: [
                'Small, iridescent, and mischievous rather than malevolent — Glimmerwings play tricks on travelers who stumble into their territory, but will aid the respectful and kind if approached properly.',
                'Delicate crystalline bodies, 6–12 inches long with wingspans up to 2 feet, refracting light into shifting colors as they move.'
            ]
        }
    },
    {
        name: 'Moonstalker', shadow: 'The Soul Realm', role: 'Fae',
        order_chaos_value: 50, influence: 'None',
        armor_class: 14, hit_points: 33, alignment: 'Neutral',
        description: 'Wolf-like nocturnal fae also called "Umbrari" locally; tied to lunar cycles and drawn to thin places between worlds.',
        stats: {
            size_type: 'Medium fey', speed: '50 ft.',
            abilities: { str: 15, dex: 17, con: 12, int: 6, wis: 15, cha: 10 },
            skills: 'Perception +4, Stealth +7',
            senses: 'darkvision 120 ft., passive Perception 14', languages: '—',
            challenge_rating: '2 (450 XP)',
            traits: [
                'Shadow Stealth. While in dim light or darkness, a Moonstalker can take the Hide action as a bonus action.',
                'Keen Hearing and Smell. The Moonstalker has advantage on Wisdom (Perception) checks that rely on hearing or smell.'
            ],
            actions: [
                'Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength save or be knocked prone.'
            ],
            reactions: [],
            lore: [
                'Wolf-like and fiercely independent, Moonstalkers rarely form bonds with anything, including each other, and are more often heard than seen.',
                'Deeply tied to lunar cycles; they actively seek out thin places between worlds, which makes them an occasional, involuntary early-warning sign that a shadow crossing point is nearby.',
                'Thick silver-gray fur that shimmers in moonlight; eyes that glow like moonstones in the dark.'
            ]
        }
    }
];

function up(db) {
    const npcCols = new Set(db.prepare('PRAGMA table_info(npcs)').all().map(c => c.name));
    if (!npcCols.has('role')) {
        db.prepare('ALTER TABLE npcs ADD COLUMN role TEXT').run();
    }
    if (!npcCols.has('order_chaos_value')) {
        db.prepare('ALTER TABLE npcs ADD COLUMN order_chaos_value INTEGER DEFAULT 50').run();
    }
    if (!npcCols.has('influence')) {
        db.prepare("ALTER TABLE npcs ADD COLUMN influence TEXT DEFAULT 'None'").run();
    }

    const findShadow = db.prepare('SELECT id FROM shadows WHERE name = ?');
    const findExisting = db.prepare('SELECT id FROM npcs WHERE name = ?');
    const insert = db.prepare(`
        INSERT INTO npcs (
            name, creature_type, shadow_id, armor_class, hit_points, stats,
            alignment, role, order_chaos_value, influence, description, is_important, is_spoiler
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);

    for (const c of CREATURES) {
        if (findExisting.get(c.name)) continue;

        const shadowRow = findShadow.get(c.shadow);
        insert.run(
            c.name,
            c.name,
            shadowRow ? shadowRow.id : null,
            c.armor_class,
            c.hit_points,
            JSON.stringify(c.stats),
            c.alignment,
            c.role,
            c.order_chaos_value,
            c.influence,
            c.description
        );
    }
}

module.exports = { up };
