const { dndModifier } = require('../../../public/js/ability-conversion');

function rollD20(random = Math.random) {
    return Math.floor(random() * 20) + 1;
}

module.exports = Object.freeze({
    id: 'dnd5e',
    label: 'D&D 5e',
    namespace: 'system:dnd5e',
    sheet: Object.freeze({
        read: 'character_extension_data',
        browserRenderer: '/js/player/player-character-sheet.js'
    }),
    dice: Object.freeze({ id: 'd20', roll: rollD20 }),
    derivedStats: Object.freeze({ abilityModifier: dndModifier }),
    pdfExport: Object.freeze({
        template: '/assets/dnd-5e-character-sheet-template.pdf',
        browserExporter: 'downloadCharacterPdf'
    }),
    conversionRenderer: Object.freeze({ id: 'dnd5e', browserRenderer: '/js/dnd-readonly-sheet.js' })
});
