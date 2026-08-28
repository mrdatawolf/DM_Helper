import { state } from './dm-state.js';
// ── Grand Narrative ────────────────────────────────────────────

function renderGrandNarrative() {
    const section = document.getElementById('grand-narrative-section');
    if (!section) return;
    const gn = state.grandNarrative || {};
    section.innerHTML = `
    <div class="grand-narrative-panel">
        <div class="gn-header" onclick="toggleGrandNarrative()">
            <div class="gn-header-text">
                <h3 class="gn-title">${escHtml(gn.title || 'Grand Narrative')}</h3>
                <span class="gn-subtitle">The cosmic frame — why everything is happening</span>
            </div>
            <button class="gn-toggle" id="gn-toggle-btn">&#9650;</button>
        </div>
        <div class="gn-body" id="gn-body">
            <div class="arc-section" style="margin-bottom:12px;">
                <h4>Title</h4>
                <input type="text" class="arc-field" id="gn-title-input"
                    value="${escHtml(gn.title || 'The Grand Narrative')}"
                    onblur="saveGrandNarrative()"
                    style="padding:8px 10px;font-size:1rem;font-weight:600;">
            </div>
            <div class="gn-two-col">
                <div class="arc-section">
                    <h4>Summary</h4>
                    <textarea class="arc-field" rows="5" id="gn-summary-input"
                        onblur="saveGrandNarrative()"
                        placeholder="The overarching force and stakes…">${escHtml(gn.summary || '')}</textarea>
                </div>
                <div class="arc-section">
                    <h4>Factions &amp; Forces</h4>
                    <textarea class="arc-field" rows="5" id="gn-factions-input"
                        onblur="saveGrandNarrative()"
                        placeholder="Key powers, their goals and conflicts…">${escHtml(gn.factions || '')}</textarea>
                </div>
            </div>
            <div class="arc-section">
                <h4>DM Notes <span style="font-weight:400;font-size:0.8rem;color:#aaa;">(private)</span></h4>
                <textarea class="arc-field" rows="3" id="gn-notes-input"
                    onblur="saveGrandNarrative()"
                    placeholder="Hidden truths, endgame plans…">${escHtml(gn.dm_notes || '')}</textarea>
            </div>
        </div>
    </div>`;
}

function toggleGrandNarrative() {
    const body = document.getElementById('gn-body');
    const btn  = document.getElementById('gn-toggle-btn');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (btn) btn.innerHTML = open ? '&#9660;' : '&#9650;';
}

async function saveGrandNarrative() {
    const title    = document.getElementById('gn-title-input')?.value?.trim();
    const summary  = document.getElementById('gn-summary-input')?.value?.trim();
    const factions = document.getElementById('gn-factions-input')?.value?.trim();
    const dm_notes = document.getElementById('gn-notes-input')?.value?.trim();
    try {
        state.grandNarrative = await apiFetch('/api/arcs/grand-narrative', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, summary, factions, dm_notes })
        });
    } catch (err) {
        console.error('Failed to save grand narrative:', err);
    }
}

Object.assign(window, { saveGrandNarrative, toggleGrandNarrative });
export { renderGrandNarrative };