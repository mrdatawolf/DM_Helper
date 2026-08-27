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

const shadowsModule = import('../public/js/player/player-shadows.js');
const wizardCoreModule = import('../public/js/player/player-wizard-core.js');

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
