const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const dnd5eContent = require('../src/systems/dnd5e/content/player-wizard-data');
const amberContent = require('../src/universes/amber/content/player-wizard-data');
const { AMBER_CHARACTER_COLUMNS } = require('../src/database/migrations/015-amber-universe-extension-data');

global.fetch = async url => ({
    ok: true, status: 200,
    async json() {
        if (url === '/api/system/content/wizard') return dnd5eContent;
        if (url === '/api/universe/content/wizard') return amberContent;
        throw new Error(`Unexpected fetch: ${url}`);
    }
});

const hostModule = import('../public/js/player/player-wizard-host.js');
const integrationModule = import('../public/js/player/player-wizard-integration.js');

function browserImporter(requested = []) {
    return specifier => {
        requested.push(specifier);
        return import(pathToFileURL(path.join(__dirname, '..', 'public', specifier)).href);
    };
}

function input(window, control, value) {
    control.value = String(value);
    control.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function change(window, control, value) {
    control.value = String(value);
    control.dispatchEvent(new window.Event(control.type === 'range' ? 'input' : 'change', { bubbles: true }));
}

function assignStandardArray(window, document) {
    [15, 14, 13, 12, 10, 8].forEach((score, index) => {
        document.querySelector(`[data-score="${score}"]`).dispatchEvent(new window.Event('click', { bubbles: true }));
        document.querySelectorAll('[data-stat]')[index].dispatchEvent(new window.Event('click', { bubbles: true }));
    });
}

test('dnd5e plus amber produces the frozen legacy server-filtered request through dynamic imports', async () => {
    const { createWizardHost } = await hostModule;
    const { filterWizardPayload, loadWizardModules } = await integrationModule;
    const campaign = { system_id: 'dnd5e', universe_id: 'amber' };
    const requested = [];
    const modules = await loadWizardModules(campaign, browserImporter(requested));
    assert.deepStrictEqual(requested, ['/js/systems/dnd5e/wizard-steps.js', '/js/universes/amber/wizard-steps.js']);

    const dom = new JSDOM('<main></main>');
    const { document, Event } = dom.window;
    const host = createWizardHost({
        ...modules,
        container: document.querySelector('main'),
        wizardState: { shadows: [{
            id: 7, name: 'Amber', description: 'The eternal city.', order_level: 90, chaos_level: 0, dream_level: 10
        }] },
        filterForReview: wizardState => filterWizardPayload(wizardState, campaign, dnd5eContent),
    });
    host.render();
    input(dom.window, document.querySelector('[name="name"]'), 'Parity Hero');
    input(dom.window, document.querySelector('[name="species"]'), 'Human');
    input(dom.window, document.querySelector('[name="backstory"]'), 'A representative backstory.');
    host.next();
    document.querySelector('[data-shadow-id="7"]').dispatchEvent(new Event('click', { bubbles: true }));
    host.next();
    change(dom.window, document.querySelector('[name="order_chaos_value"]'), 75);
    for (const [name, value] of [['blood_purity', 'Pure'], ['imprint', 'FirstPattern']]) {
        const radio = document.querySelector(`[name="${name}"][value="${value}"]`);
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    host.next();
    assignStandardArray(dom.window, document);
    host.next();
    document.querySelectorAll('input[type="checkbox"]')[0].dispatchEvent(new Event('change', { bubbles: true }));
    host.next();
    assert.strictEqual(host.currentStep.id, 'system:dnd5e:class-selection');
    assert.match(document.querySelector('main').textContent, /Characters with your imprint and abilities often lean toward/);
    document.querySelector('[data-class="Wizard"]').dispatchEvent(new Event('click', { bubbles: true }));
    input(dom.window, document.querySelector('[name="level"]'), 3);
    host.next();
    assert.strictEqual(host.currentStep.id, 'host:review');

    const payload = filterWizardPayload(host.wizardState, campaign, dnd5eContent);
    const frozenLegacyPayload = {
        name: 'Parity Hero', species: 'Human', backstory: 'A representative backstory.',
        shadow_origin_id: 7, order_chaos_value: 75, blood_purity: 'Pure', pattern_imprint: 1,
        pattern_type: 'Pattern', logrus_imprint: null, broken_imprint: 0,
        strength: 15, dexterity: 14, constitution: 14, intelligence: 13, wisdom: 14, charisma: 8,
        amber_flaws: [], amber_traits: [], class_type: 'Wizard', level: 3,
        max_hp: 8, current_hp: 8
    };
    assert.strictEqual(JSON.stringify(payload), JSON.stringify(frozenLegacyPayload));
    assert.ok(!('abilityScoreModifiers' in payload));
    assert.ok(!('shadows' in payload));
    const review = document.querySelector('main').textContent;
    assert.match(review, /Blood PurityPure/);
    assert.match(review, /Amber Flaws/);
    assert.match(review, /NotesNot eligible for Trump Artist \(DEX\+WIS 28, INT\+WIS 27; threshold 30\)/);
    assert.doesNotMatch(review, /abilityScoreModifiers|Ability Score Modifiers|shadows|Shadows/);
});

test('dnd5e without a universe dynamically loads only its system and submits no Amber fields', async () => {
    const { createWizardHost } = await hostModule;
    const { filterWizardPayload, loadWizardModules } = await integrationModule;
    const campaign = { system_id: 'dnd5e', universe_id: null };
    const requested = [];
    const modules = await loadWizardModules(campaign, browserImporter(requested));
    assert.deepStrictEqual(requested, ['/js/systems/dnd5e/wizard-steps.js']);
    const dom = new JSDOM('<main></main>');
    const { document, Event } = dom.window;
    const host = createWizardHost({ ...modules, container: document.querySelector('main') });
    host.render();
    input(dom.window, document.querySelector('[name="name"]'), 'Homebrew Hero');
    input(dom.window, document.querySelector('[name="species"]'), 'Human');
    host.next();
    assignStandardArray(dom.window, document);
    host.next();
    document.querySelector('[data-class="Fighter"]').dispatchEvent(new Event('click', { bubbles: true }));
    host.next();
    const payload = filterWizardPayload(host.wizardState, campaign, dnd5eContent);
    assert.strictEqual(host.currentStep.id, 'host:review');
    assert.ok(payload.name && payload.species && payload.class_type);
    assert.ok(AMBER_CHARACTER_COLUMNS.every(field => !(field in payload)));
});

test('a failed dynamic step-module load surfaces a clear error', async () => {
    const { loadWizardModules } = await integrationModule;
    await assert.rejects(
        loadWizardModules({ system_id: 'missing', universe_id: null }, async () => { throw new Error('404 Not Found'); }),
        /Unable to load character wizard for this campaign: 404 Not Found/
    );
});
