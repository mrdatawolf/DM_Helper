import { state } from './dm-state.js';
import { renderPatternActionsBridge } from './dm-primal-pattern-actions.js';
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

// escHtml now comes from /js/dom-utils.js (loaded before this file).

async function loadPrimalPatterns() {
    try {
        state.primalPatterns = await apiFetch('/api/primal-patterns');
        renderPrimalPatternCards();
        if (state.activePatternId && state.primalPatterns.some(p => p.id === state.activePatternId)) {
            await renderPatternDetail(state.activePatternId);
        } else if (state.activePatternId) {
            state.activePatternId = null;
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

    if (state.primalPatterns.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <h3>No patterns yet</h3>
                <p>Create a primal pattern to begin building the metaphysical lore.</p>
            </div>`;
        return;
    }

    container.innerHTML = state.primalPatterns.map(p => `
        <div class="pattern-card ${p.id === state.activePatternId ? 'active' : ''}" onclick="selectPattern(${p.id})">
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
    state.activePatternId = id;
    renderPrimalPatternCards();
    await renderPatternDetail(id);
}

async function renderPatternDetail(id) {
    const detailView = document.getElementById('pattern-detail-view');
    if (!detailView) return;
    detailView.innerHTML = '<div style="padding:20px; color:#999;">Loading...</div>';

    try {
        const pattern = await apiFetch(`/api/primal-patterns/${id}`);

        // Cache section grants so openGrantModal can access them
        state.sectionGrantsCache = {};
        pattern.sections.forEach(s => { state.sectionGrantsCache[s.id] = s.grants || []; });

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
        const isOpen = state.openSections.has(s.id);
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
                    <div class="section-read-row">
                        <div class="section-read-col ${isSecrets ? 'section-read-full' : ''}">
                            <div class="section-read-label">DM Notes</div>
                            <div class="section-read-content" id="dm-read-${s.id}">${renderSectionMarkdown(s.content)}</div>
                            <textarea class="section-edit-area" id="dm-content-${s.id}" style="display:none" oninput="autoGrow(this)">${escHtml(s.content)}</textarea>
                        </div>
                        ${!isSecrets ? `
                        <div class="section-read-col">
                            <div class="section-read-label player-label">Player Content</div>
                            <div class="section-read-content" id="player-read-${s.id}">${renderSectionMarkdown(s.player_content)}</div>
                            <textarea class="section-edit-area" id="player-content-${s.id}" style="display:none" oninput="autoGrow(this)">${escHtml(s.player_content)}</textarea>
                        </div>` : ''}
                    </div>
                    <div class="section-actions">
                        <button class="btn-secondary btn-sm" id="edit-btn-${s.id}" onclick="toggleSectionEdit(${s.id}, ${patternId})">Edit</button>
                        <button class="btn-primary btn-sm" id="save-btn-${s.id}" style="display:none" onclick="saveSectionContent(${patternId}, ${s.id})">Save</button>
                        <button class="btn-secondary btn-sm" id="cancel-btn-${s.id}" style="display:none" onclick="cancelSectionEdit(${s.id})">Cancel</button>
                        ${!isSecrets ? `<button class="btn-secondary btn-sm" onclick="openGrantModal(${s.id}, ${patternId})">Grant to Players</button>` : ''}
                        <button class="btn-secondary btn-sm btn-danger" onclick="deleteSection(${patternId}, ${s.id})">Delete Section</button>
                        ${grantsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSectionMarkdown(md) {
    if (!md || !md.trim()) return '<span style="color:#bbb; font-style:italic;">Empty</span>';
    return md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^## (.+)$/gm, '<h4>$1</h4>')
        .replace(/^# (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/^(?!<)(.+)$/gm, line => `<p>${line}</p>`)
        .replace(/<p><\/p>/g, '');
}

function toggleSectionEdit(id, patternId) {
    const dmRead    = document.getElementById(`dm-read-${id}`);
    const dmTa      = document.getElementById(`dm-content-${id}`);
    const plRead    = document.getElementById(`player-read-${id}`);
    const plTa      = document.getElementById(`player-content-${id}`);
    const editBtn   = document.getElementById(`edit-btn-${id}`);
    const saveBtn   = document.getElementById(`save-btn-${id}`);
    const cancelBtn = document.getElementById(`cancel-btn-${id}`);

    const editing = dmTa && dmTa.style.display !== 'none';
    if (editing) return;

    if (dmRead)  dmRead.style.display  = 'none';
    if (dmTa)  { dmTa.style.display   = ''; autoGrow(dmTa); }
    if (plRead)  plRead.style.display  = 'none';
    if (plTa)  { plTa.style.display   = ''; autoGrow(plTa); }

    if (editBtn)   editBtn.style.display   = 'none';
    if (saveBtn)   saveBtn.style.display   = '';
    if (cancelBtn) cancelBtn.style.display = '';
}

function cancelSectionEdit(id) {
    const dmRead    = document.getElementById(`dm-read-${id}`);
    const dmTa      = document.getElementById(`dm-content-${id}`);
    const plRead    = document.getElementById(`player-read-${id}`);
    const plTa      = document.getElementById(`player-content-${id}`);
    const editBtn   = document.getElementById(`edit-btn-${id}`);
    const saveBtn   = document.getElementById(`save-btn-${id}`);
    const cancelBtn = document.getElementById(`cancel-btn-${id}`);

    if (dmRead)  dmRead.style.display  = '';
    if (dmTa)    dmTa.style.display    = 'none';
    if (plRead)  plRead.style.display  = '';
    if (plTa)    plTa.style.display    = 'none';

    if (editBtn)   editBtn.style.display   = '';
    if (saveBtn)   saveBtn.style.display   = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

function toggleSection(id) {
    const body = document.getElementById(`sec-body-${id}`);
    const chevron = document.getElementById(`sec-chevron-${id}`);
    if (!body) return;
    if (state.openSections.has(id)) {
        state.openSections.delete(id);
        body.style.display = 'none';
        if (chevron) chevron.textContent = '▼';
    } else {
        state.openSections.add(id);
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
        await apiFetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, player_content: playerContent })
        });

        // Update read view with saved content then exit edit mode
        const dmRead = document.getElementById(`dm-read-${sectionId}`);
        const plRead = document.getElementById(`player-read-${sectionId}`);
        if (dmRead) dmRead.innerHTML = renderSectionMarkdown(content);
        if (plRead) plRead.innerHTML = renderSectionMarkdown(playerContent);
        cancelSectionEdit(sectionId);
    } catch (err) {
        if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
        showToast('Failed to save section: ' + err.message);
    }
}

Object.assign(window, { autoGrow, cancelSectionEdit, saveSectionContent, selectPattern, toggleSection, toggleSectionEdit });
renderPatternActionsBridge();
export { loadPrimalPatterns, patternInfluenceLabel, renderPatternDetail, selectPattern, shadowBalanceBar, shadowBarClass, shadowBarLabel };
