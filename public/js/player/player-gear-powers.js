// player-gear-powers.js — Gear & Powers sections on the character sheet.
// Gear is the player's own bookkeeping (add/edit/remove freely).
// Powers are granted by the DM; players spend uses and take long rests.
import { viewCharacter } from './player-characters.js';

let sheetGearList = [];   // current character's gear, kept for edit prefill
let editingGearId = null; // null = adding new

const GEAR_TYPES = ['Weapon', 'Armor', 'Magic Item', 'Consumable', 'Tool', 'Other'];

// ── Gear ─────────────────────────────────────────────────────────────────────

function renderGearSection(character) {
    sheetGearList = character.gear || [];

    const rows = sheetGearList.length ? sheetGearList.map(g => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid rgba(128,128,128,0.15)">
            <label title="Equipped" style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:#888">
                <input type="checkbox" ${g.is_equipped ? 'checked' : ''}
                       onchange="toggleGearEquipped(${character.id}, ${g.id}, this.checked)"> Eq.
            </label>
            <div style="flex:1">
                <strong>${escHtml(g.item_name)}</strong>
                ${g.quantity > 1 ? ` <span style="color:#888">×${g.quantity}</span>` : ''}
                ${g.item_type ? ` <span class="badge" style="font-size:0.7rem">${escHtml(g.item_type)}</span>` : ''}
                ${g.magical_properties ? ` <span style="color:#8e44ad;font-size:0.8rem">✦ ${escHtml(g.magical_properties)}</span>` : ''}
                ${g.description ? `<div style="font-size:0.82rem;color:#888">${escHtml(g.description)}</div>` : ''}
            </div>
            <button class="btn-secondary btn-sm" onclick="openGearForm(${character.id}, ${g.id})">Edit</button>
            <button class="btn-secondary btn-sm btn-danger" onclick="deleteGearItem(${character.id}, ${g.id})">×</button>
        </div>`).join('')
        : '<p style="color:#999;font-style:italic">Nothing carried yet.</p>';

    return `
        <h3 style="display:flex;justify-content:space-between;align-items:center">
            Gear & Inventory
            <button class="btn-secondary btn-sm" onclick="openGearForm(${character.id})">+ Add Item</button>
        </h3>
        <div id="gear-list">${rows}</div>
        <div id="gear-form" style="display:none"></div>`;
}

function openGearForm(characterId, gearId = null) {
    editingGearId = gearId;
    const g = gearId ? sheetGearList.find(x => x.id === gearId) || {} : {};
    const panel = document.getElementById('gear-form');
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="session-card" style="padding:14px;margin-top:10px">
            <h4 style="margin-top:0">${gearId ? 'Edit Item' : 'Add Item'}</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" id="gear-name" value="${escHtml(g.item_name)}">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="gear-type">
                        ${GEAR_TYPES.map(t => `<option value="${t}"${g.item_type === t ? ' selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" id="gear-quantity" min="1" value="${g.quantity || 1}">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="gear-description" rows="2">${escHtml(g.description)}</textarea>
            </div>
            <div class="form-group">
                <label>Magical Properties</label>
                <input type="text" id="gear-magical" value="${escHtml(g.magical_properties)}" placeholder="e.g. +1 to hit, glows near Chaos">
            </div>
            <label style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
                <input type="checkbox" id="gear-equipped" ${g.is_equipped ? 'checked' : ''}> Currently equipped
            </label>
            <button class="btn-primary btn-sm" onclick="saveGearItem(${characterId})">${gearId ? 'Save Changes' : 'Add Item'}</button>
            <button class="btn-secondary btn-sm" onclick="document.getElementById('gear-form').style.display='none'">Cancel</button>
        </div>`;
}

async function saveGearItem(characterId) {
    const item_name = document.getElementById('gear-name').value.trim();
    if (!item_name) { showToast('Item name is required.'); return; }

    const body = {
        item_name,
        item_type: document.getElementById('gear-type').value,
        quantity: parseInt(document.getElementById('gear-quantity').value, 10) || 1,
        description: document.getElementById('gear-description').value.trim() || null,
        magical_properties: document.getElementById('gear-magical').value.trim() || null,
        is_equipped: document.getElementById('gear-equipped').checked ? 1 : 0
    };

    const url = editingGearId
        ? `/api/characters/${characterId}/gear/${editingGearId}`
        : `/api/characters/${characterId}/gear`;

    try {
        await apiFetch(url, {
            method: editingGearId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(body)
        });
        showToast(editingGearId ? 'Item updated.' : 'Item added.');
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to save item: ${err.message}`);
    }
}

async function toggleGearEquipped(characterId, gearId, equipped) {
    try {
        await apiFetch(`/api/characters/${characterId}/gear/${gearId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ is_equipped: equipped ? 1 : 0 })
        });
    } catch (err) {
        showToast(`Failed to update item: ${err.message}`);
    }
}

async function deleteGearItem(characterId, gearId) {
    if (!confirm('Remove this item?')) return;
    try {
        await apiFetch(`/api/characters/${characterId}/gear/${gearId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to remove item: ${err.message}`);
    }
}

// ── Powers ───────────────────────────────────────────────────────────────────

function renderPowersSection(character) {
    const powers = character.powers || [];
    const hasLimited = powers.some(p => p.uses_per_day != null);

    const cards = powers.length ? powers.map(p => {
        const limited = p.uses_per_day != null;
        const current = p.current_uses ?? p.uses_per_day;
        return `
        <div style="padding:10px 4px;border-bottom:1px solid rgba(128,128,128,0.15)">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <strong style="flex:1">${escHtml(p.power_name)}
                    ${p.power_type ? ` <span class="badge" style="font-size:0.7rem">${escHtml(p.power_type)}</span>` : ''}
                    ${p.power_level > 1 ? ` <span style="color:#888;font-size:0.8rem">Lv ${p.power_level}</span>` : ''}
                </strong>
                ${limited ? `
                    <span style="font-size:0.85rem;color:${current > 0 ? '#27ae60' : '#e74c3c'}">${current} / ${p.uses_per_day} uses</span>
                    <button class="btn-secondary btn-sm" ${current > 0 ? '' : 'disabled'}
                            onclick="usePower(${character.id}, ${p.id}, ${current})">Use</button>`
                    : '<span style="font-size:0.8rem;color:#888">At will</span>'}
            </div>
            ${p.description ? `<div style="font-size:0.82rem;color:#888;margin-top:4px">${escHtml(p.description)}</div>` : ''}
        </div>`;
    }).join('')
        : '<p style="color:#999;font-style:italic">No powers yet — powers are granted by the DM as your story unfolds.</p>';

    return `
        <h3 style="display:flex;justify-content:space-between;align-items:center">
            Powers & Abilities
            ${hasLimited ? `<button class="btn-secondary btn-sm" onclick="powersLongRest(${character.id})">🌙 Long Rest</button>` : ''}
        </h3>
        <div id="powers-list">${cards}</div>`;
}

async function usePower(characterId, powerId, currentUses) {
    try {
        await apiFetch(`/api/characters/${characterId}/powers/${powerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ current_uses: Math.max(0, currentUses - 1) })
        });
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to use power: ${err.message}`);
    }
}

async function powersLongRest(characterId) {
    if (!confirm('Take a long rest and restore all power uses?')) return;
    try {
        await apiFetch(`/api/characters/${characterId}/powers/rest`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        showToast('Long rest taken — powers restored.');
        await viewCharacter(characterId);
    } catch (err) {
        showToast(`Failed to rest: ${err.message}`);
    }
}

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, {
    deleteGearItem, openGearForm, powersLongRest, saveGearItem, toggleGearEquipped, usePower,
});

// Used by player-characters.js.
export { renderGearSection, renderPowersSection };
