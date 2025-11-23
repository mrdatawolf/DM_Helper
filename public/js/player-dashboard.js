// Player Dashboard JavaScript

let currentUser = null;
let currentCharacter = null;
let userCharacters = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication - simple check, navigation.js handles validation
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '/player-login.html';
        return;
    }

    // Get user from localStorage (already validated by navigation.js)
    try {
        currentUser = JSON.parse(userStr);

        // Display username (backup if navigation hasn't loaded yet)
        const usernameEl = document.getElementById('username-display');
        if (usernameEl) {
            usernameEl.textContent = currentUser.username;
        }

        // Load user's characters
        await loadCharacters();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Clear invalid data and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/player-login.html';
        return;
    }

    // Setup tab navigation
    setupTabs();
});

// Setup tab navigation
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific data
    if (tabName === 'claims' && currentCharacter) {
        loadClaims();
    } else if (tabName === 'progress' && currentCharacter) {
        loadProgress();
    }
}

// Load user's characters
async function loadCharacters() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('characters-list');

    try {
        const response = await fetch('/api/auth/characters', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Check if it's an authentication error
            if (response.status === 401) {
                window.location.href = '/player-login.html';
                return;
            }
            throw new Error(`Failed to load characters (${response.status})`);
        }

        const data = await response.json();
        userCharacters = data.characters || [];

        if (userCharacters.length === 0) {
            container.innerHTML = `
                <div class="info-message" style="grid-column: 1 / -1;">
                    <h3>Welcome to Your Character Dashboard!</h3>
                    <p>You don't have any characters yet. Click the "Create New Character" button above to get started!</p>
                </div>
            `;
            return;
        }

        // Render character cards
        container.innerHTML = userCharacters.map(char => `
            <div class="character-card" onclick="viewCharacter(${char.id})">
                <h3>${char.name}</h3>
                <div class="character-meta">
                    <span>${char.race}</span>
                    <span>•</span>
                    <span>${char.class_type}</span>
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
                        <div class="stat-value">${char.pattern_imprint || 'None'}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
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
        const response = await fetch(`/api/characters/${characterId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load character');
        }

        const character = await response.json();
        currentCharacter = character;

        // Show character sheet
        displayCharacterSheet(character);

    } catch (error) {
        console.error('Error loading character:', error);
        alert('Failed to load character details');
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
                <h2>${character.name}</h2>
                <p>${character.race} ${character.class_type} - Level ${character.level}</p>
            </div>
            <button class="back-button" onclick="closeCharacterSheet()">← Back to Characters</button>
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
                    <strong>Pattern Imprint:</strong> ${character.pattern_imprint || 'None'}
                </div>
                <div class="stat-display">
                    <strong>Logrus Imprint:</strong> ${character.logrus_imprint || 'None'}
                </div>
                <div class="stat-display">
                    <strong>Blood Purity:</strong> ${character.blood_purity}%
                </div>
                <div class="stat-display">
                    <strong>Trump Artist:</strong> ${character.trump_artist ? 'Yes' : 'No'}
                </div>
            </div>

            ${character.backstory ? `
                <h3>Backstory</h3>
                <div class="backstory">
                    <p>${character.backstory}</p>
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
    currentCharacter = null;
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
    if (!currentCharacter) {
        document.getElementById('claims-content').innerHTML = `
            <div class="info-message">
                <p>Select a character from "My Characters" to view and manage their claims.</p>
            </div>
        `;
        return;
    }

    const token = localStorage.getItem('token');
    const container = document.getElementById('claims-content');

    try {
        const response = await fetch(`/api/claims/character/${currentCharacter.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load claims');
        }

        const claims = await response.json();

        if (claims.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <p>${currentCharacter.name} has no attribute claims yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>${currentCharacter.name}'s Claims</h3>
            <div class="claims-list">
                ${claims.map(claim => `
                    <div class="claim-card">
                        <h4>${claim.attribute_name}</h4>
                        <p><strong>Points:</strong> ${claim.points_spent}</p>
                        <p><strong>Justification:</strong> ${claim.justification}</p>
                        <p><strong>Last Updated:</strong> ${new Date(claim.updated_at).toLocaleDateString()}</p>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading claims:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load claims. Please try again.</p>
            </div>
        `;
    }
}

// Load progress for current character
async function loadProgress() {
    if (!currentCharacter) {
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
        const response = await fetch(`/api/progress/character/${currentCharacter.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load progress');
        }

        const progress = await response.json();

        if (progress.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <p>${currentCharacter.name} has no progress entries yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>${currentCharacter.name}'s Progress Timeline</h3>
            <div class="progress-timeline">
                ${progress.map(entry => `
                    <div class="progress-entry">
                        <h4>Session ${entry.session_id}</h4>
                        <p><strong>Date:</strong> ${new Date(entry.session_date).toLocaleDateString()}</p>
                        ${entry.feats_gained ? `<p><strong>Feats Gained:</strong> ${entry.feats_gained}</p>` : ''}
                        ${entry.order_chaos_shift ? `<p><strong>Order/Chaos Shift:</strong> ${entry.order_chaos_shift > 0 ? '+' : ''}${entry.order_chaos_shift}</p>` : ''}
                        ${entry.notes ? `<p>${entry.notes}</p>` : ''}
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

// Open create character modal
function openCreateCharacter() {
    const modal = document.getElementById('create-character-modal');
    modal.classList.add('show');

    // Setup form submission
    const form = document.getElementById('create-character-form');
    form.onsubmit = handleCreateCharacter;
}

// Close create character modal
function closeCreateCharacter() {
    const modal = document.getElementById('create-character-modal');
    modal.classList.remove('show');
    document.getElementById('create-character-form').reset();
}

// Handle character creation
async function handleCreateCharacter(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';

    const characterData = {
        name: document.getElementById('char-name').value,
        race: document.getElementById('char-race').value,
        class_type: document.getElementById('char-class').value,
        level: parseInt(document.getElementById('char-level').value),
        strength: parseInt(document.getElementById('char-str').value),
        dexterity: parseInt(document.getElementById('char-dex').value),
        constitution: parseInt(document.getElementById('char-con').value),
        intelligence: parseInt(document.getElementById('char-int').value),
        wisdom: parseInt(document.getElementById('char-wis').value),
        charisma: parseInt(document.getElementById('char-cha').value),
        order_chaos_value: parseInt(document.getElementById('char-order-chaos').value),
        pattern_imprint: document.getElementById('char-pattern').value || null,
        logrus_imprint: document.getElementById('char-logrus').value || null,
        blood_purity: document.getElementById('char-blood').value,
        trump_artist: parseInt(document.getElementById('char-trump').value),
        backstory: document.getElementById('char-backstory').value || null,
        user_id: currentUser.id
    };

    try {
        const response = await fetch('/api/characters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(characterData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create character');
        }

        const newCharacter = await response.json();

        // Close modal
        closeCreateCharacter();

        // Reload characters
        await loadCharacters();

        // Show success message
        alert(`Character "${newCharacter.name}" created successfully!`);

    } catch (error) {
        console.error('Error creating character:', error);
        alert(`Failed to create character: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Character';
    }
}

// Logout
async function handleLogout() {
    const token = localStorage.getItem('token');

    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to login
    window.location.href = '/player-login.html';
}

// Show player guide
function showGuide() {
    window.open('/guide.html', '_blank');
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('create-character-modal');
    if (event.target === modal) {
        closeCreateCharacter();
    }
});
