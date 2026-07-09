// player-wizard-data.js — split from player-dashboard.js (behavior unchanged)
// ═══════════════════════════════════════════════════════════════
//  CHARACTER CREATION WIZARD
// ═══════════════════════════════════════════════════════════════

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const STAT_FULL = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };

// 5e class data — hit die, soft-gate minimums, primary/secondary stats, saves
const CLASSES_5E = [
    {
        id: 'Barbarian', name: 'Barbarian', hitDie: 12,
        primary: ['STR'], secondary: ['CON'],
        saves: ['STR', 'CON'],
        minStats: { STR: 13 },
        desc: 'Primal warriors who channel rage into devastating combat power.',
        amberNote: null
    },
    {
        id: 'Bard', name: 'Bard', hitDie: 8,
        primary: ['CHA'], secondary: ['DEX'],
        saves: ['DEX', 'CHA'],
        minStats: { CHA: 13 },
        desc: 'Versatile performers who weave magic through art, music, and words.',
        amberNote: 'Common in shadows where culture thrives. Pattern walkers with CHA make exceptional Bards.'
    },
    {
        id: 'Cleric', name: 'Cleric', hitDie: 8,
        primary: ['WIS'], secondary: ['CON'],
        saves: ['WIS', 'CHA'],
        minStats: { WIS: 13 },
        desc: 'Divine servants who draw power from devotion to a deity or cosmic force.',
        amberNote: 'Pattern-imprinted characters often feel drawn to divine order. Uncommon among pure Logrus initiates.'
    },
    {
        id: 'Druid', name: 'Druid', hitDie: 8,
        primary: ['WIS'], secondary: ['CON'],
        saves: ['INT', 'WIS'],
        minStats: { WIS: 13 },
        desc: 'Guardians of the natural world who command the forces of nature.',
        amberNote: 'Shadow-walkers with deep roots in a single shadow sometimes emerge as Druids.'
    },
    {
        id: 'Fighter', name: 'Fighter', hitDie: 10,
        primary: ['STR', 'DEX'], secondary: ['CON'],
        saves: ['STR', 'CON'],
        minStats: { STR: 13, _or_: { DEX: 13 } },
        desc: 'Masters of martial combat, skilled with all weapons and armour.',
        amberNote: null
    },
    {
        id: 'Monk', name: 'Monk', hitDie: 8,
        primary: ['DEX', 'WIS'], secondary: [],
        saves: ['STR', 'DEX'],
        minStats: { DEX: 13, WIS: 13 },
        desc: 'Disciplined martial artists who harness ki to perform extraordinary feats.',
        amberNote: 'Rare in Amber proper — more common in Eastern-flavored shadows. Logrus initiates rarely pursue this path.'
    },
    {
        id: 'Paladin', name: 'Paladin', hitDie: 10,
        primary: ['STR', 'CHA'], secondary: ['CON'],
        saves: ['WIS', 'CHA'],
        minStats: { STR: 13, CHA: 13 },
        desc: 'Holy warriors bound by sacred oaths who blend martial and divine power.',
        amberNote: 'Strongly associated with Pattern-aligned characters. Logrus initiates who take this path carry an interesting tension.'
    },
    {
        id: 'Ranger', name: 'Ranger', hitDie: 10,
        primary: ['DEX', 'WIS'], secondary: ['STR'],
        saves: ['STR', 'DEX'],
        minStats: { DEX: 13, WIS: 13 },
        desc: 'Skilled hunters and trackers who navigate the wilds of many shadows.',
        amberNote: 'Shadow-walkers with Ranger training move between worlds with particular ease.'
    },
    {
        id: 'Rogue', name: 'Rogue', hitDie: 8,
        primary: ['DEX'], secondary: ['INT'],
        saves: ['DEX', 'INT'],
        minStats: { DEX: 13 },
        desc: 'Cunning specialists in stealth, subterfuge, and precision strikes.',
        amberNote: null
    },
    {
        id: 'Sorcerer', name: 'Sorcerer', hitDie: 6,
        primary: ['CHA'], secondary: ['CON'],
        saves: ['CON', 'CHA'],
        minStats: { CHA: 13 },
        desc: 'Innate spellcasters whose magic flows from their bloodline or a wild event.',
        amberNote: 'Half-blood or Pure-blood characters sometimes manifest Sorcerer traits as Amber power bleeds into instinct.'
    },
    {
        id: 'Warlock', name: 'Warlock', hitDie: 8,
        primary: ['CHA'], secondary: ['CON'],
        saves: ['WIS', 'CHA'],
        minStats: { CHA: 13 },
        desc: 'Pact-bound spellcasters who draw power from a powerful patron.',
        amberNote: 'Logrus Masters with CHA sometimes attract the attention of Chaos entities. Pattern walkers rarely make pacts.'
    },
    {
        id: 'Wizard', name: 'Wizard', hitDie: 6,
        primary: ['INT'], secondary: ['CON'],
        saves: ['INT', 'WIS'],
        minStats: { INT: 13 },
        desc: 'Scholarly magic-users who master arcane arts through rigorous study.',
        amberNote: 'Pattern-imprinted wizards are the archetypical Amber scholar. Logrus initiates rarely have the patience for formal study.'
    }
];

const IMPRINT_LORE = {
    None: { title: null, flavor: null, mechanics: null, consider: null, example: null },
    FirstPattern: {
        title: 'The Pattern',
        flavor: `Before you stands something that has always existed, older than the oldest name spoken in any shadow. It does not call to you. It does not need to. You are here because some part of you has always known this moment would come — and because the blood in your veins carries a memory that predates your birth.\n\nTo walk the Pattern is to be unmade and remade in the same breath. Every step strips away what you pretend to be and leaves only what you are. It does not grant power. It reveals it. What you carry out of it is not a gift — it is a truth you can no longer unknow.`,
        mechanics: `+2 WIS, +1 CON.\n\nUnlocks Pattern-walking — the ability to navigate Shadow by will, find true paths through confusion, and sense when reality is being reshaped around you. Also enables Trump use.`,
        consider: `Choose Pattern if your character values structure, clarity of purpose, and the Amber side of the conflict. It aligns you with the royal family's power source — which means Amber's allies will read you as kin, and its enemies will read you as a threat.\n\nPattern-walkers are stabilizing forces. Chaos environments push back against them, but Order environments amplify their presence.`,
        example: `A Pattern-walker entering a destabilized shadow can feel the wrongness immediately — the way a musician hears a note out of tune before they can name it.`
    },
    CorwinPattern: {
        title: 'The Argent Refrain',
        flavor: `The Argent Refrain is not simply a remaking of the original Pattern — born from a different understanding of the Multiverse, more flexible and more personal. Where the original Pattern demands you become yourself, the Refrain asks what you might become.\n\nIt does not unmake you. It blends echos of you bluring your past and future.`,
        mechanics: `+2 INT, +1 CHA.\n\nUnlocks Refrain-walking — similar to Pattern-walking but with greater flexibility in shadow manipulation and a stronger affinity for Trump artistry and creative power use.`,
        consider: `Choose the Argent Refrain if your character is drawn to dreams, symbolism, and the spaces between moments.  
This path is not about imposing will or surviving chaos — it is about listening to the emotional gravity of things, following meaning rather than force.

Initiates of the Refrain are:
    intuitive rather than rigid,
    imaginative rather than literal,
    guided by metaphor, memory, and possibility.
They move through the Dreaming by slipping between symbolic scenes, finding echoes of what they seek rather than perfect reflections. Their power is new, untested, and only partly understood — even by Amber’s elders — which means every initiate carries a sense of potential and uncertainty in equal measure.

Choose this path if your character feels aligned with the liminal, the poetic, the half‑remembered — or if they want to walk a road no one has fully mapped yet.`,
        example: `An Argent Refrain‑traveler entering a discordant shadow feels it the way a dreamer notices a dream shifting — familiar shapes carrying the wrong emotional weight, symbols that don’t quite match their meanings. It isn’t danger they sense first, but a subtle narrative dissonance, as if the story of the place is humming in the wrong key.`
    },
    LogrusBasic: {
        title: 'The Logrus',
        flavor: `You did not find the Logrus. The Logrus found you.\n\nIt has been there at the edges of your sight — in the moment a pattern of leaves felt like a warning, in the pull you felt toward doors that should have meant nothing, in the dreams that left you certain something vast had been watching you sleep. You dismissed it. You moved on. It waited.\n\nTo walk the Logrus is not a test of who you are. It is a test of whether you can survive what it makes of you. It does not reveal you. It reaches inside you and pulls.`,
        mechanics: `Basic: +1 CON.\nAdvanced: +1 CON, +1 STR / −1 INT, −1 WIS (one penalty shiftable).\nMaster: +1 CON, +1 STR, +1 CHA / −2 INT, −1 WIS (one penalty shiftable).\n\nUnlocks Logrus tendrils — the ability to extend Chaos into Shadow, reshape probability, and survive environments that would unmake ordinary beings.`,
        consider: `The Logrus suits characters from the Courts or those drawn to raw potential over structure. Each deeper level makes you more physically formidable and harder to destroy — but erodes the precision of your thinking.\n\nLogrus-walkers thrive in Chaos-adjacent environments and are deeply unsettling to Order-aligned beings. In Amber proper, you will be watched.`,
        example: `A Logrus-walker in a stable shadow feels it the way someone feels a too-quiet room — the absence of flux is its own sensation, and not a comfortable one.`
    },
    LogrusAdvanced: {
        title: 'The Logrus — Advanced',
        flavor: `You went back.\n\nMost who survive the first walk count themselves fortunate and move on. You returned to the Logrus deliberately — not because you had to, but because what the first walk showed you wasn't enough. The Logrus remembered you. It always remembers.\n\nWhat it has done to you since is not something you can fully explain, even to yourself.`,
        mechanics: `+1 CON, +1 STR / −1 INT, −1 WIS.\n\nOne penalty point may be shifted to a different stat with DM-approved justification. The Logrus decides where the cost falls — but sometimes what it reaches for can be redirected.`,
        consider: `Advanced initiates are significantly more dangerous physically, but the mental penalties are real. Coordinate your stat array carefully — absorbing a −1 WIS on a 14 base still leaves you functional; absorbing it on an 8 is a real limitation.\n\nThe penalty shift exists for story reasons, not optimization. Have a reason.`,
        example: `An Advanced Logrus‑walker in a stable shadow feels it like a room where someone has just stopped speaking — the silence is too deliberate, too held. The absence of flux isn’t merely uncomfortable; it’s a pressure, a reminder that the world here refuses to move with them.`
    },
    LogrusMaster: {
        title: 'The Logrus — Master',
        flavor: `There is no word in any shadow's language for what you are now.\n\nYou have walked the Logrus to its depths and returned — not unchanged, not unbroken, but present. The Logrus does not grant mastery to the strong. It grants it to the ones it cannot finish. You are something the Logrus tried to unmake and failed.\n\nThat failure has a shape, and you wear it.`,
        mechanics: `+1 CON, +1 STR, +1 CHA / −2 INT, −1 WIS.\n\nOne penalty point may be shifted with justification. At this depth, the Logrus's costs are not negotiable — only the specific form they take.`,
        consider: `Logrus Masters are among the most physically and socially formidable beings in any shadow — but the INT and WIS costs are significant. This choice produces a very specific kind of character: powerful, compelling, instinct-driven, and not always precise.\n\nTalk to your DM before choosing this. It has significant narrative weight.`,
        example: `A Logrus Master in a stable shadow feels the stillness as a kind of defiance — a world choosing not to breathe. To them, the lack of shifting possibility is a rigid wall, a fixed note that refuses to join the melody. It is not quiet; it is refusal.`
    }
};

const WIZARD_STEP_INFO = {
    1: {
        title: 'Who Are You?',
        flavor: `A name is never just a name.\n\nIn the Amber multiverse, identity has weight. A true name is a vector — a direction the universe can push against, and a declaration of who you believe yourself to be.\n\nThe Pattern answers to those who know themselves. The Logrus tests those who do not.`,
        mechanics: null,
        consider: `Choosing a name is choosing the first truth your character carries into Shadow. A bold name suggests a bold will. A secretive name hints at hidden lineage or uncertain origins. A name borrowed from Shadow may reveal a past shaped by worlds far from Amber.`,
        example: null
    },
    2: {
        title: 'Amber Attributes',
        flavor: `The great forces of the multiverse — Pattern, Logrus, the Argent Refrain — are not distant abstractions. They are pressures that shape every shadow, every encounter, every choice.`,
        mechanics: null,
        consider: `Hover over any option or info icon to see what each choice means in the texture of the world you are about to walk through.`,
        example: null
    },
    3: {
        title: 'Assign Stats',
        flavor: `Six numbers contain the whole of a person's raw potential — what the body can endure, what the mind can hold, what the spirit can sustain before any training or scar.`,
        mechanics: `The standard array is fixed by tradition: 15, 14, 13, 12, 10, 8. Each value can only be used once.`,
        consider: `Where you assign the array is your first act of intentional self-definition. Stack your Amber modifiers from Step 2 against your array choices — a +2 WIS bonus lands harder on a 14 than a 10.`,
        example: null
    },
    4: {
        title: 'Flaws & Traits',
        flavor: `No one walks through Shadow unchanged. The powers that shape reality leave marks — sometimes obvious, sometimes quiet. A flaw is not a weakness. It is evidence that something real happened to you.`,
        mechanics: null,
        consider: `Traits are the compensations, the adaptations, the gifts that emerged from surviving what tried to unmake you. Some flaws grant bonus Trait points — the greater the cost, the greater the compensation.`,
        example: null
    },
    5: {
        title: 'Class',
        flavor: `In a world where princes of Amber reshape reality and masters of Chaos rewrite the laws of physics, a class is less about what you studied and more about what you reach for when everything else is stripped away.`,
        mechanics: null,
        consider: `Your class defines how you solve problems that no one else can solve. Suggested classes are highlighted based on your stats and imprint — but suggestions are advisory, not restrictive.`,
        example: null
    },
    6: {
        title: 'Review',
        flavor: `Look carefully at what you are about to become.`,
        mechanics: null,
        consider: `Once you step through, the numbers harden into a person. The choices stop being hypothetical. You will carry this character through things not yet imagined, into shadows not yet named.`,
        example: `Take a moment. Be certain.`
    }
};

// ── Per-field info (shown when the player focuses a form input) ──
const FIELD_INFO = {
    'w-name': {
        title: 'Character Name',
        flavor: `A name is never just a name.\n\nIn the Amber multiverse, identity has weight. A true name is a vector — a direction the universe can push against, and a declaration of who you believe yourself to be.\n\nThe Pattern answers to those who know themselves. The Logrus tests those who do not.`,
        mechanics: null,
        consider: `A bold name suggests bold will. A secretive name hints at hidden lineage or uncertain origins. A name borrowed from Shadow may reveal a past shaped by worlds far from Amber.\n\nPick a name that says something about how your character sees themselves — or how they wish to be seen.`,
        example: null
    },
    'w-race': {
        title: 'Race / Species',
        flavor: `Race in the Amber multiverse is more fluid than in most worlds. Infinite shadows mean infinite varieties of humanoid life — some close to human, some wholly alien to it.\n\nAmber's nobility trends human. The Courts of Chaos harbor beings of stranger make. Everything between is Shadow — which means almost anything is possible.\n\nThe Argent Refrain makes shadows of dreams,  we don't know what that means for races... yet`,
        mechanics: `There are no fixed mechanical species traits in this system beyond what the DM grants narratively. Species shapes social context, cultural assumptions, and story — not stat blocks.`,
        consider: `Your species reflects which shadow you came from and how that world shaped you. Choose based on the story you want to tell, not stat optimization.\n\nIf your starting shadow is exotic, your species can be too — the DM will work with you on what that means.`,
        example: `Elf, Human, Ewok, Mimbari, Vulkan — or something entirely your own.`
    },
    'w-shadow': {
        title: 'Starting Shadow',
        flavor: `A Shadow is one of the infinite parallel worlds that drift between Amber and the Courts of Chaos. Each one is a reflection — some close to Amber's order, some close to Chaos's flux, most somewhere between.\n\nThe shadow you grew up in is your normal. It is the baseline against which everything else will be measured.`,
        mechanics: `Your starting shadow sets your character's cultural defaults: what magic looks like, whether gods respond, how stable reality feels, what technology exists.`,
        consider: `High-Order shadows tend to produce structured, law-minded characters. High-Chaos shadows produce adaptable, instinct-driven ones.\n\nIf you don't have a strong preference, ask your DM which shadows are most connected to the current arc.`,
        example: null
    },
    'w-backstory': {
        title: 'Backstory',
        flavor: `A backstory is not just history — it is a pattern of choices that led your character to this moment.\n\nIn Amber, backstory often contains a mystery the character hasn't solved yet: a lineage they don't fully understand, a power they felt once and couldn't explain, a door that opened somewhere it shouldn't have.`,
        mechanics: null,
        consider: `The most useful backstories name a wound, a want, and a question the character carries forward.\n\nYour DM will pull threads from what you write here. Give them something worth pulling. You don't need to explain everything — leave room for the game to fill in.`,
        example: `"I've always been able to find my way. Even in places I've never been. I stopped asking why a long time ago."`
    },

    // ── Step 2: Amber Attributes (keyed by data-lore on section containers) ──
    'order-chaos': {
        title: 'Order / Chaos Balance',
        flavor: `All existence drifts between two absolute poles. Amber is the center of Order — the Pattern made physical, reality at its most stable and law-bound. The Courts of Chaos are the opposite — the Logrus, entropy, raw potential, infinite change.\n\nYour position on this spectrum is not just philosophical. It shapes how the multiverse reacts to your presence at a fundamental level.`,
        mechanics: `0 = Pure Chaos. 100 = Pure Order. 50 = Balanced.\n\nAt the extremes (below 20 or above 80), shadow-walking in opposing territory becomes harder and certain abilities strengthen or weaken. Most characters function comfortably between 30 and 70.`,
        consider: `Strong Order makes you a stabilizing force — shadows near Amber feel natural, Chaos-adjacent environments disorient you. Strong Chaos makes you a catalyst — you thrive in flux, but structured environments push back.\n\nThis reflects where you start, not where you end up. It can shift meaningfully through play.`,
        example: null
    },
    'blood-purity': {
        title: 'Blood Purity',
        flavor: `In Amber, blood is biography. It tells the court where you stood before you were old enough to speak — whose halls you walked, whose table you sat at, whose expectations you were born into.\n\nThis isn't about metaphysical power. It's about upbringing: the tutors or hard knocks, the title or the silence around it, the world that shaped you before you ever made a choice of your own.`,
        mechanics: `None (no royal blood): +1 STR\nHalf (descended from royalty): +1 CHA\nPure (direct royal lineage): +1 WIS`,
        consider: `Pure-bloods carry the weight of visibility. Every move is noted; every failure reflects on the family. Half-bloods were raised in the in-between — aware enough to understand the game, but never quite of it.\n\nThose with no royal blood weren't born into any of that. What they have, they built. That tends to produce a different kind of resilience.`,
        example: null
    },
    'power-imprint': {
        title: 'Power Imprint',
        flavor: `An imprint is the mark burned into your soul by walking one of the great cosmic Powers. It is permanent, irreversible, and fundamentally transforms how the multiverse reads you.\n\nYou can only hold one imprint at creation. The Pattern and the Logrus are antithetical — their coexistence in a single soul would be catastrophic to both the person and reality nearby.`,
        mechanics: `Hover each card to see specific stat effects. Imprints are not just modifiers — they grant access to Power abilities that unfold through play.\n\nNone is a legitimate choice. Untapped potential has its own kind of power.`,
        consider: `Choose based on your character's history and the story you want to tell. An imprint isn't a stat optimization — it's a fundamental change to who your character is and how every Power-sensitive being in the multiverse will respond to them.`,
        example: null
    },
    'w-broken-imprint': {
        title: 'Broken Imprint',
        flavor: `A broken imprint means you walked not the true source of the Power, but a flawed reflection of it. The imprint took hold, but imperfectly — leaving a hairline fracture in the soul where something alien slipped in.\nYou gained part of what the Power should grant, and something it never meant to. This was not a choice. It was an ordeal you endured… and survived, though not unchanged.`,
        mechanics: `Grants partial imprint abilities at a reduced level but also special abilities because of it. The exact mechanical scope is determined in collaboration with the DM based on how the walk went wrong and what the crack has done since.`,
        consider: `A broken imprint is a rich story hook that the DM will pull on. The instability is not background flavor — it has metaphysical consequences that will surface during play.\n\nOnly take this if you want that wound to be central to your character's story.`,
        example: null
    },
    'w-penalty-just': {
        title: 'Penalty Shift Justification',
        flavor: `The Logrus corrodes the mind — that is its nature. But the specific shape of that erosion varies by character. What did the walk target in you? What did you hold onto, and what did you sacrifice?`,
        mechanics: null,
        consider: `A penalty shift requires a narrative reason the DM accepts. This isn't optimization — it's asking you to understand your character's inner landscape well enough to say which part of them the Logrus reached first.`,
        example: `"She went in already suspicious of everyone — the Logrus burned away what little trust remained in her instincts rather than her already-guarded reasoning."`
    },

    // ── Step 3: Stats (keyed by data-lore on stat slot cards) ────────────────
    'stat-STR': {
        title: 'Strength',
        flavor: `Strength is the simplest expression of physical potential — raw force, the ability to impose your will on the physical world. In a multiverse where some beings reshape reality with thought, the one who can still lift a horse has a particular kind of authority.`,
        mechanics: `Governs melee attacks, carrying capacity, and feats requiring raw power. Also affects Athletics checks and some grapple situations.\n\nAmber sources: None blood (+1), Logrus Advanced (+1), Logrus Master (+1).`,
        consider: `Physical characters (Fighter, Barbarian, Paladin) want this primary. Even non-combat characters occasionally need enough STR to avoid being a liability in physical confrontations — a 10 is usually sufficient if you're not leading the charge.`,
        example: null
    },
    'stat-DEX': {
        title: 'Dexterity',
        flavor: `Dexterity is precision — reflexes, agility, the quality of movement under pressure. Shadow-walking requires a kind of bodily intelligence that can't be forced, only practiced into instinct.`,
        mechanics: `Governs ranged attacks, Stealth, initiative, and AC for light/medium armor or unarmored builds.\n\nAmber sources: None. DEX is entirely determined by your array assignment — no imprint or blood modifier touches it at creation.`,
        consider: `No Amber modifier touches DEX — your array here is unmodified. Rogues, Rangers, and finesse fighters need it primary. If you're not DEX-primary, a 12 is usually sufficient. Don't dump it entirely — initiative matters in Amber.`,
        example: null
    },
    'stat-CON': {
        title: 'Constitution',
        flavor: `Constitution is what remains when everything else fails — the body's refusal to stop. Every Power walk demands it. The Pattern tests you; the Logrus tries to unmake you. Both require a body that can endure what the mind has agreed to.`,
        mechanics: `Governs hit points (CON modifier × level added each level), concentration saves, and resistance to exhaustion and some debuffs.\n\nAmber sources: Pattern (+1), all Logrus tiers (+1 each), Argent Refrain (none).`,
        consider: `CON benefits every character equally because everyone takes damage and everyone loses concentration at the worst moments. A 14 minimum is rarely a bad investment. If you have Logrus modifiers stacking here, consider where your base lands first.`,
        example: null
    },
    'stat-INT': {
        title: 'Intelligence',
        flavor: `Intelligence is the mind's precision — pattern recognition, logical structure, the ability to hold complex systems in working memory. In Amber, INT is also the substrate for Trump artistry and the analytical power to navigate Shadow deliberately rather than instinctively.`,
        mechanics: `Governs arcane spellcasting (Wizard), Arcana, History, and Investigation. Required for Trump Artist eligibility.\n\nAmber sources: Argent Refrain (+2). Logrus penalties: Advanced (−1), Master (−2).`,
        consider: `Wizards and Trump Artists need this primary. For others, 12 is usually enough. If you have Logrus penalties hitting INT, decide whether to absorb them here or shift them — a 10 base with a −1 is still functional; a 8 with −2 starts hurting.`,
        example: null
    },
    'stat-WIS': {
        title: 'Wisdom',
        flavor: `Wisdom is perception turned inward and outward — the ability to read situations, sense the unseen, and understand what is actually happening beneath the surface. In a world where nothing is quite what it appears and shadows lie constantly, WIS keeps you alive.`,
        mechanics: `Governs divine spellcasting (Cleric, Druid, Ranger), Perception, Insight, and Survival. Passive Perception is 10 + WIS modifier.\n\nAmber sources: Pure blood (+1), Pattern (+2). Logrus penalty: Master (−1).`,
        consider: `High Perception matters enormously in court intrigue and Shadow travel. Even non-WIS-primary characters rarely want a negative WIS modifier. If you're running Pattern and Pure blood together, you're looking at a +3 WIS modifier before array assignment.`,
        example: null
    },
    'stat-CHA': {
        title: 'Charisma',
        flavor: `Charisma is the force of presence — the quality that makes others listen, trust, or follow without fully understanding why. In Amber's court, CHA is currency. Among Chaos lords, it is armor.`,
        mechanics: `Governs social skills (Persuasion, Deception, Intimidation), Sorcerer and Warlock spellcasting, and general social influence.\n\nAmber sources: Half blood (+1), Argent Refrain (+1), Logrus Master (+1).`,
        consider: `Amber is a campaign of politics and manipulation as much as combat — CHA rarely goes to waste. Social characters (Bard, Sorcerer, Warlock) want it primary. Even fighters benefit from not walking into court with a −1.`,
        example: null
    },

    // ── Step 5 ────────────────────────────────────────────────────────────────
    'w-level': {
        title: 'Starting Level',
        flavor: `Starting level reflects where your character is in their story when play begins — not the beginning of their life, but the beginning of this chapter of it.`,
        mechanics: `Level 1 is standard for new campaigns. Your DM may start at a higher level if the story warrants it — established characters entering a developed world often begin at 3–5.`,
        consider: `Higher levels mean more abilities immediately, but less mechanical growth within the campaign. Discuss with your DM what level best matches the power level of the story's opening.`,
        example: null
    }
};

const FLAW_TRAIT_PAIRS = {
    pattern: [
        {
            id: 'mark',
            flaw:  { name: 'Pattern Burned',     desc: "You can't disguise your nature from Order-sensitive beings or Amber-blooded. Disadvantage on deception when your nature is relevant." },
            trait: { name: "Order's Eye",         desc: "You sense the Order/Chaos balance of any shadow you enter and know when it's being actively manipulated." }
        },
        {
            id: 'debt',
            flaw:  { name: 'Blood Debt (Order)',  desc: "An Amber royal or Order faction holds a legitimate claim on you. DM holds one narrative hook callable at any time." },
            trait: { name: 'Amber Sight',         desc: "You can sense blood purity in others with a moment's focus. Royalty, half-bloods, and ordinary people read differently to you." }
        },
        {
            id: 'sensitivity',
            flaw:  { name: 'Pattern Seared',      desc: "Proximity to an active Pattern causes splitting headaches. CON save DC 13 or disadvantage on INT/WIS checks for the scene." },
            trait: { name: 'Crystalline Mind',    desc: "Order-structure in your mind resists intrusion. +2 to Psyche defense, advantage on saves against illusion and mental manipulation." }
        }
    ],
    logrus: [
        {
            id: 'mark',
            flaw:  { name: 'Chaos Tainted',       desc: "A wrongness clings to you, detectable by Amber-blooded. Disadvantage on CHA checks in Amber or high-Order shadows." },
            trait: { name: 'Chaos Sense',         desc: "You sense Logrus use nearby and detect shadow-walkers in your vicinity before they reveal themselves." }
        },
        {
            id: 'debt',
            flaw:  { name: 'Blood Debt (Chaos)',  desc: "A Logrus master or Chaos lord has a claim on you. DM holds one narrative hook callable at any time." },
            trait: { name: 'Chaos Sight',         desc: "You can sense Logrus imprints in others — who has walked it, and roughly how deeply." }
        },
        {
            id: 'sensitivity',
            flaw:  { name: 'Logrus Touched',      desc: "Strong Order magic or Pattern proximity causes disorientation. WIS save DC 13 or disadvantage on actions when a Pattern is invoked nearby." },
            trait: { name: 'Probability Touch',   desc: "Once per session, reroll any one die and take either result. Your chaos resonance nudges outcomes." }
        }
    ],
    noImprint: {
        pattern: { name: "Order's Whisper",  desc: "You sense Influence in any shadow you enter and feel when Order/Chaos balance is actively shifting around you." },
        logrus:  { name: 'Chaos Affinity',   desc: "You sense Logrus influence in shadows and feel probability shifts near you before others notice them." }
    }
};

