// player-creatures.js — Bestiary tab: flat, non-spoiler-safe list of all creatures/NPCs.
// Reuses the influence label/color helpers and spoiler-wrapper markup already
// established for Known Shadows in player-shadows.js.

let allCreatures = [];

async function loadCreatures() {
    const container = document.getElementById('player-creatures-list');
    container.innerHTML = '<div class="loading">Loading creatures…</div>';
    try {
        const res = await fetch('/api/npcs');
        if (!res.ok) throw new Error('Failed to load creatures');
        allCreatures = await res.json();
        renderCreatures();
    } catch (err) {
        console.error('Error loading creatures:', err);
        container.innerHTML = '<div class="info-message"><p>Could not load the bestiary.</p></div>';
    }
}

function renderCreatures() {
    const container = document.getElementById('player-creatures-list');

    if (!allCreatures.length) {
        container.innerHTML = '<div class="info-message"><p>No creatures have been recorded yet.</p></div>';
        return;
    }

    const showSpoilers = localStorage.getItem('showSpoilers') === 'true';
    const byRole = {};
    for (const n of allCreatures) {
        const role = n.role || 'Other';
        (byRole[role] = byRole[role] || []).push(n);
    }

    container.innerHTML = Object.entries(byRole).map(([role, creatures]) => `
        <div style="grid-column:1/-1;margin:12px 0 4px"><h3 style="margin:0">${escHtmlP(role)}</h3></div>
        ${creatures.map(n => creatureCardHtml(n, showSpoilers)).join('')}
    `).join('');
}

function creatureCardHtml(n, showSpoilers) {
    const style = visitedShadowCardStyle(n.influence);
    const infLabel = visitedInfluenceLabel(n.influence);
    const s = n.stats || {};
    const a = s.abilities || {};
    const abilityRow = ['str', 'dex', 'con', 'int', 'wis', 'cha']
        .filter(k => a[k] !== undefined)
        .map(k => `${k.toUpperCase()} ${a[k]}`).join(' · ');

    const card = `
    <div class="creature-player-card" style="${style}">
        <h3>${escHtmlP(n.name)}</h3>
        <span class="creature-role-badge">${escHtmlP(n.role || 'Creature')}</span>
        ${s.size_type ? `<p class="shadow-depth-flavor">${escHtmlP(s.size_type)}${n.alignment ? `, ${escHtmlP(n.alignment)}` : ''}</p>` : ''}
        ${n.description ? `<p class="creature-desc">${escHtmlP(n.description)}</p>` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap">
            <span class="shadow-influence-tag">${escHtmlP(infLabel)}</span>
            ${n.armor_class ? `<span style="font-size:0.8rem;color:#888">AC ${n.armor_class}</span>` : ''}
            ${n.hit_points ? `<span style="font-size:0.8rem;color:#888">HP ${n.hit_points}</span>` : ''}
            ${s.speed ? `<span style="font-size:0.8rem;color:#888">${escHtmlP(s.speed)}</span>` : ''}
        </div>
        ${abilityRow ? `<p style="font-size:0.82rem;color:#888;margin:0 0 10px">${abilityRow}</p>` : ''}
        ${(s.traits || []).length ? `<p style="margin:6px 0 2px"><strong style="font-size:0.85rem">Traits</strong></p><ul style="margin:0 0 8px;padding-left:18px;font-size:0.88rem;color:#555">${s.traits.map(t => `<li>${escHtmlP(t)}</li>`).join('')}</ul>` : ''}
        ${(s.lore || []).length ? `<p style="margin:6px 0 2px"><strong style="font-size:0.85rem">Lore</strong></p><ul style="margin:0;padding-left:18px;font-size:0.88rem;color:#555">${s.lore.map(t => `<li>${escHtmlP(t)}</li>`).join('')}</ul>` : ''}
    </div>`;

    if (n.is_spoiler && !showSpoilers) {
        return `
        <div class="spoiler-card-wrapper">
            ${card}
            <div class="spoiler-overlay">
                <span class="spoiler-label">Spoiler</span>
                <button class="btn-spoiler-toggle" onclick="enableCreatureSpoilers()">Reveal</button>
            </div>
        </div>`;
    }
    return card;
}

function syncCreatureSpoilerButton() {
    const btn = document.getElementById('creature-spoilers-toggle-btn');
    if (!btn) return;
    const on = localStorage.getItem('showSpoilers') === 'true';
    btn.textContent = on ? 'Show Spoilers: On' : 'Show Spoilers: Off';
    btn.style.borderColor = on ? '#8e44ad' : '';
    btn.style.color = on ? '#8e44ad' : '';
}

function toggleCreatureSpoilers() {
    const on = localStorage.getItem('showSpoilers') === 'true';
    localStorage.setItem('showSpoilers', on ? 'false' : 'true');
    syncCreatureSpoilerButton();
    renderCreatures();
}

function enableCreatureSpoilers() {
    localStorage.setItem('showSpoilers', 'true');
    syncCreatureSpoilerButton();
    renderCreatures();
}
