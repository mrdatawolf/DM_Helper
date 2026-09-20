const test = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');

const hostModule = import('../public/js/player/player-wizard-host.js');

function fixtureStep(id, order, overrides = {}) {
    return {
        id,
        title: id,
        order,
        render(container) { container.textContent = id; },
        validate() { return null; },
        collect() { return { [id]: `collected:${id}` }; },
        ...overrides,
    };
}

test('assembles system and universe fixtures by order with first-come tie breaking', async () => {
    const { assembleWizardSteps } = await hostModule;
    const { steps, advisoriesByStep } = assembleWizardSteps(
        [fixtureStep('system:first', 10), fixtureStep('system:tied', 20)],
        [fixtureStep('universe:tied', 20), fixtureStep('universe:middle', 15)]
    );

    assert.deepStrictEqual(
        steps.map(step => step.id),
        ['system:first', 'universe:middle', 'system:tied', 'universe:tied']
    );
    assert.strictEqual(advisoriesByStep.size, 0);
});

test('attaches advisory fixtures around a present target in stable order without mutating it', async () => {
    const { assembleWizardSteps } = await hostModule;
    const relativeTo = position => ({ step: 'system:target', position });
    const target = Object.freeze(fixtureStep('system:target', 20));
    const { steps, advisoriesByStep } = assembleWizardSteps(
        [target],
        [
            fixtureStep('universe:before-1', 1, { relativeTo: relativeTo('before') }),
            fixtureStep('universe:before-2', 2, { relativeTo: relativeTo('before') }),
            fixtureStep('universe:after-1', 3, { relativeTo: relativeTo('after') }),
            fixtureStep('universe:after-2', 4, { relativeTo: relativeTo('after') }),
        ]
    );

    assert.deepStrictEqual(steps.map(step => step.id), ['system:target']);
    assert.deepStrictEqual(advisoriesByStep.get('system:target').before.map(step => step.id), [
        'universe:before-1', 'universe:before-2',
    ]);
    assert.deepStrictEqual(advisoriesByStep.get('system:target').after.map(step => step.id), [
        'universe:after-1', 'universe:after-2',
    ]);
    assert.deepStrictEqual(Object.keys(target), ['id', 'title', 'order', 'render', 'validate', 'collect']);
});

test('silently omits an advisory fixture whose target is absent', async () => {
    const { assembleWizardSteps } = await hostModule;
    const { steps, advisoriesByStep } = assembleWizardSteps(
        [fixtureStep('system:only', 1)],
        [fixtureStep('universe:advice', 2, {
            relativeTo: { step: 'system:missing', position: 'before' },
        })]
    );

    assert.deepStrictEqual(steps.map(step => step.id), ['system:only']);
    assert.strictEqual(advisoriesByStep.size, 0);
});

test('folds active advisories into one target page and validates and collects in display order', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM('<main></main><span id="counter"></span>');
    const document = dom.window.document;
    const calls = [];
    const appendStep = (id, order, overrides = {}) => fixtureStep(id, order, {
        render(container) {
            calls.push(`render:${id}`);
            const element = container.ownerDocument.createElement('p');
            element.textContent = id;
            container.appendChild(element);
        },
        validate() { calls.push(`validate:${id}`); return null; },
        collect() { calls.push(`collect:${id}`); return { [id]: true }; },
        ...overrides,
    });
    const relativeTo = position => ({ step: 'system:target', position });
    const host = createWizardHost({
        systemSteps: [appendStep('system:target', 10)],
        universeSteps: [
            appendStep('universe:before', 1, { relativeTo: relativeTo('before') }),
            appendStep('universe:after', 2, { relativeTo: relativeTo('after') }),
        ],
        container: document.querySelector('main'),
        counter: document.querySelector('#counter'),
    });

    host.render();
    assert.deepStrictEqual([...document.querySelectorAll('p')].map(node => node.textContent), [
        'universe:before', 'system:target', 'universe:after',
    ]);
    assert.strictEqual(document.querySelector('#counter').textContent, 'Step 1 of 2');
    host.next();
    assert.strictEqual(host.currentStep.id, 'host:review');
    assert.deepStrictEqual(calls, [
        'render:universe:before', 'render:system:target', 'render:universe:after',
        'validate:universe:before', 'validate:system:target', 'validate:universe:after',
        'collect:universe:before', 'collect:system:target', 'collect:universe:after',
    ]);
    assert.deepStrictEqual(host.wizardState, {
        'universe:before': true, 'system:target': true, 'universe:after': true,
    });
});

test('an advisory validation error blocks later validation and all collection', async () => {
    const { createWizardHost } = await hostModule;
    const calls = [];
    const host = createWizardHost({
        systemSteps: [fixtureStep('system:target', 10, {
            validate() { calls.push('validate:target'); return null; },
            collect() { calls.push('collect:target'); return {}; },
        })],
        universeSteps: [fixtureStep('universe:before', 1, {
            relativeTo: { step: 'system:target', position: 'before' },
            validate() { calls.push('validate:advisory'); return 'Advisory blocked.'; },
            collect() { calls.push('collect:advisory'); return {}; },
        })],
    });

    const result = host.next();
    assert.deepStrictEqual(result, { advanced: false, error: 'Advisory blocked.' });
    assert.deepStrictEqual(calls, ['validate:advisory']);
});

test('an advisory shouldSkip is independent of its visible target', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM('<main></main>');
    const document = dom.window.document;
    const calls = [];
    const host = createWizardHost({
        systemSteps: [fixtureStep('system:target', 10, {
            render(container) { calls.push('render:target'); container.append('target'); },
            validate() { calls.push('validate:target'); return null; },
            collect() { calls.push('collect:target'); return { target: true }; },
        })],
        universeSteps: [fixtureStep('universe:advice', 1, {
            relativeTo: { step: 'system:target', position: 'before' },
            shouldSkip: () => true,
            render() { calls.push('render:advisory'); },
            validate() { calls.push('validate:advisory'); return null; },
            collect() { calls.push('collect:advisory'); return {}; },
        })],
        container: document.querySelector('main'),
    });

    host.render();
    host.next();
    assert.deepStrictEqual(calls, ['render:target', 'validate:target', 'collect:target']);
    assert.strictEqual(host.wizardState.target, true);
});

test('a system-only host renders, collects, navigates, and reaches host review', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM(`<!doctype html><body>
        <main id="step"></main><span id="counter"></span>
        <button id="back"></button><button id="next"></button><button id="submit"></button>
    </body>`);
    const document = dom.window.document;
    const calls = [];
    const first = fixtureStep('system:identity', 1, {
        render(container) { calls.push('render:system:identity'); container.textContent = 'Identity'; },
        validate() { calls.push('validate:system:identity'); return null; },
        collect() { calls.push('collect:system:identity'); return { name: 'Synthetic Hero' }; },
    });
    const second = fixtureStep('system:rules', 2, {
        render(container) { calls.push('render:system:rules'); container.textContent = 'Rules'; },
        validate() { calls.push('validate:system:rules'); return null; },
        collect() { calls.push('collect:system:rules'); return { score: 42 }; },
    });
    const host = createWizardHost({
        systemSteps: [first, second],
        container: document.querySelector('#step'),
        counter: document.querySelector('#counter'),
        backButton: document.querySelector('#back'),
        nextButton: document.querySelector('#next'),
        submitButtons: [document.querySelector('#submit')],
    });

    host.render();
    assert.strictEqual(document.querySelector('#counter').textContent, 'Step 1 of 3');
    assert.strictEqual(document.querySelector('#back').style.display, 'none');
    host.next();
    assert.strictEqual(host.currentStep.id, 'system:rules');
    assert.strictEqual(document.querySelector('#counter').textContent, 'Step 2 of 3');
    host.back();
    assert.strictEqual(host.currentStep.id, 'system:identity');
    host.next();
    host.next();

    assert.strictEqual(host.currentStep.id, 'host:review');
    assert.strictEqual(document.querySelector('#counter').textContent, 'Step 3 of 3');
    assert.strictEqual(document.querySelector('#next').style.display, 'none');
    assert.strictEqual(document.querySelector('#submit').style.display, '');
    assert.deepStrictEqual(host.wizardState, { name: 'Synthetic Hero', score: 42 });
    assert.match(document.querySelector('#step').textContent, /NameSynthetic Hero/);
    assert.match(document.querySelector('#step').textContent, /Score42/);
    assert.ok(calls.includes('validate:system:identity'));
    assert.ok(calls.includes('collect:system:rules'));
});

test('renders static step info and clears the panel to a neutral default for a step without info', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM(`<!doctype html><body>
        <main id="step"></main>
        <aside id="info" class="wizard-info-panel is-default">
            <h4 class="lore-title"></h4>
            <div id="lore-sec-flavor"><div class="lore-sec-body"></div></div>
            <div id="lore-sec-mechanics"><div class="lore-sec-body"></div></div>
            <div id="lore-sec-consider"><div class="lore-sec-body"></div></div>
            <div id="lore-sec-example"><div class="lore-sec-body"></div></div>
        </aside>
    </body>`);
    const document = dom.window.document;
    const panel = document.querySelector('#info');
    const host = createWizardHost({
        systemSteps: [
            fixtureStep('system:informed', 1, { info: {
                title: 'Useful Context',
                flavor: 'First paragraph.\n\nSecond paragraph.',
                mechanics: 'A real rule.',
                inPlay: 'An example in play.',
            } }),
            fixtureStep('system:neutral', 2),
        ],
        container: document.querySelector('#step'),
        infoPanel: panel,
    });

    host.render();
    assert.strictEqual(panel.classList.contains('is-default'), false);
    assert.strictEqual(panel.querySelector('.lore-title').textContent, 'Useful Context');
    assert.deepStrictEqual(
        [...panel.querySelectorAll('#lore-sec-flavor p')].map(paragraph => paragraph.textContent),
        ['First paragraph.', 'Second paragraph.']
    );
    assert.strictEqual(panel.querySelector('#lore-sec-mechanics').style.display, '');
    assert.strictEqual(panel.querySelector('#lore-sec-consider').style.display, 'none');
    assert.match(panel.querySelector('#lore-sec-example').textContent, /example in play/);

    host.next();
    assert.strictEqual(panel.classList.contains('is-default'), true);
    assert.strictEqual(panel.querySelector('.lore-title').textContent, '');
    assert.strictEqual(panel.querySelector('.lore-title').style.display, 'none');
    assert.strictEqual(panel.querySelector('#lore-sec-flavor').style.display, 'none');
    assert.strictEqual(panel.querySelector('#lore-sec-flavor').textContent, '');
    assert.strictEqual(panel.querySelector('#lore-sec-mechanics').textContent, '');
    assert.strictEqual(panel.querySelector('#lore-sec-example').textContent, '');
});

test('review filters fields when requested and formats labels and values readably', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM('<main></main>');
    const document = dom.window.document;
    const host = createWizardHost({
        systemSteps: [fixtureStep('system:review', 1, {
            collect() {
                return {
                    blood_purity: 'Pure',
                    amber_traits: ['Cunning', 'Patient'],
                    abilityScoreModifiers: { constitution: 1 },
                };
            },
        })],
        container: document.querySelector('main'),
        filterForReview(wizardState) {
            const { abilityScoreModifiers, ...submittedFields } = wizardState;
            return submittedFields;
        },
    });

    host.render();
    host.next();

    const review = document.querySelector('main').textContent;
    assert.match(review, /Blood PurityPure/);
    assert.match(review, /Amber TraitsCunning, Patient/);
    assert.doesNotMatch(review, /Ability Score Modifiers/);
});

test('skips steps live in both directions and renders all non-null footnotes separately from filtered review fields', async () => {
    const { createWizardHost } = await hostModule;
    const dom = new JSDOM('<main></main>');
    const document = dom.window.document;
    const skipChecks = [];
    const conditional = fixtureStep('system:conditional', 2, {
        shouldSkip(state) {
            skipChecks.push(state.skipConditional);
            return state.skipConditional;
        },
        footnote(state) { return state.skipConditional ? 'Conditional step was skipped.' : null; },
    });
    const host = createWizardHost({
        systemSteps: [
            fixtureStep('system:first', 1, { collect: state => ({ skipConditional: state.skipConditional }) }),
            conditional,
            fixtureStep('system:last', 3, { footnote: () => 'Always noted.' }),
        ],
        wizardState: { skipConditional: true },
        container: document.querySelector('main'),
        filterForReview: () => ({ visible: 'summary' }),
    });

    host.render();
    host.next();
    assert.strictEqual(host.currentStep.id, 'system:last');
    host.next();
    assert.strictEqual(host.currentStep.id, 'host:review');
    assert.match(document.querySelector('main').textContent, /VisiblesummaryNotesConditional step was skipped\.Always noted\./);
    assert.doesNotMatch(document.querySelector('.wizard-review-fields').textContent, /Conditional step was skipped/);
    host.back();
    assert.strictEqual(host.currentStep.id, 'system:last');
    host.back();
    assert.strictEqual(host.currentStep.id, 'system:first');

    host.wizardState.skipConditional = false;
    host.next();
    assert.strictEqual(host.currentStep.id, 'system:conditional');
    assert.deepStrictEqual(skipChecks, [true, true, false, false]);
});

test('never lands on a skipped first step when rendering or navigating back', async () => {
    const { createWizardHost } = await hostModule;
    const host = createWizardHost({
        systemSteps: [
            fixtureStep('system:skipped-first', 1, { shouldSkip: () => true }),
            fixtureStep('system:first-visible', 2),
        ],
    });

    host.render();
    assert.strictEqual(host.currentStep.id, 'system:first-visible');
    host.back();
    assert.strictEqual(host.currentStep.id, 'system:first-visible');
});

test('a fixture validate message blocks advancement and collection', async () => {
    const { createWizardHost } = await hostModule;
    let collected = false;
    const errors = [];
    const host = createWizardHost({
        systemSteps: [fixtureStep('system:blocked', 1, {
            validate() { return 'Synthetic validation message.'; },
            collect() { collected = true; return {}; },
        })],
        onValidationError(message) { errors.push(message); },
    });

    const result = host.next();

    assert.deepStrictEqual(result, { advanced: false, error: 'Synthetic validation message.' });
    assert.strictEqual(host.currentStep.id, 'system:blocked');
    assert.strictEqual(collected, false);
    assert.deepStrictEqual(errors, ['Synthetic validation message.']);
});

test('rejects a system with no contributed steps with a clear error', async () => {
    const { assembleWizardSteps } = await hostModule;
    assert.throws(
        () => assembleWizardSteps([]),
        /must contribute at least one step/
    );
});
