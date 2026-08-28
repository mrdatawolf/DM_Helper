import { state, API_BASE } from './dm-state.js';
import { loadCharacters, loadProgress } from './dm-lists.js';
import { closeModal, showModal } from './dm-modal-utils.js';
// Add Progress Modal
function showAddProgressModal() {
    const charOptions = state.characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const sessionOptions = state.sessions.map(s => `<option value="${s.id}">Session ${s.session_number}: ${s.session_title || 'Untitled'}</option>`).join('');
    const shadowOptions = state.shadows.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');

    showModal('Add Progress Entry', `
        <form onsubmit="addProgress(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Character *</label>
                    <select name="character_id" required>
                        <option value="">Select Character</option>
                        ${charOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Session *</label>
                    <select name="session_id" required>
                        <option value="">Select Session</option>
                        ${sessionOptions}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Shadow Location</label>
                <select name="shadow_id">
                    <option value="">Select Shadow</option>
                    ${shadowOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Session Summary *</label>
                <textarea name="summary" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Feats Earned</label>
                    <input type="number" name="feats_earned" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>Experience Gained</label>
                    <input type="number" name="experience_gained" value="0" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Key Story Beats</label>
                <textarea name="story_beats"></textarea>
            </div>
            <div class="form-group">
                <label>NPCs Met</label>
                <input type="text" name="npcs_met">
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="is_solo_session">
                    Solo Session
                </label>
            </div>
            <div class="form-group">
                <label>DM Private Notes</label>
                <textarea name="dm_private_notes"></textarea>
            </div>
            <button type="submit" class="btn-primary">Add Progress</button>
        </form>
    `);
}

async function addProgress(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.is_solo_session = formData.has('is_solo_session');

    try {
        await apiFetch(`${API_BASE}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadProgress();
        await loadCharacters(); // Reload to update feat counts
    } catch (error) {
        console.error('Error:', error);
        showToast('Error adding progress');
    }
}

async function deleteProgress(id) {
    if (!confirm('Are you sure you want to delete this progress entry?')) return;

    try {
        await apiFetch(`${API_BASE}/progress/${id}`, { method: 'DELETE' });
        await loadProgress();
    } catch (error) {
        console.error('Error:', error);
        showToast(`Failed to delete progress entry: ${error.message}`);
    }
}

Object.assign(window, { addProgress, deleteProgress, showAddProgressModal });