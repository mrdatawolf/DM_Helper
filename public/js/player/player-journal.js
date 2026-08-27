// player-journal.js — split from player-dashboard.js (behavior unchanged)
import { state } from './player-state.js';

// Load journal entries
async function loadJournalEntries() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('journal-content');

    try {
        const data = await apiFetch('/api/journal/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
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
                            <h3>${escHtml(entry.title)}</h3>
                            <span class="entry-meta">
                                ${escHtml(entry.character_name)} • ${new Date(entry.created_at).toLocaleDateString()}
                                ${entry.is_public ? '<span class="public-badge">Public</span>' : '<span class="private-badge">Private</span>'}
                            </span>
                        </div>
                        <div class="entry-content">
                            <p>${escHtml(entry.content)}</p>
                        </div>
                        <div class="entry-footer">
                            <small>By ${escHtml(entry.author_username)}</small>
                            ${entry.user_id === state.currentUser.id ? `
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
    state.userCharacters.forEach(char => {
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
        await apiFetch('/api/journal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entryData)
        });

        // Close modal
        closeJournalEntry();

        // Reload journal entries
        await loadJournalEntries();

        // Show success message
        showToast('Journal entry saved successfully!');

    } catch (error) {
        console.error('Error creating journal entry:', error);
        showToast(`Failed to save journal entry: ${error.message}`);
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
        await apiFetch(`/api/journal/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Reload journal entries
        await loadJournalEntries();

        showToast('Journal entry deleted successfully!');

    } catch (error) {
        console.error('Error deleting journal entry:', error);
        showToast(`Failed to delete journal entry: ${error.message}`);
    }
}

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, { closeJournalEntry, deleteJournalEntry, openNewJournalEntry });

// Used by other player-*.js modules.
export { loadJournalEntries, closeJournalEntry };

// ========== CHARACTER EDIT FUNCTIONS ==========

