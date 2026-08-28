import { state, API_BASE } from './dm-state.js';
import { closeModal, showModal } from './dm-modal-utils.js';
import { loadShadows } from './dm-lists.js';
async function editShadow(id) {
    try {
        const s = await apiFetch(`${API_BASE}/shadows/${id}`);

        const influenceOptions = ['None','Pattern','Argent Refrain','Logrus','Mixed','Nexus']
            .map(v => `<option value="${v}"${s.pattern_influence === v ? ' selected' : ''}>${v === 'Argent Refrain' ? 'The Argent Refrain' : v}</option>`)
            .join('');

        showModal(`Edit: ${escHtml(s.name)}`, `
            <form onsubmit="handleEditShadow(event, ${id})">
                <div class="form-group">
                    <label>Shadow Name *</label>
                    <input type="text" name="name" value="${escHtml(s.name)}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea name="description">${escHtml(s.description || '')}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Order Level (0-100)</label>
                        <input type="number" name="order_level" value="${s.order_level}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Chaos Level (0-100)</label>
                        <input type="number" name="chaos_level" value="${s.chaos_level}" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label>Dream Level (0-100)</label>
                        <input type="number" name="dream_level" value="${s.dream_level || 0}" min="0" max="100">
                    </div>
                </div>
                <div class="form-group">
                    <label>Influence</label>
                    <select name="pattern_influence">${influenceOptions}</select>
                </div>
                <div class="form-group">
                    <label>Corruption Status</label>
                    <textarea name="corruption_status">${escHtml(s.corruption_status || '')}</textarea>
                </div>
                <input type="hidden" name="is_starting_shadow" id="is_starting_shadow_val" value="${s.is_starting_shadow ? '1' : '0'}">
                <div class="form-group">
                    <button type="button" id="btn-starting-world"
                        class="${s.is_starting_shadow ? 'btn-primary' : 'btn-secondary'}"
                        onclick="toggleStartingWorld()">
                        Starting World${s.is_starting_shadow ? ' ✓' : ''}
                    </button>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load shadow: ${err.message}`);
    }
}

function toggleStartingWorld() {
    const hidden = document.getElementById('is_starting_shadow_val');
    const btn = document.getElementById('btn-starting-world');
    const active = hidden.value === '1';
    hidden.value = active ? '0' : '1';
    btn.className = active ? 'btn-secondary' : 'btn-primary';
    btn.textContent = active ? 'Starting World' : 'Starting World ✓';
}

async function handleEditShadow(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    data.is_starting_shadow = parseInt(data.is_starting_shadow) || 0;

    try {
        await apiFetch(`${API_BASE}/shadows/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadShadows();
    } catch (err) {
        showToast(`Failed to save shadow: ${err.message}`);
    }
}

Object.assign(window, { editShadow, handleEditShadow, toggleStartingWorld });