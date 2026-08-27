// dm-scenes-combats.js — DM tools for the session tracker:
// player-scene review/approval and combat-encounter authoring.
// (Players run encounters from their dashboard; the DM builds them here.)
import { state, API_BASE } from './dm-state.js';

// ── Player Scenes panel (Sessions tab) ───────────────────────────────────────

// Kept on raw fetch rather than apiFetch: a non-ok response here silently
// clears the panel (no error shown — e.g. a non-DM viewer simply sees
// nothing), a distinct behavior from a real fetch/network exception (logged
// only). apiFetch would collapse both into one catch block.
async function loadDMScenes() {
    const panel = document.getElementById('dm-scenes-panel');
    if (!panel) return;
    try {
        const res = await fetch(`${API_BASE}/scenes`);
        if (!res.ok) { panel.innerHTML = ''; return; }
        const scenes = await res.json();
        renderDMScenes(scenes);
    } catch (err) {
        console.error('Failed to load scenes:', err);
    }
}

function renderDMScenes(scenes) {
    const panel = document.getElementById('dm-scenes-panel');
    if (!scenes.length) { panel.innerHTML = ''; return; }

    const drafts = scenes.filter(s => s.status === 'draft');
    const approved = scenes.filter(s => s.status === 'approved');

    const sceneRow = (s, isDraft) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid rgba(128,128,128,0.15)">
            <div style="flex:1">
                <strong>${escHtml(s.title)}</strong>
                <span style="color:#999;font-size:0.85em"> — ${escHtml(s.character_name)}${s.creator_username ? ` (${escHtml(s.creator_username)})` : ''}</span>
                ${s.summary ? `<div style="font-size:0.85em;color:#888">${escHtml(s.summary)}</div>` : ''}
                <div style="font-size:0.78em;color:#999">${s.scene_date ? new Date(s.scene_date).toLocaleDateString() : ''}</div>
            </div>
            ${isDraft ? `<button class="btn-primary btn-sm" onclick="approveScene(${s.id})">Approve</button>` : ''}
            <button class="btn-secondary btn-sm btn-danger" onclick="dmDeleteScene(${s.id})">Delete</button>
        </div>`;

    panel.innerHTML = `
        ${drafts.length ? `
        <div class="card" style="margin-bottom:16px;border-left:4px solid #f0ad4e">
            <h3 style="margin-top:0">Scene Drafts Awaiting Review (${drafts.length})</h3>
            ${drafts.map(s => sceneRow(s, true)).join('')}
        </div>` : ''}
        ${approved.length ? `
        <details style="margin-bottom:16px">
            <summary style="cursor:pointer;font-weight:600">Approved Player Scenes (${approved.length})</summary>
            ${approved.map(s => sceneRow(s, false)).join('')}
        </details>` : ''}`;
}

async function approveScene(id) {
    try {
        await apiFetch(`${API_BASE}/scenes/${id}/approve`, { method: 'POST' });
        showToast('Scene approved into the timeline.');
        await loadDMScenes();
    } catch (err) {
        showToast(`Failed to approve scene: ${err.message}`);
    }
}

async function dmDeleteScene(id) {
    if (!confirm('Delete this scene and all notes/combats attached to it?')) return;
    try {
        await apiFetch(`${API_BASE}/scenes/${id}`, { method: 'DELETE' });
        await loadDMScenes();
    } catch (err) {
        showToast(`Failed to delete scene: ${err.message}`);
    }
}

// ── Combat encounters (inside the Edit Session modal) ───────────────────────

async function dmLoadSessionCombats(sessionId) {
    const container = document.getElementById(`session-combats-${sessionId}`);
    if (!container) return;
    try {
        const encounters = await apiFetch(`${API_BASE}/combats?session_id=${sessionId}`);
        container.innerHTML = encounters.length
            ? encounters.map(e => dmEncounterHTML(e, sessionId)).join('')
            : '<em style="color:#999;font-size:0.9em">No encounters yet</em>';
    } catch (err) {
        container.innerHTML = `<em style="color:#c0392b;font-size:0.9em">${escHtml(err.message)}</em>`;
    }
}

function dmEncounterHTML(e, sessionId) {
    const combatantRows = (e.combatants || []).map(cb => `
        <div style="display:flex;align-items:center;gap:8px;font-size:0.88em;margin:3px 0">
            <span style="cursor:pointer;min-width:26px;text-align:center;background:#f5efe0;border-radius:4px;padding:1px 4px"
                  title="Click to change initiative"
                  onclick="dmEditInitiative(${e.id}, ${cb.id}, ${sessionId})">${cb.initiative}</span>
            <span style="flex:1">${escHtml(cb.name)}
                <span style="color:#999">(${cb.combatant_type.toUpperCase()} · ${cb.current_hp}/${cb.max_hp} HP)</span>
            </span>
            <button type="button" class="btn-secondary btn-sm btn-danger" onclick="dmRemoveCombatant(${e.id}, ${cb.id}, ${sessionId})">×</button>
        </div>`).join('');

    const pcOptions = state.characters.map(c =>
        `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');

    return `
        <div style="border:1px solid #e0d5be;border-radius:6px;padding:10px 12px;margin-bottom:10px;background:#fdf9f2">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <strong style="flex:1">${escHtml(e.title)}</strong>
                <span class="badge" style="font-size:0.75em">${e.status === 'active' ? `Active · Round ${e.round}` : 'Completed'}</span>
                <button type="button" class="btn-secondary btn-sm btn-danger" onclick="dmDeleteEncounter(${e.id}, ${sessionId})">Delete</button>
            </div>
            ${e.summary ? `<div style="font-size:0.85em;color:#888;font-style:italic;margin-bottom:6px">${escHtml(e.summary)}</div>` : ''}
            <div>${combatantRows || '<em style="color:#999;font-size:0.85em">No combatants</em>'}</div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <select id="pc-add-${e.id}" style="font-size:0.85em">${pcOptions}</select>
                <button type="button" class="btn-secondary btn-sm" onclick="dmAddPCCombatant(${e.id}, ${sessionId})">+ PC</button>
                <button type="button" class="btn-secondary btn-sm" onclick="dmAddNPCCombatant(${e.id}, ${sessionId})">+ NPC/Monster</button>
            </div>
        </div>`;
}

async function dmAddEncounter(sessionId) {
    const input = document.getElementById(`new-encounter-title-${sessionId}`);
    const title = input.value.trim();
    if (!title) { showToast('Encounter title is required.'); return; }
    try {
        await apiFetch(`${API_BASE}/combats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, title })
        });
        input.value = '';
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to create encounter: ${err.message}`);
    }
}

async function dmAddPCCombatant(encounterId, sessionId) {
    const characterId = parseInt(document.getElementById(`pc-add-${encounterId}`).value, 10);
    if (!characterId) return;
    const initiative = parseInt(prompt('Initiative roll:', '10'), 10);

    try {
        await apiFetch(`${API_BASE}/combats/${encounterId}/combatants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: characterId, initiative: isNaN(initiative) ? 10 : initiative })
        });
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to add combatant: ${err.message}`);
    }
}

async function dmAddNPCCombatant(encounterId, sessionId) {
    const name = prompt('NPC/Monster name:');
    if (!name) return;
    const initiative = parseInt(prompt('Initiative roll:', '10'), 10);
    const maxHp = parseInt(prompt('Max HP:', '20'), 10);
    const isMonster = confirm('Is this a monster? (Cancel = NPC)');

    try {
        await apiFetch(`${API_BASE}/combats/${encounterId}/combatants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                combatant_type: isMonster ? 'monster' : 'npc',
                initiative: isNaN(initiative) ? 10 : initiative,
                max_hp: isNaN(maxHp) ? 20 : maxHp
            })
        });
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to add combatant: ${err.message}`);
    }
}

async function dmEditInitiative(encounterId, combatantId, sessionId) {
    const initiative = parseInt(prompt('New initiative:'), 10);
    if (isNaN(initiative)) return;
    try {
        await apiFetch(`${API_BASE}/combats/${encounterId}/combatants/${combatantId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initiative })
        });
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to update initiative: ${err.message}`);
    }
}

async function dmRemoveCombatant(encounterId, combatantId, sessionId) {
    try {
        await apiFetch(`${API_BASE}/combats/${encounterId}/combatants/${combatantId}`, { method: 'DELETE' });
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to remove combatant: ${err.message}`);
    }
}

async function dmDeleteEncounter(encounterId, sessionId) {
    if (!confirm('Delete this encounter?')) return;
    try {
        await apiFetch(`${API_BASE}/combats/${encounterId}`, { method: 'DELETE' });
        await dmLoadSessionCombats(sessionId);
    } catch (err) {
        showToast(`Failed to delete encounter: ${err.message}`);
    }
}

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, {
    approveScene, dmAddEncounter, dmAddNPCCombatant, dmAddPCCombatant,
    dmDeleteEncounter, dmDeleteScene, dmEditInitiative, dmRemoveCombatant,
});

// Used by dm-core.js (loadDMScenes) and dm-editors.js (dmLoadSessionCombats).
export { loadDMScenes, dmLoadSessionCombats };
