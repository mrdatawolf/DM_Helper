/**
 * @typedef {Object} WizardStep
 * @property {string} id
 * @property {string} title
 * @property {number} order
 * @property {{step: string, position: 'before'|'after'}} [relativeTo]
 * @property {(wizardState: Object) => boolean} [shouldSkip]
 * @property {(wizardState: Object) => (string|null)} [footnote]
 * @property {{title: string, flavor?: string, mechanics?: string, consider?: string, inPlay?: string}} [info]
 * @property {(container: Element, wizardState: Object) => void} render
 * @property {(wizardState: Object) => (string|null|undefined)} validate
 * @property {(wizardState: Object) => Object} collect
 */

function assertStep(step) {
    if (!step || typeof step.id !== 'string' || !step.id) {
        throw new TypeError('Wizard steps require a non-empty string id.');
    }
    if (typeof step.title !== 'string' || !step.title) {
        throw new TypeError(`Wizard step "${step.id}" requires a non-empty string title.`);
    }
    if (typeof step.order !== 'number' || !Number.isFinite(step.order)) {
        throw new TypeError(`Wizard step "${step.id}" requires a finite numeric order.`);
    }
    for (const method of ['render', 'validate', 'collect']) {
        if (typeof step[method] !== 'function') {
            throw new TypeError(`Wizard step "${step.id}" requires a ${method}() function.`);
        }
    }
    if (step.relativeTo && (
        typeof step.relativeTo.step !== 'string'
        || !['before', 'after'].includes(step.relativeTo.position)
    )) {
        throw new TypeError(`Wizard step "${step.id}" has an invalid relativeTo declaration.`);
    }
    for (const method of ['shouldSkip', 'footnote']) {
        if (step[method] !== undefined && typeof step[method] !== 'function') {
            throw new TypeError(`Wizard step "${step.id}" ${method} must be a function when provided.`);
        }
    }
}

/**
 * Combines system and optional universe contributions. Native stable sorting
 * preserves concatenation order when two steps declare the same order.
 * Advisory steps are attached around non-advisory targets; an advisory whose
 * target is absent is intentionally omitted from both returned structures.
 *
 * @param {WizardStep[]} systemSteps
 * @param {WizardStep[]} [universeSteps]
 * @returns {{steps: WizardStep[], advisoriesByStep: Map<string, {before: WizardStep[], after: WizardStep[]}>}}
 */
function assembleWizardSteps(systemSteps, universeSteps = []) {
    if (!Array.isArray(systemSteps) || systemSteps.length === 0) {
        throw new Error('A wizard system must contribute at least one step.');
    }
    if (!Array.isArray(universeSteps)) {
        throw new TypeError('universeSteps must be an array when provided.');
    }

    const sorted = [...systemSteps, ...universeSteps]
        .map((step, index) => ({ step, index }))
        .sort((a, b) => (a.step.order - b.step.order) || (a.index - b.index))
        .map(({ step }) => step);
    sorted.forEach(assertStep);

    const ordinary = sorted.filter(step => !step.relativeTo);
    const ordinaryIds = new Set(ordinary.map(step => step.id));
    const advisoriesByStep = new Map();

    for (const step of sorted) {
        if (!step.relativeTo || !ordinaryIds.has(step.relativeTo.step)) continue;
        const attachments = advisoriesByStep.get(step.relativeTo.step)
            || { before: [], after: [] };
        attachments[step.relativeTo.position].push(step);
        advisoriesByStep.set(step.relativeTo.step, attachments);
    }

    return { steps: ordinary, advisoriesByStep };
}

function reviewValue(value) {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.map(reviewValue).join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
        return Object.entries(value)
            .map(([field, fieldValue]) => `${reviewLabel(field)}: ${reviewValue(fieldValue)}`)
            .join(', ');
    }
    return String(value);
}

function reviewLabel(field) {
    return field
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

/** @returns {WizardStep} */
function createReviewStep(filterForReview, contributedSteps = []) {
    return {
        id: 'host:review',
        title: 'Review',
        order: Number.MAX_SAFE_INTEGER,
        render(container, wizardState) {
            const reviewFields = filterForReview ? filterForReview(wizardState) : wizardState;
            const list = container.ownerDocument.createElement('dl');
            list.className = 'wizard-review-fields';
            for (const [field, value] of Object.entries(reviewFields)) {
                const term = container.ownerDocument.createElement('dt');
                const detail = container.ownerDocument.createElement('dd');
                term.textContent = reviewLabel(field);
                detail.textContent = reviewValue(value);
                list.append(term, detail);
            }
            container.appendChild(list);

            const footnotes = contributedSteps
                .map(step => step.footnote?.(wizardState))
                .filter(note => note !== null && note !== undefined);
            if (footnotes.length) {
                const heading = container.ownerDocument.createElement('h3');
                heading.textContent = 'Notes';
                const notes = container.ownerDocument.createElement('ul');
                notes.className = 'wizard-review-notes';
                for (const footnote of footnotes) {
                    const item = container.ownerDocument.createElement('li');
                    item.textContent = footnote;
                    notes.appendChild(item);
                }
                container.append(heading, notes);
            }
        },
        validate() { return null; },
        collect() { return {}; },
    };
}

/**
 * Creates the browser-side orchestrator. The supplied chrome elements are
 * optional so sequencing and dispatch can also run without a DOM shell.
 */
function createWizardHost({
    systemSteps,
    universeSteps,
    container,
    counter,
    backButton,
    nextButton,
    submitButtons = [],
    infoPanel,
    wizardState = {},
    filterForReview,
    onValidationError = () => {},
}) {
    const { steps: contributedSteps, advisoriesByStep } = assembleWizardSteps(systemSteps, universeSteps);
    const contributedStepsWithAdvisories = contributedSteps.flatMap(step => {
        const advisories = advisoriesByStep.get(step.id);
        return [...(advisories?.before || []), step, ...(advisories?.after || [])];
    });
    const steps = [...contributedSteps, createReviewStep(filterForReview, contributedStepsWithAdvisories)];
    let currentIndex = 0;
    let renderedIndex = -1;
    let renderedPageSteps = [];

    function pageSteps(step) {
        const advisories = advisoriesByStep.get(step.id);
        return [
            ...(advisories?.before || []).filter(advisory => !advisory.shouldSkip?.(wizardState)),
            step,
            ...(advisories?.after || []).filter(advisory => !advisory.shouldSkip?.(wizardState)),
        ];
    }

    function renderInfoPanel(info) {
        if (!infoPanel) return;
        const title = infoPanel.querySelector('.lore-title');
        const sections = [
            ['#lore-sec-flavor', info?.flavor],
            ['#lore-sec-mechanics', info?.mechanics],
            ['#lore-sec-consider', info?.consider],
            ['#lore-sec-example', info?.inPlay],
        ];

        infoPanel.classList.toggle('is-default', !info);
        if (title) {
            title.textContent = info?.title || '';
            title.style.display = info?.title ? '' : 'none';
        }
        for (const [selector, content] of sections) {
            const section = infoPanel.querySelector(selector);
            if (!section) continue;
            section.style.display = content ? '' : 'none';
            const body = section.querySelector('.lore-sec-body');
            if (!body) continue;
            body.replaceChildren();
            if (!content) continue;
            for (const paragraphText of content.split('\n\n')) {
                const paragraph = infoPanel.ownerDocument.createElement('p');
                paragraph.textContent = paragraphText;
                body.appendChild(paragraph);
            }
        }
    }

    function updateChrome() {
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === steps.length - 1;
        if (counter) counter.textContent = `Step ${currentIndex + 1} of ${steps.length}`;
        if (backButton) backButton.style.display = isFirst ? 'none' : '';
        if (nextButton) nextButton.style.display = isLast ? 'none' : '';
        for (const button of submitButtons) button.style.display = isLast ? '' : 'none';
    }

    function render() {
        while (currentIndex < steps.length - 1 && steps[currentIndex].shouldSkip?.(wizardState)) {
            currentIndex += 1;
        }
        if (container) {
            container.replaceChildren();
            renderedPageSteps = pageSteps(steps[currentIndex]);
            renderedIndex = currentIndex;
            for (const pageStep of renderedPageSteps) pageStep.render(container, wizardState);
        } else {
            renderedPageSteps = pageSteps(steps[currentIndex]);
            renderedIndex = currentIndex;
        }
        renderInfoPanel(steps[currentIndex].info);
        updateChrome();
        return steps[currentIndex];
    }

    function next() {
        const step = steps[currentIndex];
        const currentPageSteps = renderedIndex === currentIndex ? renderedPageSteps : pageSteps(step);
        for (const pageStep of currentPageSteps) {
            const error = pageStep.validate(wizardState);
            if (error) {
                onValidationError(error);
                return { advanced: false, error };
            }
        }

        for (const pageStep of currentPageSteps) {
            const fields = pageStep.collect(wizardState);
            if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
                throw new TypeError(`Wizard step "${pageStep.id}" collect() must return a fields object.`);
            }
            Object.assign(wizardState, fields);
        }

        if (currentIndex < steps.length - 1) currentIndex += 1;
        while (currentIndex < steps.length - 1 && steps[currentIndex].shouldSkip?.(wizardState)) {
            currentIndex += 1;
        }
        render();
        return { advanced: true, error: null };
    }

    function back() {
        let candidateIndex = currentIndex - 1;
        while (candidateIndex >= 0 && steps[candidateIndex].shouldSkip?.(wizardState)) {
            candidateIndex -= 1;
        }
        if (candidateIndex >= 0) currentIndex = candidateIndex;
        render();
        return steps[currentIndex];
    }

    return {
        steps,
        wizardState,
        render,
        next,
        back,
        get currentIndex() { return currentIndex; },
        get currentStep() { return steps[currentIndex]; },
    };
}

export { assembleWizardSteps, createReviewStep, createWizardHost };
