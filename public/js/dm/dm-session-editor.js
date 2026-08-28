import { state, API_BASE } from './dm-state.js';
import { buildChapterPicker, loadNpcs } from './dm-core.js';
import { showModal } from './dm-modal-utils.js';
import { dmLoadSessionCombats } from './dm-scenes-combats.js';
import { loadSessions } from './dm-lists.js';
async function editSession(id) {
    try {
        const s = await apiFetch(`${API_BASE}/sessions/${id}`);

        const linkedChapterIds = new Set((s.session_chapters || []).map(c => c.chapter_id));

        const linkedCharIds = new Set((s.session_characters || []).map(c => c.id));
        const attendanceMap  = Object.fromEntries((s.session_characters || []).map(c => [c.id, c.attendance]));
        const attendanceColors = { expected:'#8a7a5a', attended:'#27ae60', absent:'#e74c3c' };
        const charRows = state.characters.map(c => {
            const linked = linkedCharIds.has(c.id);
            const att    = attendanceMap[c.id] || 'expected';
            const color  = attendanceColors[att] || '#888';
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="flex:1">${escHtml(c.name)}${c.player_name ? ` <span style="color:#999;font-size:0.85em">(${escHtml(c.player_name)})</span>` : ''}</span>
                ${linked
                    ? `<select onchange="updateSessionCharAttendance(${id},${c.id},this.value)" style="font-size:0.85em;color:${color}">
                          ${['expected','attended','absent'].map(a => `<option value="${a}"${att===a?' selected':''}>${a}</option>`).join('')}
                       </select>
                       <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionChar(${id},${c.id},this)">×</button>`
                    : `<button type="button" class="btn-secondary btn-sm" onclick="addSessionChar(${id},${c.id},this)">+ Add</button>`
                }
            </div>`;
        }).join('');

        const linkedBeatIds = new Set((s.beats || []).map(b => b.id));
        const beatRows = (s.beats || []).map(b =>
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="flex:1;font-size:0.9em">${escHtml(b.title)}</span>
                <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionBeat(${id},${b.id},this)">×</button>
             </div>`
        ).join('') || '<em style="color:#999;font-size:0.9em">No beats linked</em>';

        const unlinkedBeats = state.beats.filter(b => !linkedBeatIds.has(b.id));
        const beatSelect = unlinkedBeats.length
            ? `<div style="display:flex;gap:8px;margin-top:8px">
                   <select id="beat-add-select-${id}" style="flex:1">
                       ${unlinkedBeats.map(b => `<option value="${b.id}">${escHtml(b.title)}</option>`).join('')}
                   </select>
                   <button type="button" class="btn-secondary btn-sm" onclick="addSessionBeat(${id})">+ Add</button>
               </div>`
            : '<em style="color:#999;font-size:0.9em;margin-top:6px;display:block">All beats linked</em>';

        const linkedNpcIds = new Set((s.npcs || []).map(n => n.id));
        const npcRows = (s.npcs || []).map(n =>
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="flex:1;font-size:0.9em"><strong>${escHtml(n.name)}</strong>${n.creature_type ? ` — ${escHtml(n.creature_type)}` : ''}${n.context ? ` <span style="color:#999">(${escHtml(n.context)})</span>` : ''}</span>
                <button type="button" class="btn-secondary btn-sm btn-danger" onclick="removeSessionNpc(${id},${n.id},this)">×</button>
             </div>`
        ).join('') || '<em style="color:#999;font-size:0.9em">No NPCs linked</em>';

        const unlinkedNpcs = state.npcs.filter(n => !linkedNpcIds.has(n.id));
        const npcSelect = unlinkedNpcs.length
            ? `<div style="display:flex;gap:8px;margin-top:8px">
                   <select id="npc-add-select-${id}" style="flex:1">
                       ${unlinkedNpcs.map(n => `<option value="${n.id}">${escHtml(n.name)}${n.creature_type ? ` (${escHtml(n.creature_type)})` : ''}</option>`).join('')}
                   </select>
                   <button type="button" class="btn-secondary btn-sm" onclick="addSessionNpc(${id})">+ Add</button>
               </div>`
            : '<em style="color:#999;font-size:0.9em;margin-top:6px;display:block">No NPCs in system yet</em>';

        const statusSel = ['planned','in-progress','completed'].map(v =>
            `<option value="${v}"${s.session_status===v?' selected':''}>${{planned:'Planned','in-progress':'In Progress',completed:'Completed'}[v]}</option>`
        ).join('');

        showModal(`Edit Session ${s.session_number}`, `
            <form onsubmit="handleEditSession(event,${id})">
                <div class="form-row">
                    <div class="form-group">
                        <label>Session #</label>
                        <input type="number" name="session_number" value="${s.session_number}" required>
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" name="session_date" value="${s.session_date}" required>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="session_status">${statusSel}</select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="session_title" value="${escHtml(s.session_title || '')}">
                </div>
                <details open style="margin-bottom:14px">
                    <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Session Notes</summary>
                    <div class="form-group">
                        <label>Opening <span style="color:#999;font-size:0.85em">(pre-session hooks, setup)</span></label>
                        <textarea name="opening_notes" rows="3">${escHtml(s.opening_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Mid-Session <span style="color:#999;font-size:0.85em">(as the session unfolds)</span></label>
                        <textarea name="mid_notes" rows="3">${escHtml(s.mid_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Closing <span style="color:#999;font-size:0.85em">(what happened, cliffhangers)</span></label>
                        <textarea name="closing_notes" rows="3">${escHtml(s.closing_notes || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>DM Scratch Pad</label>
                        <textarea name="dm_notes" rows="2">${escHtml(s.dm_notes || '')}</textarea>
                    </div>
                </details>

                <button type="submit" class="btn-primary" style="margin-bottom:20px">Save Changes</button>
            </form>

            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Active Chapters This Session</summary>
                <div style="max-height:220px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:10px 14px;background:#fdf9f2;margin-bottom:8px">
                    ${buildChapterPicker(linkedChapterIds)}
                </div>
                <button type="button" class="btn-secondary btn-sm" onclick="saveSessionChapters(${id}, this)">Save Chapter Links</button>
            </details>

            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Characters</summary>
                <div id="session-chars-${id}">${charRows}</div>
            </details>

            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Story Beats</summary>
                <div id="session-beats-${id}">${beatRows}</div>
                ${beatSelect}
            </details>

            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">NPCs & Monsters</summary>
                <div id="session-npcs-${id}">${npcRows}</div>
                ${npcSelect}
            </details>

            <details open style="margin-bottom:4px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Combat Encounters</summary>
                <div id="session-combats-${id}"><em style="color:#999;font-size:0.9em">Loading…</em></div>
                <div style="display:flex;gap:8px;margin-top:8px">
                    <input type="text" id="new-encounter-title-${id}" placeholder="Encounter title, e.g. Ambush at the docks" style="flex:1">
                    <button type="button" class="btn-secondary btn-sm" onclick="dmAddEncounter(${id})">+ Add Encounter</button>
                </div>
                <small style="color:#999;display:block;margin-top:4px">Players run encounters from their dashboard once you set them up.</small>
            </details>
        `);
        dmLoadSessionCombats(id);
    } catch (err) {
        showToast(`Failed to load session: ${err.message}`);
    }
}

async function handleEditSession(event, id) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    try {
        await apiFetch(`${API_BASE}/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await loadSessions();
    } catch (err) {
        showToast(`Failed to save session: ${err.message}`);
    }
}

async function saveSessionChapters(sessionId, btn) {
    const section = btn.closest('details');
    const checked = new Set([...section.querySelectorAll('.chapter-check:checked')].map(el => +el.value));
    const unchecked = [...section.querySelectorAll('.chapter-check:not(:checked)')].map(el => +el.value);

    try {
        await Promise.all([
            ...checked  ? [...checked].map(cid  => apiFetch(`${API_BASE}/sessions/${sessionId}/chapters`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chapter_id:cid}) })) : [],
            ...unchecked.map(cid => apiFetch(`${API_BASE}/sessions/${sessionId}/chapters/${cid}`, { method:'DELETE' }))
        ]);
    } catch (err) {
        console.error('Failed to save chapter links:', err);
    }
    await loadSessions();
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = 'Save Chapter Links'; }, 2000);
}

// These previously called bare fetch() with no error handling at all — a
// failed request was silently ignored and the UI still refreshed as if it
// had succeeded. apiFetch throws on a non-ok response, so each is now
// wrapped in a try/catch that logs the error but still refreshes the UI
// afterward, preserving that original "always refresh" behavior while
// making failures at least visible in the console instead of fully silent.

async function addSessionChar(sessionId, charId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: charId })
        });
    } catch (err) { console.error('Failed to add character to session:', err); }
    editSession(sessionId);
}

async function removeSessionChar(sessionId, charId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters/${charId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove character from session:', err); }
    editSession(sessionId);
}

async function updateSessionCharAttendance(sessionId, charId, attendance) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/characters/${charId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance })
        });
    } catch (err) { console.error('Failed to update attendance:', err); }
    await loadSessions();
}

async function addSessionBeat(sessionId) {
    const sel = document.getElementById(`beat-add-select-${sessionId}`);
    if (!sel) return;
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/beats`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ beat_id: +sel.value })
        });
    } catch (err) { console.error('Failed to add beat to session:', err); }
    editSession(sessionId);
}

async function removeSessionBeat(sessionId, beatId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/beats/${beatId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove beat from session:', err); }
    editSession(sessionId);
}

async function addSessionNpc(sessionId) {
    const sel = document.getElementById(`npc-add-select-${sessionId}`);
    if (!sel) return;
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/npcs`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npc_id: +sel.value })
        });
    } catch (err) { console.error('Failed to add NPC to session:', err); }
    editSession(sessionId);
}

async function removeSessionNpc(sessionId, npcId, btn) {
    try {
        await apiFetch(`${API_BASE}/sessions/${sessionId}/npcs/${npcId}`, { method: 'DELETE' });
    } catch (err) { console.error('Failed to remove NPC from session:', err); }
    editSession(sessionId);
}

Object.assign(window, { addSessionBeat, addSessionChar, addSessionNpc, editSession, handleEditSession, removeSessionBeat, removeSessionChar, removeSessionNpc, saveSessionChapters, updateSessionCharAttendance });