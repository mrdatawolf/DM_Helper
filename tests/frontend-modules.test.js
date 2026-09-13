// Demonstrates the outcome of TASK-008 (ADR-001 frontend ES-module
// migration): pure render/logic functions in public/js/player/*.js are now
// real named exports and can be exercised in isolation via Node + jsdom,
// without loading a full page or its network/DOM-heavy siblings in the same
// file (e.g. loadVisitedShadows, which does real fetch + DOM writes, lives
// in the same file as visitedInfluenceLabel but is never invoked here).
//
// A minimal jsdom `document`/`window` must exist before importing, because
// player-shadows.js registers a real (harmless, no-op without a
// `.wizard-body` element) event-delegation IIFE at module top level.
const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

require('../public/js/ability-conversion');
require('../public/js/faserip-conversion');
require('../public/js/faserip-sheet');
require('../public/js/dnd-computed-character');
require('../public/js/dnd-readonly-sheet');
require('../public/js/dnd-full-sheet');
require('../public/js/faserip-full-sheet');
require('../public/js/system-registry');

const shadowsModule = import('../public/js/player/player-shadows.js');
const wizardCoreModule = import('../public/js/player/player-wizard-core.js');
const characterSheetModule = import('../public/js/player/player-character-sheet.js');

test('visitedInfluenceLabel: maps internal imprint values to display labels', async () => {
    const { visitedInfluenceLabel } = await shadowsModule;

    assert.strictEqual(visitedInfluenceLabel('First Pattern'), 'Pattern');
    assert.strictEqual(visitedInfluenceLabel('Corwin Pattern'), 'Argent Refrain');
    assert.strictEqual(visitedInfluenceLabel('Logrus'), 'Logrus');
    assert.strictEqual(visitedInfluenceLabel(null), 'None');
});

test('visitedShadowCardStyle: returns a color style only for recognized influences', async () => {
    const { visitedShadowCardStyle } = await shadowsModule;

    assert.strictEqual(
        visitedShadowCardStyle('Logrus'),
        'background:rgba(192,57,43,0.1);border-left-color:rgba(192,57,43,0.5);'
    );
    assert.strictEqual(visitedShadowCardStyle('something-unmapped'), '');
});

test('calcAmberMods: derives stat modifiers from wizard choices without touching the DOM', async () => {
    const { wiz, calcAmberMods } = await wizardCoreModule;

    Object.assign(wiz, {
        orderChaos: 90, bloodPurity: 'Pure', imprint: 'FirstPattern',
        noneBonus: null, penaltyShift: '',
    });

    const mods = calcAmberMods();

    // Order >= 75 grants +1 INT/+1 WIS; First Pattern imprint grants +2
    // WIS/+1 CON; Pure blood purity grants +1 WIS — these all stack on WIS.
    assert.strictEqual(mods.INT, 1);
    assert.strictEqual(mods.WIS, 4);
    assert.strictEqual(mods.CON, 1);
    assert.strictEqual(mods.STR, 0);
});

test('D&D sheet computed values use converted abilities for saves, skills, initiative, and spells', async () => {
    const { computedCharacter } = await characterSheetModule;
    const { percentileFromScore } = require('../public/js/ability-conversion');
    const computed = computedCharacter({
        strength: percentileFromScore(18), dexterity: percentileFromScore(14),
        constitution: percentileFromScore(12), intelligence: percentileFromScore(16),
        wisdom: percentileFromScore(10), charisma: percentileFromScore(8),
        proficiency_bonus: 3, save_strength: 1, skill_perception: 2,
        initiative_bonus: 1, spellcasting_ability: 'intelligence'
    });

    assert.strictEqual(computed.ability.strength.modifier, 4);
    assert.strictEqual(computed.ability.strength.save, 7);
    assert.strictEqual(computed.skills.perception, 6);
    assert.strictEqual(computed.passivePerception, 16);
    assert.strictEqual(computed.initiative, 3);
    assert.strictEqual(computed.spellSaveDc, 14);
    assert.strictEqual(computed.spellAttackBonus, 6);
});

test('D&D sheet displays converted ability scores after inline fields are bound', async () => {
    const { bindDndCharacterSheet, renderDndCharacterSheet } = await characterSheetModule;
    const { percentileFromScore } = require('../public/js/ability-conversion');
    const character = {
        id: 1,
        strength: percentileFromScore(18), dexterity: percentileFromScore(14),
        constitution: percentileFromScore(12), intelligence: percentileFromScore(16),
        wisdom: percentileFromScore(10), charisma: percentileFromScore(8),
        weapons: [], spells: [],
    };
    const container = document.createElement('div');
    container.innerHTML = renderDndCharacterSheet(character);

    bindDndCharacterSheet(container, character, async () => {});

    const displayedStrength = container.querySelector('[data-field="strength"]').textContent;
    assert.strictEqual(displayedStrength, '18');
    assert.notStrictEqual(displayedStrength, String(character.strength));
});

test('the active campaign registry dispatches sheet rendering, derived math, dice, and PDF export', async () => {
    const sheet = await characterSheetModule;
    const registry = require('../public/js/system-registry');
    const active = registry.setActiveSystem('dnd5e');
    assert.strictEqual(active.sheet.render, sheet.renderDndCharacterSheet);
    assert.strictEqual(active.sheet.bind, sheet.bindDndCharacterSheet);
    assert.strictEqual(active.derivedStats.compute, sheet.computedCharacter);
    assert.strictEqual(active.pdfExport.export, sheet.downloadCharacterPdf);
    assert.strictEqual(await active.dice.roll(async () => 13), 13);
});

test('browser registry selects runtime behavior from the current campaign system_id', async () => {
    const registry = require('../public/js/system-registry');
    const previousFetch = global.fetch;
    global.fetch = async url => {
        assert.strictEqual(url, '/api/auth/campaigns/current-system');
        return { ok: true, json: async () => ({ id: 'dnd5e' }) };
    };
    try {
        const selected = await registry.loadActiveSystem('token');
        assert.strictEqual(selected.id, 'dnd5e');
        assert.strictEqual(registry.getActiveSystem(), selected);
    } finally { global.fetch = previousFetch; }
});

test('campaign-dispatched PDF export retains D&D field values', async () => {
    const registry = require('../public/js/system-registry');
    const active = registry.setActiveSystem('dnd5e');
    const text = new Map();
    const checks = new Map();
    const previous = { fetch: global.fetch, PDFLib: global.PDFLib,
        createObjectURL: global.URL.createObjectURL, revokeObjectURL: global.URL.revokeObjectURL };
    global.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(1) });
    global.PDFLib = { PDFDocument: { load: async () => ({
        getForm: () => ({
            getTextField: name => ({ setText: value => text.set(name, value) }),
            getCheckBox: name => ({ check: () => checks.set(name, true), uncheck: () => checks.set(name, false) })
        }),
        save: async () => new Uint8Array([1])
    }) } };
    global.URL.createObjectURL = () => 'blob:test';
    global.URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = () => {};
    try {
        const { percentileFromScore } = require('../public/js/ability-conversion');
        await active.pdfExport.export({
            id: 9, name: 'PDF Hero', class_type: 'Wizard', level: 5,
            strength: percentileFromScore(18), dexterity: percentileFromScore(14),
            constitution: percentileFromScore(12), intelligence: percentileFromScore(16),
            wisdom: percentileFromScore(10), charisma: percentileFromScore(8),
            proficiency_bonus: 3, armor_class: 17, max_hp: 27, current_hp: 19,
            heroic_inspiration: 1, weapons: [], spells: [], gear: []
        });
        assert.strictEqual(text.get('Character Name'), 'PDF Hero');
        assert.strictEqual(text.get('Strength Ability Score'), '18');
        assert.strictEqual(text.get('Armor Class'), '17');
        assert.strictEqual(text.get('Hit Point Maximum'), '27');
        assert.strictEqual(text.get('Current Hit Points'), '19');
    } finally {
        global.fetch = previous.fetch;
        global.PDFLib = previous.PDFLib;
        global.URL.createObjectURL = previous.createObjectURL;
        global.URL.revokeObjectURL = previous.revokeObjectURL;
    }
});

test('the "View As..." registry lists D&D 5e and FASERIP, and the read-only D&D view matches the real sheet\'s math', async () => {
    // dnd-computed-character.js is a plain classic-script module (not part
    // of the player-only ES module graph) specifically so it — and the
    // read-only card built on it — work on the DM dashboard too, which
    // never loads public/js/player/player-character-sheet.js. Requiring it
    // directly here exercises exactly that: a page with no player module
    // loaded at all can still compute and render the D&D view correctly.
    const { percentileFromScore } = require('../public/js/ability-conversion');
    const { computedCharacter } = require('../public/js/dnd-computed-character');
    require('../public/js/faserip-conversion');
    require('../public/js/faserip-sheet');
    require('../public/js/dnd-full-sheet');
    require('../public/js/faserip-full-sheet');
    const { renderDndReadOnlySheet } = require('../public/js/dnd-readonly-sheet');
    const { CHARACTER_SYSTEMS, getCharacterSystem } = require('../public/js/system-registry');

    assert.deepStrictEqual(
        CHARACTER_SYSTEMS.map(system => system.id),
        ['dnd5e', 'dnd5e-full', 'faserip', 'faserip-full']
    );
    assert.strictEqual(getCharacterSystem('dnd5e').render, renderDndReadOnlySheet);

    // The editable sheet's own computedCharacter export must be the exact
    // same function as the shared module's — not a re-derived copy that
    // could drift from it (the class of bug this whole extraction exists
    // to prevent).
    const { computedCharacter: sheetComputedCharacter } = await characterSheetModule;
    assert.strictEqual(sheetComputedCharacter, computedCharacter);

    const character = {
        id: 7, name: 'Read-Only & <Test>',
        strength: percentileFromScore(18), dexterity: percentileFromScore(14),
        constitution: percentileFromScore(12), intelligence: percentileFromScore(16),
        wisdom: percentileFromScore(10), charisma: percentileFromScore(8),
        proficiency_bonus: 3, initiative_bonus: 1, armor_class: 16, speed: 30,
        current_hp: 20, max_hp: 24,
    };
    const html = renderDndReadOnlySheet(character);
    const expected = computedCharacter(character);

    assert.ok(html.includes('Read-Only &amp; &lt;Test&gt;'), 'escapes the character name');
    assert.ok(!html.includes('Read-Only & <Test>'), 'never emits the raw unescaped name');
    assert.ok(!/<input|<select|<textarea|contenteditable/i.test(html), 'has no editable controls');
    assert.ok(html.includes(`>${expected.ability.strength.score}<`), 'shows the converted D&D score, not the raw percentile');
    assert.ok(!html.includes(`>${character.strength}<`), 'never shows the raw stored percentile as the score');
    assert.ok(html.includes(String(expected.passivePerception)), 'matches computedCharacter\'s passive perception');
});

test('the "Full Sheet" views are section-complete, read-only, and work with no player module loaded at all', () => {
    // Deliberately requires only plain classic-script modules — no jsdom,
    // no dynamic import of anything under public/js/player/ — reproducing
    // exactly what the DM dashboard actually loads for these two entries,
    // which is exactly the gap that broke the D&D summary card before this
    // (a global set only by a player-only ES module the DM page never runs).
    const { percentileFromScore } = require('../public/js/ability-conversion');
    const { computedCharacter } = require('../public/js/dnd-computed-character');
    const { computeFaseripCharacter } = require('../public/js/faserip-conversion');
    const { renderDndFullSheet } = require('../public/js/dnd-full-sheet');
    const { renderFaseripFullSheet } = require('../public/js/faserip-full-sheet');

    const character = {
        id: 3, name: 'Full Sheet & <Test>', class_type: 'Wizard', level: 5, species: 'Elf',
        background: 'Sage', alignment: 'Neutral Good', player_name: 'Alex', experience_points: 6500,
        strength: percentileFromScore(10), dexterity: percentileFromScore(14),
        constitution: percentileFromScore(13), intelligence: percentileFromScore(18),
        wisdom: percentileFromScore(12), charisma: percentileFromScore(8),
        proficiency_bonus: 3, armor_class: 13, speed: 30, current_hp: 30, max_hp: 33,
        spellcasting_ability: 'intelligence', spell_slots_1_total: 4, spell_slots_1_expended: 1,
        age: '112', height: '5ft 4in', weight: '110 lb', eyes: 'Violet', skin: 'Pale', hair: 'Silver',
        backstory: 'Raised in the Great Library.', personality: 'Curious & <bold>',
        weapons: [{ id: 1, name: 'Dagger', attack_bonus: 4, damage_type: '1d4 piercing' }],
        spells: [{ id: 1, spell_name: 'Fire Bolt', spell_level: 0, is_prepared: 1 }],
        gear: [{ item_name: 'Spellbook', quantity: 1 }],
    };

    const dndHtml = renderDndFullSheet(character);
    const expectedComputed = computedCharacter(character);
    assert.ok(!/<input|<select|<textarea|contenteditable/i.test(dndHtml), 'D&D full sheet has no editable controls');
    assert.ok(dndHtml.includes(`>${expectedComputed.ability.intelligence.score}<`), 'D&D full sheet shows the converted INT score');
    assert.ok(dndHtml.includes('Dagger'), 'D&D full sheet lists weapons');
    assert.ok(dndHtml.includes('Fire Bolt'), 'D&D full sheet lists spells');
    assert.ok(dndHtml.includes('Spellbook'), 'D&D full sheet lists gear');
    assert.ok(dndHtml.includes('Raised in the Great Library.'), 'D&D full sheet shows backstory');
    assert.ok(dndHtml.includes('Curious &amp; &lt;bold&gt;'), 'D&D full sheet escapes free-text fields');

    const faseripHtml = renderFaseripFullSheet(character);
    const expectedFaserip = computeFaseripCharacter(character);
    assert.ok(!/<input|<select|<textarea|contenteditable/i.test(faseripHtml), 'FASERIP full sheet has no editable controls');
    assert.ok(faseripHtml.includes(`>${expectedFaserip.health}<`), 'FASERIP full sheet shows computed Health');
    assert.ok(faseripHtml.includes(`>${expectedFaserip.karma}<`), 'FASERIP full sheet shows computed Karma');
    assert.ok(faseripHtml.includes('112'), 'FASERIP full sheet shows the real Age field');
    assert.ok(faseripHtml.includes('Spellbook'), 'FASERIP full sheet shows real gear as Inventory');
    assert.ok(faseripHtml.includes('Not tracked for converted characters'), 'FASERIP full sheet shows empty sections it has no data for, rather than omitting them');
});
