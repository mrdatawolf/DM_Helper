(function exposeFaseripFullSheet(root, factory) {
    root.FaseripFullSheet = factory(root.FaseripConversion);
    if (typeof module === 'object' && module.exports) {
        module.exports = root.FaseripFullSheet;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createFaseripFullSheet(FaseripConversion) {
    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // A field with real, converted data.
    function field(label, value) {
        return `<div class="field"><div class="field-label">${escapeHtml(label)}</div><div class="field-value">${escapeHtml(value) || '—'}</div></div>`;
    }

    // A field the sample PDF has but nothing in a D&D-converted character
    // maps to — shown per the human's explicit choice to keep section parity
    // with the paper sheet rather than silently dropping empty sections.
    function untracked(label) {
        return `<div class="field field-untracked"><div class="field-label">${escapeHtml(label)}</div><div class="field-value"><em>Not tracked for converted characters</em></div></div>`;
    }

    function textBlock(label, value, fallbackNote) {
        const body = value ? escapeHtml(value).replace(/\n/g, '<br>') : `<em>${escapeHtml(fallbackNote || 'Not tracked for converted characters')}</em>`;
        return `<div class="text-block"><h4>${escapeHtml(label)}</h4><p>${body}</p></div>`;
    }

    // Full, read-only FASERIP view for the "View As..." picker, laid out
    // after the sections of the sample sheet
    // (Samples/Classic_MSH_(FASERIP)_Character_sheet.pdf) rather than just
    // the compact FASE/RIP/Health/Karma card (public/js/faserip-sheet.js).
    // Per an explicit decision when this was scoped: most of that sheet
    // (Occupation, Group Affiliation, Powers, Talents, Contacts, Resources,
    // Popularity, Karma Bank history, Power Stunt History, etc.) has no
    // equivalent in a D&D-converted character and is shown as an empty,
    // clearly-labeled section rather than silently omitted, so the layout
    // still reads as "the same sheet, mostly blank" rather than a different,
    // shorter sheet. Only Name/Age/Height/Weight/Eyes/Skin/Hair (added in a
    // later D&D-sheet task), Health/Karma/the seven FASE/RIP stats,
    // Backstory, Personality, and Gear have real source data.
    function renderFaseripFullSheet(character) {
        const stats = FaseripConversion.computeFaseripCharacter(character);
        const statRows = [
            ['Fighting', stats.fighting], ['Agility', stats.agility],
            ['Strength', stats.strength], ['Endurance', stats.endurance],
            ['Reason', stats.reason], ['Intuition', stats.intuition],
            ['Psyche', stats.psyche],
        ].map(([label, stat]) => `
            <div class="stat-row">
                <span class="stat-name">${escapeHtml(label)}</span>
                <span class="stat-rank">${escapeHtml(stat.name)} (${stat.number})</span>
                <span class="stat-abbr">${escapeHtml(stat.abbreviation)}</span>
            </div>`).join('');

        const gearHtml = (character.gear || []).length
            ? (character.gear || []).map(item => `<div class="list-row"><strong>${escapeHtml(item.item_name)}</strong>${item.quantity > 1 ? ` <span>×${item.quantity}</span>` : ''}</div>`).join('')
            : '<p class="empty-note">No inventory recorded.</p>';

        return `
            <style>
                /* Embedded for the same reason as dnd-full-sheet.js: this
                   renders inside a modal on both the player and DM
                   dashboards, which load different page-specific
                   stylesheets. */
                .faserip-full-sheet { color: #35180f; }
                .faserip-full-sheet .sheet-header { background: #a33a1f; color: #fff; padding: 14px 18px; border-radius: 10px 10px 0 0; margin: -1px -1px 14px; }
                .faserip-full-sheet .sheet-header h2 { margin: 0 0 4px; }
                .faserip-full-sheet .sheet-subtitle { font-size: .85rem; opacity: .9; letter-spacing: .03em; }
                .faserip-full-sheet .sheet-section { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f0ded0; }
                .faserip-full-sheet .sheet-section:last-child { border-bottom: none; }
                .faserip-full-sheet h3 { margin: 0 0 10px; color: #a33a1f; }
                .faserip-full-sheet .sheet-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
                .faserip-full-sheet .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
                .faserip-full-sheet .field-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #8b5a2b; }
                .faserip-full-sheet .field-value { font-size: .95rem; }
                .faserip-full-sheet .field-untracked .field-value { color: #b0a396; }
                .faserip-full-sheet .stat-list { display: grid; gap: 4px; }
                .faserip-full-sheet .stat-row { display: grid; grid-template-columns: 90px 1fr auto; gap: 8px; font-size: .92rem; padding: 3px 0; }
                .faserip-full-sheet .stat-name { font-weight: 700; }
                .faserip-full-sheet .stat-abbr { color: #b0876a; font-size: .8rem; }
                .faserip-full-sheet .list-row { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px dashed #f0ded0; font-size: .9rem; }
                .faserip-full-sheet .empty-note { color: #b0a396; font-style: italic; font-size: .88rem; }
                .faserip-full-sheet .text-block h4 { margin: 0 0 4px; color: #a33a1f; font-size: .85rem; text-transform: uppercase; }
                .faserip-full-sheet .text-block p { margin: 0; font-size: .92rem; line-height: 1.5; }
                @media (max-width: 760px) { .faserip-full-sheet .sheet-columns { grid-template-columns: 1fr; } }
            </style>
            <section class="faserip-full-sheet">
                <header class="sheet-header">
                    <h2>${escapeHtml(character.name || 'Character')}</h2>
                    <div class="sheet-subtitle">FASERIP (converted from D&amp;D 5e)</div>
                </header>

                <section class="sheet-section">
                    <h3>Identity</h3>
                    <div class="field-grid">
                        ${untracked('Occupation')}
                        ${untracked('Legal Status')}
                        ${field('Age', character.age)}
                        ${field('Height', character.height)}
                        ${field('Hair', character.hair)}
                        ${untracked('Identity')}
                        ${untracked('Sex')}
                        ${field('Weight', character.weight)}
                        ${untracked('Ears')}
                        ${untracked('Is I.D. Secret?')}
                        ${untracked('Handed')}
                        ${field('Eyes', character.eyes)}
                        ${field('Skin', character.skin)}
                        ${untracked('Place of Birth')}
                        ${untracked('Base of Operations')}
                        ${untracked('Group Affiliation')}
                        ${untracked('Birth Order')}
                        ${untracked('Known Relatives')}
                        ${untracked('Past Group Affiliation(s)')}
                        ${untracked('Marital Status')}
                    </div>
                </section>

                <section class="sheet-section">
                    <h3>F.A.S.E.R.I.P.</h3>
                    <div class="stat-list">${statRows}</div>
                    <div class="field-grid" style="margin-top:10px">
                        ${field('Health', stats.health)}
                        ${field('Karma', stats.karma)}
                        ${untracked('Popularity')}
                        ${untracked('Resources')}
                    </div>
                </section>

                <div class="sheet-columns">
                    <section class="sheet-section">
                        ${textBlock('Brief History', character.backstory)}
                        ${textBlock('Origin of Power', null)}
                    </section>
                    <section class="sheet-section">
                        ${textBlock('Role Playing Notes', character.personality)}
                        ${textBlock('Weaknesses', null)}
                    </section>
                </div>

                <section class="sheet-section">
                    <h3>Karma Bank</h3>
                    <p class="empty-note">Not tracked for converted characters.</p>
                </section>

                <section class="sheet-section">
                    <h3>Powers, Talents &amp; Contacts</h3>
                    <p class="empty-note">Not tracked for converted characters.</p>
                </section>

                <section class="sheet-section">
                    <h3>Inventory</h3>
                    ${gearHtml}
                </section>

                <section class="sheet-section">
                    <h3>Power Stunt History &amp; Miscellaneous Notes</h3>
                    <p class="empty-note">Not tracked for converted characters.</p>
                </section>
            </section>`;
    }

    return { renderFaseripFullSheet };
}));
