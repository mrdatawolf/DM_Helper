const { AMBER_CHARACTER_COLUMNS } = require('../../database/migrations/015-amber-universe-extension-data');
const { mutateDocument, readDocument, writeDocument } = require('../../systems/extension-data');
const path = require('path');

const ATTRIBUTE_DEFAULTS = Object.freeze({
    shadow_origin_id: null,
    blood_purity: 'None',
    order_chaos_value: 50,
    pattern_imprint: 0,
    logrus_imprint: 0,
    pattern_mastery_level: 0,
    logrus_mastery_level: 0,
    trump_artist: 0,
    trump_mastery_level: 0,
    pattern_type: null,
    amber_flaws: null,
    amber_traits: null,
    broken_imprint: 0
});

const PATTERN_INFLUENCES = Object.freeze(['Pattern', 'Argent Refrain', 'Logrus', 'Mixed', 'None', 'Nexus']);

function createDocument(attributes = {}) {
    return { schema_version: 1, attributes: { ...ATTRIBUTE_DEFAULTS, ...attributes } };
}

function hydrateCharacter(db, character, universe = module.exports) {
    if (!character) return character;
    const data = readDocument(db, character.id, universe);
    if (!data) throw new Error(`Missing ${universe.namespace} data for character ${character.id}`);
    const hydrated = { ...character, ...data.attributes };
    hydrated.shadow_origin_name = hydrated.shadow_origin_id == null ? null
        : db.prepare('SELECT name FROM shadows WHERE id = ?').get(hydrated.shadow_origin_id)?.name || null;
    return hydrated;
}

function updateAttributes(db, characterId, updates, universe = module.exports) {
    return mutateDocument(db, characterId, universe, data => Object.assign(data.attributes, updates));
}

function validateShadow(shadow) {
    if (shadow.pattern_influence != null && !PATTERN_INFLUENCES.includes(shadow.pattern_influence)) {
        const error = new Error(`Invalid Amber pattern influence: ${shadow.pattern_influence}`);
        error.status = 400;
        error.clientMessage = 'Invalid pattern influence for the Amber universe';
        throw error;
    }
}

module.exports = Object.freeze({
    id: 'amber',
    label: 'Amber',
    namespace: 'universe:amber',
    character: Object.freeze({
        fields: Object.freeze([...AMBER_CHARACTER_COLUMNS]),
        defaults: ATTRIBUTE_DEFAULTS,
        createDocument,
        hydrate: hydrateCharacter,
        update: updateAttributes,
        readDocument: (db, characterId) => readDocument(db, characterId, module.exports),
        writeDocument: (db, characterId, document) => writeDocument(db, characterId, module.exports, document)
    }),
    shadows: Object.freeze({ patternInfluences: PATTERN_INFLUENCES, validate: validateShadow }),
    seed: require('./seed').seed,
    content: Object.freeze({
        guidePath: path.join(__dirname, 'content', 'PLAYER_GUIDE.md'),
        wizard: require('./content/player-wizard-data')
    })
});
