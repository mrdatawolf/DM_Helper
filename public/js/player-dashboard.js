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
    if (tabName === 'journal') {
        loadJournalEntries();
    } else if (tabName === 'claims' && currentCharacter) {
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
            <div class="character-card">
                <div onclick="viewCharacter(${char.id})" style="cursor: pointer;">
                    <h3>${char.name}</h3>
                    <div class="character-meta">
                        <span>${char.species || char.race}</span>
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
                <div class="character-card-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); openEditCharacter(${char.id})">Edit</button>
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
                <p>${character.species || character.race} ${character.class_type} - Level ${character.level}</p>
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

    // Use the new loadCharacterClaims function
    await loadCharacterClaims(currentCharacter.id);
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
    const createModal = document.getElementById('create-character-modal');
    const journalModal = document.getElementById('journal-entry-modal');
    const editModal = document.getElementById('edit-character-modal');

    if (event.target === createModal) {
        closeCreateCharacter();
    } else if (event.target === journalModal) {
        closeJournalEntry();
    } else if (event.target === editModal) {
        closeEditCharacter();
    }
});

// ========== JOURNAL FUNCTIONS ==========

// Load journal entries
async function loadJournalEntries() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('journal-content');

    try {
        const response = await fetch('/api/journal/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load journal entries');
        }

        const data = await response.json();
        const entries = data.entries || [];

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="info-message">
                    <h3>No Journal Entries Yet</h3>
                    <p>Click "New Entry" to start documenting your character's adventures!</p>
                </div>
            `;
            return;
        }

        // Render journal entries
        container.innerHTML = `
            <div class="journal-entries">
                ${entries.map(entry => `
                    <div class="journal-entry-card">
                        <div class="entry-header">
                            <h3>${entry.title}</h3>
                            <span class="entry-meta">
                                ${entry.character_name} • ${new Date(entry.created_at).toLocaleDateString()}
                                ${entry.is_public ? '<span class="public-badge">Public</span>' : '<span class="private-badge">Private</span>'}
                            </span>
                        </div>
                        <div class="entry-content">
                            <p>${entry.content}</p>
                        </div>
                        <div class="entry-footer">
                            <small>By ${entry.author_username}</small>
                            ${entry.user_id === currentUser.id ? `
                                <button class="btn-secondary btn-sm" onclick="deleteJournalEntry(${entry.id})">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading journal entries:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load journal entries. Please try again.</p>
            </div>
        `;
    }
}

// Open new journal entry modal
function openNewJournalEntry() {
    const modal = document.getElementById('journal-entry-modal');
    const characterSelect = document.getElementById('journal-character');

    // Populate character dropdown
    characterSelect.innerHTML = '<option value="">Select a character...</option>';
    userCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name;
        characterSelect.appendChild(option);
    });

    modal.classList.add('show');

    // Setup form submission
    const form = document.getElementById('journal-entry-form');
    form.onsubmit = handleJournalSubmit;
}

// Close journal entry modal
function closeJournalEntry() {
    const modal = document.getElementById('journal-entry-modal');
    modal.classList.remove('show');
    document.getElementById('journal-entry-form').reset();
}

// Handle journal entry submission
async function handleJournalSubmit(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    // Get elements and check if they exist
    const characterElement = document.getElementById('journal-character');
    const titleElement = document.getElementById('journal-title');
    const contentElement = document.getElementById('journal-entry-content');

    console.log('Elements found:', {
        characterElement: !!characterElement,
        titleElement: !!titleElement,
        contentElement: !!contentElement,
        contentElementValue: contentElement?.value
    });

    const characterId = parseInt(characterElement?.value || '');
    const title = titleElement?.value || '';
    const content = contentElement?.value || '';

    console.log('Form values:', {
        characterId,
        title,
        content,
        titleLength: title?.length,
        contentLength: content?.length
    });

    // Client-side validation
    if (!characterId || isNaN(characterId)) {
        alert('Please select a character');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!title || title.trim() === '') {
        alert('Please enter a title');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!content || content.trim() === '') {
        alert('Please enter content for the journal entry');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    const entryData = {
        character_id: characterId,
        title: title.trim(),
        content: content.trim(),
        is_public: document.getElementById('journal-visibility').checked ? 1 : 0
    };

    console.log('Sending journal entry data:', entryData);

    try {
        const response = await fetch('/api/journal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create journal entry');
        }

        // Close modal
        closeJournalEntry();

        // Reload journal entries
        await loadJournalEntries();

        // Show success message
        alert('Journal entry saved successfully!');

    } catch (error) {
        console.error('Error creating journal entry:', error);
        alert(`Failed to save journal entry: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
    }
}

// Delete journal entry
async function deleteJournalEntry(entryId) {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/journal/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete journal entry');
        }

        // Reload journal entries
        await loadJournalEntries();

        alert('Journal entry deleted successfully!');

    } catch (error) {
        console.error('Error deleting journal entry:', error);
        alert(`Failed to delete journal entry: ${error.message}`);
    }
}

// ========== CHARACTER EDIT FUNCTIONS ==========

// Open edit character view
async function openEditCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        // Fetch full character data
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

        // Display edit form in character-details div
        displayCharacterEditForm(character);

    } catch (error) {
        console.error('Error loading character for edit:', error);
        alert('Failed to load character data');
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
                <h2>Edit: ${character.name}</h2>
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
    currentCharacter = null;
}

// Generate Basic Info Tab HTML
function generateBasicInfoTab(char) {
    return `
        <div id="edit-tab-basic" class="char-edit-tab active">
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-name">Character Name *</label>
                    <input type="text" id="edit-char-name" required value="${char.name || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-species">Species *</label>
                    <input type="text" id="edit-char-species" required value="${char.species || char.race || ''}" placeholder="Human, Elf, Dwarf, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-class">Class *</label>
                    <input type="text" id="edit-char-class" required value="${char.class_type || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-subclass">Subclass</label>
                    <input type="text" id="edit-char-subclass" value="${char.subclass || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-char-level">Level</label>
                    <input type="number" id="edit-char-level" min="1" max="20" value="${char.level || 1}">
                </div>
                <div class="form-group">
                    <label for="edit-char-background">Background</label>
                    <input type="text" id="edit-char-background" value="${char.background || ''}" placeholder="Soldier, Noble, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-size">Size</label>
                    <select id="edit-char-size">
                        <option value="Tiny" ${char.size === 'Tiny' ? 'selected' : ''}>Tiny</option>
                        <option value="Small" ${char.size === 'Small' ? 'selected' : ''}>Small</option>
                        <option value="Medium" ${char.size === 'Medium' || !char.size ? 'selected' : ''}>Medium</option>
                        <option value="Large" ${char.size === 'Large' ? 'selected' : ''}>Large</option>
                        <option value="Huge" ${char.size === 'Huge' ? 'selected' : ''}>Huge</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-char-speed">Speed (ft)</label>
                    <input type="number" id="edit-char-speed" value="${char.speed || 30}" min="0">
                </div>
                <div class="form-group">
                    <label for="edit-char-xp">Experience Points</label>
                    <input type="number" id="edit-char-xp" value="${char.experience_points || 0}" min="0">
                </div>

                <!-- Amber-Specific Fields -->
                <div class="form-group">
                    <label for="edit-char-order-chaos">Order/Chaos Balance</label>
                    <input type="number" id="edit-char-order-chaos" value="${char.order_chaos_value || 50}" min="0" max="100">
                    <small>0 = Pure Chaos, 50 = Neutral, 100 = Pure Order</small>
                </div>
                <div class="form-group">
                    <label for="edit-char-blood">Blood Purity</label>
                    <select id="edit-char-blood">
                        <option value="">None</option>
                        <option value="Half" ${char.blood_purity === 'Half' ? 'selected' : ''}>Half</option>
                        <option value="Pure" ${char.blood_purity === 'Pure' ? 'selected' : ''}>Pure</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-pattern" ${char.pattern_imprint ? 'checked' : ''}>
                        Has Pattern Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-logrus" ${char.logrus_imprint ? 'checked' : ''}>
                        Has Logrus Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-trump" ${char.trump_artist ? 'checked' : ''}>
                        Trump Artist
                    </label>
                </div>
            </div>
        </div>
    `;
}

// Generate Abilities & Skills Tab HTML
function generateAbilitiesTab(char) {
    return `
        <div id="edit-tab-abilities" class="char-edit-tab" style="display: none;">
            <h4>Ability Scores</h4>
            <div class="form-grid abilities">
                <div class="form-group">
                    <label for="edit-char-str">Strength</label>
                    <input type="number" id="edit-char-str" min="1" max="30" value="${char.strength || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-dex">Dexterity</label>
                    <input type="number" id="edit-char-dex" min="1" max="30" value="${char.dexterity || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-con">Constitution</label>
                    <input type="number" id="edit-char-con" min="1" max="30" value="${char.constitution || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-int">Intelligence</label>
                    <input type="number" id="edit-char-int" min="1" max="30" value="${char.intelligence || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-wis">Wisdom</label>
                    <input type="number" id="edit-char-wis" min="1" max="30" value="${char.wisdom || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-cha">Charisma</label>
                    <input type="number" id="edit-char-cha" min="1" max="30" value="${char.charisma || 10}">
                </div>
            </div>

            <h4>Saving Throws</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-str" ${char.save_strength ? 'checked' : ''}> Strength</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-dex" ${char.save_dexterity ? 'checked' : ''}> Dexterity</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-con" ${char.save_constitution ? 'checked' : ''}> Constitution</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-int" ${char.save_intelligence ? 'checked' : ''}> Intelligence</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-wis" ${char.save_wisdom ? 'checked' : ''}> Wisdom</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-cha" ${char.save_charisma ? 'checked' : ''}> Charisma</label>
                </div>
            </div>

            <h4>Skills (Proficiency Level: 0=None, 1=Proficient, 2=Expertise)</h4>
            <div class="skills-grid">
                ${generateSkillSelect('acrobatics', 'Acrobatics (DEX)', char.skill_acrobatics || 0)}
                ${generateSkillSelect('animal-handling', 'Animal Handling (WIS)', char.skill_animal_handling || 0)}
                ${generateSkillSelect('arcana', 'Arcana (INT)', char.skill_arcana || 0)}
                ${generateSkillSelect('athletics', 'Athletics (STR)', char.skill_athletics || 0)}
                ${generateSkillSelect('deception', 'Deception (CHA)', char.skill_deception || 0)}
                ${generateSkillSelect('history', 'History (INT)', char.skill_history || 0)}
                ${generateSkillSelect('insight', 'Insight (WIS)', char.skill_insight || 0)}
                ${generateSkillSelect('intimidation', 'Intimidation (CHA)', char.skill_intimidation || 0)}
                ${generateSkillSelect('investigation', 'Investigation (INT)', char.skill_investigation || 0)}
                ${generateSkillSelect('medicine', 'Medicine (WIS)', char.skill_medicine || 0)}
                ${generateSkillSelect('nature', 'Nature (INT)', char.skill_nature || 0)}
                ${generateSkillSelect('perception', 'Perception (WIS)', char.skill_perception || 0)}
                ${generateSkillSelect('performance', 'Performance (CHA)', char.skill_performance || 0)}
                ${generateSkillSelect('persuasion', 'Persuasion (CHA)', char.skill_persuasion || 0)}
                ${generateSkillSelect('religion', 'Religion (INT)', char.skill_religion || 0)}
                ${generateSkillSelect('sleight-of-hand', 'Sleight of Hand (DEX)', char.skill_sleight_of_hand || 0)}
                ${generateSkillSelect('stealth', 'Stealth (DEX)', char.skill_stealth || 0)}
                ${generateSkillSelect('survival', 'Survival (WIS)', char.skill_survival || 0)}
            </div>
        </div>
    `;
}

// Helper function to generate skill select dropdowns
function generateSkillSelect(skillId, label, value) {
    return `
        <div class="form-group">
            <label for="edit-skill-${skillId}">${label}</label>
            <select id="edit-skill-${skillId}">
                <option value="0" ${value === 0 ? 'selected' : ''}>Not Proficient</option>
                <option value="1" ${value === 1 ? 'selected' : ''}>Proficient</option>
                <option value="2" ${value === 2 ? 'selected' : ''}>Expertise</option>
            </select>
        </div>
    `;
}

// Generate Combat & HP Tab HTML
function generateCombatTab(char) {
    return `
        <div id="edit-tab-combat" class="char-edit-tab" style="display: none;">
            <h4>Hit Points & Death Saves</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-max-hp">Max Hit Points</label>
                    <input type="number" id="edit-char-max-hp" min="1" value="${char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-current-hp">Current Hit Points</label>
                    <input type="number" id="edit-char-current-hp" min="0" value="${char.current_hp || char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-temp-hp">Temporary Hit Points</label>
                    <input type="number" id="edit-char-temp-hp" min="0" value="${char.temp_hit_points || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-hit-dice">Hit Dice (e.g., 5d8)</label>
                    <input type="text" id="edit-char-hit-dice" value="${char.hit_dice_total || '1d8'}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-successes">Death Save Successes</label>
                    <input type="number" id="edit-char-death-successes" min="0" max="3" value="${char.death_save_successes || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-failures">Death Save Failures</label>
                    <input type="number" id="edit-char-death-failures" min="0" max="3" value="${char.death_save_failures || 0}">
                </div>
            </div>

            <h4>Combat Stats</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-ac">Armor Class</label>
                    <input type="number" id="edit-char-ac" min="0" value="${char.armor_class || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-initiative">Initiative Bonus</label>
                    <input type="number" id="edit-char-initiative" value="${char.initiative_bonus || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-proficiency">Proficiency Bonus</label>
                    <input type="number" id="edit-char-proficiency" min="2" max="6" value="${char.proficiency_bonus || 2}">
                </div>
                <div class="form-group">
                    <label for="edit-char-passive-perception">Passive Perception</label>
                    <input type="number" id="edit-char-passive-perception" value="${char.passive_perception || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-inspiration">Heroic Inspiration</label>
                    <input type="number" id="edit-char-inspiration" min="0" value="${char.heroic_inspiration || 0}">
                </div>
            </div>

            <h4>Armor & Weapon Proficiencies</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-light" ${char.armor_light ? 'checked' : ''}> Light Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-medium" ${char.armor_medium ? 'checked' : ''}> Medium Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-heavy" ${char.armor_heavy ? 'checked' : ''}> Heavy Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-shields" ${char.armor_shields ? 'checked' : ''}> Shields</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-simple" ${char.weapons_simple ? 'checked' : ''}> Simple Weapons</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-martial" ${char.weapons_martial ? 'checked' : ''}> Martial Weapons</label>
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-tools">Tool Proficiencies</label>
                <textarea id="edit-char-tools" rows="2" placeholder="Comma-separated list, e.g., Thieves' Tools, Smith's Tools">${char.tools_proficiency || ''}</textarea>
            </div>
        </div>
    `;
}

// Generate Spells Tab HTML
function generateSpellsTab(char) {
    return `
        <div id="edit-tab-spells" class="char-edit-tab" style="display: none;">
            <h4>Spellcasting</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-spellcasting-ability">Spellcasting Ability</label>
                    <select id="edit-spellcasting-ability">
                        <option value="">None</option>
                        <option value="INT" ${char.spellcasting_ability === 'INT' ? 'selected' : ''}>Intelligence</option>
                        <option value="WIS" ${char.spellcasting_ability === 'WIS' ? 'selected' : ''}>Wisdom</option>
                        <option value="CHA" ${char.spellcasting_ability === 'CHA' ? 'selected' : ''}>Charisma</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-spell-save-dc">Spell Save DC</label>
                    <input type="number" id="edit-spell-save-dc" min="0" value="${char.spell_save_dc || 8}">
                </div>
                <div class="form-group">
                    <label for="edit-spell-attack-bonus">Spell Attack Bonus</label>
                    <input type="number" id="edit-spell-attack-bonus" value="${char.spell_attack_bonus || 0}">
                </div>
            </div>

            <h4>Spell Slots</h4>
            <div class="spell-slots-grid">
                ${generateSpellSlotRow(1, char)}
                ${generateSpellSlotRow(2, char)}
                ${generateSpellSlotRow(3, char)}
                ${generateSpellSlotRow(4, char)}
                ${generateSpellSlotRow(5, char)}
                ${generateSpellSlotRow(6, char)}
                ${generateSpellSlotRow(7, char)}
                ${generateSpellSlotRow(8, char)}
                ${generateSpellSlotRow(9, char)}
            </div>

            <p><em>Note: Detailed spell management (prepared spells, cantrips) will be added in a future update.</em></p>
        </div>
    `;
}

// Helper to generate spell slot row
function generateSpellSlotRow(level, char) {
    const total = char[`spell_slots_${level}_total`] || 0;
    const used = char[`spell_slots_${level}_expended`] || 0;
    return `
        <div class="form-group">
            <label>Level ${level}</label>
            <input type="number" id="edit-slots-${level}-total" min="0" placeholder="Total" value="${total}" style="width: 60px;">
            <input type="number" id="edit-slots-${level}-used" min="0" placeholder="Used" value="${used}" style="width: 60px;">
        </div>
    `;
}

// Generate Equipment Tab HTML
function generateEquipmentTab(char) {
    return `
        <div id="edit-tab-equipment" class="char-edit-tab" style="display: none;">
            <h4>Currency</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-copper">Copper Pieces (CP)</label>
                    <input type="number" id="edit-copper" min="0" value="${char.copper_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-silver">Silver Pieces (SP)</label>
                    <input type="number" id="edit-silver" min="0" value="${char.silver_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-electrum">Electrum Pieces (EP)</label>
                    <input type="number" id="edit-electrum" min="0" value="${char.electrum_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-gold">Gold Pieces (GP)</label>
                    <input type="number" id="edit-gold" min="0" value="${char.gold_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-platinum">Platinum Pieces (PP)</label>
                    <input type="number" id="edit-platinum" min="0" value="${char.platinum_pieces || 0}">
                </div>
            </div>

            <h4>Magic Item Attunement</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-attunement-used">Slots Used</label>
                    <input type="number" id="edit-attunement-used" min="0" max="3" value="${char.attunement_slots_used || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-attunement-max">Max Slots</label>
                    <input type="number" id="edit-attunement-max" min="0" max="6" value="${char.attunement_slots_max || 3}">
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-languages">Languages</label>
                <textarea id="edit-char-languages" rows="2" placeholder="Common, Elvish, Draconic, etc.">${char.languages || ''}</textarea>
                <small>Comma-separated list</small>
            </div>

            <p><em>Note: Detailed equipment, weapons, and gear are managed in the main Characters tab.</em></p>
        </div>
    `;
}

// Generate Features & Traits Tab HTML
function generateFeaturesTab(char) {
    return `
        <div id="edit-tab-features" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-class-features">Class Features</label>
                <textarea id="edit-char-class-features" rows="6" placeholder="List your class features here...">${char.class_features || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-species-traits">Species Traits</label>
                <textarea id="edit-char-species-traits" rows="6" placeholder="List your species traits here...">${char.species_traits || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-feats">Feats</label>
                <textarea id="edit-char-feats" rows="6" placeholder="List your feats here...">${char.feats || ''}</textarea>
            </div>
        </div>
    `;
}

// Generate Appearance & Story Tab HTML
function generateDetailsTab(char) {
    return `
        <div id="edit-tab-details" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-appearance">Appearance</label>
                <textarea id="edit-char-appearance" rows="4" placeholder="Describe your character's physical appearance...">${char.appearance || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-personality">Personality & Traits</label>
                <textarea id="edit-char-personality" rows="4" placeholder="Describe your character's personality...">${char.personality || ''}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-backstory">Backstory</label>
                <textarea id="edit-char-backstory" rows="6" placeholder="Tell your character's story...">${char.backstory || ''}</textarea>
            </div>
        </div>
    `;
}

// Switch tabs within character edit view
function switchCharEditTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.char-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.char-edit-tab').forEach(content => {
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(`edit-tab-${tabName}`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
}

// Populate edit form with character data
function populateEditForm(character) {
    // Basic Info
    document.getElementById('edit-char-name').value = character.name || '';
    document.getElementById('edit-char-species').value = character.species || character.race || '';
    document.getElementById('edit-char-class').value = character.class_type || '';
    document.getElementById('edit-char-subclass').value = character.subclass || '';
    document.getElementById('edit-char-level').value = character.level || 1;
    document.getElementById('edit-char-background').value = character.background || '';
    document.getElementById('edit-char-size').value = character.size || 'Medium';
    document.getElementById('edit-char-speed').value = character.speed || 30;
    document.getElementById('edit-char-xp').value = character.experience_points || 0;

    // Amber-specific
    document.getElementById('edit-char-order-chaos').value = character.order_chaos_value || 50;
    document.getElementById('edit-char-blood').value = character.blood_purity || '';
    document.getElementById('edit-char-pattern').checked = !!character.pattern_imprint;
    document.getElementById('edit-char-logrus').checked = !!character.logrus_imprint;
    document.getElementById('edit-char-trump').checked = !!character.trump_artist;

    // Ability Scores
    document.getElementById('edit-char-str').value = character.strength || 10;
    document.getElementById('edit-char-dex').value = character.dexterity || 10;
    document.getElementById('edit-char-con').value = character.constitution || 10;
    document.getElementById('edit-char-int').value = character.intelligence || 10;
    document.getElementById('edit-char-wis').value = character.wisdom || 10;
    document.getElementById('edit-char-cha').value = character.charisma || 10;

    // Saving Throws
    document.getElementById('edit-save-str').checked = character.save_strength || false;
    document.getElementById('edit-save-dex').checked = character.save_dexterity || false;
    document.getElementById('edit-save-con').checked = character.save_constitution || false;
    document.getElementById('edit-save-int').checked = character.save_intelligence || false;
    document.getElementById('edit-save-wis').checked = character.save_wisdom || false;
    document.getElementById('edit-save-cha').checked = character.save_charisma || false;

    // Skills (18 skills)
    const skills = [
        'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception',
        'history', 'insight', 'intimidation', 'investigation', 'medicine',
        'nature', 'perception', 'performance', 'persuasion', 'religion',
        'sleight-of-hand', 'stealth', 'survival'
    ];
    skills.forEach(skill => {
        const dbSkill = skill.replace(/-/g, '_');
        const element = document.getElementById(`edit-skill-${skill}`);
        if (element) {
            element.value = character[`skill_${dbSkill}`] || 0;
        }
    });

    // Combat & HP
    document.getElementById('edit-char-max-hp').value = character.max_hp || 10;
    document.getElementById('edit-char-current-hp').value = character.current_hp || character.max_hp || 10;
    document.getElementById('edit-char-temp-hp').value = character.temp_hit_points || 0;
    document.getElementById('edit-char-hit-dice').value = character.hit_dice_total || '1d8';
    document.getElementById('edit-char-death-successes').value = character.death_save_successes || 0;
    document.getElementById('edit-char-death-failures').value = character.death_save_failures || 0;
    document.getElementById('edit-char-ac').value = character.armor_class || 10;
    document.getElementById('edit-char-initiative').value = character.initiative_bonus || 0;
    document.getElementById('edit-char-proficiency').value = character.proficiency_bonus || 2;
    document.getElementById('edit-char-passive-perception').value = character.passive_perception || 10;
    document.getElementById('edit-char-inspiration').value = character.heroic_inspiration || 0;

    // Armor & Weapon Proficiencies
    document.getElementById('edit-armor-light').checked = character.armor_light || false;
    document.getElementById('edit-armor-medium').checked = character.armor_medium || false;
    document.getElementById('edit-armor-heavy').checked = character.armor_heavy || false;
    document.getElementById('edit-armor-shields').checked = character.armor_shields || false;
    document.getElementById('edit-weapons-simple').checked = character.weapons_simple || false;
    document.getElementById('edit-weapons-martial').checked = character.weapons_martial || false;
    document.getElementById('edit-char-tools').value = character.tools_proficiency || '';

    // Equipment & Currency
    document.getElementById('edit-copper').value = character.copper_pieces || 0;
    document.getElementById('edit-silver').value = character.silver_pieces || 0;
    document.getElementById('edit-electrum').value = character.electrum_pieces || 0;
    document.getElementById('edit-gold').value = character.gold_pieces || 0;
    document.getElementById('edit-platinum').value = character.platinum_pieces || 0;
    document.getElementById('edit-attunement-used').value = character.attunement_slots_used || 0;
    document.getElementById('edit-attunement-max').value = character.attunement_slots_max || 3;
    document.getElementById('edit-char-languages').value = character.languages || '';

    // Features & Traits
    document.getElementById('edit-char-class-features').value = character.class_features || '';
    document.getElementById('edit-char-species-traits').value = character.species_traits || '';
    document.getElementById('edit-char-feats').value = character.feats || '';

    // Appearance & Story
    document.getElementById('edit-char-appearance').value = character.appearance || '';
    document.getElementById('edit-char-personality').value = character.personality || '';
    document.getElementById('edit-char-backstory').value = character.backstory || '';

    // Spells
    document.getElementById('edit-spellcasting-ability').value = character.spellcasting_ability || '';
    document.getElementById('edit-spell-save-dc').value = character.spell_save_dc || 8;
    document.getElementById('edit-spell-attack-bonus').value = character.spell_attack_bonus || 0;

    // Spell Slots (levels 1-9)
    for (let i = 1; i <= 9; i++) {
        document.getElementById(`edit-slots-${i}-total`).value = character[`spell_slots_${i}_total`] || 0;
        document.getElementById(`edit-slots-${i}-used`).value = character[`spell_slots_${i}_expended`] || 0;
    }
}

// Handle character edit submission
async function handleEditCharacter(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    // Gather all form data
    const characterData = {
        // Basic Info
        name: document.getElementById('edit-char-name').value,
        species: document.getElementById('edit-char-species').value,
        class_type: document.getElementById('edit-char-class').value,
        subclass: document.getElementById('edit-char-subclass').value || null,
        level: parseInt(document.getElementById('edit-char-level').value),
        background: document.getElementById('edit-char-background').value || null,
        size: document.getElementById('edit-char-size').value,
        speed: parseInt(document.getElementById('edit-char-speed').value),
        experience_points: parseInt(document.getElementById('edit-char-xp').value),

        // Amber-specific
        order_chaos_value: parseInt(document.getElementById('edit-char-order-chaos').value),
        blood_purity: document.getElementById('edit-char-blood').value || null,
        pattern_imprint: document.getElementById('edit-char-pattern').checked ? 1 : 0,
        logrus_imprint: document.getElementById('edit-char-logrus').checked ? 1 : 0,
        trump_artist: document.getElementById('edit-char-trump').checked ? 1 : 0,

        // Ability Scores
        strength: parseInt(document.getElementById('edit-char-str').value),
        dexterity: parseInt(document.getElementById('edit-char-dex').value),
        constitution: parseInt(document.getElementById('edit-char-con').value),
        intelligence: parseInt(document.getElementById('edit-char-int').value),
        wisdom: parseInt(document.getElementById('edit-char-wis').value),
        charisma: parseInt(document.getElementById('edit-char-cha').value),

        // Saving Throws
        save_strength: document.getElementById('edit-save-str').checked ? 1 : 0,
        save_dexterity: document.getElementById('edit-save-dex').checked ? 1 : 0,
        save_constitution: document.getElementById('edit-save-con').checked ? 1 : 0,
        save_intelligence: document.getElementById('edit-save-int').checked ? 1 : 0,
        save_wisdom: document.getElementById('edit-save-wis').checked ? 1 : 0,
        save_charisma: document.getElementById('edit-save-cha').checked ? 1 : 0,

        // Skills
        skill_acrobatics: parseInt(document.getElementById('edit-skill-acrobatics').value),
        skill_animal_handling: parseInt(document.getElementById('edit-skill-animal-handling').value),
        skill_arcana: parseInt(document.getElementById('edit-skill-arcana').value),
        skill_athletics: parseInt(document.getElementById('edit-skill-athletics').value),
        skill_deception: parseInt(document.getElementById('edit-skill-deception').value),
        skill_history: parseInt(document.getElementById('edit-skill-history').value),
        skill_insight: parseInt(document.getElementById('edit-skill-insight').value),
        skill_intimidation: parseInt(document.getElementById('edit-skill-intimidation').value),
        skill_investigation: parseInt(document.getElementById('edit-skill-investigation').value),
        skill_medicine: parseInt(document.getElementById('edit-skill-medicine').value),
        skill_nature: parseInt(document.getElementById('edit-skill-nature').value),
        skill_perception: parseInt(document.getElementById('edit-skill-perception').value),
        skill_performance: parseInt(document.getElementById('edit-skill-performance').value),
        skill_persuasion: parseInt(document.getElementById('edit-skill-persuasion').value),
        skill_religion: parseInt(document.getElementById('edit-skill-religion').value),
        skill_sleight_of_hand: parseInt(document.getElementById('edit-skill-sleight-of-hand').value),
        skill_stealth: parseInt(document.getElementById('edit-skill-stealth').value),
        skill_survival: parseInt(document.getElementById('edit-skill-survival').value),

        // Combat & HP
        max_hp: parseInt(document.getElementById('edit-char-max-hp').value),
        current_hp: parseInt(document.getElementById('edit-char-current-hp').value),
        temp_hit_points: parseInt(document.getElementById('edit-char-temp-hp').value),
        hit_dice_total: document.getElementById('edit-char-hit-dice').value,
        death_save_successes: parseInt(document.getElementById('edit-char-death-successes').value),
        death_save_failures: parseInt(document.getElementById('edit-char-death-failures').value),
        armor_class: parseInt(document.getElementById('edit-char-ac').value),
        initiative_bonus: parseInt(document.getElementById('edit-char-initiative').value),
        proficiency_bonus: parseInt(document.getElementById('edit-char-proficiency').value),
        passive_perception: parseInt(document.getElementById('edit-char-passive-perception').value),
        heroic_inspiration: parseInt(document.getElementById('edit-char-inspiration').value),

        // Armor & Weapon Proficiencies
        armor_light: document.getElementById('edit-armor-light').checked ? 1 : 0,
        armor_medium: document.getElementById('edit-armor-medium').checked ? 1 : 0,
        armor_heavy: document.getElementById('edit-armor-heavy').checked ? 1 : 0,
        armor_shields: document.getElementById('edit-armor-shields').checked ? 1 : 0,
        weapons_simple: document.getElementById('edit-weapons-simple').checked ? 1 : 0,
        weapons_martial: document.getElementById('edit-weapons-martial').checked ? 1 : 0,
        tools_proficiency: document.getElementById('edit-char-tools').value || null,

        // Equipment & Currency
        copper_pieces: parseInt(document.getElementById('edit-copper').value),
        silver_pieces: parseInt(document.getElementById('edit-silver').value),
        electrum_pieces: parseInt(document.getElementById('edit-electrum').value),
        gold_pieces: parseInt(document.getElementById('edit-gold').value),
        platinum_pieces: parseInt(document.getElementById('edit-platinum').value),
        attunement_slots_used: parseInt(document.getElementById('edit-attunement-used').value),
        attunement_slots_max: parseInt(document.getElementById('edit-attunement-max').value),
        languages: document.getElementById('edit-char-languages').value || null,

        // Features & Traits
        class_features: document.getElementById('edit-char-class-features').value || null,
        species_traits: document.getElementById('edit-char-species-traits').value || null,
        feats: document.getElementById('edit-char-feats').value || null,

        // Appearance & Story
        appearance: document.getElementById('edit-char-appearance').value || null,
        personality: document.getElementById('edit-char-personality').value || null,
        backstory: document.getElementById('edit-char-backstory').value || null,

        // Spells
        spellcasting_ability: document.getElementById('edit-spellcasting-ability').value || null,
        spell_save_dc: parseInt(document.getElementById('edit-spell-save-dc').value),
        spell_attack_bonus: parseInt(document.getElementById('edit-spell-attack-bonus').value),

        // Spell Slots (1-9)
        spell_slots_1_total: parseInt(document.getElementById('edit-slots-1-total').value),
        spell_slots_1_expended: parseInt(document.getElementById('edit-slots-1-used').value),
        spell_slots_2_total: parseInt(document.getElementById('edit-slots-2-total').value),
        spell_slots_2_expended: parseInt(document.getElementById('edit-slots-2-used').value),
        spell_slots_3_total: parseInt(document.getElementById('edit-slots-3-total').value),
        spell_slots_3_expended: parseInt(document.getElementById('edit-slots-3-used').value),
        spell_slots_4_total: parseInt(document.getElementById('edit-slots-4-total').value),
        spell_slots_4_expended: parseInt(document.getElementById('edit-slots-4-used').value),
        spell_slots_5_total: parseInt(document.getElementById('edit-slots-5-total').value),
        spell_slots_5_expended: parseInt(document.getElementById('edit-slots-5-used').value),
        spell_slots_6_total: parseInt(document.getElementById('edit-slots-6-total').value),
        spell_slots_6_expended: parseInt(document.getElementById('edit-slots-6-used').value),
        spell_slots_7_total: parseInt(document.getElementById('edit-slots-7-total').value),
        spell_slots_7_expended: parseInt(document.getElementById('edit-slots-7-used').value),
        spell_slots_8_total: parseInt(document.getElementById('edit-slots-8-total').value),
        spell_slots_8_expended: parseInt(document.getElementById('edit-slots-8-used').value),
        spell_slots_9_total: parseInt(document.getElementById('edit-slots-9-total').value),
        spell_slots_9_expended: parseInt(document.getElementById('edit-slots-9-used').value)
    };

    try {
        const response = await fetch(`/api/characters/${currentCharacter.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(characterData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update character');
        }

        // Close modal
        closeEditCharacter();

        // Reload characters
        await loadCharacters();

        // If viewing character sheet, reload it
        if (document.getElementById('character-details').style.display === 'block') {
            await viewCharacter(currentCharacter.id);
        }

        // Show success message
        alert('Character updated successfully!');

    } catch (error) {
        console.error('Error updating character:', error);
        alert(`Failed to update character: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
}

// ========== CLAIMS FUNCTIONS ==========

const commonAttributes = [
    'Strength', 'Speed', 'Combat', 'Stealth', 'Intelligence',
    'Persuasion', 'Endurance', 'Archery', 'Swordsmanship', 'Magic',
    'Perception', 'Charisma', 'Wisdom', 'Leadership', 'Tactics'
];

let claimPool = null;
let currentClaims = {};
let claimSelectedCharacter = null;

// Load claims for selected character
async function loadCharacterClaims(characterId) {
    const token = localStorage.getItem('token');
    claimSelectedCharacter = characterId;

    try {
        // Load claim pool
        const poolResponse = await fetch(`/api/claims/pool/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (poolResponse.ok) {
            claimPool = await poolResponse.json();
        } else {
            // No pool exists yet
            claimPool = { total_points: 10, spent_points: 0 };
        }

        // Load existing claims
        const claimsResponse = await fetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const claims = await claimsResponse.json();

        currentClaims = {};
        claims.forEach(claim => {
            currentClaims[claim.attribute_name] = claim;
        });

        displayClaimsInterface();

    } catch (error) {
        console.error('Error loading claims:', error);
        const container = document.getElementById('claims-content');
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load claims: ${error.message}</p>
            </div>
        `;
    }
}

// Display claims interface
function displayClaimsInterface() {
    const container = document.getElementById('claims-content');

    const character = allCharacters.find(c => c.id === claimSelectedCharacter);
    if (!character) return;

    const availablePoints = claimPool.total_points - claimPool.spent_points;

    container.innerHTML = `
        <div class="info-box" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid var(--primary);">
            <h4 style="margin-top: 0;">How Attribute Claims Work:</h4>
            <ul>
                <li>Spend claim points to assert you're the best at specific attributes</li>
                <li>You get <strong>+1 bonus</strong> on rolls for claimed attributes</li>
                <li>The character who invests the most points in an attribute is secretly the best</li>
                <li>Provide justification for your claims based on your backstory and abilities</li>
            </ul>
        </div>

        <div class="point-pool" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">Available Claim Points</h2>
            <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">${availablePoints}</div>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 14px;">
                <div><strong>Total:</strong> ${claimPool.total_points}</div>
                <div><strong>Spent:</strong> ${claimPool.spent_points}</div>
            </div>
        </div>

        <h3>Your Claims for ${character.name}</h3>
        <div class="claims-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
            ${commonAttributes.map(attr => {
                const claim = currentClaims[attr];
                return `
                    <div class="claim-card" style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${claim ? 'border-left: 4px solid var(--success);' : ''}">
                        <h3 style="margin: 0 0 15px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>${attr}</span>
                            ${claim ?
                                `<span style="background: var(--success); color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">${claim.points_spent} pts</span>` :
                                '<span style="color: #999; font-style: italic; font-size: 14px;">No claim</span>'}
                        </h3>
                        ${claim ? `
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px; margin: 10px 0; font-style: italic;">
                                "${claim.justification}"
                            </div>
                        ` : ''}
                        ${availablePoints > 0 ? `
                            <button class="btn-primary" style="width: 100%; padding: 10px; margin-top: 10px;" onclick="openClaimModal('${attr}')">
                                ${claim ? 'Add More Points' : 'Make Claim'}
                            </button>
                        ` : (!claim ? `
                            <p style="text-align: center; color: #999; font-size: 14px; margin-top: 10px;">
                                No points available
                            </p>
                        ` : '')}
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Claim Modal -->
        <div id="claim-modal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
            <div class="modal-content" style="background: white; margin: 5% auto; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h2 id="claim-modal-title" style="margin-top: 0; color: var(--primary);">Add Points to Claim</h2>

                <form id="claim-form">
                    <input type="hidden" id="modal-attribute">

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="points-to-add">Points to Add:</label>
                        <input type="number" id="points-to-add" min="1" max="${availablePoints}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        <small>Available: <span id="modal-available-points">${availablePoints}</span> points</small>
                    </div>

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="claim-justification">Justification: *</label>
                        <textarea id="claim-justification" required placeholder="Explain why your character is the best at this attribute. Reference your backstory, training, or natural abilities..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 100px; resize: vertical; font-family: inherit;"></textarea>
                    </div>

                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn-secondary" onclick="closeClaimModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Points</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Setup claim form submission
    const form = document.getElementById('claim-form');
    form.onsubmit = handleClaimSubmit;
}

// Open claim modal
function openClaimModal(attribute) {
    const claim = currentClaims[attribute];
    const availablePoints = claimPool.total_points - claimPool.spent_points;

    document.getElementById('claim-modal-title').textContent = claim ?
        `Add Points to ${attribute}` :
        `Claim to be Best at ${attribute}`;

    document.getElementById('modal-attribute').value = attribute;
    document.getElementById('modal-available-points').textContent = availablePoints;
    document.getElementById('points-to-add').max = availablePoints;
    document.getElementById('points-to-add').value = Math.min(1, availablePoints);

    if (claim) {
        document.getElementById('claim-justification').value = claim.justification;
    } else {
        document.getElementById('claim-justification').value = '';
    }

    document.getElementById('claim-modal').style.display = 'flex';
    document.getElementById('claim-modal').style.justifyContent = 'center';
    document.getElementById('claim-modal').style.alignItems = 'center';
}

// Close claim modal
function closeClaimModal() {
    document.getElementById('claim-modal').style.display = 'none';
    document.getElementById('claim-form').reset();
}

// Handle claim form submission
async function handleClaimSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    const attribute = document.getElementById('modal-attribute').value;
    const pointsToAdd = parseInt(document.getElementById('points-to-add').value);
    const justification = document.getElementById('claim-justification').value;

    try {
        const response = await fetch('/api/claims/allocate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                character_id: claimSelectedCharacter,
                attribute_name: attribute,
                points_to_add: pointsToAdd,
                justification: justification
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to allocate points');
        }

        // Reload claims
        await loadCharacterClaims(claimSelectedCharacter);
        closeClaimModal();

        alert('Claim points allocated successfully!');

    } catch (error) {
        console.error('Error allocating points:', error);
        alert('Failed to allocate points: ' + error.message);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.id === 'claim-modal') {
        closeClaimModal();
    }
});

// ============================================
// DICE ROLLER FUNCTIONALITY
// ============================================

// Dice Roller State
let diceSelectedCharacter = null;
let diceSelectedSystem = 'd20'; // Default to d20
let diceSelectedAttribute = null;
let diceCharacterClaims = {};
let rollHistory = [];

// commonAttributes is already declared above in CLAIMS FUNCTIONS section

// Initialize dice roller when tab is loaded
function initDiceRoller() {
    loadDiceCharacters();

    // Set up character selection listener
    document.getElementById('dice-character-select').addEventListener('change', (e) => {
        const characterId = e.target.value;
        if (characterId) {
            diceSelectedCharacter = parseInt(characterId);
            loadDiceCharacterData(characterId);
        } else {
            diceSelectedCharacter = null;
            hideDiceSections();
        }
    });
}

// Load characters for dice roller
async function loadDiceCharacters() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const characters = await response.json();
        const select = document.getElementById('dice-character-select');

        select.innerHTML = '<option value="">Choose a character...</option>';
        characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = char.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

// Load character data and claims for dice rolling
async function loadDiceCharacterData(characterId) {
    const token = localStorage.getItem('token');

    try {
        // Load character's claims
        const claimsResponse = await fetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const claims = await claimsResponse.json();
        diceCharacterClaims = {};
        claims.forEach(claim => {
            diceCharacterClaims[claim.attribute_name] = claim;
        });

        // Show dice system selection
        document.getElementById('dice-system-section').style.display = 'block';
        selectDiceSystem(diceSelectedSystem);

    } catch (error) {
        console.error('Error loading character data:', error);
        alert('Failed to load character data: ' + error.message);
    }
}

// Select dice system (d20, d10, d6)
function selectDiceSystem(system) {
    diceSelectedSystem = system;

    // Update button states
    document.querySelectorAll('.dice-system-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.system === system) {
            btn.classList.add('active');
        }
    });

    // Show appropriate sections based on system
    if (system === 'd20') {
        // Show attribute selection for d20 (with claims integration)
        document.getElementById('attribute-section').style.display = 'block';
        document.getElementById('generic-roll-section').style.display = 'none';
        displayAttributeButtons();
    } else {
        // Show generic roll configuration for d10 and d6
        document.getElementById('attribute-section').style.display = 'none';
        document.getElementById('generic-roll-section').style.display = 'block';
        document.getElementById('roll-button-section').style.display = 'block';
    }

    // Reset selected attribute
    diceSelectedAttribute = null;
}

// Display attribute buttons for d20 system
function displayAttributeButtons() {
    const container = document.getElementById('attribute-buttons');
    container.innerHTML = '';

    commonAttributes.forEach(attr => {
        const btn = document.createElement('button');
        btn.className = 'attribute-btn';
        btn.textContent = attr;
        btn.onclick = () => selectAttribute(attr);

        // Mark if character has a claim on this attribute
        if (diceCharacterClaims[attr] && diceCharacterClaims[attr].points_spent > 0) {
            btn.classList.add('has-claim');
        }

        container.appendChild(btn);
    });
}

// Select attribute for d20 roll
function selectAttribute(attribute) {
    diceSelectedAttribute = attribute;

    // Update button states
    document.querySelectorAll('.attribute-btn').forEach(btn => {
        btn.style.background = '';
        if (btn.textContent === attribute) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        }
    });

    // Show roll button
    document.getElementById('roll-button-section').style.display = 'block';
}

// Roll dice
async function rollDice() {
    const token = localStorage.getItem('token');

    if (!diceSelectedCharacter) {
        alert('Please select a character first');
        return;
    }

    let rollResult;

    try {
        // Show rolling animation
        showDiceAnimation();

        if (diceSelectedSystem === 'd20') {
            // D20 system with claims
            if (!diceSelectedAttribute) {
                alert('Please select an attribute');
                hideDiceAnimation();
                return;
            }

            rollResult = await rollD20WithClaims();

        } else if (diceSelectedSystem === 'd10') {
            // World of Darkness d10 system
            rollResult = rollWorldOfDarkness();

        } else if (diceSelectedSystem === 'd6') {
            // Car Wars d6 system
            rollResult = rollCarWars();
        }

        // Wait for animation to complete (600ms)
        await new Promise(resolve => setTimeout(resolve, 600));

        // Hide animation and display result
        hideDiceAnimation();
        displayRollResult(rollResult);

        // Add to history
        addToRollHistory(rollResult);

    } catch (error) {
        console.error('Error rolling dice:', error);
        hideDiceAnimation();
        alert('Failed to roll dice: ' + error.message);
    }
}

// Show dice rolling animation
function showDiceAnimation() {
    const container = document.getElementById('current-roll-result');
    container.innerHTML = '<div class="dice-animation"><div class="dice-icon">🎲</div></div>';
    document.getElementById('roll-result-section').style.display = 'block';
}

// Hide dice animation
function hideDiceAnimation() {
    // Animation will be replaced by actual result
}

// Roll d20 with claims integration
async function rollD20WithClaims() {
    const token = localStorage.getItem('token');
    const baseRoll = Math.floor(Math.random() * 20) + 1;

    // Call API to resolve bonuses
    const response = await fetch('/api/claims/resolve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            character_id: diceSelectedCharacter,
            attribute_name: diceSelectedAttribute,
            roll_result: baseRoll
        })
    });

    if (!response.ok) {
        throw new Error('Failed to resolve roll');
    }

    const result = await response.json();

    return {
        system: 'd20',
        attribute: diceSelectedAttribute,
        baseRoll: baseRoll,
        bonus: result.total_bonus,
        total: result.final_result,
        message: result.message,
        isCriticalSuccess: baseRoll === 20,
        isCriticalFailure: baseRoll === 1,
        timestamp: new Date()
    };
}

// Roll World of Darkness (d10 pool system)
function rollWorldOfDarkness() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let successes = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        rolls.push(roll);

        if (roll >= 8) {
            successes++;
        }

        if (roll === 10) {
            successes++; // Double success on 10
        }
    }

    return {
        system: 'd10',
        purpose: purpose,
        rolls: rolls,
        successes: successes,
        total: successes,
        isCriticalSuccess: rolls.some(r => r === 10),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Roll Car Wars (d6 system)
function rollCarWars() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const modifier = parseInt(document.getElementById('dice-modifier').value) || 0;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let sum = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rolls.push(roll);
        sum += roll;
    }

    const total = sum + modifier;

    return {
        system: 'd6',
        purpose: purpose,
        rolls: rolls,
        baseTotal: sum,
        modifier: modifier,
        total: total,
        isCriticalSuccess: rolls.every(r => r === 6),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Display roll result
function displayRollResult(result) {
    const container = document.getElementById('current-roll-result');
    let html = '';

    let resultClass = '';
    if (result.isCriticalSuccess) {
        resultClass = 'critical-success';
    } else if (result.isCriticalFailure) {
        resultClass = 'critical-failure';
    }

    if (result.system === 'd20') {
        html = `
            <div class="result-label">D20 Roll for ${result.attribute}</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Base Roll:</strong> ${result.baseRoll}</div>
                <div><strong>Bonus:</strong> +${result.bonus}</div>
            </div>
            <div class="result-details">${result.message}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 CRITICAL SUCCESS!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 CRITICAL FAILURE!</div>' : ''}
        `;
    } else if (result.system === 'd10') {
        html = `
            <div class="result-label">World of Darkness Roll</div>
            <div class="result-value">${result.successes} Successes</div>
            <div class="result-breakdown">
                <div><strong>Dice Pool:</strong> ${result.rolls.join(', ')}</div>
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 Exceptional Success!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 Botch!</div>' : ''}
        `;
    } else if (result.system === 'd6') {
        html = `
            <div class="result-label">Car Wars Roll</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Dice:</strong> ${result.rolls.join(', ')}</div>
                <div><strong>Base Sum:</strong> ${result.baseTotal}</div>
                ${result.modifier !== 0 ? `<div><strong>Modifier:</strong> ${result.modifier > 0 ? '+' : ''}${result.modifier}</div>` : ''}
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 All Sixes!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 All Ones!</div>' : ''}
        `;
    }

    container.innerHTML = html;
    container.className = `roll-result ${resultClass}`;
    document.getElementById('roll-result-section').style.display = 'block';
}

// Add roll to history
function addToRollHistory(result) {
    rollHistory.unshift(result);

    // Keep only last 20 rolls
    if (rollHistory.length > 20) {
        rollHistory = rollHistory.slice(0, 20);
    }

    displayRollHistory();
}

// Display roll history
function displayRollHistory() {
    const container = document.getElementById('roll-history');

    if (rollHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No rolls yet</p>';
        return;
    }

    let html = '';

    rollHistory.forEach(roll => {
        let historyClass = '';
        if (roll.isCriticalSuccess) {
            historyClass = 'critical-success';
        } else if (roll.isCriticalFailure) {
            historyClass = 'critical-failure';
        }

        let displayValue, breakdown;

        if (roll.system === 'd20') {
            displayValue = roll.total;
            breakdown = `d20: ${roll.baseRoll} + ${roll.bonus} (${roll.attribute})`;
        } else if (roll.system === 'd10') {
            displayValue = `${roll.successes} succ`;
            breakdown = `${roll.rolls.length}d10: ${roll.rolls.join(', ')} (${roll.purpose})`;
        } else if (roll.system === 'd6') {
            displayValue = roll.total;
            breakdown = `${roll.rolls.length}d6: ${roll.rolls.join(', ')}${roll.modifier !== 0 ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : ''} (${roll.purpose})`;
        }

        const timeStr = roll.timestamp.toLocaleTimeString();

        html += `
            <div class="history-item ${historyClass}">
                <div class="history-roll">${displayValue}</div>
                <div class="history-details">
                    <div class="history-breakdown">${breakdown}</div>
                    <div class="history-timestamp">${timeStr}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('roll-history-section').style.display = 'block';
}

// Hide all dice sections
function hideDiceSections() {
    document.getElementById('dice-system-section').style.display = 'none';
    document.getElementById('attribute-section').style.display = 'none';
    document.getElementById('generic-roll-section').style.display = 'none';
    document.getElementById('roll-button-section').style.display = 'none';
    document.getElementById('roll-result-section').style.display = 'none';
    document.getElementById('roll-history-section').style.display = 'none';
}

// Initialize dice roller when dice tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const diceTab = document.querySelector('[data-tab="dice"]');
    if (diceTab) {
        diceTab.addEventListener('click', () => {
            initDiceRoller();
        });
    }
});

// ============================================
// SESSION TRACKER FUNCTIONALITY
// ============================================

// Session Tracker State
let activeSession = null;
let combatants = [];
let currentTurnIndex = 0;
let sessionHistory = [];

// Create new session
function createNewSession() {
    const title = prompt('Enter session title:', `Session ${new Date().toLocaleDateString()}`);

    if (!title) return;

    activeSession = {
        id: Date.now(),
        title: title,
        startTime: new Date(),
        notes: '',
        combats: []
    };

    displayActiveSession();
}

// Display active session
function displayActiveSession() {
    if (!activeSession) return;

    document.getElementById('active-session-section').style.display = 'block';
    document.getElementById('active-session-title').textContent = activeSession.title;
    document.getElementById('active-session-notes').value = activeSession.notes || '';
}

// Save session notes
function saveSessionNotes() {
    if (!activeSession) return;

    activeSession.notes = document.getElementById('active-session-notes').value;
    alert('Session notes saved!');
}

// Toggle combat tracker
function toggleCombatTracker() {
    const tracker = document.getElementById('combat-tracker');

    if (tracker.style.display === 'none') {
        tracker.style.display = 'block';

        if (combatants.length === 0) {
            // Start new combat
            addCombatant();
        } else {
            displayCombatTracker();
        }
    } else {
        tracker.style.display = 'none';
    }
}

// Add combatant to combat
function addCombatant() {
    const name = prompt('Combatant name:');
    if (!name) return;

    const initiative = parseInt(prompt('Initiative roll:', '10'));
    const maxHP = parseInt(prompt('Max HP:', '20'));
    const type = confirm('Is this a player character?') ? 'player' : 'enemy';

    const combatant = {
        id: Date.now(),
        name: name,
        initiative: initiative || 10,
        maxHP: maxHP || 20,
        currentHP: maxHP || 20,
        type: type,
        conditions: []
    };

    combatants.push(combatant);

    // Sort by initiative (descending)
    combatants.sort((a, b) => b.initiative - a.initiative);

    displayCombatTracker();
}

// Display combat tracker
function displayCombatTracker() {
    const container = document.getElementById('initiative-list');

    if (combatants.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No combatants yet. Click "Add Combatant" to start!</p>';
        return;
    }

    let html = '';

    combatants.forEach((combatant, index) => {
        const hpPercent = (combatant.currentHP / combatant.maxHP) * 100;
        const hpBarClass = hpPercent < 30 ? 'low' : '';
        const isActiveTurn = index === currentTurnIndex;

        html += `
            <div class="combatant-card ${combatant.type} ${isActiveTurn ? 'active-turn' : ''}">
                <div class="combatant-info">
                    <div class="combatant-initiative">${combatant.initiative}</div>
                    <div class="combatant-name">${combatant.name}${isActiveTurn ? ' 👉' : ''}</div>
                    <div class="combatant-hp">
                        <div class="hp-bar">
                            <div class="hp-bar-fill ${hpBarClass}" style="width: ${hpPercent}%"></div>
                        </div>
                        <div class="hp-text">${combatant.currentHP} / ${combatant.maxHP}</div>
                    </div>
                    <div class="combatant-conditions">
                        ${combatant.conditions.map(c => `<span class="condition-tag">${c}</span>`).join('')}
                    </div>
                </div>
                <div class="combatant-actions">
                    <button class="btn-icon" onclick="adjustHP(${combatant.id}, -1)" title="Damage">-</button>
                    <button class="btn-icon" onclick="adjustHP(${combatant.id}, 1)" title="Heal">+</button>
                    <button class="btn-icon" onclick="addCondition(${combatant.id})" title="Add Condition">⚠</button>
                    <button class="btn-icon danger" onclick="removeCombatant(${combatant.id})" title="Remove">×</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Adjust combatant HP
function adjustHP(combatantId, amount) {
    const combatant = combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    if (amount < 0) {
        // Damage
        const damage = parseInt(prompt('Damage amount:', '5'));
        if (damage) {
            combatant.currentHP = Math.max(0, combatant.currentHP - damage);
        }
    } else {
        // Heal
        const healing = parseInt(prompt('Healing amount:', '5'));
        if (healing) {
            combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + healing);
        }
    }

    displayCombatTracker();
}

// Add condition to combatant
function addCondition(combatantId) {
    const combatant = combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const condition = prompt('Condition (e.g., Stunned, Prone, Blinded):');
    if (condition) {
        combatant.conditions.push(condition);
        displayCombatTracker();
    }
}

// Remove combatant from combat
function removeCombatant(combatantId) {
    if (!confirm('Remove this combatant?')) return;

    combatants = combatants.filter(c => c.id !== combatantId);

    // Adjust current turn if needed
    if (currentTurnIndex >= combatants.length) {
        currentTurnIndex = 0;
    }

    displayCombatTracker();
}

// Next turn in combat
function nextTurn() {
    if (combatants.length === 0) return;

    currentTurnIndex = (currentTurnIndex + 1) % combatants.length;

    if (currentTurnIndex === 0) {
        // New round
        if (confirm('Starting a new round. Clear any end-of-round conditions?')) {
            // Could add logic here to clear conditions that last "until end of round"
        }
    }

    displayCombatTracker();
}

// End combat
function endCombat() {
    if (!confirm('End this combat encounter?')) return;

    // Save combat to session
    if (activeSession) {
        activeSession.combats.push({
            participants: combatants.map(c => c.name),
            duration: combatants.length + ' rounds',
            timestamp: new Date()
        });
    }

    combatants = [];
    currentTurnIndex = 0;
    document.getElementById('combat-tracker').style.display = 'none';
}

// End active session
function endActiveSession() {
    if (!activeSession) return;

    if (!confirm('End this session? Notes will be saved to history.')) return;

    activeSession.endTime = new Date();
    sessionHistory.unshift(activeSession);

    // Clear active session
    activeSession = null;
    combatants = [];
    currentTurnIndex = 0;

    document.getElementById('active-session-section').style.display = 'none';
    document.getElementById('combat-tracker').style.display = 'none';

    displaySessionHistory();
    alert('Session ended and saved to history!');
}

// Display session history
function displaySessionHistory() {
    const container = document.getElementById('session-history-list');

    if (sessionHistory.length === 0) {
        container.innerHTML = `
            <div class="info-message">
                <p>No session history yet. Complete a session to see it here!</p>
            </div>
        `;
        return;
    }

    let html = '';

    sessionHistory.forEach((session, index) => {
        const date = new Date(session.startTime).toLocaleDateString();
        const time = new Date(session.startTime).toLocaleTimeString();
        const duration = session.endTime ?
            Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60) + ' minutes' :
            'Ongoing';

        const notesPreview = session.notes ?
            session.notes.substring(0, 150) + (session.notes.length > 150 ? '...' : '') :
            'No notes recorded';

        html += `
            <div class="session-history-item" onclick="viewSessionDetails(${index})">
                <div class="session-history-header">
                    <div class="session-history-title">${session.title}</div>
                    <div class="session-history-date">${date} at ${time}</div>
                </div>
                <div class="session-history-summary">
                    <strong>Duration:</strong> ${duration}<br>
                    <strong>Combats:</strong> ${session.combats.length}<br>
                    <strong>Notes:</strong> ${notesPreview}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// View session details
function viewSessionDetails(index) {
    const session = sessionHistory[index];
    if (!session) return;

    const date = new Date(session.startTime).toLocaleDateString();
    const time = new Date(session.startTime).toLocaleTimeString();

    alert(
        `${session.title}\n\n` +
        `Date: ${date} at ${time}\n` +
        `Combats: ${session.combats.length}\n\n` +
        `Notes:\n${session.notes || 'No notes recorded'}`
    );
}
