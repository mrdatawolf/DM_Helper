import '../ability-conversion.js';
import { state, API_BASE } from './dm-state.js';
import { closeModal, showModal } from './dm-modal-utils.js';
import { familiarFormFields, familiarPayloadFromForm } from './dm-creature-modals.js';
import { loadCharacters } from './dm-lists.js';
const { scoreFromPercentile, dndModifier } = AbilityConversion;
// Placeholder functions for view/edit (to be implemented)
async function viewCharacter(id) {
    try {
        const c = await apiFetch(`${API_BASE}/characters/${id}`);

        const modifierStr = v => { const m = dndModifier(v); return (m >= 0 ? '+' : '') + m; };
        const statBlock = ['strength','dexterity','constitution','intelligence','wisdom','charisma']
            .map(s => `<div class="stat"><div class="stat-label">${s.slice(0,3).toUpperCase()}</div><div class="stat-value">${scoreFromPercentile(c[s])}</div><div class="stat-label">${modifierStr(c[s])}</div></div>`)
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

Object.assign(window, { dmAddGear, dmBondFamiliar, dmDeleteFamiliar, dmDeleteGear, dmDeletePower, dmEditPower, dmGrantPower, editCharacter, editFamiliar, handleBondFamiliar, handleEditCharacter, handleEditFamiliar, viewCharacter });
