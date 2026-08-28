import { API_BASE } from './dm-state.js';
import { loadNpcs } from './dm-core.js';
import { creatureFormFields, creaturePayloadFromForm } from './dm-creature-modals.js';
import { closeModal, showModal } from './dm-modal-utils.js';
async function editCreature(id) {
    try {
        const n = await apiFetch(`${API_BASE}/npcs/${id}`);

        showModal(`Edit: ${escHtml(n.name)}`, `
            <form onsubmit="handleEditCreature(event, ${id})">
                ${creatureFormFields(n)}
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        `);
    } catch (err) {
        showToast(`Failed to load creature: ${err.message}`);
    }
}

async function handleEditCreature(event, id) {
    event.preventDefault();
    const data = creaturePayloadFromForm(event);

    try {
        await apiFetch(`${API_BASE}/npcs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        closeModal();
        await loadNpcs();
    } catch (err) {
        showToast(`Failed to save creature: ${err.message}`);
    }
}

Object.assign(window, { editCreature, handleEditCreature });