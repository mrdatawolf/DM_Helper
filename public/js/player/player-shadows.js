// player-shadows.js — split from player-dashboard.js (behavior unchanged)
// ── Known Shadows ─────────────────────────────────────────────────────────────
import { state } from './player-state.js';
import { wizardFocusField, wizardBlurField, _fieldInfoForElement } from './player-wizard-core.js';

async function loadVisitedShadows() {
    const container = document.getElementById('player-shadows-list');
    if (!state.currentCharacter) {
        container.innerHTML = '<div class="info-message"><p>Select a character from "My Characters" to see the shadows they have felt.</p></div>';
        return;
    }
    container.innerHTML = '<div class="loading">Loading shadows…</div>';
    try {
        const token = localStorage.getItem('token');
        const fetches = [
            apiFetch(`/api/shadows/character/${state.currentCharacter.id}/visited`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ];
        if (state.currentCharacter.shadow_origin_id) {
            fetches.push(apiFetch(`/api/shadows/${state.currentCharacter.shadow_origin_id}`));
        }
        const currentIsDifferent = state.currentCharacter.current_shadow_id &&
            state.currentCharacter.current_shadow_id !== state.currentCharacter.shadow_origin_id;
        if (currentIsDifferent) {
            fetches.push(apiFetch(`/api/shadows/${state.currentCharacter.current_shadow_id}`));
        }
        const [visited, originShadow, currentShadow] = await Promise.all(fetches);
        renderVisitedShadows(visited, originShadow || null, currentShadow || null);
    } catch (err) {
        console.error('Error loading visited shadows:', err);
        container.innerHTML = '<div class="info-message"><p>Could not load shadow data.</p></div>';
    }
}

function renderVisitedShadows(visited, originShadow, currentShadow) {
    const container = document.getElementById('player-shadows-list');
    const hasOrigin = !!originShadow;
    const hasCurrent = !!currentShadow;

    const addButton = !hasOrigin ? `
        <div style="margin-bottom:20px">
            <button class="btn-secondary" onclick="showAddKnownShadowPanel()">+ Add Known Shadow</button>
        </div>` : '';

    if (!hasOrigin && !hasCurrent && !visited.length) {
        container.innerHTML = `
            ${addButton}
            <div class="info-message"><p>No shadows have left their mark on this character yet. Participate in sessions to begin feeling the worlds you pass through.</p></div>`;
        return;
    }

    const originCard = hasOrigin ? renderOriginShadowCard(originShadow) : '';
    const currentCard = hasCurrent ? renderCurrentShadowCard(currentShadow) : '';

    const pinnedIds = new Set([
        hasOrigin ? originShadow.id : null,
        hasCurrent ? currentShadow.id : null,
    ].filter(Boolean));

    const showSpoilers = localStorage.getItem('showSpoilers') === 'true';
    const visitedCards = visited
        .filter(s => !pinnedIds.has(s.id))
        .map(s => {
            const style = visitedShadowCardStyle(s.pattern_influence);
            const infLabel = visitedInfluenceLabel(s.pattern_influence);
            const depth = shadowDepth(s.visit_count);
            const balanceBar = visitedBalanceBar(s);
            const firstDate = s.first_visit_date ? new Date(s.first_visit_date).toLocaleDateString() : '—';
            const lastDate  = s.last_visit_date  ? new Date(s.last_visit_date).toLocaleDateString()  : '—';
            const visitText = s.visit_count === 1 ? '1 session' : `${s.visit_count} sessions`;
            const card = `
            <div class="shadow-player-card" style="${style}">
                <h3>${escHtml(s.name)}</h3>
                <span class="shadow-depth-badge">${depth.label}</span>
                <p class="shadow-depth-flavor">${depth.flavor}</p>
                ${s.description ? `<p class="shadow-desc">${escHtml(s.description)}</p>` : ''}
                <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
                    <span class="shadow-influence-tag">${escHtml(infLabel)}</span>
                    ${s.corruption_status ? `<span style="font-size:0.8rem;color:#c0392b;font-style:italic">${escHtml(s.corruption_status)}</span>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <span style="font-size:0.8rem;color:#888;white-space:nowrap">${visitedBarLabel(s)}</span>
                    <div style="flex:1;height:7px;border-radius:4px;overflow:hidden;${balanceBar}"></div>
                </div>
                <div class="shadow-meta">
                    <span>First felt: ${firstDate} (Session ${s.first_session_number})</span>
                    ${s.visit_count > 1 ? `<span>Last visited: ${lastDate}</span>` : ''}
                    <span>${visitText}</span>
                </div>
            </div>`;
            if (s.is_spoiler && !showSpoilers) {
                return `
                <div class="spoiler-card-wrapper">
                    ${card}
                    <div class="spoiler-overlay">
                        <span class="spoiler-label">Spoiler</span>
                        <button class="btn-spoiler-toggle" onclick="enableSpoilers()">Reveal</button>
                    </div>
                </div>`;
            }
            return card;
        }).join('');

    container.innerHTML = addButton + originCard + currentCard + visitedCards;
}

function renderOriginShadowCard(s) {
    const style = visitedShadowCardStyle(s.pattern_influence);
    const infLabel = visitedInfluenceLabel(s.pattern_influence);
    const balanceBar = visitedBalanceBar(s);
    return `
    <div class="shadow-player-card" style="${style}border-top:3px solid gold;">
        <h3>${escHtml(s.name)}</h3>
        <span class="shadow-depth-badge" style="background:rgba(184,134,11,0.3);color:#c8a000">Home Shadow</span>
        <p class="shadow-depth-flavor">This is where your story began.</p>
        ${s.description ? `<p class="shadow-desc">${escHtml(s.description)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
            <span class="shadow-influence-tag">${escHtml(infLabel)}</span>
            ${s.corruption_status ? `<span style="font-size:0.8rem;color:#c0392b;font-style:italic">${escHtml(s.corruption_status)}</span>` : ''}
        </div>
        ${(s.order_level || s.chaos_level || s.dream_level) ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:0.8rem;color:#888;white-space:nowrap">${visitedBarLabel(s)}</span>
            <div style="flex:1;height:7px;border-radius:4px;overflow:hidden;${balanceBar}"></div>
        </div>` : ''}
    </div>`;
}

function renderCurrentShadowCard(s) {
    const style = visitedShadowCardStyle(s.pattern_influence);
    const infLabel = visitedInfluenceLabel(s.pattern_influence);
    const balanceBar = visitedBalanceBar(s);
    return `
    <div class="shadow-player-card" style="${style}border-top:3px solid #2980b9;">
        <h3>${escHtml(s.name)}</h3>
        <span class="shadow-depth-badge" style="background:rgba(41,128,185,0.2);color:#2980b9">Current Location</span>
        <p class="shadow-depth-flavor">Your character is here now.</p>
        ${s.description ? `<p class="shadow-desc">${escHtml(s.description)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
            <span class="shadow-influence-tag">${escHtml(infLabel)}</span>
            ${s.corruption_status ? `<span style="font-size:0.8rem;color:#c0392b;font-style:italic">${escHtml(s.corruption_status)}</span>` : ''}
        </div>
        ${(s.order_level || s.chaos_level || s.dream_level) ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:0.8rem;color:#888;white-space:nowrap">${visitedBarLabel(s)}</span>
            <div style="flex:1;height:7px;border-radius:4px;overflow:hidden;${balanceBar}"></div>
        </div>` : ''}
    </div>`;
}

async function showAddKnownShadowPanel() {
    const container = document.getElementById('player-shadows-list');
    container.innerHTML = '<div class="loading">Loading shadows…</div>';
    try {
        // Kept on raw fetch rather than apiFetch: a non-ok response here
        // degrades gracefully to an empty option list (panel still
        // renders), a distinct behavior from apiFetch's throw-and-skip.
        const res = await fetch('/api/shadows');
        const allShadows = res.ok ? await res.json() : [];
        const options = allShadows.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');
        container.innerHTML = `
            <div class="add-known-shadow-panel" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:24px;max-width:560px">
                <h4 style="margin:0 0 16px">Add Known Shadow</h4>
                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:start">
                    <div>
                        <p style="font-size:0.85rem;color:#aaa;margin:0 0 8px">Choose an existing shadow</p>
                        <select id="existing-shadow-select" style="width:100%;margin-bottom:10px">
                            <option value="">— Select Shadow —</option>
                            ${options}
                        </select>
                        <button class="btn-primary" onclick="addKnownShadow()">Set as Home Shadow</button>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#666;padding-top:28px">or</div>
                    <div>
                        <p style="font-size:0.85rem;color:#aaa;margin:0 0 8px">Name a new shadow</p>
                        <input type="text" id="new-shadow-name" placeholder="Shadow name *" style="width:100%;margin-bottom:8px;box-sizing:border-box">
                        <textarea id="new-shadow-desc" placeholder="Brief description of this world…" rows="3" style="width:100%;margin-bottom:10px;box-sizing:border-box;resize:vertical"></textarea>
                        <button class="btn-primary" onclick="createAndSetKnownShadow()">Create & Set as Home</button>
                    </div>
                </div>
                <button class="btn-secondary" style="margin-top:16px" onclick="loadVisitedShadows()">Cancel</button>
            </div>`;
    } catch (err) {
        container.innerHTML = '<div class="info-message"><p>Could not load shadows list.</p></div>';
    }
}

async function addKnownShadow() {
    const shadowId = document.getElementById('existing-shadow-select').value;
    if (!shadowId) { showToast('Please select a shadow.'); return; }
    await setHomeShadow(parseInt(shadowId, 10));
}

async function createAndSetKnownShadow() {
    const name = document.getElementById('new-shadow-name').value.trim();
    if (!name) { showToast('Shadow name is required.'); return; }
    const description = document.getElementById('new-shadow-desc').value.trim();
    const token = localStorage.getItem('token');
    try {
        const newShadow = await apiFetch('/api/shadows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, description })
        });
        await setHomeShadow(newShadow.id);
    } catch (err) {
        showToast(`Failed to create shadow: ${err.message}`);
    }
}

async function setHomeShadow(shadowId) {
    const token = localStorage.getItem('token');
    try {
        await apiFetch(`/api/characters/${state.currentCharacter.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ shadow_origin_id: shadowId })
        });
        state.currentCharacter = { ...state.currentCharacter, shadow_origin_id: shadowId };
        await loadVisitedShadows();
    } catch (err) {
        showToast(`Failed to set home shadow: ${err.message}`);
    }
}

function shadowDepth(visitCount) {
    if (visitCount >= 10) return { label: 'Part of You',      flavor: 'This world is woven into your very soul.' };
    if (visitCount >= 4)  return { label: 'Well Known',        flavor: "This shadow's rhythms move through your blood." };
    if (visitCount >= 2)  return { label: 'Familiar Ground',   flavor: 'You can feel its nature without concentration.' };
    return                       { label: 'First Impression',  flavor: "The shadow's essence has touched your awareness." };
}

function visitedInfluenceLabel(val) {
    if (val === 'First Pattern')  return 'Pattern';
    if (val === 'Corwin Pattern') return 'Argent Refrain';
    return val || 'None';
}

function visitedShadowCardStyle(val) {
    const label = visitedInfluenceLabel(val);
    const map = {
        'Pattern':        ['rgba(22,160,133,0.1)',  'rgba(22,160,133,0.5)'],
        'Argent Refrain': ['rgba(90,90,154,0.1)',   'rgba(90,90,154,0.5)'],
        'Logrus':         ['rgba(192,57,43,0.1)',   'rgba(192,57,43,0.5)'],
        'Nexus':          ['rgba(184,134,11,0.1)',  'rgba(184,134,11,0.5)'],
        'Mixed':          ['rgba(142,68,173,0.1)',  'rgba(142,68,173,0.5)'],
    };
    const colors = map[label];
    if (!colors) return '';
    return `background:${colors[0]};border-left-color:${colors[1]};`;
}

function visitedBarLabel(s) {
    return (s.dream_level || 0) > 0 ? 'Order/Dream/Chaos:' : 'Order/Chaos:';
}

function syncSpoilerButton() {
    const btn = document.getElementById('spoilers-toggle-btn');
    if (!btn) return;
    const on = localStorage.getItem('showSpoilers') === 'true';
    btn.textContent = on ? 'Show Spoilers: On' : 'Show Spoilers: Off';
    btn.style.borderColor = on ? '#8e44ad' : '';
    btn.style.color = on ? '#8e44ad' : '';
}

function toggleSpoilers() {
    const on = localStorage.getItem('showSpoilers') === 'true';
    localStorage.setItem('showSpoilers', on ? 'false' : 'true');
    syncSpoilerButton();
    loadVisitedShadows();
}

function enableSpoilers() {
    localStorage.setItem('showSpoilers', 'true');
    syncSpoilerButton();
    loadVisitedShadows();
}

function visitedBalanceBar(s) {
    const o = s.order_level || 0;
    const d = s.dream_level || 0;
    const c = s.chaos_level || 0;
    if (d > 0) {
        const total = o + d + c || 100;
        const op  = (o / total * 100).toFixed(1);
        const mid = ((o + d / 2) / total * 100).toFixed(1);
        const cp  = ((o + d) / total * 100).toFixed(1);
        return `background:linear-gradient(90deg,#3d7ab5 ${op}%,#080818 ${op}%,#e8e4ff ${mid}%,#080818 ${cp}%,#b03030 ${cp}%)`;
    }
    return `background:linear-gradient(90deg,#3498db ${o}%,#e74c3c ${o}%)`;
}

// escHtml now comes from /js/dom-utils.js (loaded before this file).

// ── Wizard field-focus delegation (runs once at page load) ────
(function () {
    const body = document.querySelector('.wizard-body');
    if (!body) return;
    body.addEventListener('focusin', e => {
        const info = _fieldInfoForElement(e.target);
        if (info) wizardFocusField(info);
    });
    body.addEventListener('focusout', e => {
        if (!_fieldInfoForElement(e.target)) return;
        if (!_fieldInfoForElement(e.relatedTarget)) wizardBlurField();
    });
}());

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, {
    addKnownShadow, createAndSetKnownShadow, enableSpoilers, loadVisitedShadows,
    showAddKnownShadowPanel, toggleSpoilers,
});

// Used by other player-*.js modules.
export { syncSpoilerButton, loadVisitedShadows, visitedInfluenceLabel, visitedShadowCardStyle };
