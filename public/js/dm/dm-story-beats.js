import { state } from './dm-state.js';
import { closeModal, showModal } from './dm-modal-utils.js';
import { loadStoryArcs } from './dm-story-arcs.js';
import { selectArc } from './dm-story-arc-editor.js';
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
        ${state.beats.length ? `
        <div class="beat-pool-list">
            ${state.beats.map(b => `
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
    const chapterOptions = state.storyArcs.flatMap(arc =>
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
        await apiFetch('/api/beats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, dm_notes, chapter_id })
        });
        closeModal();
        await loadStoryArcs();
        if (state.activeArcId) selectArc(state.activeArcId);
    } catch (err) {
        showToast('Failed to create beat: ' + err.message);
    }
}

async function toggleBeatComplete(beatId, completed) {
    try {
        await apiFetch(`/api/beats/${beatId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_completed: completed })
        });
        await loadStoryArcs();
        if (state.activeArcId) selectArc(state.activeArcId);
    } catch (err) {
        console.error('Failed to toggle beat:', err);
    }
}

async function cloneBeat(beatId) {
    try {
        await apiFetch(`/api/beats/${beatId}/clone`, { method: 'POST' });
        await loadStoryArcs();
    } catch (err) {
        showToast('Failed to clone beat: ' + err.message);
    }
}

async function deleteBeat(beatId) {
    try {
        await apiFetch(`/api/beats/${beatId}`, { method: 'DELETE' });
        await loadStoryArcs();
        if (state.activeArcId) selectArc(state.activeArcId);
    } catch (err) {
        showToast('Failed to delete beat: ' + err.message);
    }
}

function openAssignBeatModal(beatId) {
    const beat     = state.beats.find(b => b.id === beatId);
    const assigned = new Set((beat?.assignments || []).map(a => a.chapter_id));

    const chapterOptions = state.storyArcs.flatMap(arc =>
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
        await apiFetch(`/api/beats/${beatId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapter_id })
        });
        closeModal();
        await loadStoryArcs();
        if (state.activeArcId) selectArc(state.activeArcId);
    } catch (err) {
        showToast('Failed to assign beat: ' + err.message);
    }
}

function openAssignBeatToChapterModal(chapterId, arcId) {
    const alreadyHere = new Set(
        state.beats.filter(b => b.assignments.some(a => a.chapter_id === chapterId)).map(b => b.id)
    );
    const available = state.beats.filter(b => !alreadyHere.has(b.id) && !b.is_completed);

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
        await apiFetch(`/api/beats/${beatId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapter_id: chapterId })
        });
        closeModal();
        await loadStoryArcs();
        selectArc(arcId);
    } catch (err) {
        showToast('Failed to assign beat: ' + err.message);
    }
}

async function unassignBeat(beatId, chapterId) {
    try {
        await apiFetch(`/api/beats/${beatId}/chapters/${chapterId}`, { method: 'DELETE' });
        await loadStoryArcs();
        if (state.activeArcId) selectArc(state.activeArcId);
    } catch (err) {
        console.error('Failed to unassign beat:', err);
    }
}

Object.assign(window, { cloneBeat, deleteBeat, handleAssignBeat, handleAssignBeatToChapter, handleCreateBeat, openAssignBeatModal, openAssignBeatToChapterModal, openCreateBeatModal, toggleBeatComplete, unassignBeat });
export { renderBeatsPool };