(function exposeFaseripSheet(root, factory) {
    const sheet = factory();
    root.FaseripSheet = sheet;
    if (typeof module === 'object' && module.exports) {
        module.exports = sheet;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createFaseripSheet() {
function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderStat(label, stat) {
    return `
        <div style="background:#fff7e6;border:1px solid #d99b32;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#7a2f16;font-size:.78rem;font-weight:700;text-transform:uppercase">${label}</div>
            <div style="font-size:1.05rem;font-weight:700">${stat.name} (${stat.number})</div>
            <div style="color:#8b5a2b;font-size:.78rem">${stat.abbreviation}</div>
        </div>`;
}

function renderFaseripSheet(character) {
    const result = FaseripConversion.computeFaseripCharacter(character);
    const stats = [
        ['Fighting', result.fighting], ['Agility', result.agility],
        ['Strength', result.strength], ['Endurance', result.endurance],
        ['Reason', result.reason], ['Intuition', result.intuition],
        ['Psyche', result.psyche],
    ];

    return `
        <section class="faserip-sheet" style="border:3px solid #a33a1f;border-radius:12px;overflow:hidden;background:#fffdf8">
            <header style="background:#a33a1f;color:white;padding:14px 18px">
                <h3 style="margin:0">${escapeHtml(character.name || 'Character')}</h3>
                <div style="font-size:.85rem;letter-spacing:.04em">FASERIP (converted)</div>
            </header>
            <div style="padding:16px">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
                    ${stats.map(([label, stat]) => renderStat(label, stat)).join('')}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px">
                    <div style="background:#7a2f16;color:white;border-radius:8px;padding:12px;text-align:center"><strong>Health</strong><div style="font-size:1.5rem">${result.health}</div></div>
                    <div style="background:#d99b32;color:#35180f;border-radius:8px;padding:12px;text-align:center"><strong>Karma</strong><div style="font-size:1.5rem">${result.karma}</div></div>
                </div>
            </div>
        </section>`;
}

return { renderFaseripSheet };
}));
