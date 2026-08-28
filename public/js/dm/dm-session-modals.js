import { state, API_BASE } from './dm-state.js';
import { buildChapterPicker } from './dm-core.js';
import { loadSessions } from './dm-lists.js';
import { closeModal, showModal } from './dm-modal-utils.js';
// Create Session Modal
function showCreateSessionModal() {
    const nextNum = state.sessions.length > 0 ? Math.max(...state.sessions.map(s => s.session_number)) + 1 : 1;
    const today   = new Date().toISOString().split('T')[0];

    const charChecks = state.characters.map(c =>
        `<label style="display:block;margin-bottom:4px;cursor:pointer">
            <input type="checkbox" class="char-check" value="${c.id}">
            ${escHtml(c.name)}${c.player_name ? ` <span style="color:#999;font-size:0.85em">(${escHtml(c.player_name)})</span>` : ''}
         </label>`
    ).join('');

    showModal('Create Session', `
        <form onsubmit="createSession(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Session # *</label>
                    <input type="number" name="session_number" value="${nextNum}" required>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="session_date" value="${today}" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="session_status">
                        <option value="planned" selected>Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" name="session_title" placeholder="Session title…">
            </div>
            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Expected Characters</summary>
                <div style="max-height:130px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:8px 12px;background:#fdf9f2">
                    ${charChecks || '<em style="color:#999">No characters yet</em>'}
                </div>
            </details>
            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Active Chapters This Session</summary>
                <div style="max-height:220px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:10px 14px;background:#fdf9f2">
                    ${buildChapterPicker()}
                </div>
            </details>
            <div class="form-group">
                <label>Opening Notes <span style="color:#999;font-size:0.85em">(pre-session setup, hooks…)</span></label>
                <textarea name="opening_notes" rows="3"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Session</button>
        </form>
    `);
}

async function createSession(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    data.character_ids = [...form.querySelectorAll('.char-check:checked')].map(el => +el.value);
    data.chapter_ids   = [...form.querySelectorAll('.chapter-check:checked')].map(el => +el.value);

    try {
        await apiFetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadSessions();
    } catch (err) {
        showToast(`Failed to create session: ${err.message}`);
    }
}

async function deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
        await apiFetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
        await loadSessions();
    } catch (error) {
        console.error('Error:', error);
        showToast(`Failed to delete session: ${error.message}`);
    }
}

Object.assign(window, { createSession, deleteSession, showCreateSessionModal });