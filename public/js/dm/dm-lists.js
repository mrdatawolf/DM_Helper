// dm-lists.js — split from app.js (behavior unchanged)
import { state, API_BASE } from './dm-state.js';
import { patternInfluenceLabel, shadowBalanceBar, shadowBarClass, shadowBarLabel } from './dm-primal-patterns.js';
import { updateJournalFilter } from './dm-journal.js';
import { renderCreatureCard, shadowInfluenceCardStyle } from './dm-creature-card.js';
import { showModal } from './dm-modal-utils.js';

// Characters
async function loadCharacters() {
    try {
        state.characters = await apiFetch(`${API_BASE}/characters`);
        renderCharacters();
        updateProgressFilter();
        updateJournalFilter();
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

function renderCharacters() {
    const container = document.getElementById('characters-list');
    if (state.characters.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No characters yet</h3><p>Create your first character to begin</p></div>';
        return;
    }

    container.innerHTML = state.characters.map(char => `
        <div class="card">
            <h3>${escHtml(char.name)}</h3>
            <div class="card-row">
                <span class="card-label">Player:</span>
                <span class="card-value">${escHtml(char.player_name) || 'NPC'}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Race/Class:</span>
                <span class="card-value">${escHtml(char.species)} ${escHtml(char.class_type)}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Level:</span>
                <span class="card-value">${char.level}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Origin:</span>
                <span class="card-value">${escHtml(char.shadow_origin_name) || 'Unknown'}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Current Location:</span>
                <span class="card-value">${escHtml(char.current_shadow_name) || 'Unknown'}</span>
            </div>
            <div class="stat-block">
                <div class="stat">
                    <div class="stat-label">HP</div>
                    <div class="stat-value">${char.current_hp}/${char.max_hp}</div>
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
            <div class="card-row" style="align-items:center">
                <span class="card-label" style="white-space:nowrap;margin-right:8px">Order/Chaos:</span>
                <div class="balance-bar" style="background:linear-gradient(90deg,#3498db ${char.order_chaos_value}%,#e74c3c ${char.order_chaos_value}%)"></div>
            </div>
            ${char.pattern_imprint ? '<span class="badge badge-pattern">Pattern</span>' : ''}
            ${char.logrus_imprint ? '<span class="badge badge-logrus">Logrus</span>' : ''}
            ${char.trump_artist ? '<span class="badge">Trump Artist</span>' : ''}
            <div style="margin-top: 15px;">
                <button class="btn-secondary" onclick="viewCharacter(${char.id})">View Details</button>
                <button class="btn-secondary" onclick="viewCharacterAs(${char.id})">View As...</button>
                <button class="btn-secondary" onclick="editCharacter(${char.id})">Edit</button>
                <button class="btn-secondary btn-danger" onclick="deleteCharacter(${char.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Shadows
async function loadShadows() {
    try {
        state.shadows = await apiFetch(`${API_BASE}/shadows`);
        renderShadows();
    } catch (error) {
        console.error('Error loading shadows:', error);
    }
}

function renderShadows() {
    const container = document.getElementById('shadows-list');

    let filtered = state.shadows;
    if (state.shadowActiveFilter !== 'All') {
        filtered = filtered.filter(s => {
            const label = patternInfluenceLabel(s.pattern_influence) || s.pattern_influence || 'None';
            return state.shadowActiveFilter === 'None'
                ? (!s.pattern_influence || s.pattern_influence === 'None')
                : label === state.shadowActiveFilter || s.pattern_influence === state.shadowActiveFilter;
        });
    }
    if (state.shadowSearchQuery) {
        filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(state.shadowSearchQuery));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${state.shadows.length === 0 ? 'No shadows yet' : 'No shadows match'}</h3></div>`;
        return;
    }

    container.innerHTML = filtered.map(shadow => {
        const infLabel = patternInfluenceLabel(shadow.pattern_influence) || shadow.pattern_influence || 'None';
        const cardStyle = shadowInfluenceCardStyle(shadow.pattern_influence);
        const canModify = !!state.currentUser && (state.currentUser.is_super_admin || shadow.created_by === state.currentUser.id);
        return `
        <div class="card" style="${cardStyle}">
            <h3>${escHtml(shadow.name)}</h3>
            <p>${escHtml(shadow.description) || 'No description'}</p>
            <div class="card-row">
                <span class="card-label">Influence:</span>
                <strong style="font-size:0.9rem">${escHtml(infLabel)}</strong>
            </div>
            <div class="card-row" style="align-items:center">
                <span class="card-label" style="white-space:nowrap;margin-right:8px">${shadowBarLabel(shadow)}</span>
                <div class="${shadowBarClass(shadow)}" style="${shadowBalanceBar(shadow)}"></div>
            </div>
            ${shadow.corruption_status ? `<p><strong>Corruption:</strong> ${escHtml(shadow.corruption_status)}</p>` : ''}
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                ${shadow.is_starting_shadow ? '<span class="badge badge-starting">Starting World</span>' : ''}
                <span class="badge" style="background:${shadow.is_spoiler ? 'rgba(142,68,173,0.2);color:#8e44ad' : 'rgba(0,0,0,0.07);color:#888'};${canModify ? 'cursor:pointer' : ''}"
                    ${canModify ? `onclick="toggleShadowSpoiler(${shadow.id}, ${shadow.is_spoiler ? 0 : 1})"` : ''}
                    title="${canModify ? (shadow.is_spoiler ? 'Click to remove spoiler flag' : 'Click to mark as spoiler') : (shadow.is_spoiler ? 'Spoiler' : 'Not spoiler')}">
                    ${shadow.is_spoiler ? '🔒 Spoiler' : '🔓 Not Spoiler'}
                </span>
            </div>
            <div style="margin-top:10px">
                <button class="btn-secondary" onclick="viewShadowLore(${shadow.id}, '${escHtml(shadow.name).replace(/'/g, "\\'")}')">View Full Lore</button>
                ${canModify ? `<button class="btn-secondary" onclick="editShadow(${shadow.id})">Edit</button>` : ''}
                ${canModify ? `<button class="btn-secondary btn-danger" onclick="deleteShadow(${shadow.id})">Delete</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

async function toggleShadowSpoiler(shadowId, newValue) {
    const token = localStorage.getItem('token');
    try {
        const updated = await apiFetch(`${API_BASE}/shadows/${shadowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_spoiler: newValue })
        });
        const idx = state.shadows.findIndex(s => s.id === shadowId);
        if (idx !== -1) state.shadows[idx] = { ...state.shadows[idx], is_spoiler: updated.is_spoiler };
        renderShadows();
    } catch (err) {
        console.error('Error toggling shadow spoiler:', err);
        showToast(`Failed to update shadow: ${err.message}`);
    }
}

function setShadowFilter(filter, btn) {
    state.shadowActiveFilter = filter;
    document.querySelectorAll('.shadow-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderShadows();
}

function filterShadows() {
    state.shadowSearchQuery = (document.getElementById('shadow-search').value || '').toLowerCase();
    renderShadows();
}

// Creatures & NPCs
function renderCreatures() {
    const container = document.getElementById('creatures-list');
    if (!container) return;

    let filtered = state.npcs;
    if (state.creatureActiveFilter !== 'All') {
        filtered = filtered.filter(n => (n.role || 'Other') === state.creatureActiveFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${state.npcs.length === 0 ? 'No creatures or NPCs yet' : 'No creatures match'}</h3></div>`;
        return;
    }

    const shadowName = id => (state.shadows.find(s => s.id === id) || {}).name || 'Unknown';

    container.innerHTML = filtered.map(n => renderCreatureCard(n, shadowName)).join('');
}

function viewCharacterAs(characterId) {
    const character = state.characters.find(item => item.id === characterId);
    if (!character) return;
    showModal(`View ${character.name} As...`, CharacterSystemRegistry.renderSystemPicker('selectCharacterSystem', characterId));
}

function selectCharacterSystem(characterId, systemId) {
    const character = state.characters.find(item => item.id === characterId);
    const system = CharacterSystemRegistry.getCharacterSystem(systemId);
    if (!character || !system) return;
    showModal(`${character.name} — ${system.label}`, system.render(character));
}

async function toggleCreatureSpoiler(id, newValue) {
    const token = localStorage.getItem('token');
    try {
        const updated = await apiFetch(`${API_BASE}/npcs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_spoiler: newValue })
        });
        const idx = state.npcs.findIndex(n => n.id === id);
        if (idx !== -1) state.npcs[idx] = { ...state.npcs[idx], is_spoiler: updated.is_spoiler };
        renderCreatures();
    } catch (err) {
        console.error('Error toggling creature spoiler:', err);
        showToast(`Failed to update creature: ${err.message}`);
    }
}

function setCreatureFilter(filter, btn) {
    state.creatureActiveFilter = filter;
    document.querySelectorAll('.creature-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCreatures();
}

// Sessions
async function loadSessions() {
    try {
        state.sessions = await apiFetch(`${API_BASE}/sessions`);
        renderSessions();
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function renderSessions() {
    const container = document.getElementById('sessions-list');
    if (state.sessions.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No sessions yet</h3></div>';
        return;
    }

    const statusColors = { planned:'#8a7a5a', 'in-progress':'#2980b9', completed:'#27ae60' };
    container.innerHTML = state.sessions.map(session => {
        const sc = session.session_characters || [];
        const charBadges = sc.map(c =>
            `<span class="badge" style="font-size:0.75em;margin-right:3px;background:${c.attendance==='absent'?'#fde':'#f5efe0'};color:${c.attendance==='absent'?'#a33':'#555'}">${escHtml(c.character_name)}</span>`
        ).join('');
        const statusLabel = { planned:'Planned', 'in-progress':'In Progress', completed:'Completed' }[session.session_status] || '';
        const statusColor = statusColors[session.session_status] || '#888';
        const chapterLine = (session.session_chapters || []).length
            ? (session.session_chapters).map(sc =>
                `<span style="color:#888;font-size:0.82em">${escHtml(sc.character_name || '—')} › ${escHtml(sc.arc_title)} › ${escHtml(sc.chapter_title)}</span>`
              ).join('<br>')
            : '';
        return `
        <div class="session-card">
            <div class="session-header">
                <div>
                    <h3>Session ${session.session_number}: ${escHtml(session.session_title) || 'Untitled'}</h3>
                    <p style="color:#666;margin-top:3px;font-size:0.9em">
                        ${new Date(session.session_date).toLocaleDateString()}
                        &nbsp;·&nbsp;<span style="color:${statusColor};font-weight:600">${statusLabel}</span>
                    </p>
                    ${chapterLine ? `<p style="margin-top:2px">${chapterLine}</p>` : ''}
                </div>
                <div>
                    <button class="btn-secondary" onclick="editSession(${session.id})">Edit</button>
                    <button class="btn-secondary btn-danger" onclick="deleteSession(${session.id})">Delete</button>
                </div>
            </div>
            ${charBadges ? `<div style="margin-top:8px">${charBadges}</div>` : ''}
            ${session.opening_notes ? `<p style="margin-top:8px;color:#555;font-size:0.9em"><strong>Opening:</strong> ${escHtml(session.opening_notes)}</p>` : ''}
        </div>`;
    }).join('');
}

// Progress
async function loadProgress() {
    try {
        const charFilter = document.getElementById('progress-filter-character')?.value || '';
        const url = charFilter ? `${API_BASE}/progress?character_id=${charFilter}` : `${API_BASE}/progress`;
        state.progress = await apiFetch(url);
        renderProgress();
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function renderProgress() {
    const container = document.getElementById('progress-list');
    if (state.progress.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No progress entries yet</h3></div>';
        return;
    }

    container.innerHTML = state.progress.map(entry => `
        <div class="progress-entry">
            <h4>${escHtml(entry.character_name)} - Session ${entry.session_number}: ${escHtml(entry.session_title) || 'Untitled'}</h4>
            <p><strong>Summary:</strong> ${escHtml(entry.summary)}</p>
            <div class="progress-meta">
                <span>📅 ${new Date(entry.session_date).toLocaleDateString()}</span>
                <span>🗺️ ${escHtml(entry.shadow_name) || 'Unknown shadow'}</span>
                ${entry.feats_earned > 0 ? `<span>⭐ ${entry.feats_earned} feat(s) earned</span>` : ''}
                ${entry.experience_gained > 0 ? `<span>📈 ${entry.experience_gained} XP</span>` : ''}
                ${entry.is_solo_session ? '<span>👤 Solo Session</span>' : '<span>👥 Group Session</span>'}
            </div>
            ${entry.story_beats ? `<p><strong>Key Moments:</strong> ${escHtml(entry.story_beats)}</p>` : ''}
            ${entry.npcs_met ? `<p><strong>NPCs Met:</strong> ${escHtml(entry.npcs_met)}</p>` : ''}
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
        state.characters.map(char => `<option value="${char.id}">${escHtml(char.name)}</option>`).join('');
}

// Referenced from generated onclick="..." HTML and the dashboard's own
// static HTML (see ADR-001).
Object.assign(window, {
    filterShadows, loadProgress, setCreatureFilter, setShadowFilter,
    selectCharacterSystem, toggleCreatureSpoiler, toggleShadowSpoiler, viewCharacterAs,
});

// Used by dm-core.js, dm-modals.js, and dm-editors.js.
export { loadCharacters, loadShadows, loadSessions, loadProgress, renderCreatures };

