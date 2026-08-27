// player-account.js — split from player-dashboard.js (behavior unchanged)
import { closeCreateCharacter } from './player-wizard-core.js';
import { closeJournalEntry } from './player-journal.js';
import { closeEditCharacter } from './player-edit-form.js';

// Logout
async function handleLogout() {
    const token = localStorage.getItem('token');

    try {
        await apiFetch('/api/auth/logout', {
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

