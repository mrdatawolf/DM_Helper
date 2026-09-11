import { state } from './player-state.js';

const STORY_MAX_LENGTH = 20000;

function characterForStory(characterId) {
    return state.userCharacters.find(character => character.id === characterId);
}

function showCharacterStory(characterId, editing) {
    const character = characterForStory(characterId);
    if (!character) return;

    document.getElementById('story-modal-title').textContent = `${character.name}'s Story`;
    const body = document.getElementById('story-modal-body');
    if (editing) {
        body.innerHTML = `
            <textarea id="story-modal-textarea" class="story-modal-textarea" maxlength="${STORY_MAX_LENGTH}" aria-label="Character story">${escHtml(character.character_story || '')}</textarea>
            <div class="story-modal-actions">
                <button class="btn-secondary" onclick="viewCharacterStory(${character.id})">Cancel</button>
                <button class="btn-primary" onclick="saveCharacterStory(${character.id})">Save</button>
            </div>`;
        document.getElementById('story-modal-textarea').focus();
    } else {
        body.innerHTML = character.character_story
            ? `<div class="story-modal-prose">${escHtml(character.character_story)}</div>`
            : '<p class="story-modal-empty">No story has been written yet.</p>';
    }
    document.getElementById('story-modal-overlay').classList.add('active');
}

function viewCharacterStory(characterId) {
    showCharacterStory(characterId, false);
}

function editCharacterStory(characterId) {
    showCharacterStory(characterId, true);
}

function closeCharacterStory() {
    document.getElementById('story-modal-overlay').classList.remove('active');
}

async function saveCharacterStory(characterId) {
    const story = document.getElementById('story-modal-textarea').value;
    try {
        const updated = await apiFetch(`/api/characters/${characterId}/story`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ story }),
        });
        const index = state.userCharacters.findIndex(character => character.id === characterId);
        if (index !== -1) state.userCharacters[index] = { ...state.userCharacters[index], ...updated };
        showToast('Story saved', 'success');
        viewCharacterStory(characterId);
    } catch (error) {
        showToast(`Failed to save story: ${error.message}`, 'error');
    }
}

Object.assign(window, { closeCharacterStory, editCharacterStory, saveCharacterStory, viewCharacterStory });
