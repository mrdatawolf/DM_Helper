const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const dnd5eContent = require('../src/systems/dnd5e/content/player-wizard-data');
const amberContent = require('../src/universes/amber/content/player-wizard-data');
const { shadows: seededShadows } = require('../src/universes/amber/seed');
const { AMBER_CHARACTER_COLUMNS } = require('../src/database/migrations/015-amber-universe-extension-data');
const hostModule = import('../public/js/player/player-wizard-host.js');
global.fetch = async url => ({
    ok: true, status: 200,
    async json() {
        if (url === '/api/system/content/wizard') return dnd5eContent;
        if (url === '/api/universe/content/wizard') return amberContent;
        throw new Error(`Unexpected fetch: ${url}`);
    }
});
const dnd5eModule = import('../public/js/systems/dnd5e/wizard-steps.js');
const amberModule = import('../public/js/universes/amber/wizard-steps.js');

function change(window, control, value) {
    control.value = String(value);
    control.dispatchEvent(new window.Event(control.type === 'range' ? 'input' : 'change', { bubbles: true }));
}

test('Amber exposes all host-compatible steps with real class attachment', async () => {
    const amber = await amberModule;
    const dnd5e = await dnd5eModule;
    assert.deepStrictEqual(amber.steps.map(step => step.id), [
        'universe:amber:shadow-origin', 'universe:amber:attributes',
        'universe:amber:flaws-traits', 'universe:amber:class-advisory',
        'universe:amber:trump-artist'
    ]);
    const advisory = amber.steps.find(step => step.id === 'universe:amber:class-advisory');
    assert.deepStrictEqual(advisory.relativeTo, { step: 'system:dnd5e:class-selection', position: 'before' });
    const { assembleWizardSteps } = await hostModule;
    const { steps, advisoriesByStep } = assembleWizardSteps(dnd5e.steps, amber.steps);
    assert.deepStrictEqual(steps.map(step => step.id), [
        'system:dnd5e:identity', 'universe:amber:shadow-origin', 'universe:amber:attributes',
        'system:dnd5e:ability-scores', 'universe:amber:flaws-traits',
        'system:dnd5e:class-selection', 'universe:amber:trump-artist'
    ]);
    assert.deepStrictEqual(
        advisoriesByStep.get('system:dnd5e:class-selection').before.map(step => step.id),
        ['universe:amber:class-advisory']
    );
});

test('Amber contextual info is static per step and excludes shadow origin', async () => {
    const amber = await amberModule;
    const byId = Object.fromEntries(amber.steps.map(step => [step.id, step]));
    assert.strictEqual(byId['universe:amber:shadow-origin'].info, undefined);
    assert.deepStrictEqual(byId['universe:amber:attributes'].info, {
        title: amberContent.WIZARD_STEP_INFO[2].title,
        flavor: amberContent.WIZARD_STEP_INFO[2].flavor,
        mechanics: amberContent.WIZARD_STEP_INFO[2].mechanics,
        consider: amberContent.WIZARD_STEP_INFO[2].consider,
        inPlay: amberContent.WIZARD_STEP_INFO[2].example,
    });
    assert.deepStrictEqual(byId['universe:amber:flaws-traits'].info, {
        title: amberContent.WIZARD_STEP_INFO[4].title,
        flavor: amberContent.WIZARD_STEP_INFO[4].flavor,
        mechanics: amberContent.WIZARD_STEP_INFO[4].mechanics,
        consider: amberContent.WIZARD_STEP_INFO[4].consider,
        inPlay: amberContent.WIZARD_STEP_INFO[4].example,
    });
    assert.match(byId['universe:amber:class-advisory'].info.flavor, /read-only.*no controls/is);
});

test('shadow origin renders selectable lore cards and filters tied influences as balanced', async () => {
    const amber = await amberModule;
    const dom = new JSDOM('<!doctype html><main></main>');
    const container = dom.window.document.querySelector('main');
    const state = { shadows: [
        { id: 1, name: 'Ordered', description: 'A precisely governed realm.', order_level: 70, chaos_level: 20, dream_level: 10 },
        { id: 2, name: 'The Balance', description: 'Three powers meet here.', order_level: 33, chaos_level: 33, dream_level: 33 }
    ] };
    const step = amber.steps.find(candidate => candidate.id === 'universe:amber:shadow-origin');
    step.render(container, state);

    const cards = [...container.querySelectorAll('.shadow-card')];
    assert.strictEqual(cards.length, 2);
    assert.match(cards[0].textContent, /Ordered.*precisely governed.*Order 70 · Chaos 20 · Dream 10/s);
    assert.strictEqual(cards[1].dataset.influence, 'balanced');
    container.querySelector('[data-filter="balanced"]').click();
    assert.strictEqual(cards[0].hidden, true);
    assert.strictEqual(cards[1].hidden, false);

    cards[1].click();
    assert.ok(cards[1].classList.contains('selected'));
    assert.deepStrictEqual(step.collect(state), { shadow_origin_id: 2 });
    assert.strictEqual(step.validate(state), null);
});

test('every Amber seed shadow has a non-zero Dream level on a consistent influence scale', () => {
    for (const shadow of seededShadows) {
        const [name, , order, chaos, dream] = shadow;
        assert.ok(dream > 0, `${name} should have a non-zero Dream level`);
        assert.ok([99, 100].includes(order + chaos + dream), `${name} should use the common influence scale`);
    }
});

test('Amber modifier calculation matches legacy representative combinations', async () => {
    const { calculateAbilityScoreModifiers } = await amberModule;
    assert.deepStrictEqual(calculateAbilityScoreModifiers({
        orderChaos: 50, bloodPurity: 'None', imprint: 'None', noneBonus: 'DEX', penaltyShift: ''
    }), { STR: 1, DEX: 1, CON: 0, INT: 0, WIS: 0, CHA: 0 });
    assert.deepStrictEqual(calculateAbilityScoreModifiers({
        orderChaos: 75, bloodPurity: 'Pure', imprint: 'FirstPattern', noneBonus: null, penaltyShift: ''
    }), { STR: 0, DEX: 0, CON: 1, INT: 1, WIS: 4, CHA: 0 });
    assert.deepStrictEqual(calculateAbilityScoreModifiers({
        orderChaos: 25, bloodPurity: 'Half', imprint: 'LogrusMaster', noneBonus: null, penaltyShift: 'DEX'
    }), { STR: 2, DEX: 0, CON: 1, INT: -1, WIS: -1, CHA: 2 });
});

test('attributes collect publishes the exact shared modifier shape and owned fields', async () => {
    const amber = await amberModule;
    const dom = new JSDOM('<!doctype html><main></main>');
    const container = dom.window.document.querySelector('main');
    const state = {};
    const step = amber.steps.find(candidate => candidate.id === 'universe:amber:attributes');
    step.render(container, state);
    change(dom.window, container.querySelector('[name="order_chaos_value"]'), 75);
    change(dom.window, container.querySelector('[name="blood_purity"][value="Pure"]'), 'Pure');
    container.querySelector('[name="blood_purity"][value="Pure"]').checked = true;
    container.querySelector('[name="blood_purity"][value="Pure"]').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    container.querySelector('[name="imprint"][value="FirstPattern"]').checked = true;
    container.querySelector('[name="imprint"][value="FirstPattern"]').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const fields = step.collect(state);
    assert.deepStrictEqual(state.abilityScoreModifiers, { STR: 0, DEX: 0, CON: 1, INT: 1, WIS: 4, CHA: 0 });
    assert.deepStrictEqual(fields, {
        order_chaos_value: 75, blood_purity: 'Pure', pattern_imprint: 1,
        pattern_type: 'Pattern', logrus_imprint: null, broken_imprint: 0
    });
    assert.ok(Object.keys(fields).every(field => AMBER_CHARACTER_COLUMNS.includes(field)));
});

test('recommendations match legacy logic for Pattern, Refrain, and Logrus inputs', async () => {
    const { recommendedClasses } = await amberModule;
    assert.deepStrictEqual([...recommendedClasses({ STR: 12, DEX: 14, CON: 10, INT: 13, WIS: 15, CHA: 8 }, 'FirstPattern')],
        ['Cleric', 'Druid', 'Wizard', 'Rogue', 'Ranger', 'Monk']);
    assert.deepStrictEqual([...recommendedClasses({ STR: 13, DEX: 10, CON: 12, INT: 15, WIS: 8, CHA: 14 }, 'CorwinPattern')],
        ['Bard', 'Sorcerer', 'Wizard', 'Paladin']);
    assert.deepStrictEqual([...recommendedClasses({ STR: 15, DEX: 12, CON: 13, INT: 8, WIS: 10, CHA: 14 }, 'LogrusMaster')],
        ['Barbarian', 'Fighter', 'Warlock', 'Sorcerer', 'Paladin']);
});

test('class advisory is read-only and never changes class state or options', async () => {
    const amber = await amberModule;
    const dom = new JSDOM('<!doctype html><main></main>');
    const container = dom.window.document.querySelector('main');
    const state = { strength: 12, dexterity: 14, constitution: 10, intelligence: 13, wisdom: 15, charisma: 8, class_type: 'Wizard' };
    const before = structuredClone(state);
    const advisory = amber.steps.find(step => step.id === 'universe:amber:class-advisory');
    advisory.render(container, state);
    assert.deepStrictEqual(state, before);
    assert.deepStrictEqual(advisory.collect(state), {});
    assert.strictEqual(container.querySelectorAll('button, input, select, textarea').length, 0);
    assert.match(container.textContent, /Rogue, Ranger, Druid, Monk/);
});

test('Trump eligibility and collection match legacy thresholds', async () => {
    const amber = await amberModule;
    const { isTrumpEligible } = amber;
    assert.strictEqual(isTrumpEligible({ DEX: 15, INT: 8, WIS: 15 }), true);
    assert.strictEqual(isTrumpEligible({ DEX: 10, INT: 15, WIS: 15 }), true);
    assert.strictEqual(isTrumpEligible({ DEX: 14, INT: 14, WIS: 15 }), false);
    const step = amber.steps.find(candidate => candidate.id === 'universe:amber:trump-artist');
    const eligibleState = { dexterity: 15, intelligence: 8, wisdom: 15 };
    assert.strictEqual(step.shouldSkip(eligibleState), false);
    assert.strictEqual(step.footnote(eligibleState), null);
    const dom = new JSDOM('<!doctype html><main></main>');
    const container = dom.window.document.querySelector('main');
    step.render(container, eligibleState);
    const checkbox = container.querySelector('[name="trump_artist"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.deepStrictEqual(step.collect(eligibleState), { trump_artist: 1 });
    const ineligibleState = { dexterity: 14, intelligence: 14, wisdom: 15 };
    assert.strictEqual(step.shouldSkip(ineligibleState), true);
    assert.strictEqual(step.footnote(ineligibleState), 'Not eligible for Trump Artist (DEX+WIS 29, INT+WIS 29; threshold 30)');
    assert.deepStrictEqual(step.collect(ineligibleState), { trump_artist: 0 });
});
