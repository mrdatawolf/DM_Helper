import { state } from './dm-state.js';
import { closeModal, showModal } from './dm-modal-utils.js';
import { loadPrimalPatterns, renderPatternDetail, selectPattern } from './dm-primal-patterns.js';
function openGrantModal(sectionId, patternId) {
    const grants = state.sectionGrantsCache[sectionId] || [];
    const grantedIds = new Set(grants.map(g => g.character_id));

    const charList = state.characters.length === 0
        ? '<p style="color:#999; font-style:italic;">No characters found. Create characters first.</p>'
        : state.characters.map(c => `
            <label style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer;
                          ${grantedIds.has(c.id) ? 'background:#e8f5e9;' : ''}">
                <input type="checkbox" value="${c.id}" ${grantedIds.has(c.id) ? 'checked' : ''}>
                <span>
                    <strong>${escHtml(c.name)}</strong>
                    ${c.player_name ? `<span style="color:#999; font-size:0.8rem; margin-left:6px;">(${escHtml(c.player_name)})</span>` : ''}
                </span>
            </label>`).join('');

    showModal('Grant Lore Access', `
        <p style="color:#666; margin-bottom:14px; font-size:0.9rem;">
            Check which characters can see the <em>Player Content</em> for this section.
            Uncheck to revoke existing access.
        </p>
        <div id="grant-char-list" style="display:flex; flex-direction:column; gap:4px; max-height:280px; overflow-y:auto; border:1px solid var(--light); border-radius:6px; padding:8px;">
            ${charList}
        </div>
        <div class="form-actions" style="margin-top:16px;">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="button" class="btn-primary" onclick="handleGrantSave(${sectionId}, ${patternId})">Save Grants</button>
        </div>
    `);
}

async function handleGrantSave(sectionId, patternId) {
    const grants = state.sectionGrantsCache[sectionId] || [];
    const originalGrantedIds = new Set(grants.map(g => g.character_id));

    const checkboxes = document.querySelectorAll('#grant-char-list input[type="checkbox"]');
    const nowCheckedIds = new Set([...checkboxes].filter(cb => cb.checked).map(cb => parseInt(cb.value)));

    const toGrant = [...nowCheckedIds].filter(id => !originalGrantedIds.has(id));
    const toRevoke = [...originalGrantedIds].filter(id => !nowCheckedIds.has(id));

    try {
        if (toGrant.length > 0) {
            await apiFetch(`/api/primal-patterns/sections/${sectionId}/grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_ids: toGrant })
            });
        }
        for (const charId of toRevoke) {
            await apiFetch(`/api/primal-patterns/sections/${sectionId}/revoke/${charId}`, { method: 'DELETE' });
        }
        closeModal();
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to update grants: ' + err.message);
    }
}

async function revokeGrant(sectionId, patternId, characterId, characterName) {
    if (!confirm(`Remove lore access for ${characterName}?`)) return;
    try {
        await apiFetch(`/api/primal-patterns/sections/${sectionId}/revoke/${characterId}`, { method: 'DELETE' });
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to revoke access: ' + err.message);
    }
}

async function deleteSection(patternId, sectionId) {
    if (!confirm('Delete this section? All player access to it will also be removed.')) return;
    try {
        await apiFetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, { method: 'DELETE' });
        state.openSections.delete(sectionId);
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to delete section: ' + err.message);
    }
}

function openAddSectionModal(patternId) {
    showModal('Add Section', `
        <form onsubmit="handleAddSection(event, ${patternId}); return false;">
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="new-sec-title" required placeholder="e.g. Mechanics, Lore, Secrets">
            </div>
            <div class="form-group">
                <label>Section Key *</label>
                <input type="text" id="new-sec-key" required placeholder="e.g. mechanics, lore, secrets">
                <small style="color:#888; display:block; margin-top:4px;">Use <strong>secrets</strong> to mark this section as DM-only (not shareable with players).</small>
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" id="new-sec-order" value="10" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Section</button>
            </div>
        </form>
    `);
}

async function handleAddSection(event, patternId) {
    event.preventDefault();
    const title = document.getElementById('new-sec-title').value.trim();
    const sectionKey = document.getElementById('new-sec-key').value.trim().toLowerCase();
    const sectionOrder = parseInt(document.getElementById('new-sec-order').value) || 10;

    try {
        await apiFetch(`/api/primal-patterns/${patternId}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, section_key: sectionKey, section_order: sectionOrder })
        });
        closeModal();
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to add section: ' + err.message);
    }
}

function openEditPatternModal(patternId) {
    const pattern = state.primalPatterns.find(p => p.id === patternId);
    if (!pattern) return;

    const roleOptions = ['unknown', 'mother', 'father', 'embodiment', 'guardian', 'avatar', 'bound'];

    showModal('Edit Pattern', `
        <form onsubmit="handleEditPattern(event, ${patternId}); return false;">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="edit-pat-name" required value="${escHtml(pattern.name)}">
            </div>
            <div class="form-group">
                <label>Also Known As</label>
                <input type="text" id="edit-pat-aka" value="${escHtml(pattern.also_known_as || '')}">
            </div>
            <div class="form-group">
                <label>Origin Figure</label>
                <input type="text" id="edit-pat-origin" value="${escHtml(pattern.origin_figure || '')}">
            </div>
            <div class="form-group">
                <label>Primal Animal</label>
                <input type="text" id="edit-pat-animal" value="${escHtml(pattern.spirit_animal || '')}">
            </div>
            <div class="form-group">
                <label>Animal Role</label>
                <select id="edit-pat-role">
                    ${roleOptions.map(r => `<option value="${r}" ${pattern.spirit_animal_role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" id="edit-pat-order" value="${pattern.display_order || 0}" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Changes</button>
            </div>
        </form>
    `);
}

async function handleEditPattern(event, patternId) {
    event.preventDefault();
    const data = {
        name: document.getElementById('edit-pat-name').value.trim(),
        also_known_as: document.getElementById('edit-pat-aka').value.trim() || null,
        origin_figure: document.getElementById('edit-pat-origin').value.trim() || null,
        spirit_animal: document.getElementById('edit-pat-animal').value.trim() || null,
        spirit_animal_role: document.getElementById('edit-pat-role').value,
        display_order: parseInt(document.getElementById('edit-pat-order').value) || 0
    };

    try {
        await apiFetch(`/api/primal-patterns/${patternId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadPrimalPatterns();
    } catch (err) {
        showToast('Failed to update pattern: ' + err.message);
    }
}

function openCreatePatternModal() {
    const roleOptions = ['unknown', 'mother', 'father', 'embodiment', 'guardian', 'avatar', 'bound'];

    showModal('Create New Pattern', `
        <form onsubmit="handleCreatePattern(event); return false;">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="new-pat-name" required placeholder="e.g. The Pattern of Shadow Earth">
            </div>
            <div class="form-group">
                <label>Also Known As</label>
                <input type="text" id="new-pat-aka" placeholder="Alternative names, comma-separated">
            </div>
            <div class="form-group">
                <label>Origin Figure</label>
                <input type="text" id="new-pat-origin" placeholder="Who inscribed or created it?">
            </div>
            <div class="form-group">
                <label>Primal Animal</label>
                <input type="text" id="new-pat-animal" placeholder="The bound spirit animal">
            </div>
            <div class="form-group">
                <label>Animal Role</label>
                <select id="new-pat-role">
                    ${roleOptions.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Create Pattern</button>
            </div>
        </form>
    `);
}

async function handleCreatePattern(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('new-pat-name').value.trim(),
        also_known_as: document.getElementById('new-pat-aka').value.trim() || null,
        origin_figure: document.getElementById('new-pat-origin').value.trim() || null,
        spirit_animal: document.getElementById('new-pat-animal').value.trim() || null,
        spirit_animal_role: document.getElementById('new-pat-role').value
    };

    if (!data.name) { showToast('Name is required.'); return; }

    try {
        const created = await apiFetch('/api/primal-patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadPrimalPatterns();
        await selectPattern(created.id);
    } catch (err) {
        showToast('Failed to create pattern: ' + err.message);
    }
}

async function deletePattern(patternId) {
    const pattern = state.primalPatterns.find(p => p.id === patternId);
    if (!confirm(`Delete "${pattern?.name || 'this pattern'}" and all its sections? This cannot be undone.`)) return;
    try {
        await apiFetch(`/api/primal-patterns/${patternId}`, { method: 'DELETE' });
        state.activePatternId = null;
        const dv = document.getElementById('pattern-detail-view');
        if (dv) dv.innerHTML = '';
        await loadPrimalPatterns();
    } catch (err) {
        showToast('Failed to delete pattern: ' + err.message);
    }
}

function renderPatternActionsBridge() {
  Object.assign(window, { deletePattern, deleteSection, handleAddSection, handleCreatePattern, handleEditPattern, handleGrantSave, openAddSectionModal, openCreatePatternModal, openEditPatternModal, openGrantModal, revokeGrant });
}
export { renderPatternActionsBridge };
