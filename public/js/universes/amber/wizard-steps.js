const [systemContentResponse, universeContentResponse] = await Promise.all([
    fetch('/api/system/content/wizard'),
    fetch('/api/universe/content/wizard')
]);
if (!systemContentResponse.ok) throw new Error(`Failed to load system wizard content (${systemContentResponse.status}).`);
if (!universeContentResponse.ok) throw new Error(`Failed to load universe wizard content (${universeContentResponse.status}).`);
const { STAT_KEYS, STAT_FULL } = await systemContentResponse.json();
const { IMPRINT_LORE, WIZARD_STEP_INFO, FLAW_TRAIT_PAIRS } = await universeContentResponse.json();

const drafts = new WeakMap();
const IMPRINTS = Object.freeze([
    ['None', 'None'], ['FirstPattern', 'Pattern'], ['CorwinPattern', 'Argent Refrain'],
    ['LogrusBasic', 'Logrus — Basic'], ['LogrusAdvanced', 'Logrus — Advanced'],
    ['LogrusMaster', 'Logrus — Master']
]);

function draftFor(state) {
    if (!drafts.has(state)) {
        drafts.set(state, {
            shadowOriginId: state.shadow_origin_id ?? '',
            attributes: {
                orderChaos: state.order_chaos_value ?? 50,
                bloodPurity: state.blood_purity || 'None',
                imprint: state.logrus_imprint ? `Logrus${state.logrus_imprint}`
                    : state.pattern_imprint ? (state.pattern_type === 'Argent Refrain' ? 'CorwinPattern' : 'FirstPattern') : 'None',
                brokenImprint: Boolean(state.broken_imprint), noneBonus: null,
                penaltyShift: '', penaltyJustification: ''
            },
            flawsChosen: [], noImprintFlavor: null,
            trumpArtist: Boolean(state.trump_artist)
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

function radioGroup(container, name, choices, selected, onChange) {
    const group = element(container, 'div', { className: 'radio-cards' });
    for (const [value, labelText] of choices) {
        const label = element(container, 'label', { className: 'radio-card' });
        const radio = element(container, 'input', { type: 'radio', name, value });
        radio.checked = value === selected;
        radio.addEventListener('change', () => { if (radio.checked) onChange(value); });
        label.append(radio, element(container, 'span', {}, labelText));
        group.appendChild(label);
    }
    container.appendChild(group);
    return group;
}

function calculateAbilityScoreModifiers(attributes) {
    const modifiers = Object.fromEntries(STAT_KEYS.map(stat => [stat, 0]));
    if (attributes.orderChaos >= 75) { modifiers.INT += 1; modifiers.WIS += 1; }
    else if (attributes.orderChaos <= 25) { modifiers.STR += 1; modifiers.DEX += 1; }

    switch (attributes.imprint) {
        case 'None':
            if (attributes.noneBonus) modifiers[attributes.noneBonus] += 1;
            break;
        case 'FirstPattern': modifiers.WIS += 2; modifiers.CON += 1; break;
        case 'CorwinPattern': modifiers.INT += 2; modifiers.CHA += 1; break;
        case 'LogrusBasic': modifiers.CON += 1; break;
        case 'LogrusAdvanced':
            modifiers.CON += 1; modifiers.STR += 1; modifiers.INT -= 1; modifiers.WIS -= 1;
            if (attributes.penaltyShift) { modifiers.INT += 1; modifiers[attributes.penaltyShift] -= 1; }
            break;
        case 'LogrusMaster':
            modifiers.CON += 1; modifiers.STR += 1; modifiers.CHA += 1;
            modifiers.INT -= 2; modifiers.WIS -= 1;
            if (attributes.penaltyShift) { modifiers.INT += 1; modifiers[attributes.penaltyShift] -= 1; }
            break;
    }
    if (attributes.bloodPurity === 'None') modifiers.STR += 1;
    else if (attributes.bloodPurity === 'Half') modifiers.CHA += 1;
    else if (attributes.bloodPurity === 'Pure') modifiers.WIS += 1;
    return modifiers;
}

function effectiveScores(state) {
    return {
        STR: Number(state.strength) || 0, DEX: Number(state.dexterity) || 0,
        CON: Number(state.constitution) || 0, INT: Number(state.intelligence) || 0,
        WIS: Number(state.wisdom) || 0, CHA: Number(state.charisma) || 0
    };
}

function imprintFromState(state) {
    if (state.logrus_imprint) return `Logrus${state.logrus_imprint}`;
    if (state.pattern_imprint) return state.pattern_type === 'Argent Refrain' ? 'CorwinPattern' : 'FirstPattern';
    return 'None';
}

function dominantInfluence(shadow) {
    const levels = {
        order: Number(shadow.order_level) || 0,
        chaos: Number(shadow.chaos_level) || 0,
        dream: Number(shadow.dream_level) || 0
    };
    const highest = Math.max(...Object.values(levels));
    const leaders = Object.keys(levels).filter(name => levels[name] === highest);
    return leaders.length === 1 ? leaders[0] : 'balanced';
}

function descriptionExcerpt(description, limit = 180) {
    const text = String(description || '').trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trimEnd()}…`;
}

function recommendedClasses(scores, imprint) {
    const { STR, DEX, INT, WIS, CHA } = scores;
    const recommendations = new Set();
    if (imprint === 'FirstPattern') {
        if (WIS >= 13) { recommendations.add('Cleric'); recommendations.add('Druid'); }
        if (INT >= 13) recommendations.add('Wizard');
    }
    if (imprint === 'CorwinPattern') {
        if (CHA >= 13) { recommendations.add('Bard'); recommendations.add('Sorcerer'); }
        if (INT >= 13) recommendations.add('Wizard');
    }
    if (imprint.startsWith('Logrus')) {
        if (STR >= 13) recommendations.add('Barbarian');
        recommendations.add('Fighter');
        if (imprint === 'LogrusMaster' && CHA >= 13) recommendations.add('Warlock');
    }
    if (DEX >= 14) { recommendations.add('Rogue'); recommendations.add('Ranger'); }
    if (STR >= 14 && DEX < 14) recommendations.add('Fighter');
    if (WIS >= 14 && !imprint.startsWith('Logrus')) recommendations.add('Druid');
    if (DEX >= 13 && WIS >= 13) recommendations.add('Monk');
    if (CHA >= 14) recommendations.add('Sorcerer');
    if (STR >= 13 && CHA >= 13) recommendations.add('Paladin');
    return recommendations;
}

function isTrumpEligible(scores) {
    return scores.DEX + scores.WIS >= 30 || scores.INT + scores.WIS >= 30;
}

const shadowOriginStep = Object.freeze({
    id: 'universe:amber:shadow-origin', title: 'Starting Shadow', order: 15,
    render(container, state) {
        const draft = draftFor(state);
        const shadows = state.shadows || [];
        container.appendChild(element(container, 'p', { className: 'panel-note' },
            'Choose the shadow that shaped your character. Filter by its strongest influence.'));

        const filters = element(container, 'div', { className: 'shadow-filter-controls', role: 'group', 'aria-label': 'Filter shadows by dominant influence' });
        const grid = element(container, 'div', { className: 'class-card-grid shadow-card-grid' });
        const cards = [];
        const applyFilter = influence => {
            for (const card of cards) card.hidden = influence !== 'all' && card.getAttribute('data-influence') !== influence;
            for (const button of filters.querySelectorAll('button')) {
                button.setAttribute('aria-pressed', String(button.getAttribute('data-filter') === influence));
            }
        };
        for (const [influence, label] of [['all', 'All'], ['order', 'Order'], ['chaos', 'Chaos'], ['dream', 'Dream'], ['balanced', 'Balanced']]) {
            const button = element(container, 'button', {
                type: 'button', className: 'btn-secondary', 'data-filter': influence,
                'aria-pressed': String(influence === 'all')
            }, label);
            button.addEventListener('click', () => applyFilter(influence));
            filters.appendChild(button);
        }
        container.appendChild(filters);

        for (const shadow of shadows) {
            const selected = String(draft.shadowOriginId) === String(shadow.id);
            const button = element(container, 'button', {
                type: 'button', className: `class-card shadow-card${selected ? ' selected' : ''}`,
                'data-shadow-id': String(shadow.id), 'data-influence': dominantInfluence(shadow),
                'aria-pressed': String(selected)
            });
            button.appendChild(element(container, 'strong', {}, shadow.name));
            button.appendChild(element(container, 'p', { className: 'shadow-description' },
                descriptionExcerpt(shadow.description) || 'No description available.'));
            button.appendChild(element(container, 'small', { className: 'shadow-influence-levels' },
                `Order ${Number(shadow.order_level) || 0} · Chaos ${Number(shadow.chaos_level) || 0} · Dream ${Number(shadow.dream_level) || 0}`));
            button.addEventListener('click', () => {
                draft.shadowOriginId = shadow.id;
                for (const card of cards) {
                    const isSelected = card === button;
                    card.classList.toggle('selected', isSelected);
                    card.setAttribute('aria-pressed', String(isSelected));
                }
            });
            cards.push(button);
            grid.appendChild(button);
        }
        container.appendChild(grid);
        if (!shadows.length) container.appendChild(element(container, 'p', {}, 'No starting shadows are available.'));
    },
    validate() { return null; },
    collect(state) {
        const value = draftFor(state).shadowOriginId;
        return { shadow_origin_id: value === '' ? null : Number(value) };
    }
});

const amberAttributesStep = Object.freeze({
    id: 'universe:amber:attributes', title: WIZARD_STEP_INFO[2].title, order: 20,
    info: Object.freeze({
        title: WIZARD_STEP_INFO[2].title,
        flavor: WIZARD_STEP_INFO[2].flavor,
        mechanics: WIZARD_STEP_INFO[2].mechanics,
        consider: WIZARD_STEP_INFO[2].consider,
        inPlay: WIZARD_STEP_INFO[2].example
    }),
    render(container, state) {
        const draft = draftFor(state).attributes;
        const range = element(container, 'input', { type: 'range', name: 'order_chaos_value', min: '0', max: '100' });
        range.value = String(draft.orderChaos);
        range.addEventListener('input', () => { draft.orderChaos = Number(range.value); });
        labeledControl(container, 'Order / Chaos Balance', range);
        container.appendChild(element(container, 'h4', {}, 'Blood Purity'));
        radioGroup(container, 'blood_purity', [['None', 'None'], ['Half', 'Half'], ['Pure', 'Pure']], draft.bloodPurity,
            value => { draft.bloodPurity = value; });
        container.appendChild(element(container, 'h4', {}, 'Power Imprint'));
        const lore = element(container, 'p', { className: 'imprint-lore' }, IMPRINT_LORE[draft.imprint]?.mechanics || 'No imprint selected.');
        radioGroup(container, 'imprint', IMPRINTS, draft.imprint, value => {
            draft.imprint = value;
            lore.textContent = IMPRINT_LORE[value]?.mechanics || 'No imprint selected.';
            const eligible = ['FirstPattern', 'CorwinPattern', 'LogrusBasic'].includes(value);
            broken.disabled = !eligible;
            if (!eligible) { broken.checked = false; draft.brokenImprint = false; }
        });
        container.appendChild(lore);
        const noneBonus = element(container, 'div', { className: 'imprint-options none-bonus' });
        noneBonus.appendChild(element(container, 'p', {}, 'No imprint: choose the stat that receives +1.'));
        radioGroup(noneBonus, 'none_bonus', STAT_KEYS.map(stat => [stat, STAT_FULL[stat]]), draft.noneBonus,
            value => { draft.noneBonus = value; });
        container.appendChild(noneBonus);
        const shift = element(container, 'div', { className: 'imprint-options penalty-shift' });
        shift.appendChild(element(container, 'p', {}, 'Advanced/Master Logrus: optionally shift one INT penalty point.'));
        radioGroup(shift, 'penalty_shift', [['', 'Keep default'], ...['STR', 'DEX', 'CON', 'CHA'].map(stat => [stat, stat])],
            draft.penaltyShift, value => { draft.penaltyShift = value; });
        const justification = element(container, 'textarea', { name: 'penalty_justification', rows: '2' });
        justification.value = draft.penaltyJustification;
        justification.addEventListener('input', () => { draft.penaltyJustification = justification.value; });
        labeledControl(shift, 'Justification for shift', justification);
        container.appendChild(shift);
        const broken = element(container, 'input', { type: 'checkbox', name: 'broken_imprint' });
        broken.checked = draft.brokenImprint;
        broken.disabled = !['FirstPattern', 'CorwinPattern', 'LogrusBasic'].includes(draft.imprint);
        broken.addEventListener('change', () => { draft.brokenImprint = broken.checked; });
        labeledControl(container, 'Broken Imprint', broken);
    },
    validate(state) {
        const draft = draftFor(state).attributes;
        if (draft.imprint === 'None' && !draft.noneBonus) return 'Choose which stat receives your +1 bonus.';
        if (['LogrusAdvanced', 'LogrusMaster'].includes(draft.imprint)
            && draft.penaltyShift && !draft.penaltyJustification.trim()) {
            return 'Please provide a justification for your penalty shift.';
        }
        return null;
    },
    collect(state) {
        const draft = draftFor(state).attributes;
        const logrus = { LogrusBasic: 'Basic', LogrusAdvanced: 'Advanced', LogrusMaster: 'Master' }[draft.imprint] || null;
        const pattern = ['FirstPattern', 'CorwinPattern'].includes(draft.imprint);
        state.abilityScoreModifiers = calculateAbilityScoreModifiers(draft);
        return {
            order_chaos_value: draft.orderChaos, blood_purity: draft.bloodPurity,
            pattern_imprint: pattern ? 1 : 0,
            pattern_type: pattern ? (draft.imprint === 'FirstPattern' ? 'Pattern' : 'Argent Refrain') : null,
            logrus_imprint: logrus, broken_imprint: draft.brokenImprint ? 1 : 0
        };
    }
});

const flawsTraitsStep = Object.freeze({
    id: 'universe:amber:flaws-traits', title: WIZARD_STEP_INFO[4].title, order: 40,
    info: Object.freeze({
        title: WIZARD_STEP_INFO[4].title,
        flavor: WIZARD_STEP_INFO[4].flavor,
        mechanics: WIZARD_STEP_INFO[4].mechanics,
        consider: WIZARD_STEP_INFO[4].consider,
        inPlay: WIZARD_STEP_INFO[4].example
    }),
    render(container, state) {
        const draft = draftFor(state);
        const imprint = imprintFromState(state);
        const path = imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
        if (imprint === 'None') {
            container.appendChild(element(container, 'p', {}, 'Choose a free trait flavor.'));
            radioGroup(container, 'no_imprint_flavor', [['pattern', FLAW_TRAIT_PAIRS.noImprint.pattern.name],
                ['logrus', FLAW_TRAIT_PAIRS.noImprint.logrus.name]], draft.noImprintFlavor,
            value => {
                draft.noImprintFlavor = value;
                draft.flawsChosen = [];
                container.replaceChildren();
                flawsTraitsStep.render(container, state);
            });
        }
        const pairs = imprint === 'None' && draft.noImprintFlavor
            ? FLAW_TRAIT_PAIRS[draft.noImprintFlavor] : FLAW_TRAIT_PAIRS[path];
        for (const pair of pairs) {
            const checkbox = element(container, 'input', { type: 'checkbox', value: pair.id });
            checkbox.checked = draft.flawsChosen.includes(pair.id);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked && draft.flawsChosen.length < 2) draft.flawsChosen.push(pair.id);
                else if (checkbox.checked) checkbox.checked = false;
                else draft.flawsChosen = draft.flawsChosen.filter(id => id !== pair.id);
            });
            labeledControl(container, `${pair.flaw.name} → ${pair.trait.name}`, checkbox);
        }
    },
    validate() { return null; },
    collect(state) {
        const draft = draftFor(state);
        const imprint = imprintFromState(state);
        const path = imprint.startsWith('Logrus') ? 'logrus'
            : imprint === 'None' && draft.noImprintFlavor ? draft.noImprintFlavor : 'pattern';
        const flaws = draft.flawsChosen.map(id => {
            const pair = FLAW_TRAIT_PAIRS[path].find(candidate => candidate.id === id);
            return pair ? { id, flaw: pair.flaw.name, trait: pair.trait.name } : null;
        }).filter(Boolean);
        if (imprint === 'None' && draft.noImprintFlavor) {
            const trait = FLAW_TRAIT_PAIRS.noImprint[draft.noImprintFlavor];
            flaws.push({ id: 'free', flaw: null, trait: trait.name, flavor: draft.noImprintFlavor });
        }
        return { amber_flaws: flaws, amber_traits: flaws.map(item => item.trait) };
    }
});

const classAdvisoryStep = Object.freeze({
    id: 'universe:amber:class-advisory', title: 'Amber Class Guidance', order: 49,
    relativeTo: Object.freeze({ step: 'system:dnd5e:class-selection', position: 'before' }),
    info: Object.freeze({
        title: 'Guidance Only',
        flavor: 'This read-only step offers class guidance based on the choices you have already made. There are no controls to complete here.'
    }),
    render(container, state) {
        const imprint = imprintFromState(state);
        const recommendations = [...recommendedClasses(effectiveScores(state), imprint)];
        const text = recommendations.length
            ? `Characters with your imprint and abilities often lean toward: ${recommendations.join(', ')}.`
            : 'Your imprint and abilities do not point toward a particular class; choose the path that fits your character.';
        container.appendChild(element(container, 'p', { className: 'wizard-advisory' }, text));
    },
    validate() { return null; },
    collect() { return {}; }
});

const trumpArtistStep = Object.freeze({
    id: 'universe:amber:trump-artist', title: 'Trump Artist', order: 60,
    shouldSkip(state) {
        return !isTrumpEligible(effectiveScores(state));
    },
    footnote(state) {
        const scores = effectiveScores(state);
        if (isTrumpEligible(scores)) return null;
        return `Not eligible for Trump Artist (DEX+WIS ${scores.DEX + scores.WIS}, INT+WIS ${scores.INT + scores.WIS}; threshold 30)`;
    },
    render(container, state) {
        const draft = draftFor(state);
        const scores = effectiveScores(state);
        const eligible = isTrumpEligible(scores);
        const summary = `DEX+WIS = ${scores.DEX + scores.WIS}; INT+WIS = ${scores.INT + scores.WIS}; threshold: 30.`;
        container.appendChild(element(container, 'p', {}, eligible ? `Trump Artist eligible. ${summary}` : `Trump Artist not eligible. ${summary}`));
        if (eligible) {
            const checkbox = element(container, 'input', { type: 'checkbox', name: 'trump_artist' });
            checkbox.checked = draft.trumpArtist;
            checkbox.addEventListener('change', () => { draft.trumpArtist = checkbox.checked; });
            labeledControl(container, 'This character is a Trump Artist', checkbox);
        } else draft.trumpArtist = false;
    },
    validate() { return null; },
    collect(state) {
        const eligible = isTrumpEligible(effectiveScores(state));
        return { trump_artist: eligible && draftFor(state).trumpArtist ? 1 : 0 };
    }
});

const steps = Object.freeze([shadowOriginStep, amberAttributesStep, flawsTraitsStep, classAdvisoryStep, trumpArtistStep]);

export { steps, calculateAbilityScoreModifiers, recommendedClasses, isTrumpEligible };
