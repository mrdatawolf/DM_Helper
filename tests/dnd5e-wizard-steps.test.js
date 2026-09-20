const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const dnd5eContent = require('../src/systems/dnd5e/content/player-wizard-data');
const { AMBER_CHARACTER_COLUMNS } = require('../src/database/migrations/015-amber-universe-extension-data');

const hostModule = import('../public/js/player/player-wizard-host.js');
global.fetch = async url => ({
    ok: true, status: 200,
    async json() {
        if (url === '/api/system/content/wizard') return dnd5eContent;
        throw new Error(`Unexpected fetch: ${url}`);
    }
});
const dnd5eModule = import('../public/js/systems/dnd5e/wizard-steps.js');

function input(window, control, value) {
    control.value = String(value);
    control.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function change(window, control, value) {
    control.value = String(value);
    control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function assignScore(window, document, score, stat) {
    document.querySelector(`[data-score="${score}"]`).dispatchEvent(new window.Event('click', { bubbles: true }));
    document.querySelector(`[data-stat="${stat}"]`).dispatchEvent(new window.Event('click', { bubbles: true }));
}

test('dnd5e exposes host-compatible identity, ability-score, and class steps', async () => {
    const dnd5e = await dnd5eModule;
    assert.deepStrictEqual(dnd5e.steps.map(step => step.id), [
        'system:dnd5e:identity',
        'system:dnd5e:ability-scores',
        'system:dnd5e:class-selection'
    ]);
    for (const step of dnd5e.steps) {
        assert.strictEqual(typeof step.title, 'string');
        assert.strictEqual(typeof step.order, 'number');
        assert.strictEqual(typeof step.render, 'function');
        assert.strictEqual(typeof step.validate, 'function');
        assert.strictEqual(typeof step.collect, 'function');
    }
});

test('a dnd5e-only host produces a complete valid character with no Amber fields', async () => {
    const { createWizardHost } = await hostModule;
    const dnd5e = await dnd5eModule;
    const dom = new JSDOM('<!doctype html><main id="step"></main>');
    const { document, Event } = dom.window;
    const host = createWizardHost({
        systemSteps: dnd5e.steps,
        container: document.querySelector('#step')
    });

    host.render();
    input(dom.window, document.querySelector('[name="name"]'), 'Homebrew Hero');
    input(dom.window, document.querySelector('[name="species"]'), 'Human');
    input(dom.window, document.querySelector('[name="backstory"]'), 'Raised beyond the mapped realms.');
    assert.deepStrictEqual(host.next(), { advanced: true, error: null });

    [15, 14, 13, 12, 10, 8].forEach((score, index) => assignScore(dom.window, document, score, dnd5eContent.STAT_KEYS[index]));
    assert.deepStrictEqual(host.next(), { advanced: true, error: null });

    document.querySelector('[data-class="Fighter"]').dispatchEvent(new Event('click', { bubbles: true }));
    input(dom.window, document.querySelector('[name="level"]'), 1);
    assert.deepStrictEqual(host.next(), { advanced: true, error: null });
    assert.strictEqual(host.currentStep.id, 'host:review');

    assert.deepStrictEqual(host.wizardState, {
        name: 'Homebrew Hero', species: 'Human', backstory: 'Raised beyond the mapped realms.',
        strength: 15, dexterity: 14, constitution: 13,
        intelligence: 12, wisdom: 10, charisma: 8,
        class_type: 'Fighter', level: 1
    });
    assert.ok(host.wizardState.name && host.wizardState.species && host.wizardState.class_type);
    assert.ok(AMBER_CHARACTER_COLUMNS.every(field => !(field in host.wizardState)));
});

test('ability-score collection adds optional shared modifiers and class gates use effective scores', async () => {
    const { createWizardHost } = await hostModule;
    const dnd5e = await dnd5eModule;
    const dom = new JSDOM('<!doctype html><main id="step"></main>');
    const { document } = dom.window;
    const host = createWizardHost({
        systemSteps: dnd5e.steps,
        container: document.querySelector('#step'),
        wizardState: { abilityScoreModifiers: { STR: -3, DEX: -3, INT: 5 } }
    });

    host.render();
    input(dom.window, document.querySelector('[name="name"]'), 'Modified Hero');
    input(dom.window, document.querySelector('[name="species"]'), 'Human');
    host.next();
    assert.strictEqual(document.querySelector('[data-stat="STR"] .ssc-amber-mod').textContent, '-3');
    assert.ok(document.querySelector('[data-stat="STR"] .ssc-amber-mod').classList.contains('neg'));
    assert.strictEqual(document.querySelector('[data-stat="INT"] .ssc-amber-mod').textContent, '+5');
    assignScore(dom.window, document, 15, 'STR');
    assert.strictEqual(document.querySelector('[data-stat="STR"] .ssc-final').textContent, 'Final: 12');
    [14, 13, 12, 10, 8].forEach((score, index) => assignScore(dom.window, document, score, dnd5eContent.STAT_KEYS[index + 1]));
    host.next();

    assert.strictEqual(host.wizardState.strength, 12);
    assert.strictEqual(host.wizardState.dexterity, 11);
    assert.strictEqual(host.wizardState.intelligence, 17);
    const fighter = document.querySelector('[data-class="Fighter"]');
    assert.match(fighter.textContent, /you have STR 12, DEX 11/);
    assert.ok(fighter.classList.contains('soft-warn'), 'effective scores drive the Fighter gate');
    const wizard = document.querySelector('[data-class="Wizard"]');
    assert.ok(!wizard.classList.contains('soft-warn'), 'effective INT 17 satisfies the Wizard gate');
});

test('ability-score chips prevent duplicate assignment and are freed by clearing their stat', async () => {
    const dnd5e = await dnd5eModule;
    const step = dnd5e.steps.find(candidate => candidate.id === 'system:dnd5e:ability-scores');
    const state = {};
    const dom = new JSDOM('<main></main>');
    const { document, Event } = dom.window;
    step.render(document.querySelector('main'), state);

    assignScore(dom.window, document, 15, 'STR');
    const chip = document.querySelector('[data-score="15"]');
    assert.strictEqual(chip.disabled, true);
    assert.ok(chip.classList.contains('used'));
    chip.dispatchEvent(new Event('click', { bubbles: true }));
    document.querySelector('[data-stat="DEX"]').dispatchEvent(new Event('click', { bubbles: true }));
    assert.strictEqual(document.querySelector('[data-stat="DEX"] .ssc-base').textContent, '—');

    document.querySelector('[data-stat="STR"]').dispatchEvent(new Event('click', { bubbles: true }));
    assert.strictEqual(chip.disabled, false);
    assignScore(dom.window, document, 15, 'DEX');
    assert.strictEqual(document.querySelector('[data-stat="DEX"] .ssc-base').textContent, '15');
    assert.match(step.validate(state), /Missing:/);
});
