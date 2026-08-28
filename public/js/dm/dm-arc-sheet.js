import { verifyDmSession } from './dm-auth-guard.js';
import { renderCreatureCard } from './dm-creature-card.js';

const DEFAULT_SHADOWS_BY_ARC = {
    2: [3],
};
const STATUS_SEQUENCE = ['planned', 'active', 'completed'];

let arc;
let npcs = [];
let shadows = [];
const expandedCompletedChapters = new Set();

function statusLabel(status) {
    return status === 'active' ? 'In Progress' :
        status.charAt(0).toUpperCase() + status.slice(1);
}

function notesList(notes) {
    const items = (notes || '').split(/\r?\n/)
        .map(note => note.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean);
    return items.length
        ? `<ul class="chapter-notes">${items.map(note => `<li>${escHtml(note)}</li>`).join('')}</ul>`
        : '<p class="empty-state">No DM notes.</p>';
}

function renderHeader() {
    document.title = `${arc.title} — DM Story Arc Sheet`;
    document.getElementById('arc-header').innerHTML = `
        <p><a href="/dm-dashboard.html#story-arcs">← Story Arcs</a></p>
        <h1>${escHtml(arc.title)}</h1>
        <p class="sheet-theme">${escHtml(arc.theme || 'No theme recorded.')}</p>
        <span class="status-badge status-${escHtml(arc.status)}">${escHtml(statusLabel(arc.status))}</span>`;
}

function renderChapter(chapter, index) {
    const collapsed = chapter.status === 'completed' && !expandedCompletedChapters.has(chapter.id);
    if (collapsed) {
        return `<article class="card chapter-card collapsed" data-expand-chapter="${chapter.id}" tabindex="0" role="button" aria-expanded="false">
            <div class="chapter-summary">
                <span>${index + 1}.</span>
                <h3>${escHtml(chapter.title)}</h3>
                <span class="status-badge status-completed">Completed</span>
            </div>
        </article>`;
    }

    const currentStatusIndex = STATUS_SEQUENCE.indexOf(chapter.status);
    const nextStatus = STATUS_SEQUENCE[currentStatusIndex + 1];
    return `<article class="card chapter-card">
        <div class="chapter-summary">
            <span>${index + 1}.</span>
            <h3>${escHtml(chapter.title)}</h3>
            <span class="status-badge status-${escHtml(chapter.status)}">${escHtml(statusLabel(chapter.status))}</span>
        </div>
        <div class="chapter-detail">
            <p>${escHtml(chapter.description || 'No description.')}</p>
            <h4>DM Notes</h4>
            ${notesList(chapter.dm_notes)}
            <div class="chapter-actions">
                ${nextStatus ? `<button class="btn-primary" data-advance-chapter="${chapter.id}" data-next-status="${nextStatus}">Advance to ${statusLabel(nextStatus)}</button>` : '<span>Chapter complete</span>'}
                ${chapter.status === 'completed' ? `<button class="btn-secondary" data-collapse-chapter="${chapter.id}">Collapse</button>` : ''}
            </div>
        </div>
    </article>`;
}

function renderChapters() {
    document.getElementById('chapter-walkthrough').innerHTML = arc.chapters
        .map(renderChapter).join('');
}

function renderShadowFilters() {
    const hasCuratedDefaults = Object.hasOwn(DEFAULT_SHADOWS_BY_ARC, arc.id);
    const defaults = new Set(DEFAULT_SHADOWS_BY_ARC[arc.id] || shadows.map(shadow => shadow.id));
    document.getElementById('shadow-filters').innerHTML = `
        ${shadows.map(shadow => `
            <label><input type="checkbox" value="${shadow.id}" ${defaults.has(shadow.id) ? 'checked' : ''}> ${escHtml(shadow.name)}</label>
        `).join('')}
        <button class="btn-secondary btn-sm" type="button" data-shadow-filter="all">Show All</button>
        ${hasCuratedDefaults ? '<button class="btn-secondary btn-sm" type="button" data-shadow-filter="curated">Curated Only</button>' : ''}
    `;
}

function renderBestiary() {
    const selected = new Set([...document.querySelectorAll('#shadow-filters input:checked')]
        .map(input => Number(input.value)));
    const filtered = npcs.filter(npc => selected.has(npc.shadow_id));
    const shadowName = id => (shadows.find(shadow => shadow.id === id) || {}).name || 'Unknown';
    document.getElementById('arc-bestiary').innerHTML = filtered.length
        ? filtered.map(npc => renderCreatureCard(npc, shadowName, { showControls: false })).join('')
        : '<div class="empty-state"><h3>No creatures match the selected shadows</h3></div>';
}

async function advanceChapter(chapterId, nextStatus, button) {
    button.disabled = true;
    try {
        const updated = await apiFetch(`/api/arcs/${arc.id}/chapters/${chapterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
        });
        const index = arc.chapters.findIndex(chapter => chapter.id === chapterId);
        arc.chapters[index] = { ...arc.chapters[index], ...updated };
        expandedCompletedChapters.delete(chapterId);
        renderChapters();
    } catch (error) {
        button.disabled = false;
        showToast(`Failed to update chapter: ${error.message}`);
    }
}

function installHandlers() {
    document.getElementById('shadow-filters').addEventListener('change', renderBestiary);
    document.getElementById('shadow-filters').addEventListener('click', event => {
        const control = event.target.closest('[data-shadow-filter]');
        if (!control) return;
        const selectedIds = control.dataset.shadowFilter === 'all'
            ? new Set(shadows.map(shadow => shadow.id))
            : new Set(DEFAULT_SHADOWS_BY_ARC[arc.id]);
        document.querySelectorAll('#shadow-filters input[type="checkbox"]').forEach(input => {
            input.checked = selectedIds.has(Number(input.value));
        });
        renderBestiary();
    });
    document.getElementById('chapter-walkthrough').addEventListener('click', event => {
        const advance = event.target.closest('[data-advance-chapter]');
        if (advance) {
            advanceChapter(Number(advance.dataset.advanceChapter), advance.dataset.nextStatus, advance);
            return;
        }
        const collapse = event.target.closest('[data-collapse-chapter]');
        if (collapse) {
            expandedCompletedChapters.delete(Number(collapse.dataset.collapseChapter));
            renderChapters();
            return;
        }
        const expand = event.target.closest('[data-expand-chapter]');
        if (expand) {
            expandedCompletedChapters.add(Number(expand.dataset.expandChapter));
            renderChapters();
        }
    });
    document.getElementById('chapter-walkthrough').addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-expand-chapter]')) {
            event.preventDefault();
            expandedCompletedChapters.add(Number(event.target.dataset.expandChapter));
            renderChapters();
        }
    });
}

async function initialize() {
    if (!await verifyDmSession()) return;
    const arcId = Number(new URLSearchParams(window.location.search).get('arc'));
    if (!Number.isInteger(arcId) || arcId <= 0) {
        document.getElementById('arc-header').innerHTML = '<p class="sheet-error">A valid arc query parameter is required.</p>';
        return;
    }

    try {
        [arc, npcs, shadows] = await Promise.all([
            apiFetch(`/api/arcs/${arcId}`),
            apiFetch('/api/npcs'),
            apiFetch('/api/shadows'),
        ]);
        renderHeader();
        renderChapters();
        renderShadowFilters();
        renderBestiary();
        installHandlers();
    } catch (error) {
        document.getElementById('arc-header').innerHTML = `<p class="sheet-error">Unable to load story arc: ${escHtml(error.message)}</p>`;
    }
}

initialize();
