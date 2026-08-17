// player-familiars.js — read-only Familiar section on the character sheet.
// Familiars are bonded/edited by the DM; effective AC/HP/abilities shown
// here are pre-computed server-side from the growth table + character level.

function renderFamiliarsSection(character) {
    const familiars = (character.familiars || []).filter(f => f.is_active);
    if (!familiars.length) return '';

    const cards = familiars.map(f => `
        <div style="padding:10px 4px;border-bottom:1px solid rgba(128,128,128,0.15)">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <strong style="flex:1">${escHtmlP(f.name)}
                    ${f.creature_type ? ` <span class="badge" style="font-size:0.7rem">${escHtmlP(f.creature_type)}</span>` : ''}
                </strong>
                <span style="font-size:0.85rem;color:#888">AC ${f.effective_ac ?? '—'} · HP ${f.effective_hp ?? '—'}</span>
            </div>
            <div style="font-size:0.82rem;color:#888;margin-top:2px">${escHtmlP(f.bond_type || 'Psychic')} bond${f.current_tier_level ? ` · grown to tier Lv ${f.current_tier_level}` : ''}${f.next_tier ? ` · next growth at Lv ${f.next_tier.level}` : ''}</div>
            ${f.unlocked_abilities && f.unlocked_abilities.length ? `<div style="font-size:0.82rem;color:#555;margin-top:2px">Abilities: ${f.unlocked_abilities.map(escHtmlP).join(', ')}</div>` : ''}
            ${f.description ? `<div style="font-size:0.85rem;margin-top:4px">${escHtmlP(f.description)}</div>` : ''}
            ${f.bond_notes ? `<div style="font-size:0.82rem;color:#888;margin-top:4px;font-style:italic">${escHtmlP(f.bond_notes)}</div>` : ''}
        </div>`
    ).join('');

    return `
        <h3>Familiar</h3>
        <div id="familiars-list">${cards}</div>`;
}
