const { dndModifier } = require('../../../public/js/ability-conversion');
const { DND5E_CHARACTER_COLUMNS } = require('../../database/migrations/014-character-extension-data');
const { mutateDocument, readDocument, writeDocument } = require('../extension-data');

const ZERO_FIELDS = DND5E_CHARACTER_COLUMNS.filter(field =>
    field.startsWith('skill_') || field.startsWith('save_') ||
    field.startsWith('spell_slots_') || field.startsWith('armor_') ||
    field.startsWith('weapons_') || field.endsWith('_pieces') ||
    ['temp_hit_points', 'initiative_bonus', 'heroic_inspiration', 'death_save_successes',
        'death_save_failures', 'spell_attack_bonus', 'attunement_slots_used'].includes(field)
);
const SHEET_DEFAULTS = Object.freeze(Object.assign(
    Object.fromEntries(DND5E_CHARACTER_COLUMNS.map(field => [field, null])),
    Object.fromEntries(ZERO_FIELDS.map(field => [field, 0])),
    { armor_class: 10, max_hp: 10, current_hp: 10, speed: 30, proficiency_bonus: 2,
        passive_perception: 10, hit_dice_total: '1d8', hit_dice_current: '1d8',
        spell_save_dc: 8, attunement_slots_max: 3 }
));

function createDocument(sheet = {}) {
    return {
        schema_version: 1,
        sheet: { ...SHEET_DEFAULTS, ...sheet },
        gear: [], powers: [], spells: [], feats: [], weapons: []
    };
}

function hydrateSheet(db, character, system = module.exports) {
    if (!character) return character;
    const data = readDocument(db, character.id, system);
    if (!data) throw new Error(`Missing ${system.namespace} data for character ${character.id}`);
    return { ...character, ...data.sheet };
}

function hydrateCharacter(db, character, system = module.exports) {
    const hydrated = hydrateSheet(db, character, system);
    const data = readDocument(db, character.id, system);
    return { ...hydrated,
        gear: data.gear || [], powers: data.powers || [],
        spells: [...(data.spells || [])].sort((a, b) => a.spell_level - b.spell_level || a.spell_name.localeCompare(b.spell_name)),
        weapons: [...(data.weapons || [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id) };
}

function updateSheet(db, characterId, updates, system = module.exports) {
    return mutateDocument(db, characterId, system, data => Object.assign(data.sheet, updates));
}

function rollD20(random = Math.random) {
    return Math.floor(random() * 20) + 1;
}

module.exports = Object.freeze({
    id: 'dnd5e',
    label: 'D&D 5e',
    namespace: 'system:dnd5e',
    content: Object.freeze({ wizard: require('./content/player-wizard-data') }),
    sheet: Object.freeze({
        read: 'character_extension_data',
        browserRenderer: '/js/player/player-character-sheet.js',
        fields: Object.freeze([...DND5E_CHARACTER_COLUMNS]),
        defaults: SHEET_DEFAULTS,
        createDocument,
        hydrateCharacter,
        hydrateSheet,
        update: updateSheet,
        readDocument: (db, characterId) => readDocument(db, characterId, module.exports),
        writeDocument: (db, characterId, document) => writeDocument(db, characterId, module.exports, document),
        mutateDocument: (db, characterId, mutation) => mutateDocument(db, characterId, module.exports, mutation)
    }),
    dice: Object.freeze({ id: 'd20', roll: rollD20 }),
    derivedStats: Object.freeze({ abilityModifier: dndModifier }),
    pdfExport: Object.freeze({
        template: '/assets/dnd-5e-character-sheet-template.pdf',
        browserExporter: 'downloadCharacterPdf'
    }),
    conversionRenderer: Object.freeze({ id: 'dnd5e', browserRenderer: '/js/dnd-readonly-sheet.js' })
});
