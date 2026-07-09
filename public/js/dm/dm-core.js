// dm-core.js — split from app.js (behavior unchanged)
// API Base URL
const API_BASE = '/api';

// State
let characters = [];
let shadows = [];
let shadowActiveFilter = 'All';
let shadowSearchQuery  = '';
let sessions = [];
let progress = [];
let journalEntries = [];
let primalPatterns = [];
let activePatternId = null;
const openSections = new Set();
let sectionGrantsCache = {};

let storyArcs = [];
let activeArcId = null;
let beats = [];
let npcs  = [];
let grandNarrative = {};

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
    if (tabName === 'story-arcs') {
        loadStoryArcs();
    }
    if (tabName === 'sessions') {
        loadDMScenes();
    }
}

// Load all data
async function loadAllData() {
    await Promise.all([
        loadCharacters(),
        loadShadows(),
        loadSessions(),
        loadProgress(),
        loadBeats(),
        loadNpcs(),
        prefetchArcs(),
        loadDMScenes()
    ]);
}

async function loadBeats() {
    try {
        const r = await fetch(`${API_BASE}/beats`);
        beats = await r.json();
    } catch (e) { console.error('Error loading beats:', e); }
}

async function loadNpcs() {
    try {
        const r = await fetch(`${API_BASE}/npcs`);
        npcs = await r.json();
    } catch (e) { console.error('Error loading npcs:', e); }
}

async function prefetchArcs() {
    try {
        const r = await fetch(`${API_BASE}/arcs`);
        storyArcs = await r.json();
    } catch (e) { console.error('Error prefetching arcs:', e); }
}

function buildChapterPicker(selectedIds = new Set()) {
    if (!storyArcs.length) return '<em style="color:#999">No arcs yet — create arcs and chapters first.</em>';

    const byChar = {};
    for (const arc of storyArcs) {
        if (!(arc.chapters || []).length) continue;
        const key = arc.character_name || 'World / General';
        if (!byChar[key]) byChar[key] = [];
        byChar[key].push(arc);
    }
    if (!Object.keys(byChar).length) return '<em style="color:#999">No chapters yet — add chapters to arcs first.</em>';

    return Object.entries(byChar).map(([charName, arcs]) => `
        <div style="margin-bottom:10px">
            <div style="font-weight:600;color:#5a4a2a;margin-bottom:4px">${escHtml(charName)}</div>
            ${arcs.map(arc => `
                <div style="margin-left:12px;margin-bottom:4px">
                    <div style="font-style:italic;color:#888;font-size:0.85em;margin-bottom:2px">${escHtml(arc.title)}</div>
                    ${(arc.chapters || []).map(ch => `
                        <label style="display:flex;align-items:center;gap:6px;margin-left:12px;font-size:0.9em;cursor:pointer;padding:2px 0">
                            <input type="checkbox" class="chapter-check" value="${ch.id}"${selectedIds.has(ch.id) ? ' checked' : ''}>
                            <span>${escHtml(ch.title)}</span>
                            <span style="color:#aaa;font-size:0.8em">(${ch.status})</span>
                        </label>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `).join('');
}

