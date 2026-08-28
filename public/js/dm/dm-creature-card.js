import { patternInfluenceLabel } from './dm-primal-patterns.js';

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

function renderCreatureCard(n, shadowName, { showControls = true } = {}) {
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
            ${showControls ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
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
            </div>` : (n.is_important ? '<div style="margin-top:10px"><span class="badge badge-starting">Important</span></div>' : '')}
        </div>`;
}

export { renderCreatureCard, shadowInfluenceCardStyle };
