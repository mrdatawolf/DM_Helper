import { state, API_BASE } from './dm-state.js';
import { loadNpcs } from './dm-core.js';
import { closeModal, showModal } from './dm-modal-utils.js';
// Creature/NPC form fields shared by create + edit
const CREATURE_ROLES = ['Predator', 'Ally', 'Pet', 'Fae', 'Monster', 'Other'];
const CREATURE_INFLUENCES = ['None', 'Pattern', 'Argent Refrain', 'Logrus', 'Mixed', 'Nexus'];

function creatureFormFields(n = {}) {
    const s = n.stats || {};
    const a = s.abilities || {};
    const shadowOptions = state.shadows.map(sh => `<option value="${sh.id}"${n.shadow_id === sh.id ? ' selected' : ''}>${escHtml(sh.name)}</option>`).join('');
    const roleOptions = CREATURE_ROLES.map(r => `<option value="${r}"${n.role === r ? ' selected' : ''}>${r}</option>`).join('');
    const influenceOptions = CREATURE_INFLUENCES.map(v => `<option value="${v}"${(n.influence || 'None') === v ? ' selected' : ''}>${v === 'Argent Refrain' ? 'The Argent Refrain' : v}</option>`).join('');
    const joinLines = arr => (arr || []).join('\n');

    return `
        <div class="form-row">
            <div class="form-group"><label>Name *</label><input type="text" name="name" value="${escHtml(n.name || '')}" required></div>
            <div class="form-group"><label>Creature Type / Species</label><input type="text" name="creature_type" value="${escHtml(n.creature_type || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Shadow</label><select name="shadow_id"><option value="">— None —</option>${shadowOptions}</select></div>
            <div class="form-group"><label>Role</label><select name="role">${roleOptions}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Size / Type</label><input type="text" name="stat_size_type" placeholder="e.g. Large beast" value="${escHtml(s.size_type || '')}"></div>
            <div class="form-group"><label>Alignment</label><input type="text" name="alignment" placeholder="e.g. Chaotic Neutral" value="${escHtml(n.alignment || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Armor Class</label><input type="number" name="armor_class" value="${n.armor_class ?? ''}"></div>
            <div class="form-group"><label>Hit Points</label><input type="number" name="hit_points" value="${n.hit_points ?? ''}"></div>
            <div class="form-group"><label>Speed</label><input type="text" name="stat_speed" placeholder="e.g. 30 ft., fly 60 ft." value="${escHtml(s.speed || '')}"></div>
        </div>
        <div class="form-row">
            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<div class="form-group"><label>${k.toUpperCase()}</label><input type="number" name="ability_${k}" value="${a[k] ?? ''}"></div>`).join('')}
        </div>
        <div class="form-row">
            <div class="form-group"><label>Order/Chaos Rating (0-100)</label><input type="number" name="order_chaos_value" min="0" max="100" value="${n.order_chaos_value ?? 50}"></div>
            <div class="form-group"><label>Influence</label><select name="influence">${influenceOptions}</select></div>
            <div class="form-group"><label>Challenge Rating</label><input type="text" name="stat_challenge_rating" placeholder="e.g. 3 (700 XP)" value="${escHtml(s.challenge_rating || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Saving Throws</label><input type="text" name="stat_saving_throws" value="${escHtml(s.saving_throws || '')}"></div>
            <div class="form-group"><label>Skills</label><input type="text" name="stat_skills" value="${escHtml(s.skills || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Damage Immunities</label><input type="text" name="stat_damage_immunities" value="${escHtml(s.damage_immunities || '')}"></div>
            <div class="form-group"><label>Condition Immunities</label><input type="text" name="stat_condition_immunities" value="${escHtml(s.condition_immunities || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Senses</label><input type="text" name="stat_senses" value="${escHtml(s.senses || '')}"></div>
            <div class="form-group"><label>Languages</label><input type="text" name="stat_languages" value="${escHtml(s.languages || '')}"></div>
        </div>
        <div class="form-group"><label>Traits (one per line)</label><textarea name="stat_traits" rows="3">${escHtml(joinLines(s.traits))}</textarea></div>
        <div class="form-group"><label>Actions (one per line)</label><textarea name="stat_actions" rows="3">${escHtml(joinLines(s.actions))}</textarea></div>
        <div class="form-group"><label>Reactions (one per line)</label><textarea name="stat_reactions" rows="2">${escHtml(joinLines(s.reactions))}</textarea></div>
        <div class="form-group"><label>Lore (one per line)</label><textarea name="stat_lore" rows="4">${escHtml(joinLines(s.lore))}</textarea></div>
        <div class="form-group"><label>Description (short summary)</label><textarea name="description" rows="2">${escHtml(n.description || '')}</textarea></div>
        <div class="form-group"><label>DM Notes (never shown to players)</label><textarea name="dm_notes" rows="2">${escHtml(n.dm_notes || '')}</textarea></div>
        <div class="form-group">
            <label class="checkbox-group"><input type="checkbox" name="is_important"${n.is_important ? ' checked' : ''}> Important NPC</label>
        </div>
        <div class="form-group">
            <label class="checkbox-group"><input type="checkbox" name="is_spoiler"${n.is_spoiler ? ' checked' : ''}> Spoiler (hidden from players until revealed)</label>
        </div>
    `;
}

function creaturePayloadFromForm(event) {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.shadow_id = data.shadow_id ? parseInt(data.shadow_id, 10) : null;
    data.armor_class = data.armor_class ? parseInt(data.armor_class, 10) : null;
    data.hit_points = data.hit_points ? parseInt(data.hit_points, 10) : null;
    data.order_chaos_value = data.order_chaos_value ? parseInt(data.order_chaos_value, 10) : 50;
    data.is_important = formData.has('is_important') ? 1 : 0;
    data.is_spoiler = formData.has('is_spoiler') ? 1 : 0;

    const splitLines = v => (v || '').split('\n').map(l => l.trim()).filter(Boolean);
    const abilities = {};
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        if (data[`ability_${k}`] !== '') abilities[k] = parseInt(data[`ability_${k}`], 10);
        delete data[`ability_${k}`];
    }

    data.stats = {
        size_type: data.stat_size_type || '',
        speed: data.stat_speed || '',
        abilities,
        saving_throws: data.stat_saving_throws || '',
        skills: data.stat_skills || '',
        damage_immunities: data.stat_damage_immunities || '',
        condition_immunities: data.stat_condition_immunities || '',
        senses: data.stat_senses || '',
        languages: data.stat_languages || '',
        challenge_rating: data.stat_challenge_rating || '',
        traits: splitLines(data.stat_traits),
        actions: splitLines(data.stat_actions),
        reactions: splitLines(data.stat_reactions),
        lore: splitLines(data.stat_lore)
    };
    for (const key of Object.keys(data)) {
        if (key.startsWith('stat_')) delete data[key];
    }

    return data;
}

function showCreateCreatureModal() {
    showModal('Create Creature / NPC', `
        <form onsubmit="createCreature(event)">
            ${creatureFormFields()}
            <button type="submit" class="btn-primary">Create</button>
        </form>
    `);
}

// Familiar form fields shared by bond + edit. Growth table is a raw JSON
// textarea — it's a DM-authored, per-familiar homebrew structure, and a
// full dynamic row editor isn't worth building for a first version.
const FAMILIAR_GROWTH_PLACEHOLDER = JSON.stringify([
    { level: 3, hp_bonus: 5, ac_bonus: 0, abilities_gained: ['Keen Senses'], notes: 'Grows to Small size' },
    { level: 5, hp_bonus: 10, ac_bonus: 1, abilities_gained: ['Share Senses'], notes: 'The bond deepens' }
], null, 2);

function familiarFormFields(f = {}) {
    const s = f.base_stats || {};
    const a = s.abilities || {};
    const templateOptions = state.npcs.map(n => `<option value="${n.id}"${f.template_npc_id === n.id ? ' selected' : ''}>${escHtml(n.name)}</option>`).join('');
    const growthJson = f.growth_table && f.growth_table.length ? JSON.stringify(f.growth_table, null, 2) : '';

    return `
        <div class="form-row">
            <div class="form-group"><label>Name *</label><input type="text" name="name" value="${escHtml(f.name || '')}" required></div>
            <div class="form-group"><label>Creature Type / Species</label><input type="text" name="creature_type" placeholder="e.g. Dog" value="${escHtml(f.creature_type || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Bond Type</label><input type="text" name="bond_type" value="${escHtml(f.bond_type || 'Psychic')}"></div>
            <div class="form-group"><label>Prefill from Bestiary</label><select name="template_npc_id"><option value="">— None —</option>${templateOptions}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Base Armor Class</label><input type="number" name="armor_class" value="${f.armor_class ?? ''}"></div>
            <div class="form-group"><label>Base Hit Points</label><input type="number" name="base_hit_points" value="${f.base_hit_points ?? ''}"></div>
        </div>
        <div class="form-row">
            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<div class="form-group"><label>${k.toUpperCase()}</label><input type="number" name="ability_${k}" value="${a[k] ?? ''}"></div>`).join('')}
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2">${escHtml(f.description || '')}</textarea></div>
        <div class="form-group"><label>Bond Notes (how the psychic bond manifests)</label><textarea name="bond_notes" rows="2">${escHtml(f.bond_notes || '')}</textarea></div>
        <div class="form-group">
            <label>Growth Table (JSON — bonuses/abilities unlocked as the bonded character levels up)</label>
            <textarea name="growth_table" rows="6" placeholder="${escHtml(FAMILIAR_GROWTH_PLACEHOLDER)}">${escHtml(growthJson)}</textarea>
        </div>
        <div class="form-group"><label>DM Notes (never shown to players)</label><textarea name="dm_notes" rows="2">${escHtml(f.dm_notes || '')}</textarea></div>
    `;
}

function familiarPayloadFromForm(event) {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.template_npc_id = data.template_npc_id ? parseInt(data.template_npc_id, 10) : null;
    data.armor_class = data.armor_class ? parseInt(data.armor_class, 10) : null;
    data.base_hit_points = data.base_hit_points ? parseInt(data.base_hit_points, 10) : null;

    const abilities = {};
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        if (data[`ability_${k}`] !== '') abilities[k] = parseInt(data[`ability_${k}`], 10);
        delete data[`ability_${k}`];
    }
    if (Object.keys(abilities).length) data.base_stats = { abilities };

    if (data.growth_table && data.growth_table.trim()) {
        try {
            data.growth_table = JSON.parse(data.growth_table);
        } catch (err) {
            throw new Error('Growth Table must be valid JSON');
        }
    } else {
        data.growth_table = [];
    }

    return data;
}

async function createCreature(event) {
    event.preventDefault();
    const data = creaturePayloadFromForm(event);

    try {
        await apiFetch(`${API_BASE}/npcs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadNpcs();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating creature');
    }
}

async function deleteCreature(id) {
    if (!confirm('Are you sure you want to delete this creature/NPC?')) return;

    try {
        await apiFetch(`${API_BASE}/npcs/${id}`, { method: 'DELETE' });
        await loadNpcs();
    } catch (error) {
        console.error('Error:', error);
        showToast(`Failed to delete creature: ${error.message}`);
    }
}

Object.assign(window, { createCreature, deleteCreature, showCreateCreatureModal });
export { creatureFormFields, creaturePayloadFromForm, familiarFormFields, familiarPayloadFromForm };
