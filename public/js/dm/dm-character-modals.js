import { state, API_BASE } from './dm-state.js';
import { loadCharacters } from './dm-lists.js';
import { closeModal, showModal } from './dm-modal-utils.js';
// Create Character Modal
function showCreateCharacterModal() {
    const shadowOptions = state.shadows.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');

    showModal('Create Character', `
        <form onsubmit="createCharacter(event)">
            <div class="form-group">
                <label>Character Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Player Name</label>
                <input type="text" name="player_name">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Species/Race *</label>
                    <input type="text" name="species" required>
                </div>
                <div class="form-group">
                    <label>Class *</label>
                    <input type="text" name="class_type" required>
                </div>
            </div>
            <div class="form-group">
                <label>Shadow Origin</label>
                <select name="shadow_origin_id">
                    <option value="">Select Shadow</option>
                    ${shadowOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Blood Purity</label>
                    <select name="blood_purity">
                        <option value="None">None</option>
                        <option value="Pure">Pure Blood</option>
                        <option value="Half">Half Blood</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Level</label>
                    <input type="number" name="level" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="pattern_imprint">
                    Has Pattern Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="logrus_imprint">
                    Has Logrus Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="trump_artist">
                    Has Trump Artistry
                </label>
            </div>
            <div class="form-group">
                <label>Character Notes</label>
                <textarea name="character_notes"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Character</button>
        </form>
    `);
}

async function createCharacter(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    // Convert checkboxes
    data.pattern_imprint = formData.has('pattern_imprint') ? 1 : 0;
    data.logrus_imprint = formData.has('logrus_imprint') ? 1 : 0;
    data.trump_artist = formData.has('trump_artist') ? 1 : 0;

    try {
        await apiFetch(`${API_BASE}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadCharacters();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating character');
    }
}

// Delete functions
async function deleteCharacter(id) {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
        await apiFetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
        await loadCharacters();
    } catch (error) {
        console.error('Error:', error);
        showToast(`Failed to delete character: ${error.message}`);
    }
}

Object.assign(window, { createCharacter, deleteCharacter, showCreateCharacterModal });