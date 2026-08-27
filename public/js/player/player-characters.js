// player-characters.js — split from player-dashboard.js (behavior unchanged)
import { state } from './player-state.js';
import { imprintLabel, switchTab } from './player-core.js';
import { loadCharacterClaims } from './player-claims.js';
import { renderFamiliarsSection } from './player-familiars.js';
import { renderGearSection, renderPowersSection } from './player-gear-powers.js';

// Load user's characters
async function loadCharacters() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('characters-list');

    try {
        const data = await apiFetch('/api/auth/characters', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        state.userCharacters = data.characters || [];

        if (state.userCharacters.length === 0) {
            container.innerHTML = `
                <div class="info-message" style="grid-column: 1 / -1;">
                    <h3>Welcome to Your Character Dashboard!</h3>
                    <p>You don't have any characters yet. Click the "Create New Character" button above to get started!</p>
                </div>
            `;
            return;
        }

        // Render character cards
        container.innerHTML = state.userCharacters.map(char => `
            <div class="character-card">
                <div onclick="viewCharacter(${char.id})" style="cursor: pointer;">
                    <h3>${escHtml(char.name)}</h3>
                    <div class="character-meta">
                        <span>${escHtml(char.species || char.race)}</span>
                        <span>•</span>
                        <span>${escHtml(char.class_type)}</span>
                        <span>•</span>
                        <span>Level ${char.level}</span>
                    </div>
                    <div class="character-stats">
                        <div class="stat-item">
                            <div class="stat-label">HP</div>
                            <div class="stat-value">${char.current_hp}/${char.max_hp}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Order/Chaos</div>
                            <div class="stat-value">${char.order_chaos_value}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Pattern</div>
                            <div class="stat-value">${imprintLabel(char.pattern_imprint)}</div>
                        </div>
                    </div>
                </div>
                <div class="character-card-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openEditCharacter(${char.id})">Edit</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        if (error.status === 401) {
            window.location.href = '/player-login.html';
            return;
        }
        console.error('Error loading characters:', error);
        console.error('Error details:', error.message);
        console.error('Token present:', !!token);
        container.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                <p>Failed to load characters: ${error.message}</p>
                <p>Please check the browser console for details or try refreshing the page.</p>
            </div>
        `;
    }
}

// View character details
async function viewCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        const character = await apiFetch(`/api/characters/${characterId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        state.currentCharacter = character;

        // Show character sheet
        displayCharacterSheet(character);

    } catch (error) {
        console.error('Error loading character:', error);
        showToast('Failed to load character details');
    }
}

// Display character sheet
function displayCharacterSheet(character) {
    const container = document.getElementById('character-details');
    const listContainer = document.getElementById('characters-list');

    // Hide character list, show character sheet
    listContainer.style.display = 'none';
    container.style.display = 'block';

    const modifier = (score) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : mod;
    };

    container.innerHTML = `
        <div class="character-sheet-header">
            <div>
                <h2>${escHtml(character.name)}</h2>
                <p>${escHtml(character.species || character.race)} ${escHtml(character.class_type)} - Level ${character.level}</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-primary" onclick="openEditCharacter(${character.id})">Edit Character</button>
                <button class="back-button" onclick="closeCharacterSheet()">← Back to Characters</button>
            </div>
        </div>

        <div class="character-sheet-content">
            <h3>Ability Scores</h3>
            <div class="ability-scores">
                <div class="ability-score">
                    <div class="label">STR</div>
                    <div class="value">${character.strength}</div>
                    <div class="modifier">${modifier(character.strength)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">DEX</div>
                    <div class="value">${character.dexterity}</div>
                    <div class="modifier">${modifier(character.dexterity)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">CON</div>
                    <div class="value">${character.constitution}</div>
                    <div class="modifier">${modifier(character.constitution)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">INT</div>
                    <div class="value">${character.intelligence}</div>
                    <div class="modifier">${modifier(character.intelligence)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">WIS</div>
                    <div class="value">${character.wisdom}</div>
                    <div class="modifier">${modifier(character.wisdom)}</div>
                </div>
                <div class="ability-score">
                    <div class="label">CHA</div>
                    <div class="value">${character.charisma}</div>
                    <div class="modifier">${modifier(character.charisma)}</div>
                </div>
            </div>

            <h3>Amber Attributes</h3>
            <div class="form-grid">
                <div class="stat-display">
                    <strong>Order/Chaos Balance:</strong> ${character.order_chaos_value}
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${character.order_chaos_value}%; background: ${getOrderChaosColor(character.order_chaos_value)}"></div>
                    </div>
                </div>
                <div class="stat-display">
                    <strong>Pattern Imprint:</strong> ${imprintLabel(character.pattern_imprint)}
                </div>
                <div class="stat-display">
                    <strong>Logrus Imprint:</strong> ${imprintLabel(character.logrus_imprint)}
                </div>
                <div class="stat-display">
                    <strong>Blood Purity:</strong> ${escHtml(character.blood_purity) || 'None'}
                </div>
                <div class="stat-display">
                    <strong>Trump Artist:</strong> ${character.trump_artist ? 'Yes' : 'No'}
                </div>
            </div>

            ${renderGearSection(character)}

            ${renderPowersSection(character)}

            ${renderFamiliarsSection(character)}

            ${character.backstory ? `
                <h3>Backstory</h3>
                <div class="backstory">
                    <p>${escHtml(character.backstory)}</p>
                </div>
            ` : ''}

            <div class="character-actions">
                <button class="btn-primary" onclick="viewCharacterClaims()">View Claims</button>
                <button class="btn-primary" onclick="viewCharacterProgress()">View Progress</button>
            </div>
        </div>
    `;
}

// Close character sheet
function closeCharacterSheet() {
    document.getElementById('character-details').style.display = 'none';
    document.getElementById('characters-list').style.display = 'grid';
    state.currentCharacter = null;
}

// Get color based on Order/Chaos value
function getOrderChaosColor(value) {
    if (value >= 75) return '#3498db'; // Order blue
    if (value >= 25) return '#95a5a6'; // Neutral gray
    return '#e74c3c'; // Chaos red
}

// View character claims
function viewCharacterClaims() {
    switchTab('claims');
}

// View character progress
function viewCharacterProgress() {
    switchTab('progress');
}

// Load claims for current character
async function loadClaims() {
    if (!state.currentCharacter) {
        document.getElementById('claims-content').innerHTML = `
            <div class="info-message">
                <p>Select a character from "My Characters" to view and manage their claims.</p>
            </div>
        `;
        return;
    }

    // Use the new loadCharacterClaims function
    await loadCharacterClaims(state.currentCharacter.id);
}

// Load progress for current character
async function loadProgress() {
    if (!state.currentCharacter) {
        document.getElementById('progress-content').innerHTML = `
            <div class="info-message">
                <p>Select a character from "My Characters" to view their progress timeline.</p>
            </div>
        `;
        return;
    }

    const token = localStorage.getItem('token');
    const container = document.getElementById('progress-content');

    try {
        const progress = await apiFetch(`/api/progress/character/${state.currentCharacter.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (progress.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <p>${escHtml(state.currentCharacter.name)} has no progress entries yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>${escHtml(state.currentCharacter.name)}'s Progress Timeline</h3>
            <div class="progress-timeline">
                ${progress.map(entry => `
                    <div class="progress-entry">
                        <h4>Session ${entry.session_id}</h4>
                        <p><strong>Date:</strong> ${new Date(entry.session_date).toLocaleDateString()}</p>
                        ${entry.feats_gained ? `<p><strong>Feats Gained:</strong> ${escHtml(entry.feats_gained)}</p>` : ''}
                        ${entry.order_chaos_shift ? `<p><strong>Order/Chaos Shift:</strong> ${entry.order_chaos_shift > 0 ? '+' : ''}${entry.order_chaos_shift}</p>` : ''}
                        ${entry.notes ? `<p>${escHtml(entry.notes)}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading progress:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load progress. Please try again.</p>
            </div>
        `;
    }
}

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, {
    closeCharacterSheet, viewCharacter, viewCharacterClaims, viewCharacterProgress,
});

// Used by other player-*.js modules.
export { loadCharacters, loadClaims, loadProgress, viewCharacter };

