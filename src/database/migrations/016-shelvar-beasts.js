// Seeds the six Shelvar beasts written up in Creature Index/Shelvar.md
// (converted from Samples/Shorven_Beasts.md) as NPCs in campaign 1.
// There is no "Shelvar" shadow in the database yet, so shadow_id stays NULL
// unless a shadow with that name already exists.

const CAMPAIGN_ID = 1;

const CREATURES = [
    {
        name: "Sapheart Ursarch", shadow: 'Shelvar', role: 'Predator',
        order_chaos_value: 65, influence: 'None',
        armor_class: 17, hit_points: 168, alignment: 'Neutral',
        description: "Colossal bear whose heart crystallizes Shelvar sap into living amber; plated in amber, sovereign of the forest, bonded to royal blood.",
        stats: {
            "size_type": "Large beast",
            "speed": "40 ft.",
            "abilities": {
                "str": 22,
                "dex": 12,
                "con": 20,
                "int": 6,
                "wis": 14,
                "cha": 10
            },
            "skills": "Perception +5",
            "senses": "darkvision 60 ft., passive Perception 15",
            "languages": "—",
            "challenge_rating": "8 (3,900 XP)",
            "traits": [
                "Forest Sovereign. Plants within 60 feet of the Ursarch shift to accommodate it. It ignores difficult terrain caused by plants.",
                "Royal Bond. The Ursarch can sense the presence of Shelvar royal blood within 1 mile of it, though not the exact location."
            ],
            "actions": [
                "Multiattack. The Ursarch makes two claw attacks.",
                "Claw. *Melee Weapon Attack:* +9 to hit, reach 5 ft., one target. *Hit:* 15 (2d8 + 6) slashing damage.",
                "Amber Pulse (Recharge 5–6). The Ursarch releases a shockwave in a 20-foot radius centered on itself. Each creature in the area must make a DC 16 Constitution saving throw. On a failure, a creature takes 18 (4d8) force damage and is restrained by amber growths; on a success, it takes half as much damage and isn't restrained. A restrained creature can use its action to make a DC 16 Strength check, freeing itself on a success.",
                "Sapheart Roar. Each creature of the Ursarch's choice within 60 feet that can hear it must succeed on a DC 15 Wisdom saving throw or be frightened for 1 minute. A frightened creature can repeat the save at the end of each of its turns, ending the effect on itself on a success. A creature that succeeds is immune to the Roar for 24 hours."
            ],
            "reactions": [],
            "lore": [
                "The heart of a Sapheart Ursarch slowly crystallizes Shelvar sap into living amber, which grows outward through its hide as armor and erupts as restraining growths when it unleashes an Amber Pulse.",
                "Shelvar's royal beastmasters bred and revered these bears as living treasures; the Royal Bond is what remains of that lineage, drawing the Ursarch toward anyone carrying the old royal blood — as protector or as threat, at the DM's discretion.",
                "The forest bends around it rather than the other way round: plants shift out of its path, which makes an Ursarch's approach eerie and unnaturally quiet."
            ]
        }
    },
    {
        name: "Grove-Crowned Lupinar", shadow: 'Shelvar', role: 'Predator',
        order_chaos_value: 65, influence: 'None',
        armor_class: 15, hit_points: 102, alignment: 'Neutral good',
        description: "Massive wolf with branch-antlers dripping luminous sap; hunts liars and shelters its allies in a glow of saplight.",
        stats: {
            "size_type": "Large beast",
            "speed": "50 ft.",
            "abilities": {
                "str": 18,
                "dex": 16,
                "con": 16,
                "int": 10,
                "wis": 16,
                "cha": 12
            },
            "skills": "Perception +5, Survival +5",
            "senses": "darkvision 60 ft., passive Perception 15",
            "languages": "understands Sylvan but can't speak",
            "challenge_rating": "4 (1,100 XP)",
            "traits": [
                "Saplight Veil. Allies of the Lupinar within 10 feet of it gain a +1 bonus to AC.",
                "Tracker of Truth. The Lupinar has advantage on Wisdom (Survival) checks to track a creature that has lied within the last hour."
            ],
            "actions": [
                "Multiattack. The Lupinar makes one bite attack and one antler strike.",
                "Bite. *Melee Weapon Attack:* +6 to hit, reach 5 ft., one target. *Hit:* 11 (2d6 + 4) piercing damage. If the attack is a critical hit, the target is slowed until the end of its next turn: its speed is halved, it takes a −2 penalty to AC and Dexterity saving throws, and it can't take reactions (Sap-Infused Bite).",
                "Antler Strike. *Melee Weapon Attack:* +6 to hit, reach 5 ft., one target. *Hit:* 13 (2d8 + 4) piercing damage.",
                "Echo-Howl (Recharges after a Short or Long Rest). Each creature of the Lupinar's choice within 30 feet that can hear it must make a DC 15 Wisdom saving throw, taking 13 (3d8) psychic damage on a failed save, or half as much on a successful one."
            ],
            "reactions": [],
            "lore": [
                "A wolf crowned with living branch-antlers that drip luminous sap. The light it sheds — the Saplight Veil — steadies the creatures who run with it.",
                "Its gift for finding liars makes it a dangerous witness: a Lupinar on your trail can tell that you lied recently, and it does not forget.",
                "Neutral good in temperament; will parley with anyone who has been honest with it, and will tear apart anyone who hasn't."
            ]
        }
    },
    {
        name: "Verdant Crown Serpent", shadow: 'Shelvar', role: 'Predator',
        order_chaos_value: 45, influence: 'None',
        armor_class: 16, hit_points: 133, alignment: 'Neutral',
        description: "Massive emerald serpent whose scales mimic leaves; its sap venom intoxicates the mind, and the grove obeys its call.",
        stats: {
            "size_type": "Huge beast",
            "speed": "40 ft., climb 40 ft.",
            "abilities": {
                "str": 20,
                "dex": 14,
                "con": 17,
                "int": 8,
                "wis": 14,
                "cha": 10
            },
            "skills": "Perception +5, Stealth +5",
            "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 15",
            "languages": "—",
            "challenge_rating": "5 (1,800 XP)",
            "traits": [
                "Ancient Coil. A creature grappled by the serpent takes 9 (2d8) bludgeoning damage at the start of each of the serpent's turns.",
                "Leaf Mimicry. The serpent has advantage on Dexterity (Stealth) checks made to hide among foliage."
            ],
            "actions": [
                "Bite. *Melee Weapon Attack:* +8 to hit, reach 10 ft., one target. *Hit:* 16 (2d10 + 5) piercing damage. The target must make a DC 15 Constitution saving throw (Sap Venom). On a failure, it takes 11 (2d10) poison damage and has disadvantage on Wisdom checks for 1 minute; it can repeat the save at the end of each of its turns, ending the effect on itself on a success.",
                "Constrict. *Melee Weapon Attack:* +8 to hit, reach 5 ft., one Large or smaller creature. *Hit:* 14 (2d8 + 5) bludgeoning damage, and the target is grappled (escape DC 16).",
                "Grove Guardian (Recharge 5–6). The serpent commands the plants around it. Plants in a 20-foot radius centered on a point it can see within 60 feet erupt in grasping growth. Each creature in the area must succeed on a DC 14 Strength saving throw or be restrained until the end of its next turn."
            ],
            "reactions": [],
            "lore": [
                "Scales that mimic leaves let it lie unseen through a forest canopy; the first warning is usually a plant-choked patch of ground closing around you.",
                "Its venom is sap-heavy and intoxicating: victims don't die so much as stop thinking clearly, which is why it is feared as a guardian of places others shouldn't enter.",
                "Ancient enough that the grove itself obeys it — which suggests it was never merely a snake."
            ]
        }
    },
    {
        name: "Sap-Sick Hound", shadow: 'Shelvar', role: 'Monster',
        order_chaos_value: 35, influence: 'None',
        armor_class: 12, hit_points: 11, alignment: 'Unaligned',
        description: "Once-noble Shelvar hunting dog corrupted by unstable sap exposure; still fiercely loyal to Shelvar survivors.",
        stats: {
            "size_type": "Medium beast",
            "speed": "40 ft.",
            "abilities": {
                "str": 14,
                "dex": 14,
                "con": 12,
                "int": 3,
                "wis": 12,
                "cha": 6
            },
            "senses": "passive Perception 11",
            "languages": "—",
            "challenge_rating": "1/4 (50 XP)",
            "traits": [
                "Feral Loyalty. The hound has advantage on attack rolls against any creature that is threatening a Shelvar survivor within 30 feet of it."
            ],
            "actions": [
                "Bite. *Melee Weapon Attack:* +4 to hit, reach 5 ft., one target. *Hit:* 5 (1d6 + 2) piercing damage. The target must succeed on a DC 11 Constitution saving throw or take 2 (1d4) poison damage (Unstable Sap)."
            ],
            "reactions": [],
            "lore": [
                "A hunting dog of the old Shelvar kennels, warped by exposure to unstable sap. Its loyalty survived the corruption even when its temperament didn't.",
                "Good level-1 encounter: dangerous in a pack, but it can be calmed or led by a Shelvar survivor."
            ]
        }
    },
    {
        name: "Grove Wisp-Moth", shadow: 'Shelvar', role: 'Monster',
        order_chaos_value: 40, influence: 'None',
        armor_class: 13, hit_points: 7, alignment: 'Unaligned',
        description: "Large-winged moth (Small beast) with shimmering wings that distort light and confuse predators.",
        stats: {
            "size_type": "Small beast",
            "speed": "10 ft., fly 40 ft.",
            "abilities": {
                "str": 6,
                "dex": 16,
                "con": 10,
                "int": 2,
                "wis": 12,
                "cha": 8
            },
            "senses": "passive Perception 11",
            "languages": "—",
            "challenge_rating": "1/8 (25 XP)",
            "traits": [
                "Sap-Drinker. At the start of each of its turns, if the moth is within 10 feet of a pool of sap, it gains 2 temporary hit points."
            ],
            "actions": [
                "Wing Buffet. *Melee Weapon Attack:* +5 to hit, reach 5 ft., one target. *Hit:* 2 (1d4) bludgeoning damage.",
                "Dazzling Wings (Bonus Action). One creature within 10 feet of the moth that can see it must succeed on a DC 10 Wisdom saving throw or have disadvantage on its next attack roll before the end of its next turn."
            ],
            "reactions": [],
            "lore": [
                "The shimmering wings distort and scatter light, confusing predators and adventurers alike. They gather wherever sap pools.",
                "Weak alone, but a swarm's Dazzling Wings can turn an early skirmish into a slog."
            ]
        }
    },
    {
        name: "Burrow-Sap Vermin", shadow: 'Shelvar', role: 'Monster',
        order_chaos_value: 35, influence: 'None',
        armor_class: 11, hit_points: 9, alignment: 'Unaligned',
        description: "Rodent-like burrowers swollen with unstable sap; aggressive, territorial, and explosive when killed.",
        stats: {
            "size_type": "Small beast",
            "speed": "30 ft., burrow 10 ft.",
            "abilities": {
                "str": 12,
                "dex": 12,
                "con": 12,
                "int": 2,
                "wis": 10,
                "cha": 4
            },
            "senses": "darkvision 30 ft., passive Perception 10",
            "languages": "—",
            "challenge_rating": "1/8 (25 XP)",
            "traits": [
                "Pack Scurry. The vermin has advantage on an attack roll against a creature if at least one of the vermin's allies is within 5 feet of the creature and isn't incapacitated.",
                "Sap Burst. When the vermin dies, it explodes. Each creature within 5 feet of it must make a DC 11 Dexterity saving throw, taking 3 (1d6) acid damage on a failed save, or half as much on a successful one."
            ],
            "actions": [
                "Gnaw. *Melee Weapon Attack:* +3 to hit, reach 5 ft., one target. *Hit:* 3 (1d4 + 1) piercing damage."
            ],
            "reactions": [],
            "lore": [
                "Territorial burrowers swollen by unstable sap; they swarm anything that approaches their warrens.",
                "Sap Burst makes them a hazard to kill in melee — fight them from range or spread the party out."
            ]
        }
    }
];

function up(db) {
    const findShadow = db.prepare('SELECT id FROM shadows WHERE name = ? AND campaign_id = ?');
    const findExisting = db.prepare('SELECT id FROM npcs WHERE name = ? AND campaign_id = ?');
    const insert = db.prepare(`
        INSERT INTO npcs (
            name, creature_type, shadow_id, armor_class, hit_points, stats,
            alignment, role, order_chaos_value, influence, description,
            is_important, is_spoiler, campaign_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `);

    for (const c of CREATURES) {
        if (findExisting.get(c.name, CAMPAIGN_ID)) continue;

        const shadowRow = findShadow.get(c.shadow, CAMPAIGN_ID);
        insert.run(
            c.name, c.name, shadowRow ? shadowRow.id : null,
            c.armor_class, c.hit_points, JSON.stringify(c.stats),
            c.alignment, c.role, c.order_chaos_value, c.influence,
            c.description, CAMPAIGN_ID
        );
    }
}

module.exports = { up, CREATURES };
