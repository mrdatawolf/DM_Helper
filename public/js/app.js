// API Base URL
const API_BASE = '/api';

// State
let characters = [];
let shadows = [];
let sessions = [];
let progress = [];
let journalEntries = [];
let primalPatterns = [];
let activePatternId = null;
const openSections = new Set();
let sectionGrantsCache = {};

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
    if (tabName === 'primal-patterns') {
        loadPrimalPatterns();
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

// ========== PRIMAL PATTERNS FUNCTIONS ==========

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function loadPrimalPatterns() {
    try {
        const response = await fetch('/api/primal-patterns');
        primalPatterns = await response.json();
        renderPrimalPatternCards();
        if (activePatternId && primalPatterns.some(p => p.id === activePatternId)) {
            await renderPatternDetail(activePatternId);
        } else if (activePatternId) {
            activePatternId = null;
            const dv = document.getElementById('pattern-detail-view');
            if (dv) dv.innerHTML = '';
        }
    } catch (err) {
        console.error('Failed to load primal patterns:', err);
    }
}

function renderPrimalPatternCards() {
    const container = document.getElementById('pattern-card-row');
    if (!container) return;

    if (primalPatterns.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <h3>No patterns yet</h3>
                <p>Create a primal pattern to begin building the metaphysical lore.</p>
            </div>`;
        return;
    }

    container.innerHTML = primalPatterns.map(p => `
        <div class="pattern-card ${p.id === activePatternId ? 'active' : ''}" onclick="selectPattern(${p.id})">
            <div class="pattern-card-name">${escHtml(p.name)}</div>
            ${p.origin_figure ? `<div class="pattern-card-origin">Origin: ${escHtml(p.origin_figure)}</div>` : ''}
            <div class="pattern-card-animal">${p.spirit_animal ? escHtml(p.spirit_animal) : 'No primal animal set'}</div>
            ${p.spirit_animal_role && p.spirit_animal_role !== 'unknown'
                ? `<div><span class="spirit-animal-role-badge">${p.spirit_animal_role}</span></div>`
                : ''}
        </div>
    `).join('');
}

async function selectPattern(id) {
    activePatternId = id;
    renderPrimalPatternCards();
    await renderPatternDetail(id);
}

async function renderPatternDetail(id) {
    const detailView = document.getElementById('pattern-detail-view');
    if (!detailView) return;
    detailView.innerHTML = '<div style="padding:20px; color:#999;">Loading...</div>';

    try {
        const response = await fetch(`/api/primal-patterns/${id}`);
        if (!response.ok) throw new Error('Failed to fetch pattern');
        const pattern = await response.json();

        // Cache section grants so openGrantModal can access them
        sectionGrantsCache = {};
        pattern.sections.forEach(s => { sectionGrantsCache[s.id] = s.grants || []; });

        detailView.innerHTML = `
            <div class="pattern-detail">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; gap:12px;">
                    <h3 style="margin:0; font-size:1.3rem;">${escHtml(pattern.name)}</h3>
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="btn-secondary btn-sm" onclick="openEditPatternModal(${id})">Edit Meta</button>
                        <button class="btn-secondary btn-sm btn-danger" onclick="deletePattern(${id})">Delete</button>
                    </div>
                </div>

                <div class="pattern-meta-bar">
                    ${pattern.also_known_as ? `
                        <div class="pattern-meta-item">
                            <label>Also Known As</label>
                            <div class="meta-value">${escHtml(pattern.also_known_as)}</div>
                        </div>` : ''}
                    <div class="pattern-meta-item">
                        <label>Origin Figure</label>
                        <div class="meta-value">${escHtml(pattern.origin_figure || 'Unknown')}</div>
                    </div>
                    <div class="pattern-meta-item">
                        <label>Primal Animal</label>
                        <div class="meta-value">${escHtml(pattern.spirit_animal || 'Unknown')}</div>
                    </div>
                    <div class="pattern-meta-item">
                        <label>Animal Role</label>
                        <div class="meta-value">${escHtml(pattern.spirit_animal_role || 'unknown')}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4 style="margin:0;">Sections</h4>
                    <button class="btn-secondary btn-sm" onclick="openAddSectionModal(${id})">+ Add Section</button>
                </div>

                <div id="sections-list">
                    ${renderSectionPanels(pattern.sections, id)}
                </div>
            </div>
        `;
    } catch (err) {
        detailView.innerHTML = `<div class="empty-state">Failed to load pattern details. ${err.message}</div>`;
    }
}

function renderSectionPanels(sections, patternId) {
    if (!sections || sections.length === 0) {
        return '<div style="color:#999; font-style:italic; padding:20px; text-align:center;">No sections yet. Add one above.</div>';
    }

    return sections.map(s => {
        const isOpen = openSections.has(s.id);
        const isSecrets = s.section_key === 'secrets';
        const grantCount = (s.grants || []).length;

        const grantsHtml = (!isSecrets && s.grants && s.grants.length > 0) ? `
            <div class="section-grant-list">
                <small style="color:#666;">Shared with:</small>
                ${s.grants.map(g => `
                    <button class="grant-chip"
                            onclick="revokeGrant(${s.id}, ${patternId}, ${g.character_id}, ${JSON.stringify(g.character_name)})">
                        ${escHtml(g.character_name)} &times;
                    </button>`).join('')}
            </div>` : '';

        return `
            <div class="section-panel ${isSecrets ? 'secrets-section' : ''}">
                <div class="section-panel-header" onclick="toggleSection(${s.id})">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <strong>${escHtml(s.title)}</strong>
                        <span class="section-key-badge">${escHtml(s.section_key)}</span>
                        ${isSecrets ? '<span style="color:#c0392b; font-size:0.72rem; font-weight:700;">DM ONLY</span>' : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${!isSecrets ? `<span class="grant-chip ${grantCount === 0 ? 'no-grants' : ''}">${grantCount === 0 ? 'Not shared' : grantCount + ' player' + (grantCount !== 1 ? 's' : '')}</span>` : ''}
                        <span id="sec-chevron-${s.id}">${isOpen ? '▲' : '▼'}</span>
                    </div>
                </div>
                <div id="sec-body-${s.id}" style="display:${isOpen ? '' : 'none'};">
                    <div class="section-body">
                        <div class="section-col">
                            <label>DM Notes (full content)</label>
                            <textarea id="dm-content-${s.id}">${escHtml(s.content)}</textarea>
                        </div>
                        <div class="section-col player-col">
                            <label>Player Content (what players see when granted)</label>
                            <textarea id="player-content-${s.id}">${escHtml(s.player_content)}</textarea>
                        </div>
                    </div>
                    <div class="section-actions">
                        <button class="btn-primary btn-sm" id="save-btn-${s.id}" onclick="saveSectionContent(${patternId}, ${s.id})">Save</button>
                        ${!isSecrets ? `<button class="btn-secondary btn-sm" onclick="openGrantModal(${s.id}, ${patternId})">Grant to Players</button>` : ''}
                        <button class="btn-secondary btn-sm btn-danger" onclick="deleteSection(${patternId}, ${s.id})">Delete Section</button>
                        ${grantsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleSection(id) {
    const body = document.getElementById(`sec-body-${id}`);
    const chevron = document.getElementById(`sec-chevron-${id}`);
    if (!body) return;
    if (openSections.has(id)) {
        openSections.delete(id);
        body.style.display = 'none';
        if (chevron) chevron.textContent = '▼';
    } else {
        openSections.add(id);
        body.style.display = '';
        if (chevron) chevron.textContent = '▲';
    }
}

async function saveSectionContent(patternId, sectionId) {
    const content = document.getElementById(`dm-content-${sectionId}`)?.value ?? '';
    const playerContent = document.getElementById(`player-content-${sectionId}`)?.value ?? '';
    const btn = document.getElementById(`save-btn-${sectionId}`);

    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

    try {
        const response = await fetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, player_content: playerContent })
        });
        if (!response.ok) throw new Error('Save failed');
        if (btn) {
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 1800);
        }
    } catch (err) {
        if (btn) { btn.textContent = 'Save'; btn.disabled = false; }
        alert('Failed to save section: ' + err.message);
    }
}

function openGrantModal(sectionId, patternId) {
    const grants = sectionGrantsCache[sectionId] || [];
    const grantedIds = new Set(grants.map(g => g.character_id));

    const charList = characters.length === 0
        ? '<p style="color:#999; font-style:italic;">No characters found. Create characters first.</p>'
        : characters.map(c => `
            <label style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer;
                          ${grantedIds.has(c.id) ? 'background:#e8f5e9;' : ''}">
                <input type="checkbox" value="${c.id}" ${grantedIds.has(c.id) ? 'checked' : ''}>
                <span>
                    <strong>${escHtml(c.name)}</strong>
                    ${c.player_name ? `<span style="color:#999; font-size:0.8rem; margin-left:6px;">(${escHtml(c.player_name)})</span>` : ''}
                </span>
            </label>`).join('');

    showModal('Grant Lore Access', `
        <p style="color:#666; margin-bottom:14px; font-size:0.9rem;">
            Check which characters can see the <em>Player Content</em> for this section.
            Uncheck to revoke existing access.
        </p>
        <div id="grant-char-list" style="display:flex; flex-direction:column; gap:4px; max-height:280px; overflow-y:auto; border:1px solid var(--light); border-radius:6px; padding:8px;">
            ${charList}
        </div>
        <div class="form-actions" style="margin-top:16px;">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="button" class="btn-primary" onclick="handleGrantSave(${sectionId}, ${patternId})">Save Grants</button>
        </div>
    `);
}

async function handleGrantSave(sectionId, patternId) {
    const grants = sectionGrantsCache[sectionId] || [];
    const originalGrantedIds = new Set(grants.map(g => g.character_id));

    const checkboxes = document.querySelectorAll('#grant-char-list input[type="checkbox"]');
    const nowCheckedIds = new Set([...checkboxes].filter(cb => cb.checked).map(cb => parseInt(cb.value)));

    const toGrant = [...nowCheckedIds].filter(id => !originalGrantedIds.has(id));
    const toRevoke = [...originalGrantedIds].filter(id => !nowCheckedIds.has(id));

    try {
        if (toGrant.length > 0) {
            await fetch(`/api/primal-patterns/sections/${sectionId}/grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_ids: toGrant })
            });
        }
        for (const charId of toRevoke) {
            await fetch(`/api/primal-patterns/sections/${sectionId}/revoke/${charId}`, { method: 'DELETE' });
        }
        closeModal();
        await renderPatternDetail(patternId);
    } catch (err) {
        alert('Failed to update grants: ' + err.message);
    }
}

async function revokeGrant(sectionId, patternId, characterId, characterName) {
    if (!confirm(`Remove lore access for ${characterName}?`)) return;
    try {
        const response = await fetch(`/api/primal-patterns/sections/${sectionId}/revoke/${characterId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Revoke failed');
        await renderPatternDetail(patternId);
    } catch (err) {
        alert('Failed to revoke access: ' + err.message);
    }
}

async function deleteSection(patternId, sectionId) {
    if (!confirm('Delete this section? All player access to it will also be removed.')) return;
    try {
        const response = await fetch(`/api/primal-patterns/${patternId}/sections/${sectionId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        openSections.delete(sectionId);
        await renderPatternDetail(patternId);
    } catch (err) {
        alert('Failed to delete section: ' + err.message);
    }
}

function openAddSectionModal(patternId) {
    showModal('Add Section', `
        <form onsubmit="handleAddSection(event, ${patternId}); return false;">
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="new-sec-title" required placeholder="e.g. Mechanics, Lore, Secrets">
            </div>
            <div class="form-group">
                <label>Section Key *</label>
                <input type="text" id="new-sec-key" required placeholder="e.g. mechanics, lore, secrets">
                <small style="color:#888; display:block; margin-top:4px;">Use <strong>secrets</strong> to mark this section as DM-only (not shareable with players).</small>
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" id="new-sec-order" value="10" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Add Section</button>
            </div>
        </form>
    `);
}

async function handleAddSection(event, patternId) {
    event.preventDefault();
    const title = document.getElementById('new-sec-title').value.trim();
    const sectionKey = document.getElementById('new-sec-key').value.trim().toLowerCase();
    const sectionOrder = parseInt(document.getElementById('new-sec-order').value) || 10;

    try {
        const response = await fetch(`/api/primal-patterns/${patternId}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, section_key: sectionKey, section_order: sectionOrder })
        });
        if (!response.ok) throw new Error('Failed to add section');
        closeModal();
        await renderPatternDetail(patternId);
    } catch (err) {
        alert('Failed to add section: ' + err.message);
    }
}

function openEditPatternModal(patternId) {
    const pattern = primalPatterns.find(p => p.id === patternId);
    if (!pattern) return;

    const roleOptions = ['unknown', 'mother', 'father', 'embodiment', 'guardian', 'avatar', 'bound'];

    showModal('Edit Pattern', `
        <form onsubmit="handleEditPattern(event, ${patternId}); return false;">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="edit-pat-name" required value="${escHtml(pattern.name)}">
            </div>
            <div class="form-group">
                <label>Also Known As</label>
                <input type="text" id="edit-pat-aka" value="${escHtml(pattern.also_known_as || '')}">
            </div>
            <div class="form-group">
                <label>Origin Figure</label>
                <input type="text" id="edit-pat-origin" value="${escHtml(pattern.origin_figure || '')}">
            </div>
            <div class="form-group">
                <label>Primal Animal</label>
                <input type="text" id="edit-pat-animal" value="${escHtml(pattern.spirit_animal || '')}">
            </div>
            <div class="form-group">
                <label>Animal Role</label>
                <select id="edit-pat-role">
                    ${roleOptions.map(r => `<option value="${r}" ${pattern.spirit_animal_role === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Display Order</label>
                <input type="number" id="edit-pat-order" value="${pattern.display_order || 0}" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Changes</button>
            </div>
        </form>
    `);
}

async function handleEditPattern(event, patternId) {
    event.preventDefault();
    const data = {
        name: document.getElementById('edit-pat-name').value.trim(),
        also_known_as: document.getElementById('edit-pat-aka').value.trim() || null,
        origin_figure: document.getElementById('edit-pat-origin').value.trim() || null,
        spirit_animal: document.getElementById('edit-pat-animal').value.trim() || null,
        spirit_animal_role: document.getElementById('edit-pat-role').value,
        display_order: parseInt(document.getElementById('edit-pat-order').value) || 0
    };

    try {
        const response = await fetch(`/api/primal-patterns/${patternId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Update failed');
        closeModal();
        await loadPrimalPatterns();
    } catch (err) {
        alert('Failed to update pattern: ' + err.message);
    }
}

function openCreatePatternModal() {
    const roleOptions = ['unknown', 'mother', 'father', 'embodiment', 'guardian', 'avatar', 'bound'];

    showModal('Create New Pattern', `
        <form onsubmit="handleCreatePattern(event); return false;">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="new-pat-name" required placeholder="e.g. The Pattern of Shadow Earth">
            </div>
            <div class="form-group">
                <label>Also Known As</label>
                <input type="text" id="new-pat-aka" placeholder="Alternative names, comma-separated">
            </div>
            <div class="form-group">
                <label>Origin Figure</label>
                <input type="text" id="new-pat-origin" placeholder="Who inscribed or created it?">
            </div>
            <div class="form-group">
                <label>Primal Animal</label>
                <input type="text" id="new-pat-animal" placeholder="The bound spirit animal">
            </div>
            <div class="form-group">
                <label>Animal Role</label>
                <select id="new-pat-role">
                    ${roleOptions.map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary">Create Pattern</button>
            </div>
        </form>
    `);
}

async function handleCreatePattern(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('new-pat-name').value.trim(),
        also_known_as: document.getElementById('new-pat-aka').value.trim() || null,
        origin_figure: document.getElementById('new-pat-origin').value.trim() || null,
        spirit_animal: document.getElementById('new-pat-animal').value.trim() || null,
        spirit_animal_role: document.getElementById('new-pat-role').value
    };

    if (!data.name) { alert('Name is required.'); return; }

    try {
        const response = await fetch('/api/primal-patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Create failed');
        const created = await response.json();
        closeModal();
        await loadPrimalPatterns();
        await selectPattern(created.id);
    } catch (err) {
        alert('Failed to create pattern: ' + err.message);
    }
}

async function deletePattern(patternId) {
    const pattern = primalPatterns.find(p => p.id === patternId);
    if (!confirm(`Delete "${pattern?.name || 'this pattern'}" and all its sections? This cannot be undone.`)) return;
    try {
        const response = await fetch(`/api/primal-patterns/${patternId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        activePatternId = null;
        const dv = document.getElementById('pattern-detail-view');
        if (dv) dv.innerHTML = '';
        await loadPrimalPatterns();
    } catch (err) {
        alert('Failed to delete pattern: ' + err.message);
    }
}
