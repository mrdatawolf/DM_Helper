const CAPABILITY_KEYS = Object.freeze([
    'might', 'mobility', 'coordination', 'endurance', 'fighting', 'perception',
    'intellect', 'instinct', 'resolve', 'presence', 'influence', 'appearance'
]);
const CAPABILITY_KEY_SET = new Set(CAPABILITY_KEYS);
const NEUTRAL_CAPABILITY_VALUE = 31;

function capabilityError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function validateValue(value, key = 'capability') {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw capabilityError(`${key} must be an integer from 0 through 100`);
    }
}

function validateProfile(profile) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
        throw capabilityError('A complete capability profile is required');
    }
    const keys = Object.keys(profile);
    if (keys.length !== CAPABILITY_KEYS.length || keys.some(key => !CAPABILITY_KEY_SET.has(key))) {
        throw capabilityError('A capability profile must contain exactly the approved capability keys');
    }
    for (const key of CAPABILITY_KEYS) validateValue(profile[key], key);
    return Object.freeze(Object.fromEntries(CAPABILITY_KEYS.map(key => [key, profile[key]])));
}

function profileFromLegacyAbilities(abilities) {
    const value = key => {
        validateValue(abilities[key], key);
        return abilities[key];
    };
    return validateProfile({
        might: value('strength'), mobility: value('dexterity'), coordination: value('dexterity'),
        endurance: value('constitution'), fighting: NEUTRAL_CAPABILITY_VALUE,
        perception: value('wisdom'), intellect: value('intelligence'), instinct: value('wisdom'),
        resolve: value('wisdom'), presence: value('charisma'), influence: value('charisma'),
        appearance: NEUTRAL_CAPABILITY_VALUE
    });
}

function readProfile(db, characterId) {
    const rows = db.prepare(`SELECT capability_key, value FROM character_capabilities WHERE character_id = ? ORDER BY capability_key`).all(characterId);
    if (rows.length !== CAPABILITY_KEYS.length) throw new Error(`Capability profile for character ${characterId} is incomplete`);
    const profile = {};
    for (const row of rows) {
        if (Object.hasOwn(profile, row.capability_key)) throw new Error(`Capability profile for character ${characterId} contains duplicate keys`);
        profile[row.capability_key] = row.value;
    }
    try { return validateProfile(profile); }
    catch (error) { throw new Error(`Capability profile for character ${characterId} is invalid: ${error.message}`); }
}

function writeProfile(db, characterId, profile) {
    const valid = validateProfile(profile);
    db.prepare('DELETE FROM character_capabilities WHERE character_id = ?').run(characterId);
    const insert = db.prepare('INSERT INTO character_capabilities (character_id, capability_key, value) VALUES (?, ?, ?)');
    for (const key of CAPABILITY_KEYS) insert.run(characterId, key, valid[key]);
    return valid;
}

module.exports = { CAPABILITY_KEYS, NEUTRAL_CAPABILITY_VALUE, validateValue, validateProfile, profileFromLegacyAbilities, readProfile, writeProfile, createProfile: writeProfile };
