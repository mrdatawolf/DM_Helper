import { API_BASE } from './dm-state.js';
import { loadShadows } from './dm-lists.js';
import { closeModal, showModal } from './dm-modal-utils.js';
// Deep lore viewer (reads Background Information/DM Info/{shadow name}.md)
function renderLoreMarkdown(md) {
    const lines = escHtml(md).split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        const listItem = line.match(/^\d+\.\s+\*\*(.*?)\*\*\s*—\s*(.*)|^\d+\.\s+(.*)/);
        if (heading) {
            if (inList) { html += '</ul>'; inList = false; }
            const level = heading[1].length + 2; // h3..h5
            html += `<h${level}>${heading[2]}</h${level}>`;
        } else if (listItem) {
            if (!inList) { html += '<ul>'; inList = true; }
            const text = listItem[1] ? `<strong>${listItem[1]}</strong> — ${listItem[2]}` : listItem[3];
            html += `<li>${text}</li>`;
        } else if (line.trim() === '') {
            if (inList) { html += '</ul>'; inList = false; }
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            const withBold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            html += `<p>${withBold}</p>`;
        }
    }
    if (inList) html += '</ul>';
    return html;
}

// Kept on raw fetch rather than apiFetch: a 404 here means "no lore file
// for this shadow" (an expected, common case with its own message), which
// is a distinct situation from a real network/exception failure — apiFetch
// would collapse both into one catch block and one message.
async function viewShadowLore(id, name) {
    try {
        const response = await fetch(`${API_BASE}/shadows/${id}/lore`);
        if (!response.ok) {
            showToast('No detailed lore written for this shadow yet.');
            return;
        }
        const data = await response.json();
        showModal(name, `<div class="lore-content">${renderLoreMarkdown(data.content)}</div>`);
    } catch (err) {
        showToast(`Failed to load lore: ${err.message}`);
    }
}

// Create Shadow Modal
function showCreateShadowModal() {
    showModal('Create Shadow', `
        <form onsubmit="createShadow(event)">
            <div class="form-group">
                <label>Shadow Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Order Level (0-100)</label>
                    <input type="number" name="order_level" value="50" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Chaos Level (0-100)</label>
                    <input type="number" name="chaos_level" value="50" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Dream Level (0-100)</label>
                    <input type="number" name="dream_level" value="0" min="0" max="100">
                </div>
            </div>
            <div class="form-group">
                <label>Influence</label>
                <select name="pattern_influence">
                    <option value="None">None</option>
                    <option value="Pattern">Pattern</option>
                    <option value="Argent Refrain">The Argent Refrain</option>
                    <option value="Logrus">Logrus</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Nexus">Nexus</option>
                </select>
            </div>
            <div class="form-group">
                <label>Corruption Status</label>
                <textarea name="corruption_status"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Shadow</button>
        </form>
    `);
}

async function createShadow(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        await apiFetch(`${API_BASE}/shadows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadShadows();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating shadow');
    }
}

async function deleteShadow(id) {
    if (!confirm('Are you sure you want to delete this shadow?')) return;

    try {
        await apiFetch(`${API_BASE}/shadows/${id}`, { method: 'DELETE' });
        await loadShadows();
    } catch (error) {
        console.error('Error:', error);
        showToast(`Failed to delete shadow: ${error.message}`);
    }
}

Object.assign(window, { createShadow, deleteShadow, showCreateShadowModal, viewShadowLore });