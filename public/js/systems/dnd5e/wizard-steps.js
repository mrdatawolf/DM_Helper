const systemContentResponse = await fetch('/api/system/content/wizard');
if (!systemContentResponse.ok) throw new Error(`Failed to load system wizard content (${systemContentResponse.status}).`);
const { STAT_KEYS, STAT_FULL, CLASSES_5E } = await systemContentResponse.json();

const STANDARD_ARRAY = Object.freeze([15, 14, 13, 12, 10, 8]);
const drafts = new WeakMap();

function draftFor(state) {
    if (!drafts.has(state)) {
        drafts.set(state, {
            identity: {
                name: state.name || '', species: state.species || '', backstory: state.backstory || ''
            },
            assignment: Object.fromEntries(STAT_KEYS.map(stat => [stat, null])),
            classSelection: { class_type: state.class_type || '', level: state.level || 1 }
        });
    }
    return drafts.get(state);
}

function element(container, tag, attributes = {}, text = '') {
    const node = container.ownerDocument.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (name === 'className') node.className = value;
        else node.setAttribute(name, value);
    }
    node.textContent = text;
    return node;
}

function labeledControl(container, labelText, control) {
    const label = element(container, 'label', { className: 'form-group' });
    label.append(element(container, 'span', {}, labelText), control);
    container.appendChild(label);
}

function effectiveScores(state, assignment) {
    const modifiers = state.abilityScoreModifiers || {};
    return Object.fromEntries(STAT_KEYS.map(stat => [stat, assignment[stat] + (Number(modifiers[stat]) || 0)]));
}

function classGateStatus(cls, scores) {
    if (cls.id === 'Fighter') {
        const pass = scores.STR >= 13 || scores.DEX >= 13;
        return { pass, warnings: pass ? [] : [`STR or DEX 13 (you have STR ${scores.STR}, DEX ${scores.DEX})`] };
    }
    const warnings = Object.entries(cls.minStats || {})
        .filter(([stat, minimum]) => stat !== '_or_' && scores[stat] < minimum)
        .map(([stat, minimum]) => `${stat} ${minimum} (you have ${scores[stat]})`);
    return { pass: warnings.length === 0, warnings };
}

const identityStep = Object.freeze({
    id: 'system:dnd5e:identity', title: 'Who Are You?', order: 10,
    render(container, state) {
        const draft = draftFor(state).identity;
        const name = element(container, 'input', { type: 'text', name: 'name', required: 'required' });
        name.value = draft.name;
        name.addEventListener('input', () => { draft.name = name.value; });
        labeledControl(container, 'Character Name', name);
        const species = element(container, 'input', { type: 'text', name: 'species', required: 'required' });
        species.value = draft.species;
        species.addEventListener('input', () => { draft.species = species.value; });
        labeledControl(container, 'Race / Species', species);
        const backstory = element(container, 'textarea', { name: 'backstory', rows: '5' });
        backstory.value = draft.backstory;
        backstory.addEventListener('input', () => { draft.backstory = backstory.value; });
        labeledControl(container, 'Backstory', backstory);
    },
    validate(state) {
        const draft = draftFor(state).identity;
        if (!draft.name.trim()) return 'Character name is required.';
        if (!draft.species.trim()) return 'Race / Species is required.';
        return null;
    },
    collect(state) {
        const draft = draftFor(state).identity;
        return { name: draft.name.trim(), species: draft.species.trim(), backstory: draft.backstory.trim() };
    }
});

const abilityScoresStep = Object.freeze({
    id: 'system:dnd5e:ability-scores', title: 'Assign Stats', order: 30,
    render(container, state) {
        const assignment = draftFor(state).assignment;
        let selectedScore = null;
        const modifiers = state.abilityScoreModifiers || {};
        const intro = element(container, 'p', {}, 'Choose a value, then choose a stat. Select an assigned stat to return its value.');
        const chips = element(container, 'div', { className: 'array-chips' });
        const grid = element(container, 'div', { className: 'stat-assignment-grid' });
        const chipButtons = new Map();
        const statCards = new Map();

        function refresh() {
            const usedScores = new Set(Object.values(assignment).filter(score => score !== null));
            for (const [score, chip] of chipButtons) {
                const used = usedScores.has(score);
                chip.disabled = used;
                chip.classList.toggle('used', used);
                chip.classList.toggle('selected', selectedScore === score && !used);
                chip.setAttribute('aria-pressed', String(selectedScore === score && !used));
            }
            for (const [stat, card] of statCards) {
                const base = assignment[stat];
                const modifier = Number(modifiers[stat]) || 0;
                card.querySelector('.ssc-base').textContent = base === null ? '—' : String(base);
                const modifierNode = card.querySelector('.ssc-amber-mod');
                modifierNode.textContent = modifier === 0 ? '' : (modifier > 0 ? `+${modifier}` : String(modifier));
                modifierNode.classList.toggle('neg', modifier < 0);
                card.querySelector('.ssc-final').textContent = base === null ? '' : `Final: ${base + modifier}`;
                card.classList.toggle('has-value', base !== null);
                card.classList.toggle('targeted', selectedScore !== null && base === null);
            }
        }

        for (const score of STANDARD_ARRAY) {
            const chip = element(container, 'button', {
                type: 'button', className: 'chip', 'data-score': String(score),
                'aria-label': `Assign score ${score}`, 'aria-pressed': 'false'
            }, String(score));
            chip.addEventListener('click', () => {
                if (chip.disabled) return;
                selectedScore = selectedScore === score ? null : score;
                refresh();
            });
            chipButtons.set(score, chip);
            chips.appendChild(chip);
        }

        for (const stat of STAT_KEYS) {
            const card = element(container, 'button', {
                type: 'button', className: 'stat-slot-card', 'data-stat': stat,
                'aria-label': `Assign ${STAT_FULL[stat]} (${stat})`
            });
            card.append(
                element(container, 'span', { className: 'ssc-name' }, `${STAT_FULL[stat]} (${stat})`),
                element(container, 'span', { className: 'ssc-base' }),
                element(container, 'span', { className: 'ssc-mod-row' })
            );
            card.querySelector('.ssc-mod-row').append(
                element(container, 'span', { className: 'ssc-amber-mod' }),
                element(container, 'span', { className: 'ssc-final' })
            );
            card.addEventListener('click', () => {
                if (selectedScore === null) {
                    if (assignment[stat] !== null) assignment[stat] = null;
                } else {
                    assignment[stat] = selectedScore;
                    selectedScore = null;
                }
                refresh();
            });
            statCards.set(stat, card);
            grid.appendChild(card);
        }
        container.append(intro, chips, grid);
        refresh();
    },
    validate(state) {
        const assignment = draftFor(state).assignment;
        const missing = STAT_KEYS.filter(stat => assignment[stat] === null);
        if (missing.length) return `Assign a value to all six stats. Missing: ${missing.join(', ')}.`;
        const values = Object.values(assignment);
        if (new Set(values).size !== STANDARD_ARRAY.length || values.some(value => !STANDARD_ARRAY.includes(value))) {
            return 'Use each standard-array value exactly once.';
        }
        return null;
    },
    collect(state) {
        const scores = effectiveScores(state, draftFor(state).assignment);
        return {
            strength: scores.STR, dexterity: scores.DEX, constitution: scores.CON,
            intelligence: scores.INT, wisdom: scores.WIS, charisma: scores.CHA
        };
    }
});

const classSelectionStep = Object.freeze({
    id: 'system:dnd5e:class-selection', title: 'Class', order: 50,
    render(container, state) {
        const draft = draftFor(state).classSelection;
        const scores = {
            STR: state.strength, DEX: state.dexterity, CON: state.constitution,
            INT: state.intelligence, WIS: state.wisdom, CHA: state.charisma
        };
        const grid = element(container, 'div', { className: 'class-card-grid' });
        for (const cls of CLASSES_5E) {
            const gate = classGateStatus(cls, scores);
            const button = element(container, 'button', {
                type: 'button', className: `class-card${draft.class_type === cls.id ? ' selected' : ''}${gate.pass ? '' : ' soft-warn'}`,
                'data-class': cls.id
            });
            button.appendChild(element(container, 'strong', {}, cls.name));
            if (!gate.pass) button.appendChild(element(container, 'small', { className: 'cls-warn-msg' }, `Suggested: ${gate.warnings.join(', ')}`));
            button.addEventListener('click', () => {
                draft.class_type = cls.id;
                for (const card of grid.querySelectorAll('.class-card')) card.classList.toggle('selected', card === button);
            });
            grid.appendChild(button);
        }
        container.appendChild(grid);
        const level = element(container, 'input', { type: 'number', name: 'level', min: '1', max: '20' });
        level.value = String(draft.level);
        level.addEventListener('input', () => { draft.level = Number(level.value); });
        labeledControl(container, 'Level', level);
    },
    validate(state) {
        const draft = draftFor(state).classSelection;
        if (!draft.class_type) return 'Please select a class.';
        if (!Number.isInteger(draft.level) || draft.level < 1 || draft.level > 20) return 'Level must be between 1 and 20.';
        return null;
    },
    collect(state) {
        const draft = draftFor(state).classSelection;
        return { class_type: draft.class_type, level: draft.level };
    }
});

const steps = Object.freeze([identityStep, abilityScoresStep, classSelectionStep]);

export { steps, classGateStatus };
