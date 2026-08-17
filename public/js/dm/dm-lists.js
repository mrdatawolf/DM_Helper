// dm-lists.js — split from app.js (behavior unchanged)
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

    let filtered = shadows;
    if (shadowActiveFilter !== 'All') {
        filtered = filtered.filter(s => {
            const label = patternInfluenceLabel(s.pattern_influence) || s.pattern_influence || 'None';
            return shadowActiveFilter === 'None'
                ? (!s.pattern_influence || s.pattern_influence === 'None')
                : label === shadowActiveFilter || s.pattern_influence === shadowActiveFilter;
        });
    }
    if (shadowSearchQuery) {
        filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(shadowSearchQuery));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${shadows.length === 0 ? 'No shadows yet' : 'No shadows match'}</h3></div>`;
        return;
    }

    container.innerHTML = filtered.map(shadow => {
        const infLabel = patternInfluenceLabel(shadow.pattern_influence) || shadow.pattern_influence || 'None';
        const cardStyle = shadowInfluenceCardStyle(shadow.pattern_influence);
        const canModify = !!currentUser && (currentUser.is_super_admin || shadow.created_by === currentUser.id);
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
        const res = await fetch(`${API_BASE}/shadows/${shadowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_spoiler: newValue })
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update shadow');
        const updated = await res.json();
        const idx = shadows.findIndex(s => s.id === shadowId);
        if (idx !== -1) shadows[idx] = { ...shadows[idx], is_spoiler: updated.is_spoiler };
        renderShadows();
    } catch (err) {
        console.error('Error toggling shadow spoiler:', err);
        showToast(`Failed to update shadow: ${err.message}`);
    }
}

function setShadowFilter(filter, btn) {
    shadowActiveFilter = filter;
    document.querySelectorAll('.shadow-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderShadows();
}

function filterShadows() {
    shadowSearchQuery = (document.getElementById('shadow-search').value || '').toLowerCase();
    renderShadows();
}

function shadowInfluenceCardStyle(val) {
    const label = patternInfluenceLabel(val) || val || 'None';
    const map = {
        'Pattern':        ['rgba(22,160,133,0.13)',  'rgba(22,160,133,0.5)'],
        'Argent Refrain': ['rgba(90,90,154,0.13)',   'rgba(90,90,154,0.5)'],
        'Logrus':         ['rgba(192,57,43,0.13)',   'rgba(192,57,43,0.5)'],
        'Nexus':          ['rgba(184,134,11,0.13)',  'rgba(184,134,11,0.5)'],
        'Mixed':          ['rgba(142,68,173,0.13)',  'rgba(142,68,173,0.5)'],
    };
    const colors = map[label];
    if (!colors) return '';
    return `background:${colors[0]};border-left:4px solid ${colors[1]};`;
}

// Creatures & NPCs
function renderCreatures() {
    const container = document.getElementById('creatures-list');
    if (!container) return;

    let filtered = npcs;
    if (creatureActiveFilter !== 'All') {
        filtered = filtered.filter(n => (n.role || 'Other') === creatureActiveFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><h3>${npcs.length === 0 ? 'No creatures or NPCs yet' : 'No creatures match'}</h3></div>`;
        return;
    }

    const shadowName = id => (shadows.find(s => s.id === id) || {}).name || 'Unknown';

    container.innerHTML = filtered.map(n => {
        const cardStyle = shadowInfluenceCardStyle(n.influence);
        const stats = n.stats || {};
        const abilities = stats.abilities || {};
        const abilityRow = ['str', 'dex', 'con', 'int', 'wis', 'cha']
            .filter(k => abilities[k] !== undefined)
            .map(k => `${k.toUpperCase()} ${abilities[k]}`).join(' · ');

        return `
        <div class="card" style="${cardStyle}">
            <h3>${escHtml(n.name)}${n.creature_type && n.creature_type !== n.name ? ` <span style="font-weight:400;color:#888;font-size:0.85em">(${escHtml(n.creature_type)})</span>` : ''}</h3>
            <div class="card-row"><span class="card-label">Role:</span><span class="card-value">${escHtml(n.role || '—')}</span></div>
            <div class="card-row"><span class="card-label">Shadow:</span><span class="card-value">${escHtml(shadowName(n.shadow_id))}</span></div>
            ${stats.size_type ? `<div class="card-row"><span class="card-label">Type:</span><span class="card-value">${escHtml(stats.size_type)}${n.alignment ? `, ${escHtml(n.alignment)}` : ''}</span></div>` : ''}
            <div class="stat-block">
                <div class="stat"><div class="stat-label">AC</div><div class="stat-value">${n.armor_class ?? '—'}</div></div>
                <div class="stat"><div class="stat-label">HP</div><div class="stat-value">${n.hit_points ?? '—'}</div></div>
                <div class="stat"><div class="stat-label">CR</div><div class="stat-value">${escHtml(stats.challenge_rating || '—')}</div></div>
            </div>
            ${abilityRow ? `<p style="font-size:0.85em;color:#666">${abilityRow}</p>` : ''}
            ${n.description ? `<p>${escHtml(n.description)}</p>` : ''}
            <div class="card-row"><span class="card-label">Order/Chaos:</span><span class="card-value">${n.order_chaos_value ?? 50}/100</span></div>
            <div class="card-row"><span class="card-label">Influence:</span><span class="card-value">${escHtml(patternInfluenceLabel(n.influence) || n.influence || 'None')}</span></div>
            ${(stats.traits && stats.traits.length) || (stats.actions && stats.actions.length) || (stats.reactions && stats.reactions.length) || (stats.lore && stats.lore.length) ? `
            <details style="margin-top:8px">
                <summary style="cursor:pointer;font-weight:600">Full Stat Block</summary>
                ${stats.speed ? `<p><strong>Speed</strong> ${escHtml(stats.speed)}</p>` : ''}
                ${stats.skills ? `<p><strong>Skills</strong> ${escHtml(stats.skills)}</p>` : ''}
                ${stats.damage_immunities ? `<p><strong>Damage Immunities</strong> ${escHtml(stats.damage_immunities)}</p>` : ''}
                ${stats.condition_immunities ? `<p><strong>Condition Immunities</strong> ${escHtml(stats.condition_immunities)}</p>` : ''}
                ${stats.senses ? `<p><strong>Senses</strong> ${escHtml(stats.senses)}</p>` : ''}
                ${stats.languages ? `<p><strong>Languages</strong> ${escHtml(stats.languages)}</p>` : ''}
                ${(stats.traits || []).length ? `<p><strong>Traits</strong></p><ul>${stats.traits.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` : ''}
                ${(stats.actions || []).length ? `<p><strong>Actions</strong></p><ul>${stats.actions.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` : ''}
                ${(stats.reactions || []).length ? `<p><strong>Reactions</strong></p><ul>${stats.reactions.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` : ''}
                ${(stats.lore || []).length ? `<p><strong>Lore</strong></p><ul>${stats.lore.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>` : ''}
            </details>` : ''}
            ${n.dm_notes ? `<p style="margin-top:8px;font-size:0.85em;color:#a67c00"><strong>DM Notes:</strong> ${escHtml(n.dm_notes)}</p>` : ''}
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                ${n.is_important ? '<span class="badge badge-starting">Important</span>' : ''}
                <span class="badge" style="background:${n.is_spoiler ? 'rgba(142,68,173,0.2);color:#8e44ad' : 'rgba(0,0,0,0.07);color:#888'};cursor:pointer"
                    onclick="toggleCreatureSpoiler(${n.id}, ${n.is_spoiler ? 0 : 1})"
                    title="${n.is_spoiler ? 'Click to remove spoiler flag' : 'Click to mark as spoiler'}">
                    ${n.is_spoiler ? '🔒 Spoiler' : '🔓 Not Spoiler'}
                </span>
            </div>
            <div style="margin-top:10px">
                <button class="btn-secondary" onclick="editCreature(${n.id})">Edit</button>
                <button class="btn-secondary btn-danger" onclick="deleteCreature(${n.id})">Delete</button>
            </div>
        </div>`;
    }).join('');
}

async function toggleCreatureSpoiler(id, newValue) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/npcs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ is_spoiler: newValue })
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update creature');
        const updated = await res.json();
        const idx = npcs.findIndex(n => n.id === id);
        if (idx !== -1) npcs[idx] = { ...npcs[idx], is_spoiler: updated.is_spoiler };
        renderCreatures();
    } catch (err) {
        console.error('Error toggling creature spoiler:', err);
        showToast(`Failed to update creature: ${err.message}`);
    }
}

function setCreatureFilter(filter, btn) {
    creatureActiveFilter = filter;
    document.querySelectorAll('.creature-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCreatures();
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

    const statusColors = { planned:'#8a7a5a', 'in-progress':'#2980b9', completed:'#27ae60' };
    container.innerHTML = sessions.map(session => {
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
        characters.map(char => `<option value="${char.id}">${escHtml(char.name)}</option>`).join('');
}

