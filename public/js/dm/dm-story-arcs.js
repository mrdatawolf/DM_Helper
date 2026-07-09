// dm-story-arcs.js — split from app.js (behavior unchanged)
// STORY ARCS
// ═══════════════════════════════════════════════════════════════

const ARC_STATUS_LABELS     = { planned: 'Planned', active: 'Active', dormant: 'Dormant', completed: 'Completed' };
const CHAPTER_STATUS_LABELS = { planned: 'Planned', active: 'Active', completed: 'Done' };

async function loadStoryArcs() {
    try {
        const [arcsRes, beatsRes, gnRes] = await Promise.all([
            fetch('/api/arcs'),
            fetch('/api/beats'),
            fetch('/api/arcs/grand-narrative'),
        ]);
        storyArcs      = await arcsRes.json();
        beats          = await beatsRes.json();
        grandNarrative = await gnRes.json();

        renderGrandNarrative();
        renderArcRows();
        renderBeatsPool();

        if (activeArcId) {
            const still = storyArcs.find(a => a.id === activeArcId);
            if (still) selectArc(activeArcId);
            else {
                activeArcId = null;
                const dv = document.getElementById('arc-detail-view');
                if (dv) dv.innerHTML = '';
            }
        }
    } catch (err) {
        console.error('Failed to load story arcs:', err);
    }
}

// ── Grand Narrative ────────────────────────────────────────────

function renderGrandNarrative() {
    const section = document.getElementById('grand-narrative-section');
    if (!section) return;
    const gn = grandNarrative || {};
    section.innerHTML = `
    <div class="grand-narrative-panel">
        <div class="gn-header" onclick="toggleGrandNarrative()">
            <div class="gn-header-text">
                <h3 class="gn-title">${escHtml(gn.title || 'Grand Narrative')}</h3>
                <span class="gn-subtitle">The cosmic frame — why everything is happening</span>
            </div>
            <button class="gn-toggle" id="gn-toggle-btn">&#9650;</button>
        </div>
        <div class="gn-body" id="gn-body">
            <div class="arc-section" style="margin-bottom:12px;">
                <h4>Title</h4>
                <input type="text" class="arc-field" id="gn-title-input"
                    value="${escHtml(gn.title || 'The Grand Narrative')}"
                    onblur="saveGrandNarrative()"
                    style="padding:8px 10px;font-size:1rem;font-weight:600;">
            </div>
            <div class="gn-two-col">
                <div class="arc-section">
                    <h4>Summary</h4>
                    <textarea class="arc-field" rows="5" id="gn-summary-input"
                        onblur="saveGrandNarrative()"
                        placeholder="The overarching force and stakes…">${escHtml(gn.summary || '')}</textarea>
                </div>
                <div class="arc-section">
                    <h4>Factions &amp; Forces</h4>
                    <textarea class="arc-field" rows="5" id="gn-factions-input"
                        onblur="saveGrandNarrative()"
                        placeholder="Key powers, their goals and conflicts…">${escHtml(gn.factions || '')}</textarea>
                </div>
            </div>
            <div class="arc-section">
                <h4>DM Notes <span style="font-weight:400;font-size:0.8rem;color:#aaa;">(private)</span></h4>
                <textarea class="arc-field" rows="3" id="gn-notes-input"
                    onblur="saveGrandNarrative()"
                    placeholder="Hidden truths, endgame plans…">${escHtml(gn.dm_notes || '')}</textarea>
            </div>
        </div>
    </div>`;
}

function toggleGrandNarrative() {
    const body = document.getElementById('gn-body');
    const btn  = document.getElementById('gn-toggle-btn');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (btn) btn.innerHTML = open ? '&#9660;' : '&#9650;';
}

async function saveGrandNarrative() {
    const title    = document.getElementById('gn-title-input')?.value?.trim();
    const summary  = document.getElementById('gn-summary-input')?.value?.trim();
    const factions = document.getElementById('gn-factions-input')?.value?.trim();
    const dm_notes = document.getElementById('gn-notes-input')?.value?.trim();
    try {
        const res = await fetch('/api/arcs/grand-narrative', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, summary, factions, dm_notes })
        });
        grandNarrative = await res.json();
    } catch (err) {
        console.error('Failed to save grand narrative:', err);
    }
}

// ── Arc Card Rows (per character) ──────────────────────────────

function renderArcRows() {
    const container = document.getElementById('arc-rows-container');
    if (!container) return;

    // Group arcs by character
    const byChar = {};
    storyArcs.forEach(a => {
        const key = a.character_id || 0;
        if (!byChar[key]) byChar[key] = { name: a.character_name || 'Unassigned', id: a.character_id || 0, arcs: [] };
        byChar[key].arcs.push(a);
    });

    // Include characters with no arcs yet
    characters.forEach(c => {
        if (!byChar[c.id]) byChar[c.id] = { name: c.name, id: c.id, arcs: [] };
    });

    const groups = Object.values(byChar).sort((a, b) => a.name.localeCompare(b.name));

    if (!groups.length) {
        container.innerHTML = '<div class="arc-empty">No characters found. Create characters first, then build their story arcs.</div>';
        return;
    }

    container.innerHTML = groups.map(group => `
        <div class="char-arc-group">
            <div class="char-arc-header">
                <h3>${escHtml(group.name)}</h3>
                <button class="btn-secondary btn-sm" onclick="openCreateArcModal(${group.id || ''})">+ Arc</button>
            </div>
            <div class="char-arc-row">
                ${group.arcs.length ? group.arcs.map(a => {
                    const total    = a.chapter_total || 0;
                    const done     = a.chapter_done  || 0;
                    const pct      = total ? Math.round((done / total) * 100) : 0;
                    const isActive = a.id === activeArcId;
                    return `<div class="arc-card${isActive ? ' active' : ''}" onclick="selectArc(${a.id})">
                        <div class="arc-status arc-status-${a.status}">${ARC_STATUS_LABELS[a.status] || a.status}</div>
                        <div class="arc-card-title">${escHtml(a.title)}</div>
                        <div class="arc-beat-bar-wrap"><div class="arc-beat-bar" style="width:${pct}%"></div></div>
                        <div class="arc-beat-label">${done} / ${total} chapters done</div>
                    </div>`;
                }).join('') : '<div class="char-arc-empty">No arcs yet</div>'}
            </div>
        </div>`
    ).join('');
}

// ── Arc Detail ─────────────────────────────────────────────────

async function selectArc(id) {
    activeArcId = id;
    renderArcRows();
    try {
        const res = await fetch(`/api/arcs/${id}`);
        const arc = await res.json();
        renderArcDetail(arc);
        document.getElementById('arc-detail-view')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        console.error('Failed to load arc detail:', err);
    }
}

function renderArcDetail(arc) {
    const dv = document.getElementById('arc-detail-view');
    if (!dv) return;

    dv.innerHTML = `
    <div class="arc-detail-panel">
        <div class="arc-detail-header">
            <div>
                <h3>${escHtml(arc.title)}</h3>
                <div class="arc-char-label">${arc.character_name ? escHtml(arc.character_name) + "'s story" : 'Unassigned'}</div>
            </div>
            <select onchange="updateArcStatus(${arc.id}, this.value)">
                ${['planned','active','dormant','completed'].map(s =>
                    `<option value="${s}"${arc.status===s?' selected':''}>${ARC_STATUS_LABELS[s]}</option>`
                ).join('')}
            </select>
            <button class="btn-secondary btn-sm" onclick="openEditArcModal(${arc.id})">Edit</button>
            <button class="btn-danger btn-sm"    onclick="deleteArc(${arc.id})">Delete</button>
        </div>

        <textarea class="arc-theme-field" rows="2"
            onblur="saveArcField(${arc.id}, 'theme', this.value)"
            placeholder="A poetic tagline for this arc…">${escHtml(arc.theme || '')}</textarea>

        <div class="arc-detail-body">
            <div>
                <div class="arc-section">
                    <h4>Description</h4>
                    <textarea class="arc-field" rows="3"
                        onblur="saveArcField(${arc.id}, 'description', this.value)"
                        placeholder="What is this arc about?">${escHtml(arc.description || '')}</textarea>
                </div>
                <div class="arc-section">
                    <h4>DM Notes <span style="font-weight:400;font-size:0.8rem;color:#aaa;">(private)</span></h4>
                    <textarea class="arc-field" rows="4"
                        onblur="saveArcField(${arc.id}, 'dm_notes', this.value)"
                        placeholder="Secrets, foreshadowing, hooks…">${escHtml(arc.dm_notes || '')}</textarea>
                </div>
            </div>

            <div>
                <div class="arc-section">
                    <h4>Chapters
                        <button class="btn-secondary btn-sm" onclick="openAddChapterModal(${arc.id})">+ Chapter</button>
                    </h4>
                    ${arc.chapters.length ? `
                    <div class="chapter-list">
                        ${arc.chapters.map((ch, i) => renderChapterItem(arc.id, ch, i)).join('')}
                    </div>` : '<div class="arc-empty-small">No chapters yet — add the first episode of this arc.</div>'}
                </div>
            </div>
        </div>
    </div>`;
}

function renderChapterItem(arcId, ch, index) {
    return `
    <div class="chapter-item${ch.status === 'completed' ? ' done' : ''}">
        <div class="chapter-header">
            <span class="chapter-num">${index + 1}</span>
            <span class="chapter-title-text">${escHtml(ch.title)}</span>
            <select class="chapter-status-select" onchange="updateChapterStatus(${arcId}, ${ch.id}, this.value)">
                ${['planned','active','completed'].map(s =>
                    `<option value="${s}"${ch.status===s?' selected':''}>${CHAPTER_STATUS_LABELS[s]}</option>`
                ).join('')}
            </select>
            <button class="btn-secondary btn-sm" onclick="openEditChapterModal(${arcId}, ${ch.id})" title="Edit chapter">✎</button>
            <button class="beat-del" onclick="deleteChapter(${arcId}, ${ch.id})" title="Delete">&times;</button>
        </div>
        ${ch.description ? `<div class="chapter-desc">${escHtml(ch.description)}</div>` : ''}
        <div class="chapter-beat-chips">
            ${ch.beats.map(b => `
                <span class="beat-chip${b.is_completed ? ' done' : ''}">
                    ${escHtml(b.title)}
                    <button class="chip-remove" onclick="unassignBeat(${b.id}, ${ch.id})" title="Remove from chapter">&times;</button>
                </span>`).join('')}
            <button class="btn-ghost btn-xs" onclick="openAssignBeatToChapterModal(${ch.id}, ${arcId})">+ Beat</button>
        </div>
    </div>`;
}

// ── Arc CRUD ───────────────────────────────────────────────────

function openCreateArcModal(presetCharId) {
    const charOptions = characters.map(c =>
        `<option value="${c.id}"${c.id === presetCharId ? ' selected' : ''}>${escHtml(c.name)}</option>`
    ).join('');
    showModal('New Story Arc', `
        <div class="form-group">
            <label>Character *</label>
            <select id="arc-char-id" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="">— select character —</option>
                ${charOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Arc Title *</label>
            <input type="text" id="arc-title" placeholder="e.g. The Throne of Amber"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
        </div>
        <div class="form-group">
            <label>Theme <span style="font-weight:400;font-size:0.8rem;color:#aaa;">(poetic tagline)</span></label>
            <textarea id="arc-theme" rows="2" placeholder="A poetic one-line hook for this arc…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-style:italic;"></textarea>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select id="arc-status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="dormant">Dormant</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="arc-desc" rows="3" placeholder="What is this arc about?"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        <div class="form-group">
            <label>DM Notes (private)</label>
            <textarea id="arc-notes" rows="2" placeholder="Secrets, hooks…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        <button class="btn-primary" onclick="handleCreateArc()" style="width:100%;margin-top:8px;">Create Arc</button>
    `);
}

async function handleCreateArc() {
    const character_id = document.getElementById('arc-char-id').value || null;
    const title        = document.getElementById('arc-title').value.trim();
    const theme        = document.getElementById('arc-theme').value.trim();
    const status       = document.getElementById('arc-status').value;
    const description  = document.getElementById('arc-desc').value.trim();
    const dm_notes     = document.getElementById('arc-notes').value.trim();

    if (!title) { showToast('Title is required'); return; }

    try {
        const res = await fetch('/api/arcs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id, title, theme, status, description, dm_notes })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
        const newArc = await res.json();
        closeModal();
        await loadStoryArcs();
        selectArc(newArc.id);
    } catch (err) {
        showToast('Failed to create arc: ' + err.message);
    }
}

async function openEditArcModal(arcId) {
    const arc = storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    const charOptions = characters.map(c =>
        `<option value="${c.id}"${c.id === arc.character_id ? ' selected' : ''}>${escHtml(c.name)}</option>`
    ).join('');
    showModal('Edit Arc', `
        <div class="form-group">
            <label>Character</label>
            <select id="arc-edit-char" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="">— unassigned —</option>
                ${charOptions}
            </select>
        </div>
        <div class="form-group">
            <label>Title *</label>
            <input type="text" id="arc-edit-title" value="${escHtml(arc.title)}"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
        </div>
        <div class="form-group">
            <label>Theme <span style="font-weight:400;font-size:0.8rem;color:#aaa;">(poetic tagline)</span></label>
            <textarea id="arc-edit-theme" rows="2"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-style:italic;"
                placeholder="A poetic one-line hook for this arc…">${escHtml(arc.theme || '')}</textarea>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select id="arc-edit-status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                ${['planned','active','dormant','completed'].map(s =>
                    `<option value="${s}"${arc.status===s?' selected':''}>${ARC_STATUS_LABELS[s]}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="arc-edit-desc" rows="3"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">${escHtml(arc.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>DM Notes (private)</label>
            <textarea id="arc-edit-notes" rows="2"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">${escHtml(arc.dm_notes || '')}</textarea>
        </div>
        <button class="btn-primary" onclick="handleEditArc(${arcId})" style="width:100%;margin-top:8px;">Save Changes</button>
    `);
}

async function handleEditArc(arcId) {
    const character_id = document.getElementById('arc-edit-char').value || null;
    const title        = document.getElementById('arc-edit-title').value.trim();
    const theme        = document.getElementById('arc-edit-theme').value.trim();
    const status       = document.getElementById('arc-edit-status').value;
    const description  = document.getElementById('arc-edit-desc').value.trim();
    const dm_notes     = document.getElementById('arc-edit-notes').value.trim();

    if (!title) { showToast('Title is required'); return; }

    try {
        const res = await fetch(`/api/arcs/${arcId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id, title, theme, status, description, dm_notes })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to update arc: ' + err.message);
    }
}

async function updateArcStatus(arcId, status) {
    const arc = storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    try {
        await fetch(`/api/arcs/${arcId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: arc.character_id, title: arc.title,
                theme: arc.theme, description: arc.description, dm_notes: arc.dm_notes, status })
        });
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        console.error('Failed to update arc status:', err);
    }
}

async function saveArcField(arcId, field, value) {
    const arc = storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    try {
        await fetch(`/api/arcs/${arcId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: arc.character_id, title: arc.title,
                theme: arc.theme, description: arc.description, dm_notes: arc.dm_notes, status: arc.status, [field]: value })
        });
        await loadStoryArcs();
    } catch (err) {
        console.error('Failed to save arc field:', err);
    }
}

async function deleteArc(arcId) {
    const arc = storyArcs.find(a => a.id === arcId);
    if (!confirm(`Delete arc "${arc?.title || ''}" and all its chapters? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/arcs/${arcId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        activeArcId = null;
        document.getElementById('arc-detail-view').innerHTML = '';
        await loadStoryArcs();
    } catch (err) {
        showToast('Failed to delete arc: ' + err.message);
    }
}

// ── Chapters ───────────────────────────────────────────────────

function openAddChapterModal(arcId) {
    showModal('Add Chapter', `
        <div class="form-group">
            <label>Title *</label>
            <input type="text" id="chapter-title" placeholder="What happens in this episode?"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="chapter-desc" rows="3" placeholder="More detail…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        <div class="form-group">
            <label>DM Notes (private)</label>
            <textarea id="chapter-notes" rows="2" placeholder="Hidden context, triggers…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        <button class="btn-primary" onclick="handleAddChapter(${arcId})" style="width:100%;margin-top:8px;">Add Chapter</button>
    `);
}

async function handleAddChapter(arcId) {
    const title       = document.getElementById('chapter-title').value.trim();
    const description = document.getElementById('chapter-desc').value.trim();
    const dm_notes    = document.getElementById('chapter-notes').value.trim();

    if (!title) { showToast('Title is required'); return; }

    try {
        const res = await fetch(`/api/arcs/${arcId}/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, dm_notes })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to add chapter: ' + err.message);
    }
}

async function updateChapterStatus(arcId, chapterId, status) {
    try {
        await fetch(`/api/arcs/${arcId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        console.error('Failed to update chapter status:', err);
    }
}

async function deleteChapter(arcId, chapterId) {
    try {
        const res = await fetch(`/api/arcs/${arcId}/chapters/${chapterId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to delete chapter: ' + err.message);
    }
}

async function openEditChapterModal(arcId, chapterId) {
    try {
        const res = await fetch(`/api/arcs/${arcId}`);
        const arc = await res.json();
        const ch  = arc.chapters.find(c => c.id === chapterId);
        if (!ch) return;

        showModal('Edit Chapter', `
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="ch-edit-title" value="${escHtml(ch.title)}"
                    style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="ch-edit-status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    ${Object.entries(CHAPTER_STATUS_LABELS).map(([s, l]) =>
                        `<option value="${s}"${ch.status === s ? ' selected' : ''}>${l}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="ch-edit-desc" rows="3"
                    style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"
                    placeholder="What happens in this chapter?">${escHtml(ch.description || '')}</textarea>
            </div>
            <div class="form-group">
                <label>DM Notes</label>
                <textarea id="ch-edit-notes" rows="3"
                    style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"
                    placeholder="Hidden context, triggers, foreshadowing…">${escHtml(ch.dm_notes || '')}</textarea>
            </div>
            <button class="btn-primary" onclick="handleEditChapter(${arcId}, ${chapterId})"
                style="width:100%;margin-top:8px;">Save Changes</button>
        `);
    } catch (err) {
        showToast('Failed to load chapter: ' + err.message);
    }
}

async function handleEditChapter(arcId, chapterId) {
    const title       = document.getElementById('ch-edit-title')?.value.trim();
    const status      = document.getElementById('ch-edit-status')?.value;
    const description = document.getElementById('ch-edit-desc')?.value.trim();
    const dm_notes    = document.getElementById('ch-edit-notes')?.value.trim();
    if (!title) { showToast('Title is required'); return; }
    try {
        const res = await fetch(`/api/arcs/${arcId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status, description, dm_notes })
        });
        if (!res.ok) throw new Error('Save failed');
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to save chapter: ' + err.message);
    }
}

// ── Beats Pool ─────────────────────────────────────────────────

function renderBeatsPool() {
    const section = document.getElementById('beats-pool-section');
    if (!section) return;

    section.innerHTML = `
    <div class="beats-pool-panel">
        <div class="beats-pool-header">
            <h3>Beats Pool</h3>
            <span class="beats-pool-subtitle">Plot events to place when the moment is right</span>
            <button class="btn-primary btn-sm" onclick="openCreateBeatModal()">+ New Beat</button>
        </div>
        ${beats.length ? `
        <div class="beat-pool-list">
            ${beats.map(b => `
            <div class="beat-pool-item${b.is_completed ? ' done' : ''}">
                <div class="beat-pool-main">
                    <label class="beat-pool-check">
                        <input type="checkbox" ${b.is_completed ? 'checked' : ''}
                            onchange="toggleBeatComplete(${b.id}, this.checked)">
                    </label>
                    <div class="beat-pool-info">
                        <div class="beat-title">${escHtml(b.title)}</div>
                        ${b.description ? `<div class="beat-desc">${escHtml(b.description)}</div>` : ''}
                        ${b.dm_notes    ? `<div class="beat-desc" style="color:#999;font-style:italic;">${escHtml(b.dm_notes)}</div>` : ''}
                        ${b.assignments.length ? `
                        <div class="beat-pool-assignments">
                            ${b.assignments.map(a => `
                                <span class="beat-assign-chip">
                                    ${escHtml(a.chapter_title)}
                                    <span style="color:#999;font-weight:400;"> — ${escHtml(a.arc_title)}</span>
                                </span>`).join('')}
                        </div>` : '<div class="beat-unassigned">Unassigned</div>'}
                    </div>
                    <div class="beat-pool-actions">
                        <button class="btn-secondary btn-xs" onclick="openAssignBeatModal(${b.id})">Assign</button>
                        <button class="btn-secondary btn-xs" onclick="cloneBeat(${b.id})">Clone</button>
                        <button class="beat-del" onclick="deleteBeat(${b.id})" title="Delete">&times;</button>
                    </div>
                </div>
            </div>`).join('')}
        </div>` : '<div class="arc-empty-small">No beats yet — create plot events to assign to chapters.</div>'}
    </div>`;
}

function openCreateBeatModal() {
    const chapterOptions = storyArcs.flatMap(arc =>
        (arc.chapters || []).map(ch =>
            `<option value="${ch.id}">${escHtml(arc.character_name || 'Unassigned')} — ${escHtml(arc.title)} — ${escHtml(ch.title)}</option>`
        )
    );
    showModal('New Beat', `
        <div class="form-group">
            <label>Title *</label>
            <input type="text" id="beat-title" placeholder="What needs to happen?"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="beat-desc" rows="2" placeholder="More detail…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        <div class="form-group">
            <label>DM Notes (private)</label>
            <textarea id="beat-notes" rows="2" placeholder="Hidden context, triggers…"
                style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;"></textarea>
        </div>
        ${chapterOptions.length ? `
        <div class="form-group">
            <label>Assign to Chapter (optional)</label>
            <select id="beat-chapter-id" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="">— assign later —</option>
                ${chapterOptions.join('')}
            </select>
        </div>` : ''}
        <button class="btn-primary" onclick="handleCreateBeat()" style="width:100%;margin-top:8px;">Create Beat</button>
    `);
}

async function handleCreateBeat() {
    const title       = document.getElementById('beat-title').value.trim();
    const description = document.getElementById('beat-desc').value.trim();
    const dm_notes    = document.getElementById('beat-notes').value.trim();
    const chapter_id  = document.getElementById('beat-chapter-id')?.value || null;

    if (!title) { showToast('Title is required'); return; }

    try {
        const res = await fetch('/api/beats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, dm_notes, chapter_id })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        closeModal();
        await loadStoryArcs();
        if (activeArcId) selectArc(activeArcId);
    } catch (err) {
        showToast('Failed to create beat: ' + err.message);
    }
}

async function toggleBeatComplete(beatId, completed) {
    try {
        await fetch(`/api/beats/${beatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: completed })
        });
        await loadStoryArcs();
        if (activeArcId) selectArc(activeArcId);
    } catch (err) {
        console.error('Failed to toggle beat:', err);
    }
}

async function cloneBeat(beatId) {
    try {
        const res = await fetch(`/api/beats/${beatId}/clone`, { method: 'POST' });
        if (!res.ok) throw new Error('Clone failed');
        await loadStoryArcs();
    } catch (err) {
        showToast('Failed to clone beat: ' + err.message);
    }
}

async function deleteBeat(beatId) {
    try {
        const res = await fetch(`/api/beats/${beatId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        await loadStoryArcs();
        if (activeArcId) selectArc(activeArcId);
    } catch (err) {
        showToast('Failed to delete beat: ' + err.message);
    }
}

function openAssignBeatModal(beatId) {
    const beat     = beats.find(b => b.id === beatId);
    const assigned = new Set((beat?.assignments || []).map(a => a.chapter_id));

    const chapterOptions = storyArcs.flatMap(arc =>
        (arc.chapters || [])
            .filter(ch => !assigned.has(ch.id))
            .map(ch =>
                `<option value="${ch.id}">${escHtml(arc.character_name || 'Unassigned')} — ${escHtml(arc.title)} — ${escHtml(ch.title)}</option>`
            )
    );

    if (!chapterOptions.length) {
        showToast('No available chapters to assign to. All chapters already have this beat, or no chapters exist yet.');
        return;
    }

    showModal('Assign Beat to Chapter', `
        <p style="color:#666;margin-bottom:12px;">
            Assign "<strong>${escHtml(beat?.title || '')}</strong>" to a chapter.
        </p>
        <div class="form-group">
            <label>Chapter</label>
            <select id="assign-chapter-id" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="">— select chapter —</option>
                ${chapterOptions.join('')}
            </select>
        </div>
        <button class="btn-primary" onclick="handleAssignBeat(${beatId})" style="width:100%;margin-top:8px;">Assign</button>
    `);
}

async function handleAssignBeat(beatId) {
    const chapter_id = document.getElementById('assign-chapter-id').value;
    if (!chapter_id) { showToast('Select a chapter'); return; }
    try {
        const res = await fetch(`/api/beats/${beatId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapter_id })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        closeModal();
        await loadStoryArcs();
        if (activeArcId) selectArc(activeArcId);
    } catch (err) {
        showToast('Failed to assign beat: ' + err.message);
    }
}

function openAssignBeatToChapterModal(chapterId, arcId) {
    const alreadyHere = new Set(
        beats.filter(b => b.assignments.some(a => a.chapter_id === chapterId)).map(b => b.id)
    );
    const available = beats.filter(b => !alreadyHere.has(b.id) && !b.is_completed);

    if (!available.length) {
        showToast('No available beats. All beats are assigned here already, completed, or none exist. Create a new beat first.');
        return;
    }

    showModal('Assign Beat to Chapter', `
        <div class="form-group">
            <label>Beat</label>
            <select id="assign-beat-id" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                <option value="">— select beat —</option>
                ${available.map(b => `<option value="${b.id}">${escHtml(b.title)}</option>`).join('')}
            </select>
        </div>
        <button class="btn-primary" onclick="handleAssignBeatToChapter(${chapterId}, ${arcId})" style="width:100%;margin-top:8px;">Assign</button>
    `);
}

async function handleAssignBeatToChapter(chapterId, arcId) {
    const beatId = document.getElementById('assign-beat-id').value;
    if (!beatId) { showToast('Select a beat'); return; }
    try {
        const res = await fetch(`/api/beats/${beatId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapter_id: chapterId })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed');
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to assign beat: ' + err.message);
    }
}

async function unassignBeat(beatId, chapterId) {
    try {
        await fetch(`/api/beats/${beatId}/chapters/${chapterId}`, { method: 'DELETE' });
        await loadStoryArcs();
        if (activeArcId) selectArc(activeArcId);
    } catch (err) {
        console.error('Failed to unassign beat:', err);
    }
}
