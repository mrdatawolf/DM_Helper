import { state } from './player-state.js';
import { viewCharacter } from './player-characters.js';
import { generateBasicInfoTab, generateAbilitiesTab } from './player-edit-basic-tabs.js';
import { generateCombatTab, generateSpellsTab, generateEquipmentTab, generateFeaturesTab } from './player-edit-gameplay-tabs.js';
import { generateDetailsTab } from './player-edit-details-tab.js';
import { handleEditCharacter, switchCharEditTab } from './player-edit-actions.js';
// Open edit character view
async function openEditCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        // shadowsRes is kept on raw fetch: a non-ok response there degrades
        // gracefully to an empty list rather than failing the whole form.
        const [character, shadowsRes] = await Promise.all([
            apiFetch(`/api/characters/${characterId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/shadows')
        ]);

        state.playerAllShadows = shadowsRes.ok ? await shadowsRes.json() : [];
        state.currentCharacter = character;

        displayCharacterEditForm(character);

    } catch (error) {
        console.error('Error loading character for edit:', error);
        showToast('Failed to load character data');
    }
}

// Display character edit form
function displayCharacterEditForm(character) {
    const container = document.getElementById('character-details');
    const listContainer = document.getElementById('characters-list');

    // Hide character list, show edit form
    listContainer.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = `
        <div class="character-sheet-header">
            <div>
                <h2>Edit: ${escHtml(character.name)}</h2>
                <p>Update your character information</p>
            </div>
            <button class="back-button" onclick="viewCharacter(${character.id})">← Cancel & View Character</button>
        </div>

        <div class="character-edit-container">
            <!-- Character Edit Tabs -->
            <div class="character-edit-tabs">
                <button class="char-tab-btn active" data-tab="basic" onclick="switchCharEditTab('basic')">Basic Info</button>
                <button class="char-tab-btn" data-tab="abilities" onclick="switchCharEditTab('abilities')">Abilities & Skills</button>
                <button class="char-tab-btn" data-tab="combat" onclick="switchCharEditTab('combat')">Combat & HP</button>
                <button class="char-tab-btn" data-tab="spells" onclick="switchCharEditTab('spells')">Spells</button>
                <button class="char-tab-btn" data-tab="equipment" onclick="switchCharEditTab('equipment')">Equipment</button>
                <button class="char-tab-btn" data-tab="features" onclick="switchCharEditTab('features')">Features & Traits</button>
                <button class="char-tab-btn" data-tab="details" onclick="switchCharEditTab('details')">Appearance & Story</button>
            </div>

            <form id="edit-character-form">
                ${generateBasicInfoTab(character)}
                ${generateAbilitiesTab(character)}
                ${generateCombatTab(character)}
                ${generateSpellsTab(character)}
                ${generateEquipmentTab(character)}
                ${generateFeaturesTab(character)}
                ${generateDetailsTab(character)}

                <!-- Save Button (shown on all tabs) -->
                <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--light);">
                    <button type="button" class="btn-secondary" onclick="viewCharacter(${character.id})">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    // Setup form submission
    const form = document.getElementById('edit-character-form');
    form.onsubmit = handleEditCharacter;
}

// Close edit character view
function closeEditCharacter() {
    // Go back to character list
    document.getElementById('character-details').style.display = 'none';
    document.getElementById('characters-list').style.display = 'grid';
    state.currentCharacter = null;
}

// Generate Basic Info Tab HTML
Object.assign(window, { closeEditCharacter, openEditCharacter, switchCharEditTab });
export { closeEditCharacter, openEditCharacter };