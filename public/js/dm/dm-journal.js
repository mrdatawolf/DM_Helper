// dm-journal.js — split from app.js (behavior unchanged)
// ========== JOURNAL FUNCTIONS ==========

// Update journal filter dropdown
function updateJournalFilter() {
    const select = document.getElementById('journal-filter-character');
    if (!select) return;

    select.innerHTML = '<option value="">All Characters</option>' +
        characters.map(char => `<option value="${char.id}">${escHtml(char.name)}</option>`).join('');
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
                            <h3>${escHtml(entry.title)}</h3>
                            <span class="entry-meta">
                                ${escHtml(entry.character_name)} • ${new Date(entry.created_at).toLocaleDateString()}
                                ${entry.is_public ? '<span class="public-badge">Public</span>' : '<span class="private-badge">Private</span>'}
                            </span>
                        </div>
                        <div class="entry-actions">
                            <button class="btn-secondary btn-sm" onclick="editJournalEntry(${entry.id})">Edit</button>
                            <button class="btn-secondary btn-sm" onclick="deleteJournalEntry(${entry.id})">Delete</button>
                        </div>
                    </div>
                    <div class="entry-content">
                        <p>${escHtml(entry.content)}</p>
                    </div>
                    <div class="entry-footer">
                        <small>By ${escHtml(entry.author_username)}</small>
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
                    ${characters.map(char => `<option value="${char.id}">${escHtml(char.name)}</option>`).join('')}
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
        showToast('Please select a character');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!title || title.trim() === '') {
        showToast('Please enter a title');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
        return;
    }

    if (!content || content.trim() === '') {
        showToast('Please enter content for the journal entry');
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
        showToast('Journal entry saved successfully!');

    } catch (error) {
        console.error('Error creating journal entry:', error);
        console.error('Full error details:', error);
        showToast(`Failed to save journal entry: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Entry';
    }
}

// Edit journal entry
async function editJournalEntry(entryId) {
    const entry = journalEntries.find(e => e.id === entryId);
    if (!entry) {
        showToast('Journal entry not found');
        return;
    }

    const modalContent = `
        <form id="journal-edit-form" onsubmit="handleJournalUpdate(event, ${entryId}); return false;">
            <div class="form-group">
                <label for="edit-journal-character">Character *</label>
                <select id="edit-journal-character" required>
                    <option value="">Select a character...</option>
                    ${characters.map(char => `<option value="${char.id}" ${char.id === entry.character_id ? 'selected' : ''}>${escHtml(char.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="edit-journal-title">Title *</label>
                <input type="text" id="edit-journal-title" required placeholder="What happened?" value="${escHtml(entry.title)}">
            </div>
            <div class="form-group">
                <label for="edit-journal-content">Entry *</label>
                <textarea id="edit-journal-content" rows="8" required>${escHtml(entry.content)}</textarea>
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
        showToast('Journal entry updated successfully!');

    } catch (error) {
        console.error('Error updating journal entry:', error);
        showToast(`Failed to update journal entry: ${error.message}`);
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
        showToast('Journal entry deleted successfully!');

    } catch (error) {
        console.error('Error deleting journal entry:', error);
        showToast(`Failed to delete journal entry: ${error.message}`);
    }
}

