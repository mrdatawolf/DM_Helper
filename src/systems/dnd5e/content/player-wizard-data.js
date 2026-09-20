const STAT_KEYS = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);
const STAT_FULL = Object.freeze({
    STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution',
    INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma'
});

const CLASSES_5E = Object.freeze([
    { id: 'Barbarian', name: 'Barbarian', hitDie: 12, primary: ['STR'], secondary: ['CON'], saves: ['STR', 'CON'], minStats: { STR: 13 }, desc: 'Primal warriors who channel rage into devastating combat power.' },
    { id: 'Bard', name: 'Bard', hitDie: 8, primary: ['CHA'], secondary: ['DEX'], saves: ['DEX', 'CHA'], minStats: { CHA: 13 }, desc: 'Versatile performers who weave magic through art, music, and words.' },
    { id: 'Cleric', name: 'Cleric', hitDie: 8, primary: ['WIS'], secondary: ['CON'], saves: ['WIS', 'CHA'], minStats: { WIS: 13 }, desc: 'Divine servants who draw power from devotion to a deity or cosmic force.' },
    { id: 'Druid', name: 'Druid', hitDie: 8, primary: ['WIS'], secondary: ['CON'], saves: ['INT', 'WIS'], minStats: { WIS: 13 }, desc: 'Guardians of the natural world who command the forces of nature.' },
    { id: 'Fighter', name: 'Fighter', hitDie: 10, primary: ['STR', 'DEX'], secondary: ['CON'], saves: ['STR', 'CON'], minStats: { STR: 13, _or_: { DEX: 13 } }, desc: 'Masters of martial combat, skilled with all weapons and armour.' },
    { id: 'Monk', name: 'Monk', hitDie: 8, primary: ['DEX', 'WIS'], secondary: [], saves: ['STR', 'DEX'], minStats: { DEX: 13, WIS: 13 }, desc: 'Disciplined martial artists who harness ki to perform extraordinary feats.' },
    { id: 'Paladin', name: 'Paladin', hitDie: 10, primary: ['STR', 'CHA'], secondary: ['CON'], saves: ['WIS', 'CHA'], minStats: { STR: 13, CHA: 13 }, desc: 'Holy warriors bound by sacred oaths who blend martial and divine power.' },
    { id: 'Ranger', name: 'Ranger', hitDie: 10, primary: ['DEX', 'WIS'], secondary: ['STR'], saves: ['STR', 'DEX'], minStats: { DEX: 13, WIS: 13 }, desc: 'Skilled hunters and trackers who navigate the wilds of many shadows.' },
    { id: 'Rogue', name: 'Rogue', hitDie: 8, primary: ['DEX'], secondary: ['INT'], saves: ['DEX', 'INT'], minStats: { DEX: 13 }, desc: 'Cunning specialists in stealth, subterfuge, and precision strikes.' },
    { id: 'Sorcerer', name: 'Sorcerer', hitDie: 6, primary: ['CHA'], secondary: ['CON'], saves: ['CON', 'CHA'], minStats: { CHA: 13 }, desc: 'Innate spellcasters whose magic flows from their bloodline or a wild event.' },
    { id: 'Warlock', name: 'Warlock', hitDie: 8, primary: ['CHA'], secondary: ['CON'], saves: ['WIS', 'CHA'], minStats: { CHA: 13 }, desc: 'Pact-bound spellcasters who draw power from a powerful patron.' },
    { id: 'Wizard', name: 'Wizard', hitDie: 6, primary: ['INT'], secondary: ['CON'], saves: ['INT', 'WIS'], minStats: { INT: 13 }, desc: 'Scholarly magic-users who master arcane arts through rigorous study.' }
].map(entry => Object.freeze(entry)));

module.exports = Object.freeze({ STAT_KEYS, STAT_FULL, CLASSES_5E });
