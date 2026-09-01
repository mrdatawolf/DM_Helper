import '../ability-conversion.js';

const { scoreFromPercentile, dndModifier, percentileFromScore } = AbilityConversion;

const ABILITIES = [
    ['strength', 'STR', 'Strength'], ['dexterity', 'DEX', 'Dexterity'],
    ['constitution', 'CON', 'Constitution'], ['intelligence', 'INT', 'Intelligence'],
    ['wisdom', 'WIS', 'Wisdom'], ['charisma', 'CHA', 'Charisma'],
];
const SKILLS = [
    ['acrobatics', 'Acrobatics', 'dexterity'], ['animal_handling', 'Animal Handling', 'wisdom'],
    ['arcana', 'Arcana', 'intelligence'], ['athletics', 'Athletics', 'strength'],
    ['deception', 'Deception', 'charisma'], ['history', 'History', 'intelligence'],
    ['insight', 'Insight', 'wisdom'], ['intimidation', 'Intimidation', 'charisma'],
    ['investigation', 'Investigation', 'intelligence'], ['medicine', 'Medicine', 'wisdom'],
    ['nature', 'Nature', 'intelligence'], ['perception', 'Perception', 'wisdom'],
    ['performance', 'Performance', 'charisma'], ['persuasion', 'Persuasion', 'charisma'],
    ['religion', 'Religion', 'intelligence'], ['sleight_of_hand', 'Sleight of Hand', 'dexterity'],
    ['stealth', 'Stealth', 'dexterity'], ['survival', 'Survival', 'wisdom'],
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const signed = value => Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function computedCharacter(character) {
    const proficiency = number(character.proficiency_bonus, 2);
    const ability = Object.fromEntries(ABILITIES.map(([key]) => [key, {
        score: scoreFromPercentile(number(character[key], 31)),
        modifier: dndModifier(number(character[key], 31)),
        save: dndModifier(number(character[key], 31)) + proficiency * number(character[`save_${key}`]),
    }]));
    const skills = Object.fromEntries(SKILLS.map(([key, , abilityKey]) => [key,
        ability[abilityKey].modifier + proficiency * number(character[`skill_${key}`])
    ]));
    const spellAbility = String(character.spellcasting_ability || '').toLowerCase();
    const spellModifier = ability[spellAbility]?.modifier ?? 0;
    return {
        ability, skills, proficiency,
        initiative: ability.dexterity.modifier + number(character.initiative_bonus),
        passivePerception: 10 + skills.perception,
        spellSaveDc: 8 + proficiency + spellModifier,
        spellAttackBonus: proficiency + spellModifier,
    };
}

// Creates the one reusable inline-edit control used by every scalar sheet field.
function editableField(container, fieldName, value, type = 'text') {
    const element = document.createElement('span');
    element.className = 'sheet-editable';
    element.dataset.field = fieldName;
    element.dataset.type = type;
    element.tabIndex = 0;
    element.title = 'Click to edit';
    element.textContent = type === 'checkbox' ? (value ? '✓' : '○') : (value ?? '—');
    container.append(element);
    return element;
}

async function saveCharacterField(character, fieldName, value) {
    await apiFetch(`/api/characters/${character.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ [fieldName]: value }),
    });
}

function activateInlineEditing(container, character, refresh) {
    container.querySelectorAll('[data-edit-slot]').forEach(slot => {
        const type = slot.dataset.editType || 'text';
        const storedValue = character[slot.dataset.editSlot];
        const displayValue = type === 'ability' ? scoreFromPercentile(number(storedValue, 31)) : storedValue;
        editableField(slot, slot.dataset.editSlot, displayValue, type);
    });
    const begin = async element => {
        if (element.dataset.type === 'checkbox') {
            try {
                await saveCharacterField(character, element.dataset.field, character[element.dataset.field] ? 0 : 1);
                await refresh();
            } catch (error) { showToast(error.message); }
            return;
        }
        if (element.querySelector('input, textarea, select')) return;
        const oldValue = character[element.dataset.field] ?? '';
        const input = element.dataset.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
        input.type = element.dataset.type === 'ability' ? 'number' : (element.dataset.type || 'text');
        input.value = element.dataset.type === 'ability' ? scoreFromPercentile(number(oldValue, 31)) : oldValue;
        if (element.dataset.type === 'ability') { input.min = '1'; input.max = '30'; }
        element.textContent = '';
        element.append(input);
        input.focus(); input.select();
        let saving = false;
        const save = async () => {
            if (saving) return; saving = true;
            let value = input.value === '' ? null : input.value;
            if (['number', 'ability'].includes(element.dataset.type) && value !== null) value = number(value);
            if (element.dataset.type === 'ability') value = percentileFromScore(value);
            try { await saveCharacterField(character, element.dataset.field, value); await refresh(); }
            catch (error) { showToast(error.message); await refresh(); }
        };
        input.addEventListener('blur', save, { once: true });
        input.addEventListener('keydown', event => { if (event.key === 'Enter' && input.tagName !== 'TEXTAREA') input.blur(); });
    };
    container.addEventListener('click', event => {
        const editable = event.target.closest('.sheet-editable');
        if (editable) begin(editable);
    });
    container.addEventListener('keydown', event => {
        const editable = event.target.closest('.sheet-editable');
        if (editable && ['Enter', ' '].includes(event.key)) { event.preventDefault(); begin(editable); }
    });
}

function slot(field, type = 'text') {
    return `<span data-edit-slot="${field}" data-edit-type="${type}"></span>`;
}

// Shared list wiring for both child resources; config supplies only their field shapes.
function editableList(container, character, config, refresh) {
    container.addEventListener('click', async event => {
        const action = event.target.dataset.listAction;
        if (!action) return;
        const row = event.target.closest('[data-list-id]');
        try {
            if (action === 'delete') {
                await apiFetch(`/api/characters/${character.id}/${config.resource}/${row.dataset.listId}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            } else if (action === 'add') {
                const body = config.create();
                if (!body) return;
                await apiFetch(`/api/characters/${character.id}/${config.resource}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(body)
                });
            } else if (action === 'toggle') {
                await apiFetch(`/api/characters/${character.id}/${config.resource}/${row.dataset.listId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ is_prepared: event.target.checked ? 1 : 0 })
                });
            } else if (action === 'edit') {
                const item = character[config.resource].find(entry => String(entry.id) === row.dataset.listId);
                const body = config.edit(item);
                if (!body) return;
                await apiFetch(`/api/characters/${character.id}/${config.resource}/${item.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify(body)
                });
            }
            await refresh();
        } catch (error) { showToast(error.message); }
    });
}

function promptWeapon(existing = {}) {
    const name = prompt('Weapon name', existing.name || ''); if (name === null || !name.trim()) return null;
    const attack = prompt('Attack bonus', existing.attack_bonus ?? 0); if (attack === null) return null;
    const damage = prompt('Damage / type', existing.damage_type || ''); if (damage === null) return null;
    return { name: name.trim(), attack_bonus: number(attack), damage_type: damage };
}
function promptSpell(existing = {}) {
    const spell_name = prompt('Spell name', existing.spell_name || ''); if (spell_name === null || !spell_name.trim()) return null;
    const spell_level = prompt('Spell level (0 for cantrip)', existing.spell_level ?? 0); if (spell_level === null) return null;
    const casting_time = prompt('Casting time', existing.casting_time || ''); if (casting_time === null) return null;
    const range = prompt('Range', existing.range || ''); if (range === null) return null;
    const components = prompt('Components', existing.components || ''); if (components === null) return null;
    const material_components = prompt('Material components', existing.material_components || ''); if (material_components === null) return null;
    const notes = prompt('Spell notes', existing.notes || ''); if (notes === null) return null;
    return {
        spell_name: spell_name.trim(), spell_level: number(spell_level), casting_time, range,
        components, material_components, notes,
        concentration: confirm('Does this spell require concentration?') ? 1 : 0,
        ritual: confirm('Can this spell be cast as a ritual?') ? 1 : 0,
        is_prepared: existing.is_prepared ?? 1,
    };
}

function renderDndCharacterSheet(character) {
    const computed = computedCharacter(character);
    const abilityHtml = ABILITIES.map(([key, short, label]) => `<div class="ability-score dnd-ability">
        <div class="label">${short}</div><div class="value">${slot(key, 'ability')}</div>
        <div class="modifier">${signed(computed.ability[key].modifier)}</div>
        <div class="sheet-save">${slot(`save_${key}`, 'checkbox')} ${signed(computed.ability[key].save)} save</div>
    </div>`).join('');
    const skillsHtml = SKILLS.map(([key, label, ability]) => `<div class="sheet-skill">
        ${slot(`skill_${key}`, 'number')} <strong>${escapeHtml(label)}</strong>
        <span>${ABILITIES.find(entry => entry[0] === ability)[1]} ${signed(computed.skills[key])}</span>
    </div>`).join('');
    const weapons = (character.weapons || []).map(weapon => `<div class="sheet-list-row" data-list-id="${weapon.id}">
        <strong>${escapeHtml(weapon.name)}</strong><span>${signed(weapon.attack_bonus)} · ${escapeHtml(weapon.damage_type || '—')}</span>
        <button data-list-action="edit">Edit</button><button data-list-action="delete">Remove</button></div>`).join('') || '<p>No attacks added.</p>';
    const spells = (character.spells || []).map(spell => `<div class="sheet-list-row" data-list-id="${spell.id}">
        <input type="checkbox" data-list-action="toggle" ${spell.is_prepared ? 'checked' : ''} aria-label="Prepared">
        <strong>${escapeHtml(spell.spell_name)}</strong><span>Level ${spell.spell_level}${spell.casting_time ? ` · ${escapeHtml(spell.casting_time)}` : ''}${spell.range ? ` · ${escapeHtml(spell.range)}` : ''}${spell.components ? ` · ${escapeHtml(spell.components)}` : ''}${spell.concentration ? ' · concentration' : ''}${spell.ritual ? ' · ritual' : ''}${spell.notes ? ` · ${escapeHtml(spell.notes)}` : ''}</span>
        <button data-list-action="edit">Edit</button><button data-list-action="delete">Remove</button></div>`).join('') || '<p>No spells added.</p>';
    const slots = Array.from({ length: 9 }, (_, index) => { const level = index + 1; return `<div>Level ${level}: ${slot(`spell_slots_${level}_total`, 'number')} total / ${slot(`spell_slots_${level}_expended`, 'number')} expended</div>`; }).join('');
    return `<section class="dnd-sheet">
        <div class="dnd-sheet-header"><div><h2>${slot('name')}</h2><div>${slot('class_type')} ${slot('subclass')} · Level ${slot('level', 'number')}</div></div>
        <div class="sheet-actions"><button class="btn-primary" data-download-pdf>Download PDF</button></div></div>
        <div class="sheet-header-grid">
            <label>Background ${slot('background')}</label><label>Alignment ${slot('alignment')}</label>
            <label>Species ${slot('species')}</label><label>XP ${slot('experience_points', 'number')}</label>
            <label>Player ${slot('player_name')}</label>
        </div>
        <div class="ability-scores">${abilityHtml}</div>
        <div class="dnd-sheet-grid">
            <section class="sheet-panel"><h3>Skills</h3>${skillsHtml}</section>
            <section class="sheet-panel"><h3>Combat</h3>
                <div class="combat-stat-grid"><label>AC ${slot('armor_class', 'number')}</label><label>Initiative ${signed(computed.initiative)} <small>(DEX + ${slot('initiative_bonus', 'number')})</small></label>
                <label>Speed ${slot('speed', 'number')}</label><label>Proficiency ${slot('proficiency_bonus', 'number')}</label>
                <label>HP ${slot('current_hp', 'number')} / ${slot('max_hp', 'number')}</label><label>Temp HP ${slot('temp_hit_points', 'number')}</label>
                <label>Hit Dice ${slot('hit_dice_current')} / ${slot('hit_dice_total')}</label><label>Passive Perception ${computed.passivePerception}</label>
                <label>Death Saves ✓ ${slot('death_save_successes', 'number')} ✗ ${slot('death_save_failures', 'number')}</label><label>Inspiration ${slot('heroic_inspiration', 'checkbox')}</label></div>
            </section>
        </div>
        <section class="sheet-panel" data-list="weapons"><div class="sheet-panel-heading"><h3>Attacks</h3><button data-list-action="add">+ Weapon</button></div>${weapons}</section>
        <section class="sheet-panel"><h3>Spellcasting</h3><div class="spell-summary"><label>Ability ${slot('spellcasting_ability')}</label><label>Save DC ${computed.spellSaveDc}</label><label>Attack ${signed(computed.spellAttackBonus)}</label></div>
            <div class="spell-slots">${slots}</div><div data-list="spells"><div class="sheet-panel-heading"><h4>Spells</h4><button data-list-action="add">+ Spell</button></div>${spells}</div></section>
        <section class="sheet-panel"><h3>Equipment & Training</h3>
            <div class="currency">CP ${slot('copper_pieces','number')} SP ${slot('silver_pieces','number')} EP ${slot('electrum_pieces','number')} GP ${slot('gold_pieces','number')} PP ${slot('platinum_pieces','number')}</div>
            <div>Attunement ${slot('attunement_slots_used','number')} / ${slot('attunement_slots_max','number')}</div>
            <div class="training-grid"><label>${slot('armor_light','checkbox')} Light armor</label><label>${slot('armor_medium','checkbox')} Medium armor</label><label>${slot('armor_heavy','checkbox')} Heavy armor</label><label>${slot('armor_shields','checkbox')} Shields</label><label>${slot('weapons_simple','checkbox')} Simple weapons</label><label>${slot('weapons_martial','checkbox')} Martial weapons</label></div>
            <label>Tools ${slot('tools_proficiency','textarea')}</label><label>Languages ${slot('languages','textarea')}</label>
        </section>
        <section class="sheet-panel"><h3>Personality & Appearance</h3>
            <div class="sheet-header-grid"><label>Age ${slot('age')}</label><label>Height ${slot('height')}</label><label>Weight ${slot('weight')}</label><label>Eyes ${slot('eyes')}</label><label>Skin ${slot('skin')}</label><label>Hair ${slot('hair')}</label></div>
            <div class="detail-grid"><label>Appearance ${slot('appearance','textarea')}</label><label>Personality ${slot('personality','textarea')}</label><label>Desires ${slot('desires','textarea')}</label><label>Fears ${slot('fears','textarea')}</label><label>Allies & Organizations ${slot('allies_organizations','textarea')}</label><label>Treasure ${slot('treasure','textarea')}</label><label>Backstory ${slot('backstory','textarea')}</label></div>
        </section>
    </section>`;
}

async function downloadCharacterPdf(character) {
    if (!globalThis.PDFLib) throw new Error('PDF library has not loaded yet');
    const computed = computedCharacter(character);
    const bytes = await fetch('/assets/dnd-5e-character-sheet-template.pdf').then(response => response.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const form = pdf.getForm();
    const setText = (name, value) => { try { form.getTextField(name).setText(String(value ?? '')); } catch {} };
    const setCheck = (name, checked) => { try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck(); } catch {} };
    setText('Character Name', character.name); setText('Class & Level', `${character.class_type || ''} ${character.subclass || ''} ${character.level || ''}`.trim());
    setText('Background', character.background); setText('Player Name', character.player_name); setText('Race', character.species); setText('Alignment', character.alignment); setText('Experience Points', character.experience_points);
    for (const [key, , label] of ABILITIES) { setText(`${label} Ability Score`, computed.ability[key].score); setText(`${label} Bonus`, signed(computed.ability[key].modifier)); setText(`${label} Save Score`, signed(computed.ability[key].save)); }
    setText('Inspiration', character.heroic_inspiration ? 'Yes' : ''); setText('Proficiency Bonus', signed(computed.proficiency)); setText('Passive Perception', computed.passivePerception); setText('Initiative', signed(computed.initiative)); setText('Speed', character.speed); setText('Armor Class', character.armor_class);
    setText('Hit Point Maximum', character.max_hp); setText('Current Hit Points', character.current_hp); setText('Temporary Hit Points', character.temp_hit_points); setText('Hit Dice Total', character.hit_dice_total); setText('Hit Dice Tally', character.hit_dice_current);
    for (let i = 1; i <= 3; i++) { setCheck(`Death Success ${i}`, number(character.death_save_successes) >= i); setCheck(`Death Failure ${i}`, number(character.death_save_failures) >= i); }
    SKILLS.forEach(([key, label]) => { const rank = number(character[`skill_${key}`]); setText(`${label} Score`, signed(computed.skills[key])); setCheck(`${label} Proficiency`, rank >= 1); setCheck(`${label} Expertise`, rank >= 2); });
    (character.weapons || []).slice(0, 6).forEach((weapon, index) => { const n = index + 1; setText(`Weapon ${n} Name`, weapon.name); setText(`Weapon ${n} Bonus`, signed(weapon.attack_bonus)); setText(`Weapon ${n} Damage/Type`, weapon.damage_type); });
    setText('Copper Pieces', character.copper_pieces); setText('Silver Pieces', character.silver_pieces); setText('Gold Pieces', character.gold_pieces); setText('Platinum Pieces', character.platinum_pieces);
    setText('Equipment', (character.gear || []).map(item => `${item.quantity || 1}× ${item.item_name}`).join('\n')); setText('Languages and Other Proficiencies', [character.languages, character.tools_proficiency].filter(Boolean).join('\n'));
    [['Light Armor Proficiency','armor_light'],['Medium Armor Proficiency','armor_medium'],['Heavy Armor Proficiency','armor_heavy'],['Shields Proficiency','armor_shields'],['Simple Weapons Proficiency','weapons_simple'],['Martial Weapons Proficiency','weapons_martial']].forEach(([field,key]) => setCheck(field, character[key]));
    ['Age','Height','Weight','Eyes','Skin','Hair'].forEach(field => setText(field, character[field.toLowerCase()])); setText('Character appearance', character.appearance); setText('Personality Traits', character.personality); setText('Desires', character.desires); setText('Fears', character.fears); setText('Allies and Organisations', character.allies_organizations); setText('Treasure 1', character.treasure); setText('Character Backstory 1', character.backstory);
    setText('Features and Traits', [character.class_features, character.species_traits, character.feats].filter(Boolean).join('\n')); setText('Spellcasting Class', character.class_type); setText('Spellcasting Ability', character.spellcasting_ability); setText('Spell Save DC', computed.spellSaveDc); setText('Spell Attack Bonus', signed(computed.spellAttackBonus));
    for (let level = 1; level <= 9; level++) { setText(`Level ${level} Slots`, character[`spell_slots_${level}_total`]); setText(`Level ${level} Expended`, character[`spell_slots_${level}_expended`]); }
    const grouped = Object.groupBy ? Object.groupBy(character.spells || [], spell => number(spell.spell_level)) : (character.spells || []).reduce((groups, spell) => ((groups[spell.spell_level] ||= []).push(spell), groups), {});
    for (const [levelText, spells] of Object.entries(grouped)) spells.forEach((spell, index) => { const level = Number(levelText); const prefix = level === 0 ? 'Cantrip' : `Level ${level} Spell`; setText(`${prefix} ${index + 1}`, spell.spell_name); if (level > 0) setCheck(`Level ${level} Prepared ${index + 1}`, spell.is_prepared); });
    const output = await pdf.save(); const blob = new Blob([output], { type: 'application/pdf' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${character.name || 'character'}-sheet.pdf`; link.click(); URL.revokeObjectURL(link.href);
}

function bindDndCharacterSheet(container, character, refresh) {
    activateInlineEditing(container, character, refresh);
    editableList(container.querySelector('[data-list="weapons"]'), character, { resource: 'weapons', create: () => promptWeapon(), edit: promptWeapon }, refresh);
    editableList(container.querySelector('[data-list="spells"]'), character, { resource: 'spells', create: () => promptSpell(), edit: promptSpell }, refresh);
    container.querySelector('[data-download-pdf]').addEventListener('click', () => downloadCharacterPdf(character).catch(error => showToast(error.message)));
}

export { bindDndCharacterSheet, computedCharacter, downloadCharacterPdf, editableField, editableList, renderDndCharacterSheet };
