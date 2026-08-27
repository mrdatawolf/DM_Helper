// player-session-tracker.js — "My Story": the character's own comic.
// Campaign sessions are shared issues (team-ups); scenes are personal issues,
// drafted by the player and approved into the timeline by the DM.
// Notes and combat encounters live on the server and carry a visibility level
// controlling what other characters' books can see.
import { state } from './player-state.js';

let storyDetailContext = null; // { type: 'session'|'scene', id, title }

function trackerHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

const VISIBILITY_LABELS = {
    private: '🔒 Private (me + DM)',
    session: '👥 Session participants',
    public:  '🌐 Everyone'
};

function visibilityTag(v) {
    const short = { private: '🔒 Private', session: '👥 Session', public: '🌐 Everyone' };
    return `<span style="font-size:0.75rem;color:#999">${short[v] || v}</span>`;
}

function visibilitySelect(id, current) {
    return `<select id="${id}" style="font-size:0.85rem">
        ${Object.entries(VISIBILITY_LABELS).map(([v, label]) =>
            `<option value="${v}"${current === v ? ' selected' : ''}>${label}</option>`).join('')}
    </select>`;
}

// ── Timeline ─────────────────────────────────────────────────────────────────

async function loadStoryTimeline() {
    const container = document.getElementById('story-timeline');
    document.getElementById('story-detail').style.display = 'none';
    container.style.display = 'block';

    if (!state.currentCharacter) {
        container.innerHTML = '<div class="info-message"><p>Select a character from "My Characters" to see their story.</p></div>';
        return;
    }
    container.innerHTML = '<div class="loading">Loading story…</div>';

    try {
        // Kept on raw fetch rather than apiFetch: a non-ok response for
        // either degrades gracefully to an empty list rather than failing
        // the whole timeline view (same pattern as openStoryEntry below).
        const [sessionsRes, scenesRes] = await Promise.all([
            fetch('/api/sessions', { headers: trackerHeaders() }),
            fetch(`/api/scenes?character_id=${state.currentCharacter.id}`, { headers: trackerHeaders() })
        ]);
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
        const scenes = scenesRes.ok ? await scenesRes.json() : [];

        const mySessions = sessions.filter(s =>
            (s.session_characters || []).some(c => c.id === state.currentCharacter.id)
        );

        const entries = [
            ...mySessions.map(s => ({ type: 'session', date: s.session_date, data: s })),
            ...scenes.map(sc => ({ type: 'scene', date: sc.scene_date, data: sc }))
        ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        renderStoryTimeline(entries);
    } catch (err) {
        console.error('Error loading story timeline:', err);
        container.innerHTML = '<div class="error-message"><p>Could not load the story timeline.</p></div>';
    }
}

function renderStoryTimeline(entries) {
    const container = document.getElementById('story-timeline');

    if (!entries.length) {
        container.innerHTML = `
            <div class="info-message">
                <p>${escHtml(state.currentCharacter.name)}'s story hasn't started yet.
                Sessions appear here once the DM adds this character to them —
                or draft a scene of your own to begin a solo issue.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <h3 style="margin-bottom:12px">${escHtml(state.currentCharacter.name)} — Issues</h3>
        ${entries.map(e => e.type === 'session'
            ? storySessionCard(e.data)
            : storySceneCard(e.data)).join('')}`;
}

function storySessionCard(s) {
    const teammates = (s.session_characters || [])
        .filter(c => c.id !== state.currentCharacter.id)
        .map(c => escHtml(c.character_name));
    const teamUp = teammates.length
        ? `<div style="font-size:0.85rem;color:#8a7a5a;margin-top:4px">⚔ Team-up with ${teammates.join(', ')}</div>`
        : '<div style="font-size:0.85rem;color:#999;margin-top:4px">Solo issue</div>';
    const status = s.session_status ? `<span class="badge" style="font-size:0.75rem">${escHtml(s.session_status)}</span>` : '';

    return `
        <div class="session-history-item" onclick="openStoryEntry('session', ${s.id})" style="cursor:pointer">
            <div class="session-history-header">
                <div class="session-history-title">#${s.session_number} — ${escHtml(s.session_title || 'Untitled Session')} ${status}</div>
                <div class="session-history-date">${s.session_date ? new Date(s.session_date).toLocaleDateString() : ''}</div>
            </div>
            ${teamUp}
        </div>`;
}

function storySceneCard(sc) {
    const draft = sc.status === 'draft';
    const badge = draft
        ? '<span class="badge" style="background:#f0ad4e;color:#333;font-size:0.75rem">Draft — awaiting DM</span>'
        : '<span class="badge" style="font-size:0.75rem">Scene</span>';

    return `
        <div class="session-history-item" onclick="openStoryEntry('scene', ${sc.id})" style="cursor:pointer;${draft ? 'opacity:0.75;border-left:3px solid #f0ad4e' : 'border-left:3px solid #8a7a5a'}">
            <div class="session-history-header">
                <div class="session-history-title">${escHtml(sc.title)} ${badge}</div>
                <div class="session-history-date">${sc.scene_date ? new Date(sc.scene_date).toLocaleDateString() : ''}</div>
            </div>
            ${sc.summary ? `<div style="font-size:0.85rem;color:#888;margin-top:4px">${escHtml(sc.summary)}</div>` : ''}
        </div>`;
}

// ── Draft a scene ────────────────────────────────────────────────────────────

function openDraftSceneForm() {
    if (!state.currentCharacter) {
        showToast('Select a character first.');
        return;
    }
    const panel = document.getElementById('story-draft-form');
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="session-card" style="margin-bottom:20px">
            <h3>Draft a Scene for ${escHtml(state.currentCharacter.name)}</h3>
            <p style="font-size:0.85rem;color:#888">A solo issue in your character's story. The DM reviews drafts and approves them into the timeline.</p>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="draft-scene-title" placeholder="e.g. Shadows of the Old Market">
            </div>
            <div class="form-group">
                <label>What happens?</label>
                <textarea id="draft-scene-summary" rows="4" placeholder="A short pitch for the scene…"></textarea>
            </div>
            <div class="form-group">
                <label>Story date</label>
                <input type="date" id="draft-scene-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <button class="btn-primary" onclick="submitDraftScene()">Submit Draft</button>
            <button class="btn-secondary" onclick="document.getElementById('story-draft-form').style.display='none'">Cancel</button>
        </div>`;
}

async function submitDraftScene() {
    const title = document.getElementById('draft-scene-title').value.trim();
    if (!title) { showToast('A title is required.'); return; }

    try {
        await apiFetch('/api/scenes', {
            method: 'POST',
            headers: trackerHeaders(),
            body: JSON.stringify({
                character_id: state.currentCharacter.id,
                title,
                summary: document.getElementById('draft-scene-summary').value.trim() || null,
                scene_date: document.getElementById('draft-scene-date').value || null
            })
        });
        document.getElementById('story-draft-form').style.display = 'none';
        showToast('Scene drafted — the DM will review it.');
        await loadStoryTimeline();
    } catch (err) {
        showToast(`Failed to draft scene: ${err.message}`);
    }
}

async function deleteScene(sceneId) {
    if (!confirm('Delete this scene and everything in it?')) return;
    try {
        await apiFetch(`/api/scenes/${sceneId}`, { method: 'DELETE', headers: trackerHeaders() });
        showToast('Scene deleted.');
        await loadStoryTimeline();
    } catch (err) {
        showToast(`Failed to delete scene: ${err.message}`);
    }
}

// ── Entry detail: notes + combats ────────────────────────────────────────────

async function openStoryEntry(type, id) {
    const param = type === 'session' ? `session_id=${id}` : `scene_id=${id}`;
    try {
        // Notes/combats kept on raw fetch rather than apiFetch: a non-ok
        // response for either degrades gracefully to an empty list rather
        // than failing the whole entry view.
        const [notesRes, combatsRes] = await Promise.all([
            fetch(`/api/session-notes?${param}`, { headers: trackerHeaders() }),
            fetch(`/api/combats?${param}`, { headers: trackerHeaders() })
        ]);
        const notes = notesRes.ok ? await notesRes.json() : [];
        const combats = combatsRes.ok ? await combatsRes.json() : [];

        let title, subtitle = '', ownScene = null;
        if (type === 'session') {
            const s = await apiFetch(`/api/sessions/${id}`, { headers: trackerHeaders() });
            title = `#${s.session_number} — ${s.session_title || 'Untitled Session'}`;
            const teammates = (s.session_characters || []).map(c => escHtml(c.character_name));
            subtitle = `${s.session_date ? new Date(s.session_date).toLocaleDateString() : ''}${teammates.length ? ' · ' + teammates.join(', ') : ''}`;
        } else {
            const scenes = await apiFetch(`/api/scenes?character_id=${state.currentCharacter.id}`, { headers: trackerHeaders() });
            const sc = scenes.find(x => x.id === id) || {};
            ownScene = sc;
            title = sc.title || 'Scene';
            subtitle = `${sc.scene_date ? new Date(sc.scene_date).toLocaleDateString() : ''}${sc.status === 'draft' ? ' · Draft — awaiting DM approval' : ''}`;
        }

        storyDetailContext = { type, id, title };
        renderStoryDetail(title, subtitle, notes, combats, ownScene);
    } catch (err) {
        console.error('Error opening story entry:', err);
        showToast('Could not load this entry.');
    }
}

function renderStoryDetail(title, subtitle, notes, combats, ownScene) {
    document.getElementById('story-timeline').style.display = 'none';
    const detail = document.getElementById('story-detail');
    detail.style.display = 'block';

    const noteCards = notes.length ? notes.map(n => {
        const mine = n.user_id === state.currentUser.id;
        return `
        <div class="session-card" style="padding:12px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <strong style="font-size:0.9rem">${escHtml(n.character_name || n.author_username)}</strong>
                <span style="display:flex;gap:8px;align-items:center">
                    ${mine
                        ? `<select onchange="updateNoteVisibility(${n.id}, this.value)" style="font-size:0.75rem">
                              ${Object.entries(VISIBILITY_LABELS).map(([v, l]) => `<option value="${v}"${n.visibility === v ? ' selected' : ''}>${l}</option>`).join('')}
                           </select>
                           <button class="btn-secondary btn-sm btn-danger" onclick="deleteStoryNote(${n.id})">×</button>`
                        : visibilityTag(n.visibility)}
                </span>
            </div>
            <p style="margin:8px 0 0;white-space:pre-wrap">${escHtml(n.content)}</p>
            <div style="font-size:0.75rem;color:#999;margin-top:6px">${new Date(n.created_at).toLocaleString()}</div>
        </div>`;
    }).join('') : '<p style="color:#999;font-style:italic">No notes yet.</p>';

    const combatCards = combats.length ? combats.map(renderCombatCard).join('')
        : '<p style="color:#999;font-style:italic">No encounters here. The DM sets up combat encounters; once one exists, you can run it.</p>';

    detail.innerHTML = `
        <button class="back-button" onclick="loadStoryTimeline()">← Back to Story</button>
        <div class="session-card" style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
                <div>
                    <h3 style="margin:0">${escHtml(title)}</h3>
                    <div style="font-size:0.85rem;color:#888">${subtitle}</div>
                </div>
                ${ownScene && ownScene.created_by === state.currentUser.id
                    ? `<button class="btn-secondary btn-sm btn-danger" onclick="deleteScene(${ownScene.id})">Delete Scene</button>` : ''}
            </div>
        </div>

        <h4 style="margin:20px 0 10px">Notes</h4>
        <div id="story-notes">${noteCards}</div>
        <div class="session-card" style="padding:12px">
            <textarea id="new-note-content" rows="3" placeholder="What happened from ${escHtml(state.currentCharacter.name)}'s point of view?" style="width:100%;box-sizing:border-box"></textarea>
            <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
                ${visibilitySelect('new-note-visibility', 'session')}
                <button class="btn-primary btn-sm" onclick="addStoryNote()">Add Note</button>
            </div>
        </div>

        <h4 style="margin:24px 0 10px">Combat Encounters</h4>
        <div id="story-combats">${combatCards}</div>
    `;
}

async function addStoryNote() {
    const content = document.getElementById('new-note-content').value.trim();
    if (!content) { showToast('Write something first.'); return; }

    const body = {
        character_id: state.currentCharacter.id,
        content,
        visibility: document.getElementById('new-note-visibility').value
    };
    body[storyDetailContext.type === 'session' ? 'session_id' : 'scene_id'] = storyDetailContext.id;

    try {
        await apiFetch('/api/session-notes', {
            method: 'POST', headers: trackerHeaders(), body: JSON.stringify(body)
        });
        await openStoryEntry(storyDetailContext.type, storyDetailContext.id);
    } catch (err) {
        showToast(`Failed to add note: ${err.message}`);
    }
}

async function updateNoteVisibility(noteId, visibility) {
    try {
        await apiFetch(`/api/session-notes/${noteId}`, {
            method: 'PUT', headers: trackerHeaders(), body: JSON.stringify({ visibility })
        });
        showToast('Note visibility updated.');
    } catch (err) {
        showToast(`Failed to update visibility: ${err.message}`);
    }
}

async function deleteStoryNote(noteId) {
    if (!confirm('Delete this note?')) return;
    try {
        await apiFetch(`/api/session-notes/${noteId}`, { method: 'DELETE', headers: trackerHeaders() });
        await openStoryEntry(storyDetailContext.type, storyDetailContext.id);
    } catch (err) {
        showToast(`Failed to delete note: ${err.message}`);
    }
}

// ── Combat runner (encounters are DM-authored; players run them) ─────────────

function renderCombatCard(e) {
    const active = e.status === 'active';
    const combatantRows = (e.combatants || []).map((cb, i) => {
        const isTurn = active && i === (e.turn_index || 0) % (e.combatants.length || 1);
        const hpPercent = Math.max(0, Math.min(100, (cb.current_hp / (cb.max_hp || 1)) * 100));
        const conditions = parseConditions(cb.conditions);
        return `
        <div class="combatant-card ${cb.combatant_type === 'pc' ? 'player' : 'enemy'} ${isTurn ? 'active-turn' : ''}">
            <div class="combatant-info">
                <div class="combatant-initiative">${cb.initiative}</div>
                <div class="combatant-name">${escHtml(cb.name)}${isTurn ? ' 👉' : ''}</div>
                <div class="combatant-hp">
                    <div class="hp-bar"><div class="hp-bar-fill ${hpPercent < 30 ? 'low' : ''}" style="width:${hpPercent}%"></div></div>
                    <div class="hp-text">${cb.current_hp} / ${cb.max_hp}</div>
                </div>
                <div class="combatant-conditions">
                    ${conditions.map(c => `<span class="condition-tag">${escHtml(c)}</span>`).join('')}
                </div>
            </div>
            ${active ? `
            <div class="combatant-actions">
                <button class="btn-icon" onclick="combatAdjustHP(${e.id}, ${cb.id}, -1)" title="Damage">-</button>
                <button class="btn-icon" onclick="combatAdjustHP(${e.id}, ${cb.id}, 1)" title="Heal">+</button>
                <button class="btn-icon" onclick="combatAddCondition(${e.id}, ${cb.id})" title="Add Condition">⚠</button>
            </div>` : ''}
        </div>`;
    }).join('');

    return `
    <div class="session-card" style="margin-bottom:14px" id="combat-${e.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <h4 style="margin:0">${escHtml(e.title)}
                <span class="badge" style="font-size:0.75rem;${active ? 'background:#c0392b;color:#fff' : ''}">${active ? `Round ${e.round}` : 'Completed'}</span>
                ${visibilityTag(e.visibility)}
            </h4>
            ${active ? `
            <span style="display:flex;gap:8px">
                <button class="btn-secondary btn-sm" onclick="combatNextTurn(${e.id})">Next Turn</button>
                <button class="btn-danger btn-sm" onclick="combatEnd(${e.id})">End Combat</button>
            </span>` : ''}
        </div>
        ${e.summary ? `<p style="font-size:0.9rem;color:#888;font-style:italic;margin:8px 0 0">${escHtml(e.summary)}</p>` : ''}
        <div class="initiative-tracker" style="margin-top:10px">${combatantRows || '<p style="color:#999">No combatants yet.</p>'}</div>
    </div>`;
}

function parseConditions(raw) {
    try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
}

async function refreshCombats() {
    await openStoryEntry(storyDetailContext.type, storyDetailContext.id);
}

async function fetchCombat(encounterId) {
    return apiFetch(`/api/combats/${encounterId}`, { headers: trackerHeaders() });
}

async function combatAdjustHP(encounterId, combatantId, direction) {
    const amount = parseInt(prompt(direction < 0 ? 'Damage amount:' : 'Healing amount:', '5'), 10);
    if (!amount || amount <= 0) return;

    try {
        const e = await fetchCombat(encounterId);
        const cb = e.combatants.find(c => c.id === combatantId);
        if (!cb) return;
        const newHP = direction < 0
            ? Math.max(0, cb.current_hp - amount)
            : Math.min(cb.max_hp, cb.current_hp + amount);

        await apiFetch(`/api/combats/${encounterId}/combatants/${combatantId}`, {
            method: 'PUT', headers: trackerHeaders(), body: JSON.stringify({ current_hp: newHP })
        });
        await refreshCombats();
    } catch (err) {
        showToast(`Failed to update HP: ${err.message}`);
    }
}

async function combatAddCondition(encounterId, combatantId) {
    const condition = prompt('Condition (e.g. Stunned, Prone, Blinded):');
    if (!condition) return;

    try {
        const e = await fetchCombat(encounterId);
        const cb = e.combatants.find(c => c.id === combatantId);
        if (!cb) return;
        const conditions = parseConditions(cb.conditions);
        conditions.push(condition.trim());

        await apiFetch(`/api/combats/${encounterId}/combatants/${combatantId}`, {
            method: 'PUT', headers: trackerHeaders(), body: JSON.stringify({ conditions })
        });
        await refreshCombats();
    } catch (err) {
        showToast(`Failed to add condition: ${err.message}`);
    }
}

async function combatNextTurn(encounterId) {
    try {
        const e = await fetchCombat(encounterId);
        const count = (e.combatants || []).length;
        if (!count) return;
        let turn = ((e.turn_index || 0) + 1) % count;
        let round = e.round || 1;
        if (turn === 0) round += 1;

        await apiFetch(`/api/combats/${encounterId}`, {
            method: 'PUT', headers: trackerHeaders(), body: JSON.stringify({ turn_index: turn, round })
        });
        await refreshCombats();
    } catch (err) {
        showToast(`Failed to advance turn: ${err.message}`);
    }
}

async function combatEnd(encounterId) {
    if (!confirm('End this combat encounter?')) return;
    const summary = prompt('How did it go? (optional summary)') || null;

    try {
        await apiFetch(`/api/combats/${encounterId}`, {
            method: 'PUT', headers: trackerHeaders(),
            body: JSON.stringify({ status: 'completed', ...(summary ? { summary } : {}) })
        });
        showToast('Combat ended.');
        await refreshCombats();
    } catch (err) {
        showToast(`Failed to end combat: ${err.message}`);
    }
}

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, {
    addStoryNote, combatAddCondition, combatAdjustHP, combatEnd, combatNextTurn,
    deleteScene, deleteStoryNote, loadStoryTimeline, openDraftSceneForm, openStoryEntry,
    submitDraftScene, updateNoteVisibility,
});

// Used by player-core.js.
export { loadStoryTimeline };
