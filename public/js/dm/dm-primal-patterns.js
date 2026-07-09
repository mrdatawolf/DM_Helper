// dm-primal-patterns.js — split from app.js (behavior unchanged)
// ========== PRIMAL PATTERNS FUNCTIONS ==========

function patternInfluenceLabel(val) {
    if (val === 'First Pattern') return 'Pattern';
    if (val === 'Corwin Pattern') return 'Argent Refrain';
    return val || '';
}

function shadowBarLabel(shadow) {
    return (shadow.dream_level || 0) > 0 ? 'Order/Dream/Chaos:' : 'Order/Chaos:';
}

function shadowBalanceBar(shadow) {
    const o = shadow.order_level || 0;
    const d = shadow.dream_level || 0;
    const c = shadow.chaos_level || 0;

    if (d > 0) {
        const total = o + d + c || 100;
        const op  = (o / total * 100).toFixed(1);
        const mid = ((o + d / 2) / total * 100).toFixed(1);
        const cp  = ((o + d) / total * 100).toFixed(1);
        return `--o:${op}%;--mid:${mid}%;--c:${cp}%`;
    }
    return `background:linear-gradient(90deg,#3498db ${o}%,#e74c3c ${o}%)`;
}

function shadowBarClass(shadow) {
    return (shadow.dream_level || 0) > 0 ? 'balance-bar balance-bar-dream' : 'balance-bar';
}

function patternInfluenceBadge(val) {
    const label = patternInfluenceLabel(val);
    if (label === 'Logrus') return 'badge-logrus';
    if (label === 'Argent Refrain') return 'badge-argent';
    return 'badge-pattern';
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function loadPrimalPatterns() {
    try {
        const response = await fetch('/api/primal-patterns');
        primalPatterns = await response.json();
        renderPrimalPatternCards();
        if (activePatternId && primalPatterns.some(p => p.id === activePatternId)) {
            await renderPatternDetail(activePatternId);
        } else if (activePatternId) {
            activePatternId = null;
            const dv = document.getElementById('pattern-detail-view');
            if (dv) dv.innerHTML = '';
        }
    } catch (err) {
        console.error('Failed to load primal patterns:', err);
    }
}

function renderPrimalPatternCards() {
    const container = document.getElementById('pattern-card-row');
    if (!container) return;

    if (primalPatterns.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <h3>No patterns yet</h3>
                <p>Create a primal pattern to begin building the metaphysical lore.</p>
            </div>`;
        return;
    }

    container.innerHTML = primalPatterns.map(p => `
        <div class="pattern-card ${p.id === activePatternId ? 'active' : ''}" onclick="selectPattern(${p.id})">
            <div class="pattern-card-name">${escHtml(p.name)}</div>
            ${p.origin_figure ? `<div class="pattern-card-origin">Origin: ${escHtml(p.origin_figure)}</div>` : ''}
            <div class="pattern-card-animal">${p.spirit_animal ? escHtml(p.spirit_animal) : 'No primal animal set'}</div>
            ${p.spirit_animal_role && p.spirit_animal_role !== 'unknown'
                ? `<div><span class="spirit-animal-role-badge">${p.spirit_animal_role}</span></div>`
                : ''}
        </div>
    `).join('');
}

async function selectPattern(id) {
    activePatternId = id;
    renderPrimalPatternCards();
    await renderPatternDetail(id);
}

async function renderPatternDetail(id) {
    const detailView = document.getElementById('pattern-detail-view');
    if (!detailView) return;
    detailView.innerHTML = '<div style="padding:20px; color:#999;">Loading...</div>';

    try {
        const response = await fetch(`/api/primal-patterns/${id}`);
        if (!response.ok) throw new Error('Failed to fetch pattern');
        const pattern = await response.json();

        // Cache section grants so openGrantModal can access them
        sectionGrantsCache = {};
        pattern.sections.forEach(s => { sectionGrantsCache[s.id] = s.grants || []; });

        detailView.innerHTML = `
            <div class="pattern-detail">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; gap:12px;">
                    <h3 style="margin:0; font-size:1.3rem;">${escHtml(pattern.name)}</h3>
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="btn-secondary btn-sm" onclick="openEditPatternModal(${id})">Edit Meta</button>
                        <button class="btn-secondary btn-sm btn-danger" onclick="deletePattern(${id})">Delete</button>
                    </div>
                </div>

                <div class="pattern-meta-bar">
                    ${pattern.also_known_as ? `
                        <div class="pattern-meta-item">
                            <label>Also Known As</label>
                            <div class="meta-value">${escHtml(pattern.also_known_as)}</div>
                        </div>` : ''}
                    <div class="pattern-meta-item">
                        <label>Origin Figure</label>
                        <div class="meta-value">${escHtml(pattern.origin_figure || 'Unknown')}</div>
                    </div>
                    <div class="pattern-meta-item">
                        <label>Primal Animal</label>
                        <div class="meta-value">${escHtml(pattern.spirit_animal || 'Unknown')}</div>
                    </div>
                    <div class="pattern-meta-item">
                        <label>Animal Role</label>
                        <div class="meta-value">${escHtml(pattern.spirit_animal_role || 'unknown')}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4 style="margin:0;">Sections</h4>
                    <button class="btn-secondary btn-sm" onclick="openAddSectionModal(${id})">+ Add Section</button>
                </div>

                <div id="sections-list">
                    ${renderSectionPanels(pattern.sections, id)}
                </div>
            </div>
        `;
    } catch (err) {
        detailView.innerHTML = `<div class="empty-state">Failed to load pattern details. ${err.message}</div>`;
    }
}

function renderSectionPanels(sections, patternId) {
    if (!sections || sections.length === 0) {
        return '<div style="color:#999; font-style:italic; padding:20px; text-align:center;">No sections yet. Add one above.</div>';
    }

    return sections.map(s => {
        const isOpen = openSections.has(s.id);
        const isSecrets = s.section_key === 'secrets';
        const grantCount = (s.grants || []).length;

        const grantsHtml = (!isSecrets && s.grants && s.grants.length > 0) ? `
            <div class="section-grant-list">
                <small style="color:#666;">Shared with:</small>
                ${s.grants.map(g => `
                    <button class="grant-chip"
                            onclick="revokeGrant(${s.id}, ${patternId}, ${g.character_id}, ${JSON.stringify(g.character_name)})">
                        ${escHtml(g.character_name)} &times;
                    </button>`).join('')}
            </div>` : '';

        return `
            <div class="section-panel ${isSecrets ? 'secrets-section' : ''}">
                <div class="section-panel-header" onclick="toggleSection(${s.id})">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <strong>${escHtml(s.title)}</strong>
                        <span class="section-key-badge">${escHtml(s.section_key)}</span>
                        ${isSecrets ? '<span style="color:#c0392b; font-size:0.72rem; font-weight:700;">DM ONLY</span>' : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${!isSecrets ? `<span class="grant-chip ${grantCount === 0 ? 'no-grants' : ''}">${grantCount === 0 ? 'Not shared' : grantCount + ' player' + (grantCount !== 1 ? 's' : '')}</span>` : ''}
                        <span id="sec-chevron-${s.id}">${isOpen ? '▲' : '▼'}</span>
                    </div>
                </div>
                <div id="sec-body-${s.id}" style="display:${isOpen ? '' : 'none'};">
                    <div class="section-body">
                        <div class="section-col">
                            <label>DM Notes (full content)</label>
                            <textarea id="dm-content-${s.id}">${escHtml(s.content)}</textarea>
                        </div>
                        <div class="section-col player-col">
                            <label>Player Content (what players see when granted)</label>
                            <textarea id="player-content-${s.id}">${escHtml(s.player_content)}</textarea>
                        </div>
                    </div>
                    <div class="section-actions">
                        <button class="btn-primary btn-sm" id="save-btn-${s.id}" onclick="saveSectionContent(${patternId}, ${s.id})">Save</button>
                        ${!isSecrets ? `<button class="btn-secondary btn-sm" onclick="openGrantModal(${s.id}, ${patternId})">Grant to Players</button>` : ''}
                        <button class="btn-secondary btn-sm btn-danger" onclick="deleteSection(${patternId}, ${s.id})">Delete Section</button>
                        ${grantsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleSection(id) {
    const body = document.getElementById(`sec-body-${id}`);
    const chevron = document.getElementById(`sec-chevron-${id}`);
    if (!body) return;
    if (openSections.has(id)) {
        openSections.delete(id);
        body.style.display = 'none';
        if (chevron) chevron.textContent = '▼';
    } else {
        openSections.add(id);
        body.style.display = '';
        if (chevron) chevron.textContent = '▲';
    }
}

async function saveSectionContent(patternId, sectionId) {
    const content = document.getElementById(`dm-content-${sectionId}`)?.value ?? '';
    const playerContent = document.getElementById(`player-content-${sectionId}`)?.value ?? '';
    const btn = document.getElementById(`save-btn-${sectionId}`);

    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

    try {
        const response = await fetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, player_content: playerContent })
        });
        if (!response.ok) throw new Error('Save failed');
        if (btn) {
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 1800);
        }
    } catch (err) {
        if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
        showToast('Failed to save section: ' + err.message);
    }
}

function openGrantModal(sectionId, patternId) {
    const grants = sectionGrantsCache[sectionId] || [];
    const grantedIds = new Set(grants.map(g => g.character_id));

    const charList = characters.length === 0
        ? '<p style="color:#999; font-style:italic;">No characters found. Create characters first.</p>'
        : characters.map(c => `
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
    const grants = sectionGrantsCache[sectionId] || [];
    const originalGrantedIds = new Set(grants.map(g => g.character_id));

    const checkboxes = document.querySelectorAll('#grant-char-list input[type="checkbox"]');
    const nowCheckedIds = new Set([...checkboxes].filter(cb => cb.checked).map(cb => parseInt(cb.value)));

    const toGrant = [...nowCheckedIds].filter(id => !originalGrantedIds.has(id));
    const toRevoke = [...originalGrantedIds].filter(id => !nowCheckedIds.has(id));

    try {
        if (toGrant.length > 0) {
            await fetch(`/api/primal-patterns/sections/${sectionId}/grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_ids: toGrant })
            });
        }
        for (const charId of toRevoke) {
            await fetch(`/api/primal-patterns/sections/${sectionId}/revoke/${charId}`, { method: 'DELETE' });
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
        const response = await fetch(`/api/primal-patterns/sections/${sectionId}/revoke/${characterId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Revoke failed');
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to revoke access: ' + err.message);
    }
}

async function deleteSection(patternId, sectionId) {
    if (!confirm('Delete this section? All player access to it will also be removed.')) return;
    try {
        const response = await fetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        openSections.delete(sectionId);
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
        const response = await fetch(`/api/primal-patterns/${patternId}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, section_key: sectionKey, section_order: sectionOrder })
        });
        if (!response.ok) throw new Error('Failed to add section');
        closeModal();
        await renderPatternDetail(patternId);
    } catch (err) {
        showToast('Failed to add section: ' + err.message);
    }
}

function openEditPatternModal(patternId) {
    const pattern = primalPatterns.find(p => p.id === patternId);
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
        const response = await fetch(`/api/primal-patterns/${patternId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Update failed');
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
        const response = await fetch('/api/primal-patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Create failed');
        const created = await response.json();
        closeModal();
        await loadPrimalPatterns();
        await selectPattern(created.id);
    } catch (err) {
        showToast('Failed to create pattern: ' + err.message);
    }
}

async function deletePattern(patternId) {
    const pattern = primalPatterns.find(p => p.id === patternId);
    if (!confirm(`Delete "${pattern?.name || 'this pattern'}" and all its sections? This cannot be undone.`)) return;
    try {
        const response = await fetch(`/api/primal-patterns/${patternId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        activePatternId = null;
        const dv = document.getElementById('pattern-detail-view');
        if (dv) dv.innerHTML = '';
        await loadPrimalPatterns();
    } catch (err) {
        showToast('Failed to delete pattern: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
