// player-core.js — split from player-dashboard.js (behavior unchanged)
// Player Dashboard JavaScript

let currentUser = null;
let currentCharacter = null;
let userCharacters = [];
let playerAllShadows = [];

// Human label for imprint values: 0/1 booleans or legacy strings like "Basic"
function imprintLabel(v) {
    if (!v) return 'None';
    return typeof v === 'string' ? escHtmlP(v) : 'Yes';
}

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

        // Admin belongs in the admin panel, not here
        if (currentUser.is_admin || currentUser.username === 'admin') {
            window.location.href = '/admin.html';
            return;
        }

        // Display username (backup if navigation hasn't loaded yet)
        const usernameEl = document.getElementById('username-display');
        if (usernameEl) {
            usernameEl.textContent = currentUser.username;
        }

        // Unlock "Create New Character" if the player has acknowledged the guide
        applyGuideGate();

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
    } else if (tabName === 'shadows') {
        syncSpoilerButton();
        loadVisitedShadows();
    } else if (tabName === 'sessions') {
        loadStoryTimeline();
    }
}

