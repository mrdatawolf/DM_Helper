// API Base URL
const API_BASE = '/api';

// State
let characters = [];
let shadows = [];
let sessions = [];
let progress = [];
let journalEntries = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadAllData();
});

// Show Player Guide
function showGuide() {
    window.open('/guide.html', '_blank');
}

// Tab navigation
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Load journal entries when switching to journal tab
    if (tabName === 'journal') {
        loadJournalEntries();
    }
}

// Load all data
async function loadAllData() {
    await Promise.all([
        loadCharacters(),
        loadShadows(),
        loadSessions(),
        loadProgress()
    ]);
}

// Characters
async function loadCharacters() {
    try {
        const response = await fetch(`${API_BASE}/characters`);
        characters = await response.json();
        renderCharacters();
        updateProgressFilter();
        updateJournalFilter();
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

function renderCharacters() {
    const container = document.getElementById('characters-list');
    if (characters.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No characters yet</h3><p>Create your first character to begin</p></div>';
        return;
    }

    container.innerHTML = characters.map(char => `
        <div class="card">
            <h3>${char.name}</h3>
            <div class="card-row">
                <span class="card-label">Player:</span>
                <span class="card-value">${char.player_name || 'NPC'}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Race/Class:</span>
                <span class="card-value">${char.race} ${char.class}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Level:</span>
                <span class="card-value">${char.level}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Origin:</span>
                <span class="card-value">${char.shadow_origin_name || 'Unknown'}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Current Location:</span>
                <span class="card-value">${char.current_shadow_name || 'Unknown'}</span>
            </div>
            <div class="stat-block">
                <div class="stat">
                    <div class="stat-label">HP</div>
                    <div class="stat-value">${char.current_hit_points}/${char.max_hit_points}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">AC</div>
                    <div class="stat-value">${char.armor_class}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Feats</div>
                    <div class="stat-value">${char.feat_pool}</div>
                </div>
            </div>
            <div class="card-row">
                <span class="card-label">Order/Chaos:</span>
                <div class="progress-bar" style="flex: 1; margin-left: 10px;">
                    <div class="progress-fill" style="width: ${char.order_chaos_balance}%; background: ${char.order_chaos_balance > 50 ? 'linear-gradient(90deg, #3498db, #2980b9)' : 'linear-gradient(90deg, #e74c3c, #c0392b)'}"></div>
                </div>
            </div>
            ${char.has_pattern_imprint ? '<span class="badge badge-pattern">Pattern</span>' : ''}
            ${char.has_logrus_imprint ? '<span class="badge badge-logrus">Logrus</span>' : ''}
            ${char.has_trump_artistry ? '<span class="badge">Trump Artist</span>' : ''}
            <div style="margin-top: 15px;">
                <button class="btn-secondary" onclick="viewCharacter(${char.id})">View Details</button>
                <button class="btn-secondary" onclick="editCharacter(${char.id})">Edit</button>
                <button class="btn-secondary btn-danger" onclick="deleteCharacter(${char.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Shadows
async function loadShadows() {
    try {
        const response = await fetch(`${API_BASE}/shadows`);
        shadows = await response.json();
        renderShadows();
    } catch (error) {
        console.error('Error loading shadows:', error);
    }
}

function renderShadows() {
    const container = document.getElementById('shadows-list');
    if (shadows.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No shadows yet</h3></div>';
        return;
    }

    container.innerHTML = shadows.map(shadow => `
        <div class="card">
            <h3>${shadow.name}</h3>
            <p>${shadow.description || 'No description'}</p>
            <div class="card-row">
                <span class="card-label">Pattern Influence:</span>
                <span class="badge badge-pattern">${shadow.pattern_influence}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Order Level:</span>
                <span class="card-value">${shadow.order_level}/100</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${shadow.order_level}%; background: linear-gradient(90deg, #3498db, #2980b9)"></div>
            </div>
            <div class="card-row">
                <span class="card-label">Chaos Level:</span>
                <span class="card-value">${shadow.chaos_level}/100</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${shadow.chaos_level}%; background: linear-gradient(90deg, #e74c3c, #c0392b)"></div>
            </div>
            ${shadow.corruption_status ? `<p><strong>Corruption:</strong> ${shadow.corruption_status}</p>` : ''}
            <div style="margin-top: 15px;">
                <button class="btn-secondary" onclick="editShadow(${shadow.id})">Edit</button>
                <button class="btn-secondary btn-danger" onclick="deleteShadow(${shadow.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Sessions
async function loadSessions() {
    try {
        const response = await fetch(`${API_BASE}/sessions`);
        sessions = await response.json();
        renderSessions();
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function renderSessions() {
    const container = document.getElementById('sessions-list');
    if (sessions.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No sessions yet</h3></div>';
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="session-card">
            <div class="session-header">
                <div>
                    <h3>Session ${session.session_number}: ${session.session_title || 'Untitled'}</h3>
                    <p style="color: #666; margin-top: 5px;">${new Date(session.session_date).toLocaleDateString()}</p>
                </div>
                <div>
                    <button class="btn-secondary" onclick="editSession(${session.id})">Edit</button>
                    <button class="btn-secondary btn-danger" onclick="deleteSession(${session.id})">Delete</button>
                </div>
            </div>
            ${session.dm_notes ? `<p><strong>DM Notes:</strong> ${session.dm_notes}</p>` : ''}
        </div>
    `).join('');
}

// Progress
async function loadProgress() {
    try {
        const charFilter = document.getElementById('progress-filter-character')?.value || '';
        const url = charFilter ? `${API_BASE}/progress?character_id=${charFilter}` : `${API_BASE}/progress`;
        const response = await fetch(url);
        progress = await response.json();
        renderProgress();
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function renderProgress() {
    const container = document.getElementById('progress-list');
    if (progress.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No progress entries yet</h3></div>';
        return;
    }

    container.innerHTML = progress.map(entry => `
        <div class="progress-entry">
            <h4>${entry.character_name} - Session ${entry.session_number}: ${entry.session_title || 'Untitled'}</h4>
            <p><strong>Summary:</strong> ${entry.summary}</p>
            <div class="progress-meta">
                <span>📅 ${new Date(entry.session_date).toLocaleDateString()}</span>
                <span>🗺️ ${entry.shadow_name || 'Unknown shadow'}</span>
                ${entry.feats_earned > 0 ? `<span>⭐ ${entry.feats_earned} feat(s) earned</span>` : ''}
                ${entry.experience_gained > 0 ? `<span>📈 ${entry.experience_gained} XP</span>` : ''}
                ${entry.is_solo_session ? '<span>👤 Solo Session</span>' : '<span>👥 Group Session</span>'}
            </div>
            ${entry.story_beats ? `<p><strong>Key Moments:</strong> ${entry.story_beats}</p>` : ''}
            ${entry.npcs_met ? `<p><strong>NPCs Met:</strong> ${entry.npcs_met}</p>` : ''}
            <div style="margin-top: 10px;">
                <button class="btn-secondary" onclick="editProgress(${entry.id})">Edit</button>
                <button class="btn-secondary btn-danger" onclick="deleteProgress(${entry.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function updateProgressFilter() {
    const select = document.getElementById('progress-filter-character');
    if (!select) return;

    select.innerHTML = '<option value="">All Characters</option>' +
        characters.map(char => `<option value="${char.id}">${char.name}</option>`).join('');
}

// Modal functions
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

// Create Character Modal
function showCreateCharacterModal() {
    const shadowOptions = shadows.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

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
                    <label>Race *</label>
                    <input type="text" name="race" required>
                </div>
                <div class="form-group">
                    <label>Class *</label>
                    <input type="text" name="class" required>
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
                    <input type="checkbox" name="has_pattern_imprint">
                    Has Pattern Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="has_logrus_imprint">
                    Has Logrus Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="has_trump_artistry">
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
    data.has_pattern_imprint = formData.has('has_pattern_imprint');
    data.has_logrus_imprint = formData.has('has_logrus_imprint');
    data.has_trump_artistry = formData.has('has_trump_artistry');

    try {
        const response = await fetch(`${API_BASE}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadCharacters();
        } else {
            alert('Error creating character');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating character');
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
            </div>
            <div class="form-group">
                <label>Pattern Influence</label>
                <select name="pattern_influence">
                    <option value="None">None</option>
                    <option value="First Pattern">First Pattern</option>
                    <option value="Corwin Pattern">Corwin's Pattern</option>
                    <option value="Logrus">Logrus</option>
                    <option value="Mixed">Mixed</option>
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
        const response = await fetch(`${API_BASE}/shadows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadShadows();
        } else {
            alert('Error creating shadow');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating shadow');
    }
}

// Create Session Modal
function showCreateSessionModal() {
    const nextSessionNumber = sessions.length > 0 ? Math.max(...sessions.map(s => s.session_number)) + 1 : 1;
    const today = new Date().toISOString().split('T')[0];

    showModal('Create Session', `
        <form onsubmit="createSession(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Session Number *</label>
                    <input type="number" name="session_number" value="${nextSessionNumber}" required>
                </div>
                <div class="form-group">
                    <label>Session Date *</label>
                    <input type="date" name="session_date" value="${today}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Session Title</label>
                <input type="text" name="session_title">
            </div>
            <div class="form-group">
                <label>DM Notes</label>
                <textarea name="dm_notes"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Session</button>
        </form>
    `);
}

async function createSession(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadSessions();
        } else {
            alert('Error creating session');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating session');
    }
}

// Add Progress Modal
function showAddProgressModal() {
    const charOptions = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const sessionOptions = sessions.map(s => `<option value="${s.id}">Session ${s.session_number}: ${s.session_title || 'Untitled'}</option>`).join('');
    const shadowOptions = shadows.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

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
        const response = await fetch(`${API_BASE}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadProgress();
            await loadCharacters(); // Reload to update feat counts
        } else {
            alert('Error adding progress');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding progress');
    }
}

// Delete functions
async function deleteCharacter(id) {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
        const response = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadCharacters();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteShadow(id) {
    if (!confirm('Are you sure you want to delete this shadow?')) return;

    try {
        const response = await fetch(`${API_BASE}/shadows/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadShadows();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
        const response = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadSessions();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteProgress(id) {
    if (!confirm('Are you sure you want to delete this progress entry?')) return;

    try {
        const response = await fetch(`${API_BASE}/progress/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadProgress();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ========== JOURNAL FUNCTIONS ==========

// Update journal filter dropdown
function updateJournalFilter() {
    const select = document.getElementById('journal-filter-character');
    if (!select) return;

    select.innerHTML = '<option value="">All Characters</option>' +
        characters.map(char => `<option value="${char.id}">${char.name}</option>`).join('');
}

// Load journal entries
async function loadJournalEntries() {
    const container = document.getElementById('journal-content');
    const characterFilter = document.getElementById('journal-filter-character')?.value || '';
    const publicOnlyFilter = document.getElementById('journal-filter-public')?.checked || false;

    try {
        const response = await fetch(`${API_BASE}/journal/user`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load journal entries');
        }

        const data = await response.json();
        let entries = data.entries || [];

        // Apply filters
        if (characterFilter) {
            entries = entries.filter(e => e.character_id == characterFilter);
        }
        if (publicOnlyFilter) {
            entries = entries.filter(e => e.is_public === 1);
        }

        journalEntries = entries;
        renderJournalEntries();

    } catch (error) {
        console.error('Error loading journal entries:', error);
        container.innerHTML = `
            <div class="error-state">
                <h3>Failed to Load Journal Entries</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Render journal entries
function renderJournalEntries() {
    const container = document.getElementById('journal-content');

    if (journalEntries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Journal Entries</h3>
                <p>Create your first journal entry to document the campaign.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="journal-entries">
            ${journalEntries.map(entry => `
                <div class="journal-entry-card">
                    <div class="entry-header">
                        <div>
                            <h3>${entry.title}</h3>
                            <span class="entry-meta">
                                ${entry.character_name} • ${new Date(entry.created_at).toLocaleDateString()}
                                ${entry.is_public ? '<span class="public-badge">Public</span>' : '<span class="private-badge">Private</span>'}
                            </span>
                        </div>
                        <div class="entry-actions">
                            <button class="btn-secondary btn-sm" onclick="editJournalEntry(${entry.id})">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="deleteJournalEntry(${entry.id})">Delete</button>
                        </div>
                    </div>
                    <div class="entry-content">
                        <p>${entry.content}</p>
                    </div>
                    <div class="entry-footer">
                        <small>By ${entry.author_username}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Open new journal entry modal
function openNewJournalEntry() {
    const modalContent = `
        <form id="journal-entry-form" onsubmit="handleJournalSubmit(event); return false;">
            <div class="form-group">
                <label for="journal-character">Character *</label>
                <select id="journal-character" required>
                    <option value="">Select a character...</option>
                    ${characters.map(char => `<option value="${char.id}">${char.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="journal-title">Title *</label>
                <input type="text" id="journal-title" required placeholder="What happened?">
            </div>
            <div class="form-group">
                <label for="journal-content">Entry *</label>
                <textarea id="journal-content" rows="8" required></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="journal-visibility">
                    Make this entry public (visible to all players)
                </label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Entry</button>
            </div>
        </form>
    `;

    showModal('New Journal Entry', modalContent);
}

// Handle journal entry submission
async function handleJournalSubmit(event) {
    event.preventDefault();

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    const characterId = parseInt(document.getElementById('journal-character').value);
    const title = document.getElementById('journal-title').value;
    const content = document.getElementById('journal-content').value;

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
        const response = await fetch(`${API_BASE}/journal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create journal entry');
        }

        closeModal();
        await loadJournalEntries();
        alert('Journal entry saved successfully!');

    } catch (error) {
        console.error('Error creating journal entry:', error);
        console.error('Full error details:', error);
        alert(`Failed to save journal entry: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
    }
}

// Edit journal entry
async function editJournalEntry(entryId) {
    const entry = journalEntries.find(e => e.id === entryId);
    if (!entry) {
        alert('Journal entry not found');
        return;
    }

    const modalContent = `
        <form id="journal-edit-form" onsubmit="handleJournalUpdate(event, ${entryId}); return false;">
            <div class="form-group">
                <label for="edit-journal-character">Character *</label>
                <select id="edit-journal-character" required>
                    <option value="">Select a character...</option>
                    ${characters.map(char => `<option value="${char.id}" ${char.id === entry.character_id ? 'selected' : ''}>${char.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="edit-journal-title">Title *</label>
                <input type="text" id="edit-journal-title" required placeholder="What happened?" value="${entry.title}">
            </div>
            <div class="form-group">
                <label for="edit-journal-content">Entry *</label>
                <textarea id="edit-journal-content" rows="8" required>${entry.content}</textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="edit-journal-visibility" ${entry.is_public ? 'checked' : ''}>
                    Make this entry public (visible to all players)
                </label>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Update Entry</button>
            </div>
        </form>
    `;

    showModal('Edit Journal Entry', modalContent);
}

// Handle journal entry update
async function handleJournalUpdate(event, entryId) {
    event.preventDefault();

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    const entryData = {
        character_id: parseInt(document.getElementById('edit-journal-character').value),
        title: document.getElementById('edit-journal-title').value,
        content: document.getElementById('edit-journal-content').value,
        is_public: document.getElementById('edit-journal-visibility').checked ? 1 : 0
    };

    try {
        const response = await fetch(`${API_BASE}/journal/${entryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(entryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update journal entry');
        }

        closeModal();
        await loadJournalEntries();
        alert('Journal entry updated successfully!');

    } catch (error) {
        console.error('Error updating journal entry:', error);
        alert(`Failed to update journal entry: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Entry';
    }
}

// Delete journal entry
async function deleteJournalEntry(entryId) {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/journal/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete journal entry');
        }

        await loadJournalEntries();
        alert('Journal entry deleted successfully!');

    } catch (error) {
        console.error('Error deleting journal entry:', error);
        alert(`Failed to delete journal entry: ${error.message}`);
    }
}

// Placeholder functions for view/edit (to be implemented)
function viewCharacter(id) {
    alert('View character details - to be implemented');
}

function editCharacter(id) {
    alert('Edit character - to be implemented');
}

function editShadow(id) {
    alert('Edit shadow - to be implemented');
}

function editSession(id) {
    alert('Edit session - to be implemented');
}

function editProgress(id) {
    alert('Edit progress - to be implemented');
}

// ========== CLAIMS RANKINGS FUNCTIONS ==========

// Load claims rankings for DM view
async function loadClaimsRankings() {
    const container = document.getElementById('claims-rankings-container');
    const summaryContainer = document.getElementById('claims-summary-stats');

    container.innerHTML = '<div class="loading">Loading claims rankings...</div>';

    try {
        const response = await fetch('/api/claims/rankings/all/with-best');
        const rankings = await response.json();

        if (Object.keys(rankings).length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px; font-style: italic;">No attribute claims have been made yet.</div>';
            summaryContainer.innerHTML = '';
            return;
        }

        // Calculate summary stats
        let totalAttributes = Object.keys(rankings).length;
        let totalClaims = 0;
        let totalPoints = 0;
        let mostCompetitiveAttr = '';
        let mostCompetitiveCount = 0;

        Object.entries(rankings).forEach(([attr, chars]) => {
            totalClaims += chars.length;
            chars.forEach(char => totalPoints += char.points_spent);

            if (chars.length > mostCompetitiveCount) {
                mostCompetitiveCount = chars.length;
                mostCompetitiveAttr = attr;
            }
        });

        summaryContainer.innerHTML = `
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalAttributes}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Attributes Claimed</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalClaims}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Total Claims</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalPoints}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Total Points Spent</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${mostCompetitiveAttr || 'N/A'}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Most Competitive (${mostCompetitiveCount} claims)</div>
            </div>
        `;

        // Render each attribute section
        container.innerHTML = '';
        Object.entries(rankings).forEach(([attributeName, characters]) => {
            const section = document.createElement('div');
            section.style.cssText = 'background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';

            let tableHTML = `
                <h3 style="margin-top: 0; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 10px;">${attributeName}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: var(--light);">
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Rank</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Character</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Points Spent</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Justification</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            characters.forEach((char, index) => {
                let rankBadgeStyle = 'display: inline-block; background: #666; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; min-width: 30px; text-align: center;';

                if (index === 0) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #FFD700; color: #333');
                } else if (index === 1) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #C0C0C0; color: #333');
                } else if (index === 2) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #CD7F32');
                }

                tableHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><span style="${rankBadgeStyle}">#${char.rank_position}</span></td>
                        <td style="padding: 12px;">
                            <strong>${char.character_name}</strong>
                            ${char.is_best ? '<span style="display: inline-block; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px;">🏆 BEST</span>' : ''}
                        </td>
                        <td style="padding: 12px;"><span style="font-size: 18px; font-weight: bold; color: var(--primary);">${char.points_spent}</span> points</td>
                        <td style="padding: 12px;"><span style="font-style: italic; color: #666; font-size: 14px;">${char.justification || 'No justification provided'}</span></td>
                        <td style="padding: 12px;">
                            ${char.is_best ?
                                '<span style="color: #4CAF50; font-weight: bold;">Gets +2 total bonus</span>' :
                                '<span style="color: #666;">Gets +1 claim bonus</span>'}
                        </td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            // Add secret bonus info for the best character
            const bestChar = characters.find(c => c.is_best);
            if (bestChar) {
                tableHTML += `
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #4CAF50;">
                        <strong>🔒 Secret:</strong> ${bestChar.character_name} gets a hidden +1 bonus on top of the visible +1 claim bonus.
                        Players won't know who's truly the best, creating suspense!
                    </div>
                `;
            }

            section.innerHTML = tableHTML;
            container.appendChild(section);
        });

    } catch (error) {
        console.error('Error loading rankings:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>Failed to load rankings: ${error.message}</p>
                <button class="btn-primary" onclick="loadClaimsRankings()">Retry</button>
            </div>
        `;
    }
}
