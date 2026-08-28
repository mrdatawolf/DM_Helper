import { state } from './dm-state.js';
import { closeModal, showModal } from './dm-modal-utils.js';
import { loadStoryArcs } from './dm-story-arcs.js';
import { renderBeatsPool } from './dm-story-beats.js';
const ARC_STATUS_LABELS     = { planned: 'Planned', active: 'Active', dormant: 'Dormant', completed: 'Completed' };
const CHAPTER_STATUS_LABELS = { planned: 'Planned', active: 'Active', completed: 'Done' };

// ── Arc Card Rows (per character) ──────────────────────────────

function renderArcRows() {
    const container = document.getElementById('arc-rows-container');
    if (!container) return;

    // Group arcs by character
    const byChar = {};
    state.storyArcs.forEach(a => {
        const key = a.character_id || 0;
        if (!byChar[key]) byChar[key] = { name: a.character_name || 'Unassigned', id: a.character_id || 0, arcs: [] };
        byChar[key].arcs.push(a);
    });

    // Include characters with no arcs yet
    state.characters.forEach(c => {
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
                    const isActive = a.id === state.activeArcId;
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
    state.activeArcId = id;
    renderArcRows();
    try {
        const arc = await apiFetch(`/api/arcs/${id}`);
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
    const charOptions = state.characters.map(c =>
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
        const newArc = await apiFetch('/api/arcs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id, title, theme, status, description, dm_notes })
        });
        closeModal();
        await loadStoryArcs();
        selectArc(newArc.id);
    } catch (err) {
        showToast('Failed to create arc: ' + err.message);
    }
}

async function openEditArcModal(arcId) {
    const arc = state.storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    const charOptions = state.characters.map(c =>
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
        await apiFetch(`/api/arcs/${arcId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id, title, theme, status, description, dm_notes })
        });
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to update arc: ' + err.message);
    }
}

async function updateArcStatus(arcId, status) {
    const arc = state.storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    try {
        await apiFetch(`/api/arcs/${arcId}`, {
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
    const arc = state.storyArcs.find(a => a.id === arcId);
    if (!arc) return;
    try {
        await apiFetch(`/api/arcs/${arcId}`, {
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
    const arc = state.storyArcs.find(a => a.id === arcId);
    if (!confirm(`Delete arc "${arc?.title || ''}" and all its chapters? This cannot be undone.`)) return;
    try {
        await apiFetch(`/api/arcs/${arcId}`, { method: 'DELETE' });
        state.activeArcId = null;
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
        await apiFetch(`/api/arcs/${arcId}/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, dm_notes })
        });
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to add chapter: ' + err.message);
    }
}

async function updateChapterStatus(arcId, chapterId, status) {
    try {
        await apiFetch(`/api/arcs/${arcId}/chapters/${chapterId}`, {
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
        await apiFetch(`/api/arcs/${arcId}/chapters/${chapterId}`, { method: 'DELETE' });
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to delete chapter: ' + err.message);
    }
}

async function openEditChapterModal(arcId, chapterId) {
    try {
        const arc = await apiFetch(`/api/arcs/${arcId}`);
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
        await apiFetch(`/api/arcs/${arcId}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, status, description, dm_notes })
        });
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to save chapter: ' + err.message);
    }
}

Object.assign(window, { deleteArc, deleteChapter, handleAddChapter, handleCreateArc, handleEditArc, handleEditChapter, openAddChapterModal, openCreateArcModal, openEditArcModal, openEditChapterModal, saveArcField, selectArc, updateArcStatus, updateChapterStatus });
export { renderArcRows, selectArc };