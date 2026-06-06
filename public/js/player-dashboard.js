// Player Dashboard JavaScript

let currentUser = null;
let currentCharacter = null;
let userCharacters = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication - simple check, navigation.js handles validation
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/player-login.html';
        return;
    }

    // Get user from localStorage (already validated by navigation.js)
    try {
        currentUser = JSON.parse(userStr);

        // Admin belongs in the admin panel, not here
        if (currentUser.is_admin || currentUser.username === 'admin') {
            window.location.href = '/admin.html';
            return;
        }

        // Display username (backup if navigation hasn't loaded yet)
        const usernameEl = document.getElementById('username-display');
        if (usernameEl) {
            usernameEl.textContent = currentUser.username;
        }

        // Unlock "Create New Character" if the player has acknowledged the guide
        applyGuideGate();

        // Load user's characters
        await loadCharacters();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Clear invalid data and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/player-login.html';
        return;
    }

    // Setup tab navigation
    setupTabs();
});

// Setup tab navigation
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific data
    if (tabName === 'journal') {
        loadJournalEntries();
    } else if (tabName === 'claims' && currentCharacter) {
        loadClaims();
    } else if (tabName === 'progress' && currentCharacter) {
        loadProgress();
    } else if (tabName === 'shadows') {
        loadVisitedShadows();
    }
}

// Load user's characters
async function loadCharacters() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('characters-list');

    try {
        const response = await fetch('/api/auth/characters', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Check if it's an authentication error
            if (response.status === 401) {
                window.location.href = '/player-login.html';
                return;
            }
            throw new Error(`Failed to load characters (${response.status})`);
        }

        const data = await response.json();
        userCharacters = data.characters || [];

        if (userCharacters.length === 0) {
            container.innerHTML = `
                <div class="info-message" style="grid-column: 1 / -1;">
                    <h3>Welcome to Your Character Dashboard!</h3>
                    <p>You don't have any characters yet. Click the "Create New Character" button above to get started!</p>
                </div>
            `;
            return;
        }

        // Render character cards
        container.innerHTML = userCharacters.map(char => `
            <div class="character-card">
                <div onclick="viewCharacter(${char.id})" style="cursor: pointer;">
                    <h3>${char.name}</h3>
                    <div class="character-meta">
                        <span>${char.species || char.race}</span>
                        <span>•</span>
                        <span>${char.class_type}</span>
                        <span>•</span>
                        <span>Level ${char.level}</span>
                    </div>
                    <div class="character-stats">
                        <div class="stat-item">
                            <div class="stat-label">HP</div>
                            <div class="stat-value">${char.current_hp}/${char.max_hp}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Order/Chaos</div>
                            <div class="stat-value">${char.order_chaos_value}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Pattern</div>
                            <div class="stat-value">${char.pattern_imprint || 'None'}</div>
                        </div>
                    </div>
                </div>
                <div class="character-card-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openEditCharacter(${char.id})">Edit</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading characters:', error);
        console.error('Error details:', error.message);
        console.error('Token present:', !!token);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                <p>Failed to load characters: ${error.message}</p>
                <p>Please check the browser console for details or try refreshing the page.</p>
            </div>
        `;
    }
}

// View character details
async function viewCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/characters/${characterId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load character');
        }

        const character = await response.json();
        currentCharacter = character;

        // Show character sheet
        displayCharacterSheet(character);

    } catch (error) {
        console.error('Error loading character:', error);
        alert('Failed to load character details');
    }
}

// Display character sheet
function displayCharacterSheet(character) {
    const container = document.getElementById('character-details');
    const listContainer = document.getElementById('characters-list');

    // Hide character list, show character sheet
    listContainer.style.display = 'none';
    container.style.display = 'block';

    const modifier = (score) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : mod;
    };

    container.innerHTML = `
        <div class="character-sheet-header">
            <div>
                <h2>${character.name}</h2>
                <p>${character.species || character.race} ${character.class_type} - Level ${character.level}</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-primary" onclick="openEditCharacter(${character.id})">Edit Character</button>
                <button class="back-button" onclick="closeCharacterSheet()">← Back to Characters</button>
            </div>
        </div>

        <div class="character-sheet-content">
            <h3>Ability Scores</h3>
            <div class="ability-scores">
                <div class="ability-score">
                    <div class="label">STR</div>
                    <div class="value">${character.strength}</div>
                    <div class="modifier">${modifier(character.strength)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">DEX</div>
                    <div class="value">${character.dexterity}</div>
                    <div class="modifier">${modifier(character.dexterity)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">CON</div>
                    <div class="value">${character.constitution}</div>
                    <div class="modifier">${modifier(character.constitution)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">INT</div>
                    <div class="value">${character.intelligence}</div>
                    <div class="modifier">${modifier(character.intelligence)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">WIS</div>
                    <div class="value">${character.wisdom}</div>
                    <div class="modifier">${modifier(character.wisdom)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">CHA</div>
                    <div class="value">${character.charisma}</div>
                    <div class="modifier">${modifier(character.charisma)}</div>
                </div>
            </div>

            <h3>Amber Attributes</h3>
            <div class="form-grid">
                <div class="stat-display">
                    <strong>Order/Chaos Balance:</strong> ${character.order_chaos_value}
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${character.order_chaos_value}%; background: ${getOrderChaosColor(character.order_chaos_value)}"></div>
                    </div>
                </div>
                <div class="stat-display">
                    <strong>Pattern Imprint:</strong> ${character.pattern_imprint || 'None'}
                </div>
                <div class="stat-display">
                    <strong>Logrus Imprint:</strong> ${character.logrus_imprint || 'None'}
                </div>
                <div class="stat-display">
                    <strong>Blood Purity:</strong> ${character.blood_purity}%
                </div>
                <div class="stat-display">
                    <strong>Trump Artist:</strong> ${character.trump_artist ? 'Yes' : 'No'}
                </div>
            </div>

            ${character.backstory ? `
                <h3>Backstory</h3>
                <div class="backstory">
                    <p>${character.backstory}</p>
                </div>
            ` : ''}

            <div class="character-actions">
                <button class="btn-primary" onclick="viewCharacterClaims()">View Claims</button>
                <button class="btn-primary" onclick="viewCharacterProgress()">View Progress</button>
            </div>
        </div>
    `;
}

// Close character sheet
function closeCharacterSheet() {
    document.getElementById('character-details').style.display = 'none';
    document.getElementById('characters-list').style.display = 'grid';
    currentCharacter = null;
}

// Get color based on Order/Chaos value
function getOrderChaosColor(value) {
    if (value >= 75) return '#3498db'; // Order blue
    if (value >= 25) return '#95a5a6'; // Neutral gray
    return '#e74c3c'; // Chaos red
}

// View character claims
function viewCharacterClaims() {
    switchTab('claims');
}

// View character progress
function viewCharacterProgress() {
    switchTab('progress');
}

// Load claims for current character
async function loadClaims() {
    if (!currentCharacter) {
        document.getElementById('claims-content').innerHTML = `
            <div class="info-message">
                <p>Select a character from "My Characters" to view and manage their claims.</p>
            </div>
        `;
        return;
    }

    // Use the new loadCharacterClaims function
    await loadCharacterClaims(currentCharacter.id);
}

// Load progress for current character
async function loadProgress() {
    if (!currentCharacter) {
        document.getElementById('progress-content').innerHTML = `
            <div class="info-message">
                <p>Select a character from "My Characters" to view their progress timeline.</p>
            </div>
        `;
        return;
    }

    const token = localStorage.getItem('token');
    const container = document.getElementById('progress-content');

    try {
        const response = await fetch(`/api/progress/character/${currentCharacter.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load progress');
        }

        const progress = await response.json();

        if (progress.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <p>${currentCharacter.name} has no progress entries yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>${currentCharacter.name}'s Progress Timeline</h3>
            <div class="progress-timeline">
                ${progress.map(entry => `
                    <div class="progress-entry">
                        <h4>Session ${entry.session_id}</h4>
                        <p><strong>Date:</strong> ${new Date(entry.session_date).toLocaleDateString()}</p>
                        ${entry.feats_gained ? `<p><strong>Feats Gained:</strong> ${entry.feats_gained}</p>` : ''}
                        ${entry.order_chaos_shift ? `<p><strong>Order/Chaos Shift:</strong> ${entry.order_chaos_shift > 0 ? '+' : ''}${entry.order_chaos_shift}</p>` : ''}
                        ${entry.notes ? `<p>${entry.notes}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading progress:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load progress. Please try again.</p>
            </div>
        `;
    }
}

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

// Wizard state
let wiz = {};

function wizardReset() {
    wiz = {
        step: 1,
        // Step 1
        name: '', race: '', shadowId: null, backstory: '',
        // Step 2
        orderChaos: 50, bloodPurity: 'None', imprint: 'None',
        brokenImprint: false,
        noneBonus: null,
        penaltyShift: '', penaltyJust: '',
        // Step 3
        assign: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
        selectedChipVal: null,
        // Step 4
        flawsChosen: [],          // array of pair IDs, max 2
        noImprintFlavor: null,    // 'pattern' | 'logrus'
        // Step 5
        classType: '', level: 1, trumpArtist: false
    };
}

// ── Modifier calculation ─────────────────────────────────────

function calcAmberMods() {
    const m = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };

    // Order/Chaos
    if (wiz.orderChaos >= 75)      { m.INT += 1; m.WIS += 1; }
    else if (wiz.orderChaos <= 25) { m.STR += 1; m.DEX += 1; }

    // Imprint
    switch (wiz.imprint) {
        case 'None':
            if (wiz.noneBonus) m[wiz.noneBonus] += 1;
            break;
        case 'FirstPattern':
            m.WIS += 2; m.CON += 1;
            break;
        case 'CorwinPattern':
            m.INT += 2; m.CHA += 1;
            break;
        case 'LogrusBasic':
            m.CON += 1;
            break;
        case 'LogrusAdvanced':
            m.CON += 1; m.STR += 1;
            m.INT -= 1; m.WIS -= 1;
            if (wiz.penaltyShift) { m.INT += 1; m[wiz.penaltyShift] -= 1; }
            break;
        case 'LogrusMaster':
            m.CON += 1; m.STR += 1; m.CHA += 1;
            m.INT -= 2; m.WIS -= 1;
            if (wiz.penaltyShift) { m.INT += 1; m[wiz.penaltyShift] -= 1; }
            break;
    }

    // Blood purity
    if (wiz.bloodPurity === 'None') m.STR += 1;
    else if (wiz.bloodPurity === 'Half') m.CHA += 1;
    else if (wiz.bloodPurity === 'Pure') { m.WIS += 1; }

    return m;
}

function getFinalStats() {
    const mods = calcAmberMods();
    const out = {};
    for (const s of STAT_KEYS) out[s] = (wiz.assign[s] || 0) + (mods[s] || 0);
    return out;
}

function isTrumpEligible(finals) {
    return (finals.DEX + finals.WIS >= 30) || (finals.INT + finals.WIS >= 30);
}

// ── Class suggestions ────────────────────────────────────────

// Returns set of class IDs the system recommends based on finals + imprint
function getRecommendedClasses(finals) {
    const { STR, DEX, INT, WIS, CHA } = finals;
    const imp = wiz.imprint;
    const rec = new Set();

    if (imp === 'FirstPattern') {
        if (WIS >= 13) { rec.add('Cleric'); rec.add('Druid'); }
        if (INT >= 13) rec.add('Wizard');
    }
    if (imp === 'CorwinPattern') {
        if (CHA >= 13) { rec.add('Bard'); rec.add('Sorcerer'); }
        if (INT >= 13) rec.add('Wizard');
    }
    if (imp.startsWith('Logrus')) {
        if (STR >= 13) rec.add('Barbarian');
        rec.add('Fighter');
        if (imp === 'LogrusMaster' && CHA >= 13) rec.add('Warlock');
    }

    // Stat-driven
    if (DEX >= 14) { rec.add('Rogue'); rec.add('Ranger'); }
    if (STR >= 14 && DEX < 14) rec.add('Fighter');
    if (WIS >= 14 && !imp.startsWith('Logrus')) rec.add('Druid');
    if (DEX >= 13 && WIS >= 13) rec.add('Monk');
    if (CHA >= 14) rec.add('Sorcerer');
    if (STR >= 13 && CHA >= 13) rec.add('Paladin');

    return rec;
}

// Check whether finals meet a class's soft gate
function classGateStatus(cls, finals) {
    const min = cls.minStats;
    if (!min) return { pass: true, warnings: [] };

    // Special case: Fighter allows STR OR DEX
    if (cls.id === 'Fighter') {
        if (finals.STR >= 13 || finals.DEX >= 13) return { pass: true, warnings: [] };
        return { pass: false, warnings: [`STR ${finals.STR} or DEX ${finals.DEX} (need 13 in one)`] };
    }

    const warnings = [];
    for (const [stat, threshold] of Object.entries(min)) {
        if (stat === '_or_') continue;
        if (finals[stat] < threshold) {
            warnings.push(`${stat} ${finals[stat]} (need ${threshold})`);
        }
    }
    return { pass: warnings.length === 0, warnings };
}

// ── Wizard open / close ──────────────────────────────────────

function applyGuideGate() {
    const btn = document.getElementById('create-character-btn');
    if (!btn) return;
    if (localStorage.getItem('amber_guide_acknowledged')) {
        btn.disabled = false;
        btn.classList.remove('btn-create-locked');
        const reminderBtn = document.getElementById('guide-reminder-btn');
        if (reminderBtn) reminderBtn.style.display = 'none';
    }
}

function showGuideReminder() {
    document.getElementById('guide-reminder-modal').classList.add('show');
}

function acknowledgeGuide(goToGuide) {
    localStorage.setItem('amber_guide_acknowledged', '1');
    document.getElementById('guide-reminder-modal').classList.remove('show');
    applyGuideGate();
    // If going to the guide, the <a> tag handles navigation naturally
}

async function openCreateCharacter() {
    if (!localStorage.getItem('amber_guide_acknowledged')) return;
    wizardReset();
    const modal = document.getElementById('create-character-modal');
    modal.classList.add('show');
    await wizardPopulateShadows();

    // Imprint radio cards: hover shows lore temporarily; selection pins it
    document.querySelectorAll('input[name="w-imprint"]').forEach(radio => {
        const card = radio.closest('.radio-card');
        card.addEventListener('mouseenter', () => {
            const key = (radio.value === 'LogrusAdvanced' || radio.value === 'LogrusMaster')
                ? 'LogrusBasic' : radio.value;
            const lore = IMPRINT_LORE[key];
            const hasSections = lore && (lore.flavor || lore.mechanics || lore.consider || lore.example);
            if (hasSections) {
                wizardShowInfoPanel(lore.title, lore);
            } else {
                wizardRevertInfoPanel();
            }
        });
        card.addEventListener('mouseleave', () => wizardRevertInfoPanel());
    });

    // Info icons: hover shows tooltip text in the right panel
    document.querySelectorAll('.modal-wizard .info-icon').forEach(icon => {
        const tooltip = icon.querySelector('.info-tooltip');
        if (!tooltip) return;
        const text = tooltip.textContent.trim();
        icon.addEventListener('mouseenter', () => {
            wizardShowInfoPanel(null, { flavor: text });
        });
        icon.addEventListener('mouseleave', () => wizardRevertInfoPanel());
    });

    wizardRenderStep();
}

function closeCreateCharacter() {
    document.getElementById('create-character-modal').classList.remove('show');
    wizardReset();
}

async function wizardPopulateShadows() {
    const sel = document.getElementById('w-shadow');
    if (sel.options.length > 1) return; // already loaded
    try {
        const res = await fetch('/api/shadows');
        const shadows = await res.json();
        shadows.forEach(s => {
            const o = document.createElement('option');
            o.value = s.id;
            o.textContent = s.name;
            sel.appendChild(o);
        });
    } catch {}
}

// ── Navigation ───────────────────────────────────────────────

function wizardNext() {
    const err = wizardValidateStep(wiz.step);
    if (err) { alert(err); return; }
    wizardCollectStep(wiz.step);
    wiz.step++;
    wizardRenderStep();
}

function wizardBack() {
    wiz.step--;
    wizardRenderStep();
}

function wizardRenderStep() {
    // Panels
    document.querySelectorAll('.wizard-panel').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === wiz.step);
    });
    // Step indicators
    document.querySelectorAll('.wstep').forEach(el => {
        const n = parseInt(el.dataset.step);
        el.classList.toggle('active', n === wiz.step);
        el.classList.toggle('done',   n < wiz.step);
    });
    // Buttons
    document.getElementById('wizard-back-btn').style.display = wiz.step === 1 ? 'none' : '';
    const isLast = wiz.step === 6;
    document.getElementById('wizard-next-btn').style.display      = isLast ? 'none' : '';
    document.getElementById('wizard-submit-btn').style.display    = isLast ? '' : 'none';
    document.getElementById('wizard-submit-edit-btn').style.display = isLast ? '' : 'none';
    document.getElementById('wizard-step-counter').textContent = `Step ${wiz.step} of 6`;

    // Step-specific rendering
    if (wiz.step === 2) wizardRenderAmberMods();
    if (wiz.step === 3) wizardRenderStats();
    if (wiz.step === 4) wizardRenderFlaws();
    if (wiz.step === 5) wizardRenderClass();
    if (wiz.step === 6) wizardRenderReview();

    wizardResetInfoPanel();
}

// ── Validation ───────────────────────────────────────────────

function wizardValidateStep(step) {
    if (step === 1) {
        if (!document.getElementById('w-name').value.trim()) return 'Character name is required.';
        if (!document.getElementById('w-race').value.trim()) return 'Race / Species is required.';
    }
    if (step === 2) {
        if (wiz.imprint === 'None' && !wiz.noneBonus) return 'Choose which stat receives your +1 bonus.';
        if ((wiz.imprint === 'LogrusAdvanced' || wiz.imprint === 'LogrusMaster') && wiz.penaltyShift && !document.getElementById('w-penalty-just').value.trim()) {
            return 'Please provide a justification for your penalty shift.';
        }
    }
    if (step === 3) {
        const unset = STAT_KEYS.filter(s => wiz.assign[s] === null);
        if (unset.length > 0) return `Assign a value to all six stats. Missing: ${unset.join(', ')}.`;
    }
    if (step === 5) {
        if (!wiz.classType) return 'Please select a class.';
    }
    return null;
}

// ── Collect from DOM into wiz state ─────────────────────────

function wizardCollectStep(step) {
    if (step === 1) {
        wiz.name     = document.getElementById('w-name').value.trim();
        wiz.race     = document.getElementById('w-race').value.trim();
        wiz.shadowId = document.getElementById('w-shadow').value || null;
        wiz.backstory= document.getElementById('w-backstory').value.trim();
    }
    if (step === 2) {
        wiz.orderChaos  = parseInt(document.getElementById('w-order-chaos').value);
        wiz.bloodPurity   = document.querySelector('input[name="w-blood"]:checked').value;
        wiz.imprint       = document.querySelector('input[name="w-imprint"]:checked').value;
        wiz.brokenImprint = document.getElementById('w-broken-imprint')?.checked || false;
        const nb = document.querySelector('input[name="w-none-bonus"]:checked');
        wiz.noneBonus   = nb ? nb.value : null;
        const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
        wiz.penaltyShift = ps ? ps.value : '';
        wiz.penaltyJust  = (document.getElementById('w-penalty-just') || {}).value || '';
    }
    if (step === 5) {
        // wiz.classType is set live by selectClass()
        wiz.level      = parseInt(document.getElementById('w-level').value) || 1;
        wiz.trumpArtist = document.getElementById('w-trump-check')?.checked || false;
    }
}

// ── Step 2: live amber display ───────────────────────────────

function wizardOCUpdate() {
    const val = parseInt(document.getElementById('w-order-chaos').value);
    wiz.orderChaos = val;
    let label = 'Balanced';
    let hint  = '';
    if (val >= 75)      { label = 'High Order';  hint = '+1 INT, +1 WIS'; }
    else if (val <= 25) { label = 'High Chaos';  hint = '+1 STR, +1 DEX'; }
    document.getElementById('oc-display').innerHTML =
        `${val} — ${label} <span class="oc-mod-hint">${hint ? `(${hint})` : ''}</span>`;
}

function wizardImprintChange() {
    const imprint = document.querySelector('input[name="w-imprint"]:checked')?.value || 'None';
    wiz.imprint = imprint;

    document.getElementById('none-imprint-bonus').style.display =
        imprint === 'None' ? '' : 'none';

    const showPenalty = imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster';
    document.getElementById('logrus-penalty-section').style.display = showPenalty ? '' : 'none';

    if (showPenalty) {
        const note = imprint === 'LogrusAdvanced'
            ? 'Fixed penalties: −1 INT, −1 WIS. You may shift one −1 to a different stat.'
            : 'Fixed penalties: −2 INT, −1 WIS. You may shift one −1 to a different stat.';
        document.getElementById('logrus-penalty-note').textContent = note;
    }

    // Broken imprint: available for Pattern and Basic Logrus only
    const brokenEligible = ['FirstPattern', 'CorwinPattern', 'LogrusBasic'].includes(imprint);
    const brokenCb = document.getElementById('w-broken-imprint');
    const brokenTxt = document.getElementById('broken-imprint-text');
    brokenCb.disabled = !brokenEligible;
    if (!brokenEligible) brokenCb.checked = false;
    brokenTxt.className = brokenEligible ? 'broken-enabled' : 'broken-disabled';
    wiz.brokenImprint = brokenCb.checked;

    wizardAmberUpdate();
    wizardShowImprintLore(imprint);
}

// ── Wizard right-panel helpers ───────────────────────────────
let _wizardInfoPinned  = null; // { title, sections } — set by imprint selection
let _wizardInfoFocused = null; // { title, sections } — set by field focus

function _renderLoreSection(id, content) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!content) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.querySelector('.lore-sec-body').innerHTML =
        content.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

function wizardShowInfoPanel(title, sections) {
    const panel = document.getElementById('wizard-info-panel');
    if (!panel) return;
    panel.classList.remove('is-default');
    const titleEl = document.getElementById('wizard-info-title');
    titleEl.textContent = title || '';
    titleEl.style.display = title ? '' : 'none';
    _renderLoreSection('lore-sec-flavor',    sections.flavor    || null);
    _renderLoreSection('lore-sec-mechanics', sections.mechanics || null);
    _renderLoreSection('lore-sec-consider',  sections.consider  || null);
    _renderLoreSection('lore-sec-example',   sections.example   || null);
}

function wizardPinInfoPanel(title, sections) {
    _wizardInfoPinned = sections ? { title, sections } : null;
    if (_wizardInfoPinned) {
        wizardShowInfoPanel(title, sections);
    } else {
        wizardResetInfoPanel();
    }
}

function wizardRevertInfoPanel() {
    if (_wizardInfoFocused) {
        wizardShowInfoPanel(_wizardInfoFocused.title, _wizardInfoFocused.sections);
    } else if (_wizardInfoPinned) {
        wizardShowInfoPanel(_wizardInfoPinned.title, _wizardInfoPinned.sections);
    } else {
        wizardResetInfoPanel();
    }
}

function wizardResetInfoPanel() {
    _wizardInfoPinned  = null;
    _wizardInfoFocused = null;
    const panel = document.getElementById('wizard-info-panel');
    if (!panel) return;
    panel.classList.add('is-default');
    const info = WIZARD_STEP_INFO[wiz.step];
    const titleEl = document.getElementById('wizard-info-title');
    titleEl.textContent = info ? info.title : '';
    titleEl.style.display = '';
    if (info) {
        _renderLoreSection('lore-sec-flavor',    info.flavor    || null);
        _renderLoreSection('lore-sec-mechanics', info.mechanics || null);
        _renderLoreSection('lore-sec-consider',  info.consider  || null);
        _renderLoreSection('lore-sec-example',   info.example   || null);
    }
}

function wizardShowImprintLore(imprint) {
    const key = (imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster')
        ? 'LogrusBasic'
        : imprint;
    const lore = IMPRINT_LORE[key];
    const hasSections = lore && (lore.flavor || lore.mechanics || lore.consider || lore.example);
    if (!hasSections) {
        wizardPinInfoPanel(null, null);
        return;
    }
    wizardPinInfoPanel(lore.title, lore);
}

function wizardFocusField(info) {
    _wizardInfoFocused = { title: info.title, sections: info };
    wizardShowInfoPanel(info.title, info);
}

function wizardBlurField() {
    _wizardInfoFocused = null;
    wizardRevertInfoPanel();
}

function _fieldInfoForElement(el) {
    if (!el) return null;
    return FIELD_INFO[el.id] || FIELD_INFO[el.closest?.('[data-lore]')?.dataset.lore] || null;
}

function _classLore(cls) {
    if (!cls) return null;
    const primary = cls.primary.join(', ');
    const secondary = cls.secondary.length ? cls.secondary.join(', ') : '—';
    return {
        title: cls.name,
        flavor: cls.desc || null,
        mechanics: `Hit Die: d${cls.hitDie}\nPrimary: ${primary}\nSecondary: ${secondary}\nSaving Throws: ${cls.saves.join(', ')}`,
        consider: cls.amberNote || null,
        example: null
    };
}

function hoverClass(id) {
    const cls = CLASSES_5E.find(c => c.id === id);
    if (cls) wizardShowInfoPanel(cls.name, _classLore(cls));
}

function wizardAmberUpdate() {
    // Collect current values without navigating away
    const nb = document.querySelector('input[name="w-none-bonus"]:checked');
    wiz.noneBonus = nb ? nb.value : null;
    const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
    wiz.penaltyShift = ps ? ps.value : '';

    // Show/hide justification box
    const justWrap = document.getElementById('penalty-justification-wrap');
    if (justWrap) justWrap.style.display = wiz.penaltyShift ? '' : 'none';

    wizardRenderAmberMods();
}

function wizardRenderAmberMods() {
    // Sync imprint-dependent sub-panels on step 2 initial render
    if (wiz.step === 2) {
        const imprint = document.querySelector('input[name="w-imprint"]:checked')?.value || 'None';
        wiz.imprint = imprint;
        document.getElementById('none-imprint-bonus').style.display = imprint === 'None' ? '' : 'none';
        const showPenalty = imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster';
        document.getElementById('logrus-penalty-section').style.display = showPenalty ? '' : 'none';
        if (showPenalty) {
            document.getElementById('logrus-penalty-note').textContent = imprint === 'LogrusAdvanced'
                ? 'Fixed penalties: −1 INT, −1 WIS. You may shift one −1 to a different stat.'
                : 'Fixed penalties: −2 INT, −1 WIS. You may shift one −1 to a different stat.';
        }
        // Sync penalty-justification wrap
        const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
        wiz.penaltyShift = ps ? ps.value : '';
        const justWrap = document.getElementById('penalty-justification-wrap');
        if (justWrap) justWrap.style.display = wiz.penaltyShift ? '' : 'none';
    }
    // If we're already on step 3, refresh stat display too
    if (wiz.step === 3) wizardRenderStats();
}

// ── Step 3: stat assignment ──────────────────────────────────

function wizardRenderStats() {
    const mods = calcAmberMods();

    // Refresh chip states (used vs available)
    const usedVals = Object.values(wiz.assign).filter(v => v !== null);
    document.querySelectorAll('.chip').forEach(chip => {
        const v = parseInt(chip.dataset.val);
        const isUsed = usedVals.includes(v);
        chip.classList.toggle('used', isUsed);
        chip.classList.toggle('selected', wiz.selectedChipVal === v && !isUsed);
        chip.disabled = isUsed;
    });

    // Refresh stat slot cards
    for (const stat of STAT_KEYS) {
        const base = wiz.assign[stat];
        const mod  = mods[stat] || 0;
        const card = document.querySelector(`.stat-slot-card[data-stat="${stat}"]`);

        document.getElementById(`ssc-${stat}`).textContent = base !== null ? base : '—';

        const modEl   = document.getElementById(`amod-${stat}`);
        const finalEl = document.getElementById(`sfinal-${stat}`);

        if (mod !== 0) {
            modEl.textContent = mod > 0 ? `+${mod}` : `${mod}`;
            modEl.className   = `ssc-amber-mod${mod < 0 ? ' neg' : ''}`;
        } else {
            modEl.textContent = '';
        }

        if (base !== null) {
            finalEl.textContent = base + mod;
        } else {
            finalEl.textContent = '';
        }

        card.classList.toggle('has-value', base !== null);
        card.classList.toggle('targeted', wiz.selectedChipVal !== null && base === null);
    }
}

function selectChip(el) {
    const val = parseInt(el.dataset.val);
    if (el.classList.contains('used')) return;
    wiz.selectedChipVal = wiz.selectedChipVal === val ? null : val;
    wizardRenderStats();
}

function assignStat(stat) {
    const info = FIELD_INFO['stat-' + stat];
    if (info) {
        _wizardInfoFocused = { title: info.title, sections: info };
        wizardShowInfoPanel(info.title, info);
    }
    if (wiz.selectedChipVal === null) {
        // Clicking an occupied slot without a chip selected: return value to pool
        if (wiz.assign[stat] !== null) {
            wiz.assign[stat] = null;
            wizardRenderStats();
        }
        return;
    }
    // Assign the selected chip
    // If slot already has a value, swap it back to pool first (find and free old chip)
    wiz.assign[stat] = wiz.selectedChipVal;
    wiz.selectedChipVal = null;
    wizardRenderStats();
}

// ── Step 4: flaws & traits ───────────────────────────────────

function wizardRenderFlaws() {
    const intro = document.getElementById('flaws-intro');
    const content = document.getElementById('flaws-content');
    const imprint = wiz.imprint;
    const isLogrus = imprint.startsWith('Logrus');
    const isNone = imprint === 'None';

    if (isNone) {
        const activeFlavor = wiz.noImprintFlavor || 'pattern';
        intro.textContent = 'You have no imprint — the lack of alignment is your flaw. You receive one free Trait. Choose its flavor:';
        content.innerHTML = `
            <div style="display:flex;gap:12px;margin-bottom:16px;">
                <label class="radio-card" style="flex:1"
                    onmouseenter="wizardHoverNoImprint('pattern')" onmouseleave="wizardRevertInfoPanel()">
                    <input type="radio" name="w-noflavor" value="pattern"
                        ${activeFlavor === 'pattern' ? 'checked' : ''}
                        onchange="wizardFlavorChange()">
                    <div class="rc-body">
                        <strong>Pattern Flavor</strong>
                        <small>${FLAW_TRAIT_PAIRS.noImprint.pattern.name}</small>
                    </div>
                </label>
                <label class="radio-card" style="flex:1"
                    onmouseenter="wizardHoverNoImprint('logrus')" onmouseleave="wizardRevertInfoPanel()">
                    <input type="radio" name="w-noflavor" value="logrus"
                        ${activeFlavor === 'logrus' ? 'checked' : ''}
                        onchange="wizardFlavorChange()">
                    <div class="rc-body">
                        <strong>Logrus Flavor</strong>
                        <small>${FLAW_TRAIT_PAIRS.noImprint.logrus.name}</small>
                    </div>
                </label>
            </div>
            <p class="panel-note">You may also take up to 2 flaw/trait pairs below for additional benefits.</p>
            <div id="flaws-pairs-container">${renderFlawPairs(activeFlavor)}</div>
        `;
    } else {
        const path = isLogrus ? 'logrus' : 'pattern';
        intro.textContent = `You may take up to 2 flaw/trait pairs. Each flaw you accept grants its paired trait.`;
        content.innerHTML = renderFlawPairs(path);
    }
}

function renderFlawPairs(path) {
    return FLAW_TRAIT_PAIRS[path].map(pair => `
        <div class="flaw-trait-pair${wiz.flawsChosen.includes(pair.id) ? ' selected' : ''}" id="ftp-${pair.id}"
            onmouseenter="wizardHoverFlawPair('${pair.id}', '${path}')" onmouseleave="wizardRevertInfoPanel()">
            <label>
                <input type="checkbox" value="${pair.id}"
                    ${wiz.flawsChosen.includes(pair.id) ? 'checked' : ''}
                    onchange="wizardFlawToggle('${pair.id}', this.checked, this)"
                    style="margin-top:4px;flex-shrink:0">
                <div class="ftp-content">
                    <div class="ftp-flaw">
                        <span class="flaw-label">Flaw</span>
                        <strong>${pair.flaw.name}</strong>
                    </div>
                    <div class="ftp-divider">⟶ grants ⟶</div>
                    <div class="ftp-trait">
                        <span class="trait-label">Trait</span>
                        <strong>${pair.trait.name}</strong>
                    </div>
                </div>
            </label>
        </div>
    `).join('');
}

function wizardHoverFlawPair(id, path) {
    const pair = (FLAW_TRAIT_PAIRS[path] || []).find(p => p.id === id);
    if (!pair) return;
    wizardShowInfoPanel(`${pair.flaw.name} → ${pair.trait.name}`, {
        flavor:    `<strong>Flaw:</strong> ${pair.flaw.desc}`,
        mechanics: `<strong>Trait:</strong> ${pair.trait.desc}`
    });
}

function wizardHoverNoImprint(flavor) {
    const t = FLAW_TRAIT_PAIRS.noImprint[flavor];
    if (!t) return;
    wizardShowInfoPanel(`Free Trait: ${t.name}`, { flavor: t.desc });
}

function wizardFlawToggle(id, checked, el) {
    if (checked) {
        if (wiz.flawsChosen.length >= 2) {
            alert('You may only take up to 2 flaw/trait pairs.');
            if (el) el.checked = false;
            return;
        }
        wiz.flawsChosen.push(id);
    } else {
        wiz.flawsChosen = wiz.flawsChosen.filter(f => f !== id);
    }
    document.querySelectorAll('.flaw-trait-pair').forEach(el => {
        const id2 = el.id.replace('ftp-', '');
        el.classList.toggle('selected', wiz.flawsChosen.includes(id2));
    });
}

function wizardFlavorChange() {
    const checked = document.querySelector('input[name="w-noflavor"]:checked');
    wiz.noImprintFlavor = checked ? checked.value : null;
    const container = document.getElementById('flaws-pairs-container');
    if (container && wiz.noImprintFlavor) {
        wiz.flawsChosen = [];
        container.innerHTML = renderFlawPairs(wiz.noImprintFlavor);
    }
}

// ── Step 5: class & trump ────────────────────────────────────

function selectClass(id) {
    wiz.classType = wiz.classType === id ? '' : id;
    document.querySelectorAll('.class-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.cls === wiz.classType);
    });
    const cls = CLASSES_5E.find(c => c.id === wiz.classType);
    wizardPinInfoPanel(cls ? cls.name : null, cls ? _classLore(cls) : null);
}

function wizardRenderClass() {
    const finals = getFinalStats();
    const eligible = isTrumpEligible(finals);
    // Preserve trump checkbox state across re-renders
    const prevTrump = wiz.trumpArtist;
    wiz.trumpArtist = false;

    // Trump eligibility section
    const trumpEl = document.getElementById('trump-eligibility');
    if (eligible) {
        trumpEl.className = 'trump-check eligible';
        trumpEl.innerHTML = `
            ✓ Trump Artist Eligible
            <label style="margin-left:16px;font-weight:normal;font-size:0.88rem;">
                <input type="checkbox" id="w-trump-check" ${prevTrump ? 'checked' : ''} onchange="wiz.trumpArtist=this.checked">
                Yes, this character is a Trump Artist
            </label>
            <div style="font-size:0.8rem;font-weight:400;margin-top:4px;">
                (DEX+WIS = ${finals.DEX + finals.WIS} or INT+WIS = ${finals.INT + finals.WIS} — threshold: 30)
            </div>`;
        wiz.trumpArtist = prevTrump;
    } else {
        trumpEl.className = 'trump-check ineligible';
        trumpEl.innerHTML = `✗ Trump Artist not yet eligible
            <div style="font-size:0.8rem;font-weight:400;margin-top:4px;">
                Requires DEX+WIS ≥ 30 or INT+WIS ≥ 30.
                Current: DEX+WIS = ${finals.DEX + finals.WIS}, INT+WIS = ${finals.INT + finals.WIS}.
            </div>`;
    }

    // Class card grid
    const recommended = getRecommendedClasses(finals);
    const gridEl = document.getElementById('class-card-grid');
    gridEl.innerHTML = CLASSES_5E.map(cls => {
        const gate = classGateStatus(cls, finals);
        const isRec = recommended.has(cls.id);
        const isSelected = wiz.classType === cls.id;
        const statTags = cls.primary.map(s =>
            `<span class="cls-stat-tag primary">${s} ${finals[s]}</span>`
        ).concat(cls.secondary.map(s =>
            `<span class="cls-stat-tag secondary">${s} ${finals[s]}</span>`
        )).join('');

        return `
        <div class="class-card${isSelected ? ' selected' : ''}${isRec ? ' recommended' : ''}${!gate.pass ? ' soft-warn' : ''}"
             data-cls="${cls.id}" onclick="selectClass('${cls.id}')"
             onmouseenter="hoverClass('${cls.id}')" onmouseleave="wizardRevertInfoPanel()">
            ${isRec ? '<span class="cls-badge rec-badge">★ Suggested</span>' : ''}
            ${!gate.pass ? `<span class="cls-badge warn-badge">⚠ Low stats</span>` : ''}
            <div class="cls-header">
                <span class="cls-name">${cls.name}</span>
                <span class="cls-hd" title="Hit Die">d${cls.hitDie}</span>
            </div>
            <div class="cls-stats">${statTags}</div>
            ${!gate.pass ? `<div class="cls-warn-msg">Suggested: ${gate.warnings.join(', ')}</div>` : ''}
        </div>`;
    }).join('');
}

// ── Step 6: review ───────────────────────────────────────────

function buildCharacterDescription() {
    const finals  = getFinalStats();
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const className = clsData?.name || 'adventurer';

    const levelDesc = wiz.level <= 1 ? 'fledgling' :
                      wiz.level <= 3 ? 'seasoned'   :
                      wiz.level <= 6 ? 'veteran'    : 'formidable';

    const topStat = STAT_KEYS.reduce((a, b) => finals[a] >= finals[b] ? a : b);
    const statPhrases = {
        STR: 'powerful of body',
        DEX: 'quick and sure-handed',
        CON: 'hard to break',
        INT: 'keen of mind',
        WIS: 'sharp of perception',
        CHA: 'compelling in presence'
    };

    const lines = [];

    // Opening
    lines.push(`${wiz.name} of the ${wiz.race} is a ${levelDesc} ${className} — ${statPhrases[topStat]}, and shaped by choices that leave a mark on the soul.`);

    // Blood & alignment
    const purityOpener = wiz.bloodPurity === 'PureBlood' ? 'Of pure Amber lineage' :
                         wiz.bloodPurity === 'HalfBlood' ? 'Of partial Amber descent' :
                                                            'Without Amber blood';
    const oc = wiz.orderChaos;
    const align = oc <= 20 ? 'pulled hard toward the raw storm of Chaos' :
                  oc <= 40 ? 'drawn toward Chaos'                        :
                  oc <= 48 ? 'leaning slightly toward Chaos'             :
                  oc <= 52 ? 'poised at the still point between Order and Chaos' :
                  oc <= 60 ? 'leaning slightly toward Order'             :
                  oc <= 80 ? 'drawn toward Order'                        :
                             'aligned deeply with Order';
    lines.push(`${purityOpener}, they are ${align}.`);

    // Imprint
    const imprintText = {
        None:           `They walk without an imprint — unbound by Pattern or Logrus, carrying a freedom that is also a kind of wound.`,
        FirstPattern:   `They have walked the Pattern and carry its crystalline Order within, a mark no shadow can fully conceal.`,
        CorwinPattern:  `They have walked the Argent Refrain — Corwin's own Pattern, carved in silver fire — carrying a power born from both defiance and grief.`,
        LogrusBasic:    `They have walked the Logrus and bear Chaos within, learning to let probability bend at their touch.`,
        LogrusAdvanced: `They have walked deep into the Logrus and grown proficient in commanding its writhing tendrils.`,
        LogrusMaster:   `They are a master of the Logrus, wielding Chaos as an extension of will where others see only madness.`
    }[wiz.imprint] || '';
    let imprint = imprintText;
    if (wiz.brokenImprint && wiz.imprint !== 'None') {
        imprint += ` Yet the imprint took imperfectly — a hairline fracture in the soul, where something alien slipped in.`;
    }
    if (imprint) lines.push(imprint);

    // Free trait (noImprint only)
    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        if (ft) lines.push(`In place of an imprint, they carry the free gift of ${ft.name}.`);
    }

    // Flaw/trait pairs
    const path = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const flawParts = wiz.flawsChosen.map(id => {
        const p = (FLAW_TRAIT_PAIRS[path] || []).find(x => x.id === id);
        return p ? `${p.flaw.name} in exchange for ${p.trait.name}` : null;
    }).filter(Boolean);
    if (flawParts.length === 1) {
        lines.push(`They have accepted ${flawParts[0]}.`);
    } else if (flawParts.length === 2) {
        lines.push(`They have accepted ${flawParts[0]}, and ${flawParts[1]}.`);
    }

    // Trump
    if (wiz.trumpArtist) {
        lines.push(`Their hand shapes Trumps — painted gates between moments, bridging distance with will alone.`);
    }

    return lines.join(' ');
}

function wizardRenderReview() {
    wizardCollectStep(5); // pick up level/trump from DOM (classType already in wiz state)
    const finals  = getFinalStats();
    const mods    = calcAmberMods();
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const imprintLabels = {
        None: 'None', FirstPattern: 'Pattern', CorwinPattern: 'The Argent Refrain',
        LogrusBasic: 'Logrus — Basic', LogrusAdvanced: 'Logrus — Advanced', LogrusMaster: 'Logrus — Master'
    };
    const modStr = s => {
        const m = mods[s];
        if (!m) return '';
        return m > 0 ? ` <span style="color:#27ae60">(+${m})</span>` : ` <span style="color:#e74c3c">(${m})</span>`;
    };

    // Build flaw/trait display
    const path = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const pairs = FLAW_TRAIT_PAIRS[path];
    const flawLines = wiz.flawsChosen.map(id => {
        const p = pairs.find(x => x.id === id);
        return p ? `<div class="review-row"><span>⚠ ${p.flaw.name}</span><span style="color:#27ae60">⟶ ${p.trait.name}</span></div>` : '';
    }).join('');

    let freeTraitLine = '';
    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        freeTraitLine = `<div class="review-row"><span>Free Trait</span><span style="color:#27ae60">${ft.name}</span></div>`;
    }

    document.getElementById('review-content').innerHTML = `
        <div class="review-description">
            <p>${buildCharacterDescription()}</p>
        </div>
        <div class="review-section">
            <h4>Identity</h4>
            <div class="review-row"><span>Name</span><span>${wiz.name}</span></div>
            <div class="review-row"><span>Race</span><span>${wiz.race}</span></div>
            <div class="review-row"><span>Class</span><span>${wiz.classType}${clsData ? ` (d${clsData.hitDie})` : ''} — Level ${wiz.level}</span></div>
            <div class="review-row"><span>Trump Artist</span><span>${wiz.trumpArtist ? 'Yes' : 'No'}</span></div>
            <div class="review-row"><span>Starting HP</span><span>${Math.max(1, (clsData?.hitDie || 8) + Math.floor((finals.CON - 10) / 2))} (d${clsData?.hitDie || 8} + CON mod)</span></div>
        </div>
        <div class="review-section">
            <h4>Amber Attributes</h4>
            <div class="review-row"><span>Order/Chaos Balance</span><span>${wiz.orderChaos}</span></div>
            <div class="review-row"><span>Blood Purity</span><span>${wiz.bloodPurity}</span></div>
            <div class="review-row"><span>Imprint</span><span>${imprintLabels[wiz.imprint]}${wiz.brokenImprint ? ' (Broken)' : ''}</span></div>
            ${wiz.imprint === 'None' && wiz.noneBonus ? `<div class="review-row"><span>Free +1</span><span>${STAT_FULL[wiz.noneBonus]}</span></div>` : ''}
            ${wiz.penaltyShift ? `<div class="review-row"><span>Penalty Shifted To</span><span>${STAT_FULL[wiz.penaltyShift]}</span></div>` : ''}
        </div>
        <div class="review-section">
            <h4>Final Stats</h4>
            <div class="review-stats">
                ${STAT_KEYS.map(s => `
                    <div class="review-stat">
                        <div class="rs-name">${s}</div>
                        <div class="rs-val">${finals[s]}${modStr(s)}</div>
                    </div>`).join('')}
            </div>
        </div>
        ${flawLines || freeTraitLine ? `
        <div class="review-section">
            <h4>Flaws &amp; Traits</h4>
            ${flawLines}${freeTraitLine}
        </div>` : ''}
        ${wiz.backstory ? `
        <div class="review-section">
            <h4>Backstory</h4>
            <div style="font-size:0.88rem;color:#555;line-height:1.5;">${wiz.backstory}</div>
        </div>` : ''}
        <div class="review-dnd-note">
            <strong>What happens next</strong>
            <p>This wizard has established your Amber foundation — stats, imprint, flaws, and traits. The rest of character creation follows standard D&amp;D 5e rules: skills, saving throw proficiencies, equipment, spells, and background features are all filled in on the character sheet.</p>
            <p>Choose <em>Save &amp; Continue Editing</em> to jump straight to the character sheet now, or <em>Save for Later</em> and return to it whenever you're ready.</p>
        </div>
    `;
}

// ── Submit ───────────────────────────────────────────────────

async function wizardSubmit(continueToEdit = false) {
    const btnSave = document.getElementById('wizard-submit-btn');
    const btnEdit = document.getElementById('wizard-submit-edit-btn');
    btnSave.disabled = true;
    btnEdit.disabled = true;
    const btn = continueToEdit ? btnEdit : btnSave;
    btn.textContent = 'Creating…';

    const token   = localStorage.getItem('token');
    const finals  = getFinalStats();
    const path    = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const pairs   = FLAW_TRAIT_PAIRS[path];

    // Build flaws/traits arrays
    const flawsArr = wiz.flawsChosen.map(id => {
        const p = pairs.find(x => x.id === id);
        return p ? { id, flaw: p.flaw.name, trait: p.trait.name } : null;
    }).filter(Boolean);

    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        flawsArr.push({ id: 'free', flaw: null, trait: ft.name, flavor: wiz.noImprintFlavor });
    }

    const logrusImprint = { LogrusBasic: 'Basic', LogrusAdvanced: 'Advanced', LogrusMaster: 'Master' }[wiz.imprint] || null;
    const isPattern = wiz.imprint === 'FirstPattern' || wiz.imprint === 'CorwinPattern';
    const patternType = isPattern ? (wiz.imprint === 'FirstPattern' ? 'Pattern' : 'Argent Refrain') : null;

    // HP: (class hit die avg) + CON mod — use d8 as safe default
    const conMod  = Math.floor((finals.CON - 10) / 2);
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const hitDie  = clsData ? clsData.hitDie : 8;
    const maxHp   = Math.max(1, hitDie + conMod);

    const payload = {
        name:           wiz.name,
        race:           wiz.race,
        class_type:     wiz.classType,
        level:          wiz.level,
        strength:       finals.STR,
        dexterity:      finals.DEX,
        constitution:   finals.CON,
        intelligence:   finals.INT,
        wisdom:         finals.WIS,
        charisma:       finals.CHA,
        max_hp:         maxHp,
        current_hp:     maxHp,
        order_chaos_value: wiz.orderChaos,
        blood_purity:   wiz.bloodPurity,
        pattern_imprint: isPattern ? 1 : 0,
        pattern_type:   patternType,
        logrus_imprint: logrusImprint,
        broken_imprint: wiz.brokenImprint ? 1 : 0,
        trump_artist:   wiz.trumpArtist ? 1 : 0,
        backstory:      wiz.backstory || null,
        shadow_origin_id: wiz.shadowId || null,
        amber_flaws:    flawsArr,
        amber_traits:   flawsArr.map(f => f.trait),
        user_id:        currentUser.id
    };

    try {
        const res = await fetch('/api/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create character');
        }
        const newChar = await res.json();
        closeCreateCharacter();
        await loadCharacters();
        if (continueToEdit) {
            openEditCharacter(newChar.id);
        }
    } catch (err) {
        console.error(err);
        alert(`Error: ${err.message}`);
    } finally {
        btnSave.disabled = false;
        btnEdit.disabled = false;
        btnSave.textContent = 'Save for Later';
        btnEdit.textContent = 'Save & Continue Editing →';
    }
}

// Logout
async function handleLogout() {
    const token = localStorage.getItem('token');

    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to login
    window.location.href = '/player-login.html';
}

// Show player guide
function showGuide() {
    window.open('/guide.html', '_blank');
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const createModal = document.getElementById('create-character-modal');
    const journalModal = document.getElementById('journal-entry-modal');
    const editModal = document.getElementById('edit-character-modal');

    if (event.target === createModal) {
        closeCreateCharacter();
    } else if (event.target === journalModal) {
        closeJournalEntry();
    } else if (event.target === editModal) {
        closeEditCharacter();
    }
});

// ========== JOURNAL FUNCTIONS ==========

// Load journal entries
async function loadJournalEntries() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('journal-content');

    try {
        const response = await fetch('/api/journal/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load journal entries');
        }

        const data = await response.json();
        const entries = data.entries || [];

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <h3>No Journal Entries Yet</h3>
                    <p>Click "New Entry" to start documenting your character's adventures!</p>
                </div>
            `;
            return;
        }

        // Render journal entries
        container.innerHTML = `
            <div class="journal-entries">
                ${entries.map(entry => `
                    <div class="journal-entry-card">
                        <div class="entry-header">
                            <h3>${entry.title}</h3>
                            <span class="entry-meta">
                                ${entry.character_name} • ${new Date(entry.created_at).toLocaleDateString()}
                                ${entry.is_public ? '<span class="public-badge">Public</span>' : '<span class="private-badge">Private</span>'}
                            </span>
                        </div>
                        <div class="entry-content">
                            <p>${entry.content}</p>
                        </div>
                        <div class="entry-footer">
                            <small>By ${entry.author_username}</small>
                            ${entry.user_id === currentUser.id ? `
                                <button class="btn-secondary btn-sm" onclick="deleteJournalEntry(${entry.id})">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading journal entries:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load journal entries. Please try again.</p>
            </div>
        `;
    }
}

// Open new journal entry modal
function openNewJournalEntry() {
    const modal = document.getElementById('journal-entry-modal');
    const characterSelect = document.getElementById('journal-character');

    // Populate character dropdown
    characterSelect.innerHTML = '<option value="">Select a character...</option>';
    userCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name;
        characterSelect.appendChild(option);
    });

    modal.classList.add('show');

    // Setup form submission
    const form = document.getElementById('journal-entry-form');
    form.onsubmit = handleJournalSubmit;
}

// Close journal entry modal
function closeJournalEntry() {
    const modal = document.getElementById('journal-entry-modal');
    modal.classList.remove('show');
    document.getElementById('journal-entry-form').reset();
}

// Handle journal entry submission
async function handleJournalSubmit(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    // Get elements and check if they exist
    const characterElement = document.getElementById('journal-character');
    const titleElement = document.getElementById('journal-title');
    const contentElement = document.getElementById('journal-entry-content');

    console.log('Elements found:', {
        characterElement: !!characterElement,
        titleElement: !!titleElement,
        contentElement: !!contentElement,
        contentElementValue: contentElement?.value
    });

    const characterId = parseInt(characterElement?.value || '');
    const title = titleElement?.value || '';
    const content = contentElement?.value || '';

    console.log('Form values:', {
        characterId,
        title,
        content,
        titleLength: title?.length,
        contentLength: content?.length
    });

    // Client-side validation
    if (!characterId || isNaN(characterId)) {
        alert('Please select a character');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!title || title.trim() === '') {
        alert('Please enter a title');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!content || content.trim() === '') {
        alert('Please enter content for the journal entry');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    const entryData = {
        character_id: characterId,
        title: title.trim(),
        content: content.trim(),
        is_public: document.getElementById('journal-visibility').checked ? 1 : 0
    };

    console.log('Sending journal entry data:', entryData);

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create journal entry');
        }

        // Close modal
        closeJournalEntry();

        // Reload journal entries
        await loadJournalEntries();

        // Show success message
        alert('Journal entry saved successfully!');

    } catch (error) {
        console.error('Error creating journal entry:', error);
        alert(`Failed to save journal entry: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
    }
}

// Delete journal entry
async function deleteJournalEntry(entryId) {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/journal/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete journal entry');
        }

        // Reload journal entries
        await loadJournalEntries();

        alert('Journal entry deleted successfully!');

    } catch (error) {
        console.error('Error deleting journal entry:', error);
        alert(`Failed to delete journal entry: ${error.message}`);
    }
}

// ========== CHARACTER EDIT FUNCTIONS ==========

// Open edit character view
async function openEditCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        // Fetch full character data
        const response = await fetch(`/api/characters/${characterId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load character');
        }

        const character = await response.json();
        currentCharacter = character;

        // Display edit form in character-details div
        displayCharacterEditForm(character);

    } catch (error) {
        console.error('Error loading character for edit:', error);
        alert('Failed to load character data');
    }
}

// Display character edit form
function displayCharacterEditForm(character) {
    const container = document.getElementById('character-details');
    const listContainer = document.getElementById('characters-list');

    // Hide character list, show edit form
    listContainer.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = `
        <div class="character-sheet-header">
            <div>
                <h2>Edit: ${character.name}</h2>
                <p>Update your character information</p>
            </div>
            <button class="back-button" onclick="viewCharacter(${character.id})">← Cancel & View Character</button>
        </div>

        <div class="character-edit-container">
            <!-- Character Edit Tabs -->
            <div class="character-edit-tabs">
                <button class="char-tab-btn active" data-tab="basic" onclick="switchCharEditTab('basic')">Basic Info</button>
                <button class="char-tab-btn" data-tab="abilities" onclick="switchCharEditTab('abilities')">Abilities & Skills</button>
                <button class="char-tab-btn" data-tab="combat" onclick="switchCharEditTab('combat')">Combat & HP</button>
                <button class="char-tab-btn" data-tab="spells" onclick="switchCharEditTab('spells')">Spells</button>
                <button class="char-tab-btn" data-tab="equipment" onclick="switchCharEditTab('equipment')">Equipment</button>
                <button class="char-tab-btn" data-tab="features" onclick="switchCharEditTab('features')">Features & Traits</button>
                <button class="char-tab-btn" data-tab="details" onclick="switchCharEditTab('details')">Appearance & Story</button>
            </div>

            <form id="edit-character-form">
                ${generateBasicInfoTab(character)}
                ${generateAbilitiesTab(character)}
                ${generateCombatTab(character)}
                ${generateSpellsTab(character)}
                ${generateEquipmentTab(character)}
                ${generateFeaturesTab(character)}
                ${generateDetailsTab(character)}

                <!-- Save Button (shown on all tabs) -->
                <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--light);">
                    <button type="button" class="btn-secondary" onclick="viewCharacter(${character.id})">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    // Setup form submission
    const form = document.getElementById('edit-character-form');
    form.onsubmit = handleEditCharacter;
}

// Close edit character view
function closeEditCharacter() {
    // Go back to character list
    document.getElementById('character-details').style.display = 'none';
    document.getElementById('characters-list').style.display = 'grid';
    currentCharacter = null;
}

// Generate Basic Info Tab HTML
function generateBasicInfoTab(char) {
    return `
        <div id="edit-tab-basic" class="char-edit-tab active">
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-name">Character Name *</label>
                    <input type="text" id="edit-char-name" required value="${char.name || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-species">Species *</label>
                    <input type="text" id="edit-char-species" required value="${char.species || char.race || ''}" placeholder="Human, Elf, Dwarf, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-class">Class *</label>
                    <input type="text" id="edit-char-class" required value="${char.class_type || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-subclass">Subclass</label>
                    <input type="text" id="edit-char-subclass" value="${char.subclass || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-level">Level</label>
                    <input type="number" id="edit-char-level" min="1" max="20" value="${char.level || 1}">
                </div>
                <div class="form-group">
                    <label for="edit-char-background">Background</label>
                    <input type="text" id="edit-char-background" value="${char.background || ''}" placeholder="Soldier, Noble, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-size">Size</label>
                    <select id="edit-char-size">
                        <option value="Tiny" ${char.size === 'Tiny' ? 'selected' : ''}>Tiny</option>
                        <option value="Small" ${char.size === 'Small' ? 'selected' : ''}>Small</option>
                        <option value="Medium" ${char.size === 'Medium' || !char.size ? 'selected' : ''}>Medium</option>
                        <option value="Large" ${char.size === 'Large' ? 'selected' : ''}>Large</option>
                        <option value="Huge" ${char.size === 'Huge' ? 'selected' : ''}>Huge</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-char-speed">Speed (ft)</label>
                    <input type="number" id="edit-char-speed" value="${char.speed || 30}" min="0">
                </div>
                <div class="form-group">
                    <label for="edit-char-xp">Experience Points</label>
                    <input type="number" id="edit-char-xp" value="${char.experience_points || 0}" min="0">
                </div>

                <!-- Amber-Specific Fields -->
                <div class="form-group">
                    <label for="edit-char-order-chaos">Order/Chaos Balance</label>
                    <input type="number" id="edit-char-order-chaos" value="${char.order_chaos_value || 50}" min="0" max="100">
                    <small>0 = Pure Chaos, 50 = Neutral, 100 = Pure Order</small>
                </div>
                <div class="form-group">
                    <label for="edit-char-blood">Blood Purity</label>
                    <select id="edit-char-blood">
                        <option value="">None</option>
                        <option value="Half" ${char.blood_purity === 'Half' ? 'selected' : ''}>Half</option>
                        <option value="Pure" ${char.blood_purity === 'Pure' ? 'selected' : ''}>Pure</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-pattern" ${char.pattern_imprint ? 'checked' : ''}>
                        Has Pattern Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-logrus" ${char.logrus_imprint ? 'checked' : ''}>
                        Has Logrus Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-trump" ${char.trump_artist ? 'checked' : ''}>
                        Trump Artist
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Generate Abilities & Skills Tab HTML
function generateAbilitiesTab(char) {
    return `
        <div id="edit-tab-abilities" class="char-edit-tab" style="display: none;">
            <h4>Ability Scores</h4>
            <div class="form-grid abilities">
                <div class="form-group">
                    <label for="edit-char-str">Strength</label>
                    <input type="number" id="edit-char-str" min="1" max="30" value="${char.strength || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-dex">Dexterity</label>
                    <input type="number" id="edit-char-dex" min="1" max="30" value="${char.dexterity || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-con">Constitution</label>
                    <input type="number" id="edit-char-con" min="1" max="30" value="${char.constitution || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-int">Intelligence</label>
                    <input type="number" id="edit-char-int" min="1" max="30" value="${char.intelligence || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-wis">Wisdom</label>
                    <input type="number" id="edit-char-wis" min="1" max="30" value="${char.wisdom || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-cha">Charisma</label>
                    <input type="number" id="edit-char-cha" min="1" max="30" value="${char.charisma || 10}">
                </div>
            </div>

            <h4>Saving Throws</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-str" ${char.save_strength ? 'checked' : ''}> Strength</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-dex" ${char.save_dexterity ? 'checked' : ''}> Dexterity</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-con" ${char.save_constitution ? 'checked' : ''}> Constitution</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-int" ${char.save_intelligence ? 'checked' : ''}> Intelligence</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-wis" ${char.save_wisdom ? 'checked' : ''}> Wisdom</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-cha" ${char.save_charisma ? 'checked' : ''}> Charisma</label>
                </div>
            </div>

            <h4>Skills (Proficiency Level: 0=None, 1=Proficient, 2=Expertise)</h4>
            <div class="skills-grid">
                ${generateSkillSelect('acrobatics', 'Acrobatics (DEX)', char.skill_acrobatics || 0)}
                ${generateSkillSelect('animal-handling', 'Animal Handling (WIS)', char.skill_animal_handling || 0)}
                ${generateSkillSelect('arcana', 'Arcana (INT)', char.skill_arcana || 0)}
                ${generateSkillSelect('athletics', 'Athletics (STR)', char.skill_athletics || 0)}
                ${generateSkillSelect('deception', 'Deception (CHA)', char.skill_deception || 0)}
                ${generateSkillSelect('history', 'History (INT)', char.skill_history || 0)}
                ${generateSkillSelect('insight', 'Insight (WIS)', char.skill_insight || 0)}
                ${generateSkillSelect('intimidation', 'Intimidation (CHA)', char.skill_intimidation || 0)}
                ${generateSkillSelect('investigation', 'Investigation (INT)', char.skill_investigation || 0)}
                ${generateSkillSelect('medicine', 'Medicine (WIS)', char.skill_medicine || 0)}
                ${generateSkillSelect('nature', 'Nature (INT)', char.skill_nature || 0)}
                ${generateSkillSelect('perception', 'Perception (WIS)', char.skill_perception || 0)}
                ${generateSkillSelect('performance', 'Performance (CHA)', char.skill_performance || 0)}
                ${generateSkillSelect('persuasion', 'Persuasion (CHA)', char.skill_persuasion || 0)}
                ${generateSkillSelect('religion', 'Religion (INT)', char.skill_religion || 0)}
                ${generateSkillSelect('sleight-of-hand', 'Sleight of Hand (DEX)', char.skill_sleight_of_hand || 0)}
                ${generateSkillSelect('stealth', 'Stealth (DEX)', char.skill_stealth || 0)}
                ${generateSkillSelect('survival', 'Survival (WIS)', char.skill_survival || 0)}
            </div>
        </div>
    `;
}

// Helper function to generate skill select dropdowns
function generateSkillSelect(skillId, label, value) {
    return `
        <div class="form-group">
            <label for="edit-skill-${skillId}">${label}</label>
            <select id="edit-skill-${skillId}">
                <option value="0" ${value === 0 ? 'selected' : ''}>Not Proficient</option>
                <option value="1" ${value === 1 ? 'selected' : ''}>Proficient</option>
                <option value="2" ${value === 2 ? 'selected' : ''}>Expertise</option>
            </select>
        </div>
    `;
}

// Generate Combat & HP Tab HTML
function generateCombatTab(char) {
    return `
        <div id="edit-tab-combat" class="char-edit-tab" style="display: none;">
            <h4>Hit Points & Death Saves</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-max-hp">Max Hit Points</label>
                    <input type="number" id="edit-char-max-hp" min="1" value="${char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-current-hp">Current Hit Points</label>
                    <input type="number" id="edit-char-current-hp" min="0" value="${char.current_hp || char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-temp-hp">Temporary Hit Points</label>
                    <input type="number" id="edit-char-temp-hp" min="0" value="${char.temp_hit_points || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-hit-dice">Hit Dice (e.g., 5d8)</label>
                    <input type="text" id="edit-char-hit-dice" value="${char.hit_dice_total || '1d8'}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-successes">Death Save Successes</label>
                    <input type="number" id="edit-char-death-successes" min="0" max="3" value="${char.death_save_successes || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-failures">Death Save Failures</label>
                    <input type="number" id="edit-char-death-failures" min="0" max="3" value="${char.death_save_failures || 0}">
                </div>
            </div>

            <h4>Combat Stats</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-ac">Armor Class</label>
                    <input type="number" id="edit-char-ac" min="0" value="${char.armor_class || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-initiative">Initiative Bonus</label>
                    <input type="number" id="edit-char-initiative" value="${char.initiative_bonus || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-proficiency">Proficiency Bonus</label>
                    <input type="number" id="edit-char-proficiency" min="2" max="6" value="${char.proficiency_bonus || 2}">
                </div>
                <div class="form-group">
                    <label for="edit-char-passive-perception">Passive Perception</label>
                    <input type="number" id="edit-char-passive-perception" value="${char.passive_perception || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-inspiration">Heroic Inspiration</label>
                    <input type="number" id="edit-char-inspiration" min="0" value="${char.heroic_inspiration || 0}">
                </div>
            </div>

            <h4>Armor & Weapon Proficiencies</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-light" ${char.armor_light ? 'checked' : ''}> Light Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-medium" ${char.armor_medium ? 'checked' : ''}> Medium Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-heavy" ${char.armor_heavy ? 'checked' : ''}> Heavy Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-shields" ${char.armor_shields ? 'checked' : ''}> Shields</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-simple" ${char.weapons_simple ? 'checked' : ''}> Simple Weapons</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-martial" ${char.weapons_martial ? 'checked' : ''}> Martial Weapons</label>
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-tools">Tool Proficiencies</label>
                <textarea id="edit-char-tools" rows="2" placeholder="Comma-separated list, e.g., Thieves' Tools, Smith's Tools">${char.tools_proficiency || ''}</textarea>
            </div>
        </div>
    `;
}

// Generate Spells Tab HTML
function generateSpellsTab(char) {
    return `
        <div id="edit-tab-spells" class="char-edit-tab" style="display: none;">
            <h4>Spellcasting</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-spellcasting-ability">Spellcasting Ability</label>
                    <select id="edit-spellcasting-ability">
                        <option value="">None</option>
                        <option value="INT" ${char.spellcasting_ability === 'INT' ? 'selected' : ''}>Intelligence</option>
                        <option value="WIS" ${char.spellcasting_ability === 'WIS' ? 'selected' : ''}>Wisdom</option>
                        <option value="CHA" ${char.spellcasting_ability === 'CHA' ? 'selected' : ''}>Charisma</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-spell-save-dc">Spell Save DC</label>
                    <input type="number" id="edit-spell-save-dc" min="0" value="${char.spell_save_dc || 8}">
                </div>
                <div class="form-group">
                    <label for="edit-spell-attack-bonus">Spell Attack Bonus</label>
                    <input type="number" id="edit-spell-attack-bonus" value="${char.spell_attack_bonus || 0}">
                </div>
            </div>

            <h4>Spell Slots</h4>
            <div class="spell-slots-grid">
                ${generateSpellSlotRow(1, char)}
                ${generateSpellSlotRow(2, char)}
                ${generateSpellSlotRow(3, char)}
                ${generateSpellSlotRow(4, char)}
                ${generateSpellSlotRow(5, char)}
                ${generateSpellSlotRow(6, char)}
                ${generateSpellSlotRow(7, char)}
                ${generateSpellSlotRow(8, char)}
                ${generateSpellSlotRow(9, char)}
            </div>

            <p><em>Note: Detailed spell management (prepared spells, cantrips) will be added in a future update.</em></p>
        </div>
    `;
}

// Helper to generate spell slot row
function generateSpellSlotRow(level, char) {
    const total = char[`spell_slots_${level}_total`] || 0;
    const used = char[`spell_slots_${level}_expended`] || 0;
    return `
        <div class="form-group">
            <label>Level ${level}</label>
            <input type="number" id="edit-slots-${level}-total" min="0" placeholder="Total" value="${total}" style="width: 60px;">
            <input type="number" id="edit-slots-${level}-used" min="0" placeholder="Used" value="${used}" style="width: 60px;">
        </div>
    `;
}

// Generate Equipment Tab HTML
function generateEquipmentTab(char) {
    return `
        <div id="edit-tab-equipment" class="char-edit-tab" style="display: none;">
            <h4>Currency</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-copper">Copper Pieces (CP)</label>
                    <input type="number" id="edit-copper" min="0" value="${char.copper_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-silver">Silver Pieces (SP)</label>
                    <input type="number" id="edit-silver" min="0" value="${char.silver_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-electrum">Electrum Pieces (EP)</label>
                    <input type="number" id="edit-electrum" min="0" value="${char.electrum_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-gold">Gold Pieces (GP)</label>
                    <input type="number" id="edit-gold" min="0" value="${char.gold_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-platinum">Platinum Pieces (PP)</label>
                    <input type="number" id="edit-platinum" min="0" value="${char.platinum_pieces || 0}">
                </div>
            </div>

            <h4>Magic Item Attunement</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-attunement-used">Slots Used</label>
                    <input type="number" id="edit-attunement-used" min="0" max="3" value="${char.attunement_slots_used || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-attunement-max">Max Slots</label>
                    <input type="number" id="edit-attunement-max" min="0" max="6" value="${char.attunement_slots_max || 3}">
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-languages">Languages</label>
                <textarea id="edit-char-languages" rows="2" placeholder="Common, Elvish, Draconic, etc.">${char.languages || ''}</textarea>
                <small>Comma-separated list</small>
            </div>

            <p><em>Note: Detailed equipment, weapons, and gear are managed in the main Characters tab.</em></p>
        </div>
    `;
}

// Generate Features & Traits Tab HTML
function generateFeaturesTab(char) {
    return `
        <div id="edit-tab-features" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-class-features">Class Features</label>
                <textarea id="edit-char-class-features" rows="6" placeholder="List your class features here...">${char.class_features || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-species-traits">Species Traits</label>
                <textarea id="edit-char-species-traits" rows="6" placeholder="List your species traits here...">${char.species_traits || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-feats">Feats</label>
                <textarea id="edit-char-feats" rows="6" placeholder="List your feats here...">${char.feats || ''}</textarea>
            </div>
        </div>
    `;
}

// Generate Appearance & Story Tab HTML
function generateDetailsTab(char) {
    return `
        <div id="edit-tab-details" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-appearance">Appearance</label>
                <textarea id="edit-char-appearance" rows="4" placeholder="Describe your character's physical appearance...">${char.appearance || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-personality">Personality & Traits</label>
                <textarea id="edit-char-personality" rows="4" placeholder="Describe your character's personality...">${char.personality || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-backstory">Backstory</label>
                <textarea id="edit-char-backstory" rows="6" placeholder="Tell your character's story...">${char.backstory || ''}</textarea>
            </div>
        </div>
    `;
}

// Switch tabs within character edit view
function switchCharEditTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.char-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.char-edit-tab').forEach(content => {
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(`edit-tab-${tabName}`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
}

// Populate edit form with character data
function populateEditForm(character) {
    // Basic Info
    document.getElementById('edit-char-name').value = character.name || '';
    document.getElementById('edit-char-species').value = character.species || character.race || '';
    document.getElementById('edit-char-class').value = character.class_type || '';
    document.getElementById('edit-char-subclass').value = character.subclass || '';
    document.getElementById('edit-char-level').value = character.level || 1;
    document.getElementById('edit-char-background').value = character.background || '';
    document.getElementById('edit-char-size').value = character.size || 'Medium';
    document.getElementById('edit-char-speed').value = character.speed || 30;
    document.getElementById('edit-char-xp').value = character.experience_points || 0;

    // Amber-specific
    document.getElementById('edit-char-order-chaos').value = character.order_chaos_value || 50;
    document.getElementById('edit-char-blood').value = character.blood_purity || '';
    document.getElementById('edit-char-pattern').checked = !!character.pattern_imprint;
    document.getElementById('edit-char-logrus').checked = !!character.logrus_imprint;
    document.getElementById('edit-char-trump').checked = !!character.trump_artist;

    // Ability Scores
    document.getElementById('edit-char-str').value = character.strength || 10;
    document.getElementById('edit-char-dex').value = character.dexterity || 10;
    document.getElementById('edit-char-con').value = character.constitution || 10;
    document.getElementById('edit-char-int').value = character.intelligence || 10;
    document.getElementById('edit-char-wis').value = character.wisdom || 10;
    document.getElementById('edit-char-cha').value = character.charisma || 10;

    // Saving Throws
    document.getElementById('edit-save-str').checked = character.save_strength || false;
    document.getElementById('edit-save-dex').checked = character.save_dexterity || false;
    document.getElementById('edit-save-con').checked = character.save_constitution || false;
    document.getElementById('edit-save-int').checked = character.save_intelligence || false;
    document.getElementById('edit-save-wis').checked = character.save_wisdom || false;
    document.getElementById('edit-save-cha').checked = character.save_charisma || false;

    // Skills (18 skills)
    const skills = [
        'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception',
        'history', 'insight', 'intimidation', 'investigation', 'medicine',
        'nature', 'perception', 'performance', 'persuasion', 'religion',
        'sleight-of-hand', 'stealth', 'survival'
    ];
    skills.forEach(skill => {
        const dbSkill = skill.replace(/-/g, '_');
        const element = document.getElementById(`edit-skill-${skill}`);
        if (element) {
            element.value = character[`skill_${dbSkill}`] || 0;
        }
    });

    // Combat & HP
    document.getElementById('edit-char-max-hp').value = character.max_hp || 10;
    document.getElementById('edit-char-current-hp').value = character.current_hp || character.max_hp || 10;
    document.getElementById('edit-char-temp-hp').value = character.temp_hit_points || 0;
    document.getElementById('edit-char-hit-dice').value = character.hit_dice_total || '1d8';
    document.getElementById('edit-char-death-successes').value = character.death_save_successes || 0;
    document.getElementById('edit-char-death-failures').value = character.death_save_failures || 0;
    document.getElementById('edit-char-ac').value = character.armor_class || 10;
    document.getElementById('edit-char-initiative').value = character.initiative_bonus || 0;
    document.getElementById('edit-char-proficiency').value = character.proficiency_bonus || 2;
    document.getElementById('edit-char-passive-perception').value = character.passive_perception || 10;
    document.getElementById('edit-char-inspiration').value = character.heroic_inspiration || 0;

    // Armor & Weapon Proficiencies
    document.getElementById('edit-armor-light').checked = character.armor_light || false;
    document.getElementById('edit-armor-medium').checked = character.armor_medium || false;
    document.getElementById('edit-armor-heavy').checked = character.armor_heavy || false;
    document.getElementById('edit-armor-shields').checked = character.armor_shields || false;
    document.getElementById('edit-weapons-simple').checked = character.weapons_simple || false;
    document.getElementById('edit-weapons-martial').checked = character.weapons_martial || false;
    document.getElementById('edit-char-tools').value = character.tools_proficiency || '';

    // Equipment & Currency
    document.getElementById('edit-copper').value = character.copper_pieces || 0;
    document.getElementById('edit-silver').value = character.silver_pieces || 0;
    document.getElementById('edit-electrum').value = character.electrum_pieces || 0;
    document.getElementById('edit-gold').value = character.gold_pieces || 0;
    document.getElementById('edit-platinum').value = character.platinum_pieces || 0;
    document.getElementById('edit-attunement-used').value = character.attunement_slots_used || 0;
    document.getElementById('edit-attunement-max').value = character.attunement_slots_max || 3;
    document.getElementById('edit-char-languages').value = character.languages || '';

    // Features & Traits
    document.getElementById('edit-char-class-features').value = character.class_features || '';
    document.getElementById('edit-char-species-traits').value = character.species_traits || '';
    document.getElementById('edit-char-feats').value = character.feats || '';

    // Appearance & Story
    document.getElementById('edit-char-appearance').value = character.appearance || '';
    document.getElementById('edit-char-personality').value = character.personality || '';
    document.getElementById('edit-char-backstory').value = character.backstory || '';

    // Spells
    document.getElementById('edit-spellcasting-ability').value = character.spellcasting_ability || '';
    document.getElementById('edit-spell-save-dc').value = character.spell_save_dc || 8;
    document.getElementById('edit-spell-attack-bonus').value = character.spell_attack_bonus || 0;

    // Spell Slots (levels 1-9)
    for (let i = 1; i <= 9; i++) {
        document.getElementById(`edit-slots-${i}-total`).value = character[`spell_slots_${i}_total`] || 0;
        document.getElementById(`edit-slots-${i}-used`).value = character[`spell_slots_${i}_expended`] || 0;
    }
}

// Handle character edit submission
async function handleEditCharacter(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    // Gather all form data
    const characterData = {
        // Basic Info
        name: document.getElementById('edit-char-name').value,
        species: document.getElementById('edit-char-species').value,
        class_type: document.getElementById('edit-char-class').value,
        subclass: document.getElementById('edit-char-subclass').value || null,
        level: parseInt(document.getElementById('edit-char-level').value),
        background: document.getElementById('edit-char-background').value || null,
        size: document.getElementById('edit-char-size').value,
        speed: parseInt(document.getElementById('edit-char-speed').value),
        experience_points: parseInt(document.getElementById('edit-char-xp').value),

        // Amber-specific
        order_chaos_value: parseInt(document.getElementById('edit-char-order-chaos').value),
        blood_purity: document.getElementById('edit-char-blood').value || null,
        pattern_imprint: document.getElementById('edit-char-pattern').checked ? 1 : 0,
        logrus_imprint: document.getElementById('edit-char-logrus').checked ? 1 : 0,
        trump_artist: document.getElementById('edit-char-trump').checked ? 1 : 0,

        // Ability Scores
        strength: parseInt(document.getElementById('edit-char-str').value),
        dexterity: parseInt(document.getElementById('edit-char-dex').value),
        constitution: parseInt(document.getElementById('edit-char-con').value),
        intelligence: parseInt(document.getElementById('edit-char-int').value),
        wisdom: parseInt(document.getElementById('edit-char-wis').value),
        charisma: parseInt(document.getElementById('edit-char-cha').value),

        // Saving Throws
        save_strength: document.getElementById('edit-save-str').checked ? 1 : 0,
        save_dexterity: document.getElementById('edit-save-dex').checked ? 1 : 0,
        save_constitution: document.getElementById('edit-save-con').checked ? 1 : 0,
        save_intelligence: document.getElementById('edit-save-int').checked ? 1 : 0,
        save_wisdom: document.getElementById('edit-save-wis').checked ? 1 : 0,
        save_charisma: document.getElementById('edit-save-cha').checked ? 1 : 0,

        // Skills
        skill_acrobatics: parseInt(document.getElementById('edit-skill-acrobatics').value),
        skill_animal_handling: parseInt(document.getElementById('edit-skill-animal-handling').value),
        skill_arcana: parseInt(document.getElementById('edit-skill-arcana').value),
        skill_athletics: parseInt(document.getElementById('edit-skill-athletics').value),
        skill_deception: parseInt(document.getElementById('edit-skill-deception').value),
        skill_history: parseInt(document.getElementById('edit-skill-history').value),
        skill_insight: parseInt(document.getElementById('edit-skill-insight').value),
        skill_intimidation: parseInt(document.getElementById('edit-skill-intimidation').value),
        skill_investigation: parseInt(document.getElementById('edit-skill-investigation').value),
        skill_medicine: parseInt(document.getElementById('edit-skill-medicine').value),
        skill_nature: parseInt(document.getElementById('edit-skill-nature').value),
        skill_perception: parseInt(document.getElementById('edit-skill-perception').value),
        skill_performance: parseInt(document.getElementById('edit-skill-performance').value),
        skill_persuasion: parseInt(document.getElementById('edit-skill-persuasion').value),
        skill_religion: parseInt(document.getElementById('edit-skill-religion').value),
        skill_sleight_of_hand: parseInt(document.getElementById('edit-skill-sleight-of-hand').value),
        skill_stealth: parseInt(document.getElementById('edit-skill-stealth').value),
        skill_survival: parseInt(document.getElementById('edit-skill-survival').value),

        // Combat & HP
        max_hp: parseInt(document.getElementById('edit-char-max-hp').value),
        current_hp: parseInt(document.getElementById('edit-char-current-hp').value),
        temp_hit_points: parseInt(document.getElementById('edit-char-temp-hp').value),
        hit_dice_total: document.getElementById('edit-char-hit-dice').value,
        death_save_successes: parseInt(document.getElementById('edit-char-death-successes').value),
        death_save_failures: parseInt(document.getElementById('edit-char-death-failures').value),
        armor_class: parseInt(document.getElementById('edit-char-ac').value),
        initiative_bonus: parseInt(document.getElementById('edit-char-initiative').value),
        proficiency_bonus: parseInt(document.getElementById('edit-char-proficiency').value),
        passive_perception: parseInt(document.getElementById('edit-char-passive-perception').value),
        heroic_inspiration: parseInt(document.getElementById('edit-char-inspiration').value),

        // Armor & Weapon Proficiencies
        armor_light: document.getElementById('edit-armor-light').checked ? 1 : 0,
        armor_medium: document.getElementById('edit-armor-medium').checked ? 1 : 0,
        armor_heavy: document.getElementById('edit-armor-heavy').checked ? 1 : 0,
        armor_shields: document.getElementById('edit-armor-shields').checked ? 1 : 0,
        weapons_simple: document.getElementById('edit-weapons-simple').checked ? 1 : 0,
        weapons_martial: document.getElementById('edit-weapons-martial').checked ? 1 : 0,
        tools_proficiency: document.getElementById('edit-char-tools').value || null,

        // Equipment & Currency
        copper_pieces: parseInt(document.getElementById('edit-copper').value),
        silver_pieces: parseInt(document.getElementById('edit-silver').value),
        electrum_pieces: parseInt(document.getElementById('edit-electrum').value),
        gold_pieces: parseInt(document.getElementById('edit-gold').value),
        platinum_pieces: parseInt(document.getElementById('edit-platinum').value),
        attunement_slots_used: parseInt(document.getElementById('edit-attunement-used').value),
        attunement_slots_max: parseInt(document.getElementById('edit-attunement-max').value),
        languages: document.getElementById('edit-char-languages').value || null,

        // Features & Traits
        class_features: document.getElementById('edit-char-class-features').value || null,
        species_traits: document.getElementById('edit-char-species-traits').value || null,
        feats: document.getElementById('edit-char-feats').value || null,

        // Appearance & Story
        appearance: document.getElementById('edit-char-appearance').value || null,
        personality: document.getElementById('edit-char-personality').value || null,
        backstory: document.getElementById('edit-char-backstory').value || null,

        // Spells
        spellcasting_ability: document.getElementById('edit-spellcasting-ability').value || null,
        spell_save_dc: parseInt(document.getElementById('edit-spell-save-dc').value),
        spell_attack_bonus: parseInt(document.getElementById('edit-spell-attack-bonus').value),

        // Spell Slots (1-9)
        spell_slots_1_total: parseInt(document.getElementById('edit-slots-1-total').value),
        spell_slots_1_expended: parseInt(document.getElementById('edit-slots-1-used').value),
        spell_slots_2_total: parseInt(document.getElementById('edit-slots-2-total').value),
        spell_slots_2_expended: parseInt(document.getElementById('edit-slots-2-used').value),
        spell_slots_3_total: parseInt(document.getElementById('edit-slots-3-total').value),
        spell_slots_3_expended: parseInt(document.getElementById('edit-slots-3-used').value),
        spell_slots_4_total: parseInt(document.getElementById('edit-slots-4-total').value),
        spell_slots_4_expended: parseInt(document.getElementById('edit-slots-4-used').value),
        spell_slots_5_total: parseInt(document.getElementById('edit-slots-5-total').value),
        spell_slots_5_expended: parseInt(document.getElementById('edit-slots-5-used').value),
        spell_slots_6_total: parseInt(document.getElementById('edit-slots-6-total').value),
        spell_slots_6_expended: parseInt(document.getElementById('edit-slots-6-used').value),
        spell_slots_7_total: parseInt(document.getElementById('edit-slots-7-total').value),
        spell_slots_7_expended: parseInt(document.getElementById('edit-slots-7-used').value),
        spell_slots_8_total: parseInt(document.getElementById('edit-slots-8-total').value),
        spell_slots_8_expended: parseInt(document.getElementById('edit-slots-8-used').value),
        spell_slots_9_total: parseInt(document.getElementById('edit-slots-9-total').value),
        spell_slots_9_expended: parseInt(document.getElementById('edit-slots-9-used').value)
    };

    try {
        const response = await fetch(`/api/characters/${currentCharacter.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(characterData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update character');
        }

        // Close modal
        closeEditCharacter();

        // Reload characters
        await loadCharacters();

        // If viewing character sheet, reload it
        if (document.getElementById('character-details').style.display === 'block') {
            await viewCharacter(currentCharacter.id);
        }

        // Show success message
        alert('Character updated successfully!');

    } catch (error) {
        console.error('Error updating character:', error);
        alert(`Failed to update character: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
}

// ========== CLAIMS FUNCTIONS ==========

const commonAttributes = [
    'Strength', 'Speed', 'Combat', 'Stealth', 'Intelligence',
    'Persuasion', 'Endurance', 'Archery', 'Swordsmanship', 'Magic',
    'Perception', 'Charisma', 'Wisdom', 'Leadership', 'Tactics'
];

let claimPool = null;
let currentClaims = {};
let claimSelectedCharacter = null;

// Load claims for selected character
async function loadCharacterClaims(characterId) {
    const token = localStorage.getItem('token');
    claimSelectedCharacter = characterId;

    try {
        // Load claim pool
        const poolResponse = await fetch(`/api/claims/pool/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (poolResponse.ok) {
            claimPool = await poolResponse.json();
        } else {
            // No pool exists yet
            claimPool = { total_points: 10, spent_points: 0 };
        }

        // Load existing claims
        const claimsResponse = await fetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const claims = await claimsResponse.json();

        currentClaims = {};
        claims.forEach(claim => {
            currentClaims[claim.attribute_name] = claim;
        });

        displayClaimsInterface();

    } catch (error) {
        console.error('Error loading claims:', error);
        const container = document.getElementById('claims-content');
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load claims: ${error.message}</p>
            </div>
        `;
    }
}

// Display claims interface
function displayClaimsInterface() {
    const container = document.getElementById('claims-content');

    const character = allCharacters.find(c => c.id === claimSelectedCharacter);
    if (!character) return;

    const availablePoints = claimPool.total_points - claimPool.spent_points;

    container.innerHTML = `
        <div class="info-box" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid var(--primary);">
            <h4 style="margin-top: 0;">How Attribute Claims Work:</h4>
            <ul>
                <li>Spend claim points to assert you're the best at specific attributes</li>
                <li>You get <strong>+1 bonus</strong> on rolls for claimed attributes</li>
                <li>The character who invests the most points in an attribute is secretly the best</li>
                <li>Provide justification for your claims based on your backstory and abilities</li>
            </ul>
        </div>

        <div class="point-pool" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">Available Claim Points</h2>
            <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">${availablePoints}</div>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 14px;">
                <div><strong>Total:</strong> ${claimPool.total_points}</div>
                <div><strong>Spent:</strong> ${claimPool.spent_points}</div>
            </div>
        </div>

        <h3>Your Claims for ${character.name}</h3>
        <div class="claims-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
            ${commonAttributes.map(attr => {
                const claim = currentClaims[attr];
                return `
                    <div class="claim-card" style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${claim ? 'border-left: 4px solid var(--success);' : ''}">
                        <h3 style="margin: 0 0 15px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>${attr}</span>
                            ${claim ?
                                `<span style="background: var(--success); color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">${claim.points_spent} pts</span>` :
                                '<span style="color: #999; font-style: italic; font-size: 14px;">No claim</span>'}
                        </h3>
                        ${claim ? `
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px; margin: 10px 0; font-style: italic;">
                                "${claim.justification}"
                            </div>
                        ` : ''}
                        ${availablePoints > 0 ? `
                            <button class="btn-primary" style="width: 100%; padding: 10px; margin-top: 10px;" onclick="openClaimModal('${attr}')">
                                ${claim ? 'Add More Points' : 'Make Claim'}
                            </button>
                        ` : (!claim ? `
                            <p style="text-align: center; color: #999; font-size: 14px; margin-top: 10px;">
                                No points available
                            </p>
                        ` : '')}
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Claim Modal -->
        <div id="claim-modal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
            <div class="modal-content" style="background: white; margin: 5% auto; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h2 id="claim-modal-title" style="margin-top: 0; color: var(--primary);">Add Points to Claim</h2>

                <form id="claim-form">
                    <input type="hidden" id="modal-attribute">

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="points-to-add">Points to Add:</label>
                        <input type="number" id="points-to-add" min="1" max="${availablePoints}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        <small>Available: <span id="modal-available-points">${availablePoints}</span> points</small>
                    </div>

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="claim-justification">Justification: *</label>
                        <textarea id="claim-justification" required placeholder="Explain why your character is the best at this attribute. Reference your backstory, training, or natural abilities..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 100px; resize: vertical; font-family: inherit;"></textarea>
                    </div>

                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn-secondary" onclick="closeClaimModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Points</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Setup claim form submission
    const form = document.getElementById('claim-form');
    form.onsubmit = handleClaimSubmit;
}

// Open claim modal
function openClaimModal(attribute) {
    const claim = currentClaims[attribute];
    const availablePoints = claimPool.total_points - claimPool.spent_points;

    document.getElementById('claim-modal-title').textContent = claim ?
        `Add Points to ${attribute}` :
        `Claim to be Best at ${attribute}`;

    document.getElementById('modal-attribute').value = attribute;
    document.getElementById('modal-available-points').textContent = availablePoints;
    document.getElementById('points-to-add').max = availablePoints;
    document.getElementById('points-to-add').value = Math.min(1, availablePoints);

    if (claim) {
        document.getElementById('claim-justification').value = claim.justification;
    } else {
        document.getElementById('claim-justification').value = '';
    }

    document.getElementById('claim-modal').style.display = 'flex';
    document.getElementById('claim-modal').style.justifyContent = 'center';
    document.getElementById('claim-modal').style.alignItems = 'center';
}

// Close claim modal
function closeClaimModal() {
    document.getElementById('claim-modal').style.display = 'none';
    document.getElementById('claim-form').reset();
}

// Handle claim form submission
async function handleClaimSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    const attribute = document.getElementById('modal-attribute').value;
    const pointsToAdd = parseInt(document.getElementById('points-to-add').value);
    const justification = document.getElementById('claim-justification').value;

    try {
        const response = await fetch('/api/claims/allocate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                character_id: claimSelectedCharacter,
                attribute_name: attribute,
                points_to_add: pointsToAdd,
                justification: justification
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to allocate points');
        }

        // Reload claims
        await loadCharacterClaims(claimSelectedCharacter);
        closeClaimModal();

        alert('Claim points allocated successfully!');

    } catch (error) {
        console.error('Error allocating points:', error);
        alert('Failed to allocate points: ' + error.message);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.id === 'claim-modal') {
        closeClaimModal();
    }
});

// ============================================
// DICE ROLLER FUNCTIONALITY
// ============================================

// Dice Roller State
let diceSelectedCharacter = null;
let diceSelectedSystem = 'd20'; // Default to d20
let diceSelectedAttribute = null;
let diceCharacterClaims = {};
let rollHistory = [];

// commonAttributes is already declared above in CLAIMS FUNCTIONS section

// Initialize dice roller when tab is loaded
function initDiceRoller() {
    loadDiceCharacters();

    // Set up character selection listener
    document.getElementById('dice-character-select').addEventListener('change', (e) => {
        const characterId = e.target.value;
        if (characterId) {
            diceSelectedCharacter = parseInt(characterId);
            loadDiceCharacterData(characterId);
        } else {
            diceSelectedCharacter = null;
            hideDiceSections();
        }
    });
}

// Load characters for dice roller
async function loadDiceCharacters() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const characters = await response.json();
        const select = document.getElementById('dice-character-select');

        select.innerHTML = '<option value="">Choose a character...</option>';
        characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = char.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

// Load character data and claims for dice rolling
async function loadDiceCharacterData(characterId) {
    const token = localStorage.getItem('token');

    try {
        // Load character's claims
        const claimsResponse = await fetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const claims = await claimsResponse.json();
        diceCharacterClaims = {};
        claims.forEach(claim => {
            diceCharacterClaims[claim.attribute_name] = claim;
        });

        // Show dice system selection
        document.getElementById('dice-system-section').style.display = 'block';
        selectDiceSystem(diceSelectedSystem);

    } catch (error) {
        console.error('Error loading character data:', error);
        alert('Failed to load character data: ' + error.message);
    }
}

// Select dice system (d20, d10, d6)
function selectDiceSystem(system) {
    diceSelectedSystem = system;

    // Update button states
    document.querySelectorAll('.dice-system-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.system === system) {
            btn.classList.add('active');
        }
    });

    // Show appropriate sections based on system
    if (system === 'd20') {
        // Show attribute selection for d20 (with claims integration)
        document.getElementById('attribute-section').style.display = 'block';
        document.getElementById('generic-roll-section').style.display = 'none';
        displayAttributeButtons();
    } else {
        // Show generic roll configuration for d10 and d6
        document.getElementById('attribute-section').style.display = 'none';
        document.getElementById('generic-roll-section').style.display = 'block';
        document.getElementById('roll-button-section').style.display = 'block';
    }

    // Reset selected attribute
    diceSelectedAttribute = null;
}

// Display attribute buttons for d20 system
function displayAttributeButtons() {
    const container = document.getElementById('attribute-buttons');
    container.innerHTML = '';

    commonAttributes.forEach(attr => {
        const btn = document.createElement('button');
        btn.className = 'attribute-btn';
        btn.textContent = attr;
        btn.onclick = () => selectAttribute(attr);

        // Mark if character has a claim on this attribute
        if (diceCharacterClaims[attr] && diceCharacterClaims[attr].points_spent > 0) {
            btn.classList.add('has-claim');
        }

        container.appendChild(btn);
    });
}

// Select attribute for d20 roll
function selectAttribute(attribute) {
    diceSelectedAttribute = attribute;

    // Update button states
    document.querySelectorAll('.attribute-btn').forEach(btn => {
        btn.style.background = '';
        if (btn.textContent === attribute) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        }
    });

    // Show roll button
    document.getElementById('roll-button-section').style.display = 'block';
}

// Roll dice
async function rollDice() {
    const token = localStorage.getItem('token');

    if (!diceSelectedCharacter) {
        alert('Please select a character first');
        return;
    }

    let rollResult;

    try {
        // Show rolling animation
        showDiceAnimation();

        if (diceSelectedSystem === 'd20') {
            // D20 system with claims
            if (!diceSelectedAttribute) {
                alert('Please select an attribute');
                hideDiceAnimation();
                return;
            }

            rollResult = await rollD20WithClaims();

        } else if (diceSelectedSystem === 'd10') {
            // World of Darkness d10 system
            rollResult = rollWorldOfDarkness();

        } else if (diceSelectedSystem === 'd6') {
            // Car Wars 2d6 system
            rollResult = rollCarWars();
        }

        // Wait for animation to complete (600ms)
        await new Promise(resolve => setTimeout(resolve, 600));

        // Hide animation and display result
        hideDiceAnimation();
        displayRollResult(rollResult);

        // Add to history
        addToRollHistory(rollResult);

    } catch (error) {
        console.error('Error rolling dice:', error);
        hideDiceAnimation();
        alert('Failed to roll dice: ' + error.message);
    }
}

// Show dice rolling animation
function showDiceAnimation() {
    const container = document.getElementById('current-roll-result');
    container.innerHTML = '<div class="dice-animation"><div class="dice-icon">🎲</div></div>';
    document.getElementById('roll-result-section').style.display = 'block';
}

// Hide dice animation
function hideDiceAnimation() {
    // Animation will be replaced by actual result
}

// Roll d20 with claims integration
async function rollD20WithClaims() {
    const token = localStorage.getItem('token');
    const baseRoll = Math.floor(Math.random() * 20) + 1;

    // Call API to resolve bonuses
    const response = await fetch('/api/claims/resolve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            character_id: diceSelectedCharacter,
            attribute_name: diceSelectedAttribute,
            roll_result: baseRoll
        })
    });

    if (!response.ok) {
        throw new Error('Failed to resolve roll');
    }

    const result = await response.json();

    return {
        system: 'd20',
        attribute: diceSelectedAttribute,
        baseRoll: baseRoll,
        bonus: result.total_bonus,
        total: result.final_result,
        message: result.message,
        isCriticalSuccess: baseRoll === 20,
        isCriticalFailure: baseRoll === 1,
        timestamp: new Date()
    };
}

// Roll World of Darkness (d10 pool system)
function rollWorldOfDarkness() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let successes = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        rolls.push(roll);

        if (roll >= 8) {
            successes++;
        }

        if (roll === 10) {
            successes++; // Double success on 10
        }
    }

    return {
        system: 'd10',
        purpose: purpose,
        rolls: rolls,
        successes: successes,
        total: successes,
        isCriticalSuccess: rolls.some(r => r === 10),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Roll Car Wars (2d6 system)
function rollCarWars() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const modifier = parseInt(document.getElementById('dice-modifier').value) || 0;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let sum = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rolls.push(roll);
        sum += roll;
    }

    const total = sum + modifier;

    return {
        system: 'd6',
        purpose: purpose,
        rolls: rolls,
        baseTotal: sum,
        modifier: modifier,
        total: total,
        isCriticalSuccess: rolls.every(r => r === 6),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Display roll result
function displayRollResult(result) {
    const container = document.getElementById('current-roll-result');
    let html = '';

    let resultClass = '';
    if (result.isCriticalSuccess) {
        resultClass = 'critical-success';
    } else if (result.isCriticalFailure) {
        resultClass = 'critical-failure';
    }

    if (result.system === 'd20') {
        html = `
            <div class="result-label">D20 Roll for ${result.attribute}</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Base Roll:</strong> ${result.baseRoll}</div>
                <div><strong>Bonus:</strong> +${result.bonus}</div>
            </div>
            <div class="result-details">${result.message}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 CRITICAL SUCCESS!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 CRITICAL FAILURE!</div>' : ''}
        `;
    } else if (result.system === 'd10') {
        html = `
            <div class="result-label">World of Darkness Roll</div>
            <div class="result-value">${result.successes} Successes</div>
            <div class="result-breakdown">
                <div><strong>Dice Pool:</strong> ${result.rolls.join(', ')}</div>
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 Exceptional Success!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 Botch!</div>' : ''}
        `;
    } else if (result.system === 'd6') {
        html = `
            <div class="result-label">Car Wars Roll</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Dice:</strong> ${result.rolls.join(', ')}</div>
                <div><strong>Base Sum:</strong> ${result.baseTotal}</div>
                ${result.modifier !== 0 ? `<div><strong>Modifier:</strong> ${result.modifier > 0 ? '+' : ''}${result.modifier}</div>` : ''}
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 All Sixes!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 All Ones!</div>' : ''}
        `;
    }

    container.innerHTML = html;
    container.className = `roll-result ${resultClass}`;
    document.getElementById('roll-result-section').style.display = 'block';
}

// Add roll to history
function addToRollHistory(result) {
    rollHistory.unshift(result);

    // Keep only last 20 rolls
    if (rollHistory.length > 20) {
        rollHistory = rollHistory.slice(0, 20);
    }

    displayRollHistory();
}

// Display roll history
function displayRollHistory() {
    const container = document.getElementById('roll-history');

    if (rollHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No rolls yet</p>';
        return;
    }

    let html = '';

    rollHistory.forEach(roll => {
        let historyClass = '';
        if (roll.isCriticalSuccess) {
            historyClass = 'critical-success';
        } else if (roll.isCriticalFailure) {
            historyClass = 'critical-failure';
        }

        let displayValue, breakdown;

        if (roll.system === 'd20') {
            displayValue = roll.total;
            breakdown = `d20: ${roll.baseRoll} + ${roll.bonus} (${roll.attribute})`;
        } else if (roll.system === 'd10') {
            displayValue = `${roll.successes} succ`;
            breakdown = `${roll.rolls.length}d10: ${roll.rolls.join(', ')} (${roll.purpose})`;
        } else if (roll.system === 'd6') {
            displayValue = roll.total;
            breakdown = `${roll.rolls.length}d6: ${roll.rolls.join(', ')}${roll.modifier !== 0 ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : ''} (${roll.purpose})`;
        }

        const timeStr = roll.timestamp.toLocaleTimeString();

        html += `
            <div class="history-item ${historyClass}">
                <div class="history-roll">${displayValue}</div>
                <div class="history-details">
                    <div class="history-breakdown">${breakdown}</div>
                    <div class="history-timestamp">${timeStr}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('roll-history-section').style.display = 'block';
}

// Hide all dice sections
function hideDiceSections() {
    document.getElementById('dice-system-section').style.display = 'none';
    document.getElementById('attribute-section').style.display = 'none';
    document.getElementById('generic-roll-section').style.display = 'none';
    document.getElementById('roll-button-section').style.display = 'none';
    document.getElementById('roll-result-section').style.display = 'none';
    document.getElementById('roll-history-section').style.display = 'none';
}

// Initialize dice roller when dice tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const diceTab = document.querySelector('[data-tab="dice"]');
    if (diceTab) {
        diceTab.addEventListener('click', () => {
            initDiceRoller();
        });
    }
});

// ============================================
// SESSION TRACKER FUNCTIONALITY
// ============================================

// Session Tracker State
let activeSession = null;
let combatants = [];
let currentTurnIndex = 0;
let sessionHistory = [];

// Create new session
function createNewSession() {
    const title = prompt('Enter session title:', `Session ${new Date().toLocaleDateString()}`);

    if (!title) return;

    activeSession = {
        id: Date.now(),
        title: title,
        startTime: new Date(),
        notes: '',
        combats: []
    };

    displayActiveSession();
}

// Display active session
function displayActiveSession() {
    if (!activeSession) return;

    document.getElementById('active-session-section').style.display = 'block';
    document.getElementById('active-session-title').textContent = activeSession.title;
    document.getElementById('active-session-notes').value = activeSession.notes || '';
}

// Save session notes
function saveSessionNotes() {
    if (!activeSession) return;

    activeSession.notes = document.getElementById('active-session-notes').value;
    alert('Session notes saved!');
}

// Toggle combat tracker
function toggleCombatTracker() {
    const tracker = document.getElementById('combat-tracker');

    if (tracker.style.display === 'none') {
        tracker.style.display = 'block';

        if (combatants.length === 0) {
            // Start new combat
            addCombatant();
        } else {
            displayCombatTracker();
        }
    } else {
        tracker.style.display = 'none';
    }
}

// Add combatant to combat
function addCombatant() {
    const name = prompt('Combatant name:');
    if (!name) return;

    const initiative = parseInt(prompt('Initiative roll:', '10'));
    const maxHP = parseInt(prompt('Max HP:', '20'));
    const type = confirm('Is this a player character?') ? 'player' : 'enemy';

    const combatant = {
        id: Date.now(),
        name: name,
        initiative: initiative || 10,
        maxHP: maxHP || 20,
        currentHP: maxHP || 20,
        type: type,
        conditions: []
    };

    combatants.push(combatant);

    // Sort by initiative (descending)
    combatants.sort((a, b) => b.initiative - a.initiative);

    displayCombatTracker();
}

// Display combat tracker
function displayCombatTracker() {
    const container = document.getElementById('initiative-list');

    if (combatants.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No combatants yet. Click "Add Combatant" to start!</p>';
        return;
    }

    let html = '';

    combatants.forEach((combatant, index) => {
        const hpPercent = (combatant.currentHP / combatant.maxHP) * 100;
        const hpBarClass = hpPercent < 30 ? 'low' : '';
        const isActiveTurn = index === currentTurnIndex;

        html += `
            <div class="combatant-card ${combatant.type} ${isActiveTurn ? 'active-turn' : ''}">
                <div class="combatant-info">
                    <div class="combatant-initiative">${combatant.initiative}</div>
                    <div class="combatant-name">${combatant.name}${isActiveTurn ? ' 👉' : ''}</div>
                    <div class="combatant-hp">
                        <div class="hp-bar">
                            <div class="hp-bar-fill ${hpBarClass}" style="width: ${hpPercent}%"></div>
                        </div>
                        <div class="hp-text">${combatant.currentHP} / ${combatant.maxHP}</div>
                    </div>
                    <div class="combatant-conditions">
                        ${combatant.conditions.map(c => `<span class="condition-tag">${c}</span>`).join('')}
                    </div>
                </div>
                <div class="combatant-actions">
                    <button class="btn-icon" onclick="adjustHP(${combatant.id}, -1)" title="Damage">-</button>
                    <button class="btn-icon" onclick="adjustHP(${combatant.id}, 1)" title="Heal">+</button>
                    <button class="btn-icon" onclick="addCondition(${combatant.id})" title="Add Condition">⚠</button>
                    <button class="btn-icon danger" onclick="removeCombatant(${combatant.id})" title="Remove">×</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Adjust combatant HP
function adjustHP(combatantId, amount) {
    const combatant = combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    if (amount < 0) {
        // Damage
        const damage = parseInt(prompt('Damage amount:', '5'));
        if (damage) {
            combatant.currentHP = Math.max(0, combatant.currentHP - damage);
        }
    } else {
        // Heal
        const healing = parseInt(prompt('Healing amount:', '5'));
        if (healing) {
            combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + healing);
        }
    }

    displayCombatTracker();
}

// Add condition to combatant
function addCondition(combatantId) {
    const combatant = combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const condition = prompt('Condition (e.g., Stunned, Prone, Blinded):');
    if (condition) {
        combatant.conditions.push(condition);
        displayCombatTracker();
    }
}

// Remove combatant from combat
function removeCombatant(combatantId) {
    if (!confirm('Remove this combatant?')) return;

    combatants = combatants.filter(c => c.id !== combatantId);

    // Adjust current turn if needed
    if (currentTurnIndex >= combatants.length) {
        currentTurnIndex = 0;
    }

    displayCombatTracker();
}

// Next turn in combat
function nextTurn() {
    if (combatants.length === 0) return;

    currentTurnIndex = (currentTurnIndex + 1) % combatants.length;

    if (currentTurnIndex === 0) {
        // New round
        if (confirm('Starting a new round. Clear any end-of-round conditions?')) {
            // Could add logic here to clear conditions that last "until end of round"
        }
    }

    displayCombatTracker();
}

// End combat
function endCombat() {
    if (!confirm('End this combat encounter?')) return;

    // Save combat to session
    if (activeSession) {
        activeSession.combats.push({
            participants: combatants.map(c => c.name),
            duration: combatants.length + ' rounds',
            timestamp: new Date()
        });
    }

    combatants = [];
    currentTurnIndex = 0;
    document.getElementById('combat-tracker').style.display = 'none';
}

// End active session
function endActiveSession() {
    if (!activeSession) return;

    if (!confirm('End this session? Notes will be saved to history.')) return;

    activeSession.endTime = new Date();
    sessionHistory.unshift(activeSession);

    // Clear active session
    activeSession = null;
    combatants = [];
    currentTurnIndex = 0;

    document.getElementById('active-session-section').style.display = 'none';
    document.getElementById('combat-tracker').style.display = 'none';

    displaySessionHistory();
    alert('Session ended and saved to history!');
}

// Display session history
function displaySessionHistory() {
    const container = document.getElementById('session-history-list');

    if (sessionHistory.length === 0) {
        container.innerHTML = `
            <div class="info-message">
                <p>No session history yet. Complete a session to see it here!</p>
            </div>
        `;
        return;
    }

    let html = '';

    sessionHistory.forEach((session, index) => {
        const date = new Date(session.startTime).toLocaleDateString();
        const time = new Date(session.startTime).toLocaleTimeString();
        const duration = session.endTime ?
            Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60) + ' minutes' :
            'Ongoing';

        const notesPreview = session.notes ?
            session.notes.substring(0, 150) + (session.notes.length > 150 ? '...' : '') :
            'No notes recorded';

        html += `
            <div class="session-history-item" onclick="viewSessionDetails(${index})">
                <div class="session-history-header">
                    <div class="session-history-title">${session.title}</div>
                    <div class="session-history-date">${date} at ${time}</div>
                </div>
                <div class="session-history-summary">
                    <strong>Duration:</strong> ${duration}<br>
                    <strong>Combats:</strong> ${session.combats.length}<br>
                    <strong>Notes:</strong> ${notesPreview}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// View session details
function viewSessionDetails(index) {
    const session = sessionHistory[index];
    if (!session) return;

    const date = new Date(session.startTime).toLocaleDateString();
    const time = new Date(session.startTime).toLocaleTimeString();

    alert(
        `${session.title}\n\n` +
        `Date: ${date} at ${time}\n` +
        `Combats: ${session.combats.length}\n\n` +
        `Notes:\n${session.notes || 'No notes recorded'}`
    );
}

// ── Known Shadows ─────────────────────────────────────────────────────────────

async function loadVisitedShadows() {
    const container = document.getElementById('player-shadows-list');
    if (!currentCharacter) {
        container.innerHTML = '<div class="info-message"><p>Select a character from "My Characters" to see the shadows they have felt.</p></div>';
        return;
    }
    container.innerHTML = '<div class="loading">Loading shadows…</div>';
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/shadows/character/${currentCharacter.id}/visited`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load visited shadows');
        const visited = await response.json();
        renderVisitedShadows(visited);
    } catch (err) {
        console.error('Error loading visited shadows:', err);
        container.innerHTML = '<div class="info-message"><p>Could not load shadow data.</p></div>';
    }
}

function renderVisitedShadows(visited) {
    const container = document.getElementById('player-shadows-list');
    if (!visited.length) {
        container.innerHTML = '<div class="info-message"><p>No shadows have left their mark on this character yet. Participate in sessions to begin feeling the worlds you pass through.</p></div>';
        return;
    }
    container.innerHTML = visited.map(s => {
        const style = visitedShadowCardStyle(s.pattern_influence);
        const infLabel = visitedInfluenceLabel(s.pattern_influence);
        const depth = shadowDepth(s.visit_count);
        const balanceBar = visitedBalanceBar(s);
        const firstDate = s.first_visit_date ? new Date(s.first_visit_date).toLocaleDateString() : '—';
        const lastDate  = s.last_visit_date  ? new Date(s.last_visit_date).toLocaleDateString()  : '—';
        const visitText = s.visit_count === 1 ? '1 session' : `${s.visit_count} sessions`;
        return `
        <div class="shadow-player-card" style="${style}">
            <h3>${escHtmlP(s.name)}</h3>
            <span class="shadow-depth-badge">${depth.label}</span>
            <p class="shadow-depth-flavor">${depth.flavor}</p>
            ${s.description ? `<p class="shadow-desc">${escHtmlP(s.description)}</p>` : ''}
            <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
                <span class="shadow-influence-tag">${escHtmlP(infLabel)}</span>
                ${s.corruption_status ? `<span style="font-size:0.8rem;color:#c0392b;font-style:italic">${escHtmlP(s.corruption_status)}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:0.8rem;color:#888;white-space:nowrap">${visitedBarLabel(s)}</span>
                <div style="flex:1;height:7px;border-radius:4px;overflow:hidden;${balanceBar}"></div>
            </div>
            <div class="shadow-meta">
                <span>First felt: ${firstDate} (Session ${s.first_session_number})</span>
                ${s.visit_count > 1 ? `<span>Last visited: ${lastDate}</span>` : ''}
                <span>${visitText}</span>
            </div>
        </div>`;
    }).join('');
}

function shadowDepth(visitCount) {
    if (visitCount >= 10) return { label: 'Part of You',      flavor: 'This world is woven into your very soul.' };
    if (visitCount >= 4)  return { label: 'Well Known',        flavor: "This shadow's rhythms move through your blood." };
    if (visitCount >= 2)  return { label: 'Familiar Ground',   flavor: 'You can feel its nature without concentration.' };
    return                       { label: 'First Impression',  flavor: "The shadow's essence has touched your awareness." };
}

function visitedInfluenceLabel(val) {
    if (val === 'First Pattern')  return 'Pattern';
    if (val === 'Corwin Pattern') return 'Argent Refrain';
    return val || 'None';
}

function visitedShadowCardStyle(val) {
    const label = visitedInfluenceLabel(val);
    const map = {
        'Pattern':        ['rgba(22,160,133,0.1)',  'rgba(22,160,133,0.5)'],
        'Argent Refrain': ['rgba(90,90,154,0.1)',   'rgba(90,90,154,0.5)'],
        'Logrus':         ['rgba(192,57,43,0.1)',   'rgba(192,57,43,0.5)'],
        'Nexus':          ['rgba(184,134,11,0.1)',  'rgba(184,134,11,0.5)'],
        'Mixed':          ['rgba(142,68,173,0.1)',  'rgba(142,68,173,0.5)'],
    };
    const colors = map[label];
    if (!colors) return '';
    return `background:${colors[0]};border-left-color:${colors[1]};`;
}

function visitedBarLabel(s) {
    return (s.dream_level || 0) > 0 ? 'Order/Dream/Chaos:' : 'Order/Chaos:';
}

function visitedBalanceBar(s) {
    const o = s.order_level || 0;
    const d = s.dream_level || 0;
    const c = s.chaos_level || 0;
    if (d > 0) {
        const total = o + d + c || 100;
        const op  = (o / total * 100).toFixed(1);
        const mid = ((o + d / 2) / total * 100).toFixed(1);
        const cp  = ((o + d) / total * 100).toFixed(1);
        return `background:linear-gradient(90deg,#3d7ab5 ${op}%,#080818 ${op}%,#e8e4ff ${mid}%,#080818 ${cp}%,#b03030 ${cp}%)`;
    }
    return `background:linear-gradient(90deg,#3498db ${o}%,#e74c3c ${o}%)`;
}

function escHtmlP(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Wizard field-focus delegation (runs once at page load) ────
(function () {
    const body = document.querySelector('.wizard-body');
    if (!body) return;
    body.addEventListener('focusin', e => {
        const info = _fieldInfoForElement(e.target);
        if (info) wizardFocusField(info);
    });
    body.addEventListener('focusout', e => {
        if (!_fieldInfoForElement(e.target)) return;
        if (!_fieldInfoForElement(e.relatedTarget)) wizardBlurField();
    });
}());
