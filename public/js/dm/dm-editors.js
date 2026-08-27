// dm-editors.js — split from app.js (behavior unchanged)
import { state, API_BASE } from './dm-state.js';
import { buildChapterPicker, loadNpcs } from './dm-core.js';
import {
    closeModal, creatureFormFields, creaturePayloadFromForm,
    familiarFormFields, familiarPayloadFromForm, showModal,
} from './dm-modals.js';
import { dmLoadSessionCombats } from './dm-scenes-combats.js';
import { loadCharacters, loadSessions, loadShadows } from './dm-lists.js';

// Placeholder functions for view/edit (to be implemented)
async function viewCharacter(id) {
    try {
        const c = await apiFetch(`${API_BASE}/characters/${id}`);

        const modifierStr = v => { const m = Math.floor((v - 10) / 2); return (m >= 0 ? '+' : '') + m; };
        const statBlock = ['strength','dexterity','constitution','intelligence','wisdom','charisma']
            .map(s => `<div class="stat"><div class="stat-label">${s.slice(0,3).toUpperCase()}</div><div class="stat-value">${c[s]}</div><div class="stat-label">${modifierStr(c[s])}</div></div>`)
            .join('');

        const badges = [
            c.pattern_imprint ? '<span class="badge badge-pattern">Pattern</span>' : '',
            c.logrus_imprint  ? '<span class="badge badge-logrus">Logrus</span>' : '',
            c.trump_artist    ? '<span class="badge">Trump Artist</span>' : '',
        ].filter(Boolean).join(' ');

        const gearRows = (c.gear || []).length
            ? (c.gear || []).map(g => `<tr><td>${escHtml(g.item_name)}${g.quantity > 1 ? ` ×${g.quantity}` : ''}</td><td>${escHtml(g.item_type || '—')}</td><td>${g.is_equipped ? 'Yes' : 'No'}</td><td>${escHtml(g.magical_properties || g.description || '—')}</td><td><button class="btn-secondary btn-sm btn-danger" onclick="dmDeleteGear(${id}, ${g.id})">×</button></td></tr>`).join('')
            : '<tr><td colspan="5" style="color:#999;font-style:italic">No gear recorded</td></tr>';

        const powerRows = (c.powers || []).length
            ? (c.powers || []).map(p => `<tr><td>${escHtml(p.power_name)}${p.power_level > 1 ? ` (Lv ${p.power_level})` : ''}</td><td>${escHtml(p.power_type || '—')}</td><td>${p.uses_per_day != null ? `${p.current_uses ?? p.uses_per_day}/${p.uses_per_day}` : 'At will'}</td><td>${escHtml(p.description || '—')}</td><td style="white-space:nowrap"><button class="btn-secondary btn-sm" onclick="dmEditPower(${id}, ${p.id})">Edit</button> <button class="btn-secondary btn-sm btn-danger" onclick="dmDeletePower(${id}, ${p.id})">×</button></td></tr>`).join('')
            : '<tr><td colspan="5" style="color:#999;font-style:italic">No powers granted yet</td></tr>';

        const familiarCards = (c.familiars || []).length
            ? (c.familiars || []).map(f => `
                <div class="card-row" style="display:block;padding:8px 0;border-bottom:1px solid #eee">
                    <div style="display:flex;justify-content:space-between;align-items:baseline">
                        <strong>${escHtml(f.name)}</strong>
                        <span style="white-space:nowrap">
                            <button class="btn-secondary btn-sm" onclick="editFamiliar(${id}, ${f.id})">Edit</button>
                            <button class="btn-secondary btn-sm btn-danger" onclick="dmDeleteFamiliar(${id}, ${f.id})">×</button>
                        </span>
                    </div>
                    <div style="color:#888;font-size:0.85em">${escHtml(f.creature_type || 'Familiar')} — ${escHtml(f.bond_type || 'Psychic')} bond</div>
                    <div style="font-size:0.85em;margin-top:2px">AC ${f.effective_ac ?? '—'} · HP ${f.effective_hp ?? '—'}${f.current_tier_level ? ` · Tier: Lv ${f.current_tier_level}` : ''}${f.next_tier ? ` · Next at Lv ${f.next_tier.level}` : ''}</div>
                    ${f.unlocked_abilities && f.unlocked_abilities.length ? `<div style="font-size:0.85em;color:#555">Abilities: ${f.unlocked_abilities.map(escHtml).join(', ')}</div>` : ''}
                </div>
            `).join('')
            : '<p style="color:#999;font-style:italic;margin:4px 0">No familiar bonded yet.</p>';

        const progressRows = (c.recent_progress || []).length
            ? (c.recent_progress || []).map(p => `<tr><td>${escHtml(p.session_title || '—')}</td><td>${escHtml(p.shadow_name || '—')}</td><td>${escHtml(p.description || '—')}</td></tr>`).join('')
            : '<tr><td colspan="3" style="color:#999;font-style:italic">No progress recorded</td></tr>';

        const html = `
            <div style="margin-bottom:12px">
                <span style="color:#888;font-size:0.9em">${escHtml(c.species)} ${escHtml(c.class_type)} — Level ${c.level}</span>
                ${c.player_name ? `<span style="margin-left:12px;color:#888;font-size:0.9em">Player: <strong>${escHtml(c.player_name)}</strong></span>` : ''}
                <div style="margin-top:6px">${badges}</div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
                <div class="card-row"><span class="card-label">Origin:</span><span class="card-value">${escHtml(c.shadow_origin_name || 'Unknown')}</span></div>
                <div class="card-row"><span class="card-label">Current Location:</span><span class="card-value">${escHtml(c.current_shadow_name || 'Unknown')}</span></div>
                <div class="card-row"><span class="card-label">Blood Purity:</span><span class="card-value">${escHtml(c.blood_purity || 'Unknown')}</span></div>
                <div class="card-row"><span class="card-label">Order/Chaos:</span><span class="card-value">${c.order_chaos_value}/100</span></div>
                <div class="card-row"><span class="card-label">HP:</span><span class="card-value">${c.current_hp} / ${c.max_hp}</span></div>
                <div class="card-row"><span class="card-label">AC / Speed:</span><span class="card-value">${c.armor_class} / ${c.speed} ft</span></div>
                <div class="card-row"><span class="card-label">Feat Pool:</span><span class="card-value">${c.feat_pool} (earned: ${c.total_feats_earned})</span></div>
                <div class="card-row"><span class="card-label">XP:</span><span class="card-value">${c.experience_points} (next: ${c.points_to_next_level})</span></div>
            </div>

            <div class="stat-block" style="margin-bottom:16px">${statBlock}</div>

            ${c.character_notes ? `<div style="margin-bottom:16px"><strong>Notes:</strong><p style="margin:6px 0 0;color:#555">${escHtml(c.character_notes)}</p></div>` : ''}

            <details open style="margin-bottom:12px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:6px">Gear (${(c.gear||[]).length})</summary>
                <table style="width:100%;border-collapse:collapse;font-size:0.9em">
                    <thead><tr style="background:#f5efe0"><th style="text-align:left;padding:4px 8px">Item</th><th style="text-align:left;padding:4px 8px">Type</th><th style="text-align:left;padding:4px 8px">Equipped</th><th style="text-align:left;padding:4px 8px">Notes</th><th></th></tr></thead>
                    <tbody>${gearRows}</tbody>
                </table>
                <button type="button" class="btn-secondary btn-sm" style="margin-top:6px" onclick="dmAddGear(${id})">+ Add Gear</button>
            </details>

            <details open style="margin-bottom:12px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:6px">Powers & Abilities (${(c.powers||[]).length})</summary>
                <table style="width:100%;border-collapse:collapse;font-size:0.9em">
                    <thead><tr style="background:#f5efe0"><th style="text-align:left;padding:4px 8px">Power</th><th style="text-align:left;padding:4px 8px">Type</th><th style="text-align:left;padding:4px 8px">Uses</th><th style="text-align:left;padding:4px 8px">Description</th><th></th></tr></thead>
                    <tbody>${powerRows}</tbody>
                </table>
                <button type="button" class="btn-secondary btn-sm" style="margin-top:6px" onclick="dmGrantPower(${id})">+ Grant Power</button>
            </details>

            <details open style="margin-bottom:12px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:6px">Familiar (${(c.familiars||[]).length})</summary>
                ${familiarCards}
                <button type="button" class="btn-secondary btn-sm" style="margin-top:6px" onclick="dmBondFamiliar(${id})">+ Bond Familiar</button>
            </details>

            <details style="margin-bottom:4px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:6px">Recent Progress</summary>
                <table style="width:100%;border-collapse:collapse;font-size:0.9em">
                    <thead><tr style="background:#f5efe0"><th style="text-align:left;padding:4px 8px">Session</th><th style="text-align:left;padding:4px 8px">Shadow</th><th style="text-align:left;padding:4px 8px">Description</th></tr></thead>
                    <tbody>${progressRows}</tbody>
                </table>
            </details>
        `;

        showModal(c.name, html);
    } catch (err) {
        showToast(`Failed to load character: ${err.message}`);
    }
}

// ── Gear & power management from the character modal ────────────────────────

async function dmAddGear(characterId) {
    const item_name = prompt('Item name:');
    if (!item_name) return;
    const item_type = prompt('Type (Weapon, Armor, Magic Item, Consumable, Tool, Other):', 'Other');
    const quantity = parseInt(prompt('Quantity:', '1'), 10) || 1;
    const magical_properties = prompt('Magical properties (blank for none):') || null;
    const description = prompt('Description (optional):') || null;

    try {
        await apiFetch(`${API_BASE}/characters/${characterId}/gear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_name, item_type, quantity, magical_properties, description })
        });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to add gear: ${err.message}`);
    }
}

async function dmDeleteGear(characterId, gearId) {
    if (!confirm('Remove this item?')) return;
    try {
        await apiFetch(`${API_BASE}/characters/${characterId}/gear/${gearId}`, { method: 'DELETE' });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to remove gear: ${err.message}`);
    }
}

async function dmGrantPower(characterId) {
    const power_name = prompt('Power name:');
    if (!power_name) return;
    const power_type = prompt('Type (Pattern, Logrus, Trump, Spell, Class Ability, Feat):', 'Class Ability');
    const power_level = parseInt(prompt('Power level:', '1'), 10) || 1;
    const usesInput = prompt('Uses per day (blank = at will):');
    const uses_per_day = usesInput && !isNaN(parseInt(usesInput, 10)) ? parseInt(usesInput, 10) : null;
    const description = prompt('Description (optional):') || null;

    try {
        await apiFetch(`${API_BASE}/characters/${characterId}/powers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ power_name, power_type, power_level, uses_per_day, description })
        });
        showToast(`Power granted: ${power_name}`);
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to grant power: ${err.message}`);
    }
}

async function dmEditPower(characterId, powerId) {
    try {
        const c = await apiFetch(`${API_BASE}/characters/${characterId}`);
        const p = (c.powers || []).find(x => x.id === powerId);
        if (!p) return;

        const power_name = prompt('Power name:', p.power_name);
        if (!power_name) return;
        const power_type = prompt('Type:', p.power_type || 'Class Ability');
        const power_level = parseInt(prompt('Power level:', p.power_level || 1), 10) || 1;
        const usesInput = prompt('Uses per day (blank = at will):', p.uses_per_day ?? '');
        const uses_per_day = usesInput && !isNaN(parseInt(usesInput, 10)) ? parseInt(usesInput, 10) : null;
        const description = prompt('Description:', p.description || '') || null;

        await apiFetch(`${API_BASE}/characters/${characterId}/powers/${powerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                power_name, power_type, power_level, uses_per_day, description,
                current_uses: uses_per_day
            })
        });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to edit power: ${err.message}`);
    }
}

async function dmBondFamiliar(characterId) {
    showModal('Bond Familiar', `
        <form onsubmit="handleBondFamiliar(event, ${characterId})">
            ${familiarFormFields()}
            <button type="submit" class="btn-primary">Bond Familiar</button>
        </form>
    `);
}

async function handleBondFamiliar(event, characterId) {
    event.preventDefault();
    try {
        const data = familiarPayloadFromForm(event);
        await apiFetch(`${API_BASE}/characters/${characterId}/familiars`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        showToast(`Familiar bonded: ${data.name}`);
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to bond familiar: ${err.message}`);
    }
}

async function editFamiliar(characterId, familiarId) {
    try {
        const c = await apiFetch(`${API_BASE}/characters/${characterId}`);
        const f = (c.familiars || []).find(x => x.id === familiarId);
        if (!f) return;

        showModal(`Edit: ${escHtml(f.name)}`, `
            <form onsubmit="handleEditFamiliar(event, ${characterId}, ${familiarId})">
                ${familiarFormFields(f)}
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load familiar: ${err.message}`);
    }
}

async function handleEditFamiliar(event, characterId, familiarId) {
    event.preventDefault();
    try {
        const data = familiarPayloadFromForm(event);
        await apiFetch(`${API_BASE}/characters/${characterId}/familiars/${familiarId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to save familiar: ${err.message}`);
    }
}

async function dmDeleteFamiliar(characterId, familiarId) {
    if (!confirm('Release this familiar\'s bond?')) return;
    try {
        await apiFetch(`${API_BASE}/characters/${characterId}/familiars/${familiarId}`, { method: 'DELETE' });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to release familiar: ${err.message}`);
    }
}

async function dmDeletePower(characterId, powerId) {
    if (!confirm('Revoke this power?')) return;
    try {
        await apiFetch(`${API_BASE}/characters/${characterId}/powers/${powerId}`, { method: 'DELETE' });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to revoke power: ${err.message}`);
    }
}

async function editCharacter(id) {
    try {
        const c = await apiFetch(`${API_BASE}/characters/${id}`);

        const shadowOptions = state.shadows.map(s =>
            `<option value="${s.id}"${c.shadow_origin_id == s.id ? ' selected' : ''}>${escHtml(s.name)}</option>`
        ).join('');
        const locationOptions = state.shadows.map(s =>
            `<option value="${s.id}"${c.current_shadow_id == s.id ? ' selected' : ''}>${escHtml(s.name)}</option>`
        ).join('');

        showModal(`Edit: ${escHtml(c.name)}`, `
            <form onsubmit="handleEditCharacter(event, ${id})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Character Name *</label>
                        <input type="text" name="name" value="${escHtml(c.name)}" required>
                    </div>
                    <div class="form-group">
                        <label>Player Name</label>
                        <input type="text" name="player_name" value="${escHtml(c.player_name || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Species/Race</label>
                        <input type="text" name="species" value="${escHtml(c.species || '')}">
                    </div>
                    <div class="form-group">
                        <label>Class</label>
                        <input type="text" name="class_type" value="${escHtml(c.class_type || '')}">
                    </div>
                    <div class="form-group">
                        <label>Level</label>
                        <input type="number" name="level" value="${c.level || 1}" min="1">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Shadow Origin</label>
                        <select name="shadow_origin_id">
                            <option value="">Unknown</option>
                            ${shadowOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Current Location</label>
                        <select name="current_shadow_id">
                            <option value="">Unknown</option>
                            ${locationOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Blood Purity</label>
                        <select name="blood_purity">
                            <option value="None"${c.blood_purity === 'None' ? ' selected' : ''}>None</option>
                            <option value="Pure"${c.blood_purity === 'Pure' ? ' selected' : ''}>Pure Blood</option>
                            <option value="Half"${c.blood_purity === 'Half' ? ' selected' : ''}>Half Blood</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Feat Pool</label>
                        <input type="number" name="feat_pool" value="${c.feat_pool || 0}" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Max HP</label>
                        <input type="number" name="max_hp" value="${c.max_hp || 10}" min="1">
                    </div>
                    <div class="form-group">
                        <label>Current HP</label>
                        <input type="number" name="current_hp" value="${c.current_hp || 10}">
                    </div>
                    <div class="form-group">
                        <label>Armor Class</label>
                        <input type="number" name="armor_class" value="${c.armor_class || 10}" min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label>Order/Chaos Balance (0=Chaos, 100=Order)</label>
                    <input type="number" name="order_chaos_value" value="${c.order_chaos_value || 50}" min="0" max="100">
                </div>
                <div class="form-group">
                    <label class="checkbox-group">
                        <input type="checkbox" name="pattern_imprint"${c.pattern_imprint ? ' checked' : ''}>
                        Has Pattern Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-group">
                        <input type="checkbox" name="logrus_imprint"${c.logrus_imprint ? ' checked' : ''}>
                        Has Logrus Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-group">
                        <input type="checkbox" name="trump_artist"${c.trump_artist ? ' checked' : ''}>
                        Has Trump Artistry
                    </label>
                </div>
                <div class="form-group">
                    <label>Character Notes</label>
                    <textarea name="character_notes">${escHtml(c.character_notes || '')}</textarea>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load character: ${err.message}`);
    }
}

async function handleEditCharacter(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.pattern_imprint = formData.has('pattern_imprint') ? 1 : 0;
    data.logrus_imprint = formData.has('logrus_imprint') ? 1 : 0;
    data.trump_artist = formData.has('trump_artist') ? 1 : 0;

    if (!data.shadow_origin_id) delete data.shadow_origin_id;
    if (!data.current_shadow_id) delete data.current_shadow_id;

    try {
        await apiFetch(`${API_BASE}/characters/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadCharacters();
    } catch (err) {
        showToast(`Failed to save character: ${err.message}`);
    }
}

async function editShadow(id) {
    try {
        const s = await apiFetch(`${API_BASE}/shadows/${id}`);

        const influenceOptions = ['None','Pattern','Argent Refrain','Logrus','Mixed','Nexus']
            .map(v => `<option value="${v}"${s.pattern_influence === v ? ' selected' : ''}>${v === 'Argent Refrain' ? 'The Argent Refrain' : v}</option>`)
            .join('');

        showModal(`Edit: ${escHtml(s.name)}`, `
            <form onsubmit="handleEditShadow(event, ${id})">
                <div class="form-group">
                    <label>Shadow Name *</label>
                    <input type="text" name="name" value="${escHtml(s.name)}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description">${escHtml(s.description || '')}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Order Level (0-100)</label>
                        <input type="number" name="order_level" value="${s.order_level}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Chaos Level (0-100)</label>
                        <input type="number" name="chaos_level" value="${s.chaos_level}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Dream Level (0-100)</label>
                        <input type="number" name="dream_level" value="${s.dream_level || 0}" min="0" max="100">
                    </div>
                </div>
                <div class="form-group">
                    <label>Influence</label>
                    <select name="pattern_influence">${influenceOptions}</select>
                </div>
                <div class="form-group">
                    <label>Corruption Status</label>
                    <textarea name="corruption_status">${escHtml(s.corruption_status || '')}</textarea>
                </div>
                <input type="hidden" name="is_starting_shadow" id="is_starting_shadow_val" value="${s.is_starting_shadow ? '1' : '0'}">
                <div class="form-group">
                    <button type="button" id="btn-starting-world"
                        class="${s.is_starting_shadow ? 'btn-primary' : 'btn-secondary'}"
                        onclick="toggleStartingWorld()">
                        Starting World${s.is_starting_shadow ? ' ✓' : ''}
                    </button>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load shadow: ${err.message}`);
    }
}

function toggleStartingWorld() {
    const hidden = document.getElementById('is_starting_shadow_val');
    const btn = document.getElementById('btn-starting-world');
    const active = hidden.value === '1';
    hidden.value = active ? '0' : '1';
    btn.className = active ? 'btn-secondary' : 'btn-primary';
    btn.textContent = active ? 'Starting World' : 'Starting World ✓';
}

async function handleEditShadow(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    data.is_starting_shadow = parseInt(data.is_starting_shadow) || 0;

    try {
        await apiFetch(`${API_BASE}/shadows/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadShadows();
    } catch (err) {
        showToast(`Failed to save shadow: ${err.message}`);
    }
}

async function editCreature(id) {
    try {
        const n = await apiFetch(`${API_BASE}/npcs/${id}`);

        showModal(`Edit: ${escHtml(n.name)}`, `
            <form onsubmit="handleEditCreature(event, ${id})">
                ${creatureFormFields(n)}
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load creature: ${err.message}`);
    }
}

async function handleEditCreature(event, id) {
    event.preventDefault();
    const data = creaturePayloadFromForm(event);

    try {
        await apiFetch(`${API_BASE}/npcs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadNpcs();
    } catch (err) {
        showToast(`Failed to save creature: ${err.message}`);
    }
}

async function editSession(id) {
    try {
        const s = await apiFetch(`${API_BASE}/sessions/${id}`);

        const linkedChapterIds = new Set((s.session_chapters || []).map(c => c.chapter_id));

        const linkedCharIds = new Set((s.session_characters || []).map(c => c.id));
        const attendanceMap  = Object.fromEntries((s.session_characters || []).map(c => [c.id, c.attendance]));
        const attendanceColors = { expected:'#8a7a5a', attended:'#27ae60', absent:'#e74c3c' };
        const charRows = state.characters.map(c => {
            const linked = linkedCharIds.has(c.id);
            const att    = attendanceMap[c.id] || 'expected';
            const color  = attendanceColors[att] || '#888';
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="flex:1">${escHtml(c.name)}${c.player_name ? ` <span style="color:#999;font-size:0.85em">(${escHtml(c.player_name)})</span>` : ''}</span>
                ${linked
                    ? `<select onchange="updateSessionCharAttendance(${id},${c.id},this.value)" style="font-size:0.85em;color:${color}">
                          ${['expected','attended','absent'].map(a => `<option value="${a}"${att===a?' selected':''}>${a}</option>`).join('')}
                       </select>
                       <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionChar(${id},${c.id},this)">×</button>`
                    : `<button type="button" class="btn-secondary btn-sm" onclick="addSessionChar(${id},${c.id},this)">+ Add</button>`
                }
            </div>`;
        }).join('');

        const linkedBeatIds = new Set((s.beats || []).map(b => b.id));
        const beatRows = (s.beats || []).map(b =>
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="flex:1;font-size:0.9em">${escHtml(b.title)}</span>
                <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionBeat(${id},${b.id},this)">×</button>
             </div>`
        ).join('') || '<em style="color:#999;font-size:0.9em">No beats linked</em>';

        const unlinkedBeats = state.beats.filter(b => !linkedBeatIds.has(b.id));
        const beatSelect = unlinkedBeats.length
            ? `<div style="display:flex;gap:8px;margin-top:8px">
                   <select id="beat-add-select-${id}" style="flex:1">
                       ${unlinkedBeats.map(b => `<option value="${b.id}">${escHtml(b.title)}</option>`).join('')}
                   </select>
                   <button type="button" class="btn-secondary btn-sm" onclick="addSessionBeat(${id})">+ Add</button>
               </div>`
            : '<em style="color:#999;font-size:0.9em;margin-top:6px;display:block">All beats linked</em>';

        const linkedNpcIds = new Set((s.npcs || []).map(n => n.id));
        const npcRows = (s.npcs || []).map(n =>
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="flex:1;font-size:0.9em"><strong>${escHtml(n.name)}</strong>${n.creature_type ? ` — ${escHtml(n.creature_type)}` : ''}${n.context ? ` <span style="color:#999">(${escHtml(n.context)})</span>` : ''}</span>
                <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionNpc(${id},${n.id},this)">×</button>
             </div>`
        ).join('') || '<em style="color:#999;font-size:0.9em">No NPCs linked</em>';

        const unlinkedNpcs = state.npcs.filter(n => !linkedNpcIds.has(n.id));
        const npcSelect = unlinkedNpcs.length
            ? `<div style="display:flex;gap:8px;margin-top:8px">
                   <select id="npc-add-select-${id}" style="flex:1">
                       ${unlinkedNpcs.map(n => `<option value="${n.id}">${escHtml(n.name)}${n.creature_type ? ` (${escHtml(n.creature_type)})` : ''}</option>`).join('')}
                   </select>
                   <button type="button" class="btn-secondary btn-sm" onclick="addSessionNpc(${id})">+ Add</button>
               </div>`
            : '<em style="color:#999;font-size:0.9em;margin-top:6px;display:block">No NPCs in system yet</em>';

        const statusSel = ['planned','in-progress','completed'].map(v =>
            `<option value="${v}"${s.session_status===v?' selected':''}>${{planned:'Planned','in-progress':'In Progress',completed:'Completed'}[v]}</option>`
        ).join('');

        showModal(`Edit Session ${s.session_number}`, `
            <form onsubmit="handleEditSession(event,${id})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Session #</label>
                        <input type="number" name="session_number" value="${s.session_number}" required>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="session_date" value="${s.session_date}" required>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="session_status">${statusSel}</select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="session_title" value="${escHtml(s.session_title || '')}">
                </div>
                <details open style="margin-bottom:14px">
                    <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Session Notes</summary>
                    <div class="form-group">
                        <label>Opening <span style="color:#999;font-size:0.85em">(pre-session hooks, setup)</span></label>
                        <textarea name="opening_notes" rows="3">${escHtml(s.opening_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Mid-Session <span style="color:#999;font-size:0.85em">(as the session unfolds)</span></label>
                        <textarea name="mid_notes" rows="3">${escHtml(s.mid_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Closing <span style="color:#999;font-size:0.85em">(what happened, cliffhangers)</span></label>
                        <textarea name="closing_notes" rows="3">${escHtml(s.closing_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>DM Scratch Pad</label>
                        <textarea name="dm_notes" rows="2">${escHtml(s.dm_notes || '')}</textarea>
                    </div>
                </details>

                <button type="submit" class="btn-primary" style="margin-bottom:20px">Save Changes</button>
            </form>

            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Active Chapters This Session</summary>
                <div style="max-height:220px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:10px 14px;background:#fdf9f2;margin-bottom:8px">
                    ${buildChapterPicker(linkedChapterIds)}
                </div>
                <button type="button" class="btn-secondary btn-sm" onclick="saveSessionChapters(${id}, this)">Save Chapter Links</button>
            </details>

            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Characters</summary>
                <div id="session-chars-${id}">${charRows}</div>
            </details>

            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Story Beats</summary>
                <div id="session-beats-${id}">${beatRows}</div>
                ${beatSelect}
            </details>

            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">NPCs & Monsters</summary>
                <div id="session-npcs-${id}">${npcRows}</div>
                ${npcSelect}
            </details>

            <details open style="margin-bottom:4px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Combat Encounters</summary>
                <div id="session-combats-${id}"><em style="color:#999;font-size:0.9em">Loading…</em></div>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <input type="text" id="new-encounter-title-${id}" placeholder="Encounter title, e.g. Ambush at the docks" style="flex:1">
                    <button type="button" class="btn-secondary btn-sm" onclick="dmAddEncounter(${id})">+ Add Encounter</button>
                </div>
                <small style="color:#999;display:block;margin-top:4px">Players run encounters from their dashboard once you set them up.</small>
            </details>
        `);
        dmLoadSessionCombats(id);
    } catch (err) {
        showToast(`Failed to load session: ${err.message}`);
    }
}

async function handleEditSession(event, id) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    try {
        await apiFetch(`${API_BASE}/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await loadSessions();
    } catch (err) {
        showToast(`Failed to save session: ${err.message}`);
    }
}

async function saveSessionChapters(sessionId, btn) {
    const section = btn.closest('details');
    const checked = new Set([...section.querySelectorAll('.chapter-check:checked')].map(el => +el.value));
    const unchecked = [...section.querySelectorAll('.chapter-check:not(:checked)')].map(el => +el.value);

    try {
        await Promise.all([
            ...checked  ? [...checked].map(cid  => apiFetch(`${API_BASE}/sessions/${sessionId}/chapters`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chapter_id:cid}) })) : [],
            ...unchecked.map(cid => apiFetch(`${API_BASE}/sessions/${sessionId}/chapters/${cid}`, { method:'DELETE' }))
        ]);
    } catch (err) {
        console.error('Failed to save chapter links:', err);
    }
    await loadSessions();
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Chapter Links'; }, 2000);
}

// These previously called bare fetch() with no error handling at all — a
// failed request was silently ignored and the UI still refreshed as if it
// had succeeded. apiFetch throws on a non-ok response, so each is now
// wrapped in a try/catch that logs the error but still refreshes the UI
// afterward, preserving that original "always refresh" behavior while
// making failures at least visible in the console instead of fully silent.

async function addSessionChar(sessionId, charId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: charId })
        });
    } catch (err) { console.error('Failed to add character to session:', err); }
    editSession(sessionId);
}

async function removeSessionChar(sessionId, charId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters/${charId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove character from session:', err); }
    editSession(sessionId);
}

async function updateSessionCharAttendance(sessionId, charId, attendance) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters/${charId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance })
        });
    } catch (err) { console.error('Failed to update attendance:', err); }
    await loadSessions();
}

async function addSessionBeat(sessionId) {
    const sel = document.getElementById(`beat-add-select-${sessionId}`);
    if (!sel) return;
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/beats`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ beat_id: +sel.value })
        });
    } catch (err) { console.error('Failed to add beat to session:', err); }
    editSession(sessionId);
}

async function removeSessionBeat(sessionId, beatId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/beats/${beatId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove beat from session:', err); }
    editSession(sessionId);
}

async function addSessionNpc(sessionId) {
    const sel = document.getElementById(`npc-add-select-${sessionId}`);
    if (!sel) return;
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/npcs`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npc_id: +sel.value })
        });
    } catch (err) { console.error('Failed to add NPC to session:', err); }
    editSession(sessionId);
}

async function removeSessionNpc(sessionId, npcId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/npcs/${npcId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove NPC from session:', err); }
    editSession(sessionId);
}

function editProgress(id) {
    showToast('Edit progress - to be implemented');
}

// Referenced from generated onclick="..."/onsubmit="..." HTML (see ADR-001).
Object.assign(window, {
    addSessionBeat, addSessionChar, addSessionNpc, dmAddGear, dmBondFamiliar,
    dmDeleteFamiliar, dmDeleteGear, dmDeletePower, dmEditPower, dmGrantPower,
    editCharacter, editCreature, editFamiliar, editProgress, editSession,
    editShadow, handleBondFamiliar, handleEditCharacter, handleEditCreature,
    handleEditFamiliar, handleEditSession, handleEditShadow, removeSessionBeat,
    removeSessionChar, removeSessionNpc, saveSessionChapters, toggleStartingWorld,
    updateSessionCharAttendance, viewCharacter,
});

