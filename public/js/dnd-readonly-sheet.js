(function exposeDndReadOnlySheet(root, factory) {
    root.DndReadOnlySheet = factory(root.DndComputedCharacter);
    if (typeof module === 'object' && module.exports) {
        module.exports = root.DndReadOnlySheet;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDndReadOnlySheet(dndComputedCharacter) {
    const ABILITIES = [
        ['strength', 'STR'], ['dexterity', 'DEX'], ['constitution', 'CON'],
        ['intelligence', 'INT'], ['wisdom', 'WIS'], ['charisma', 'CHA'],
    ];

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function signed(value) {
        return Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
    }

    function renderAbility(label, ability) {
        return `
            <div style="background:#eaf2fb;border:1px solid #4a7fc9;border-radius:8px;padding:10px;text-align:center">
                <div style="color:#1c3f66;font-size:.78rem;font-weight:700;text-transform:uppercase">${label}</div>
                <div style="font-size:1.05rem;font-weight:700">${ability.score}</div>
                <div style="color:#2c5a8f;font-size:.85rem">${signed(ability.modifier)} · save ${signed(ability.save)}</div>
            </div>`;
    }

    // Read-only summary for the "View As..." picker — reuses the same
    // computedCharacter() the editable D&D sheet uses
    // (public/js/dnd-computed-character.js, a plain classic-script module
    // loaded on both the player and DM dashboards, specifically so this
    // works on both) so the numbers can never drift from the real sheet.
    // Deliberately does not reuse renderDndCharacterSheet()'s markup: that
    // template relies on bindDndCharacterSheet() to hydrate its slot()
    // placeholders and wire click-to-edit/PDF behavior, neither of which
    // this read-only, string-returning registry entry can do.
    function renderDndReadOnlySheet(character) {
        const computed = dndComputedCharacter.computedCharacter(character);
        const abilitiesHtml = ABILITIES.map(([key, label]) => renderAbility(label, computed.ability[key])).join('');

        return `
            <section class="dnd-readonly-sheet" style="border:3px solid #2c5a8f;border-radius:12px;overflow:hidden;background:#fdfeff">
                <header style="background:#2c5a8f;color:white;padding:14px 18px">
                    <h3 style="margin:0">${escapeHtml(character.name || 'Character')}</h3>
                    <div style="font-size:.85rem;letter-spacing:.04em">D&amp;D 5e (converted)</div>
                </header>
                <div style="padding:16px">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">
                        ${abilitiesHtml}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:14px">
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>AC</strong><div style="font-size:1.3rem">${character.armor_class ?? '—'}</div></div>
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>Initiative</strong><div style="font-size:1.3rem">${signed(computed.initiative)}</div></div>
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>Speed</strong><div style="font-size:1.3rem">${character.speed ?? '—'}</div></div>
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>HP</strong><div style="font-size:1.3rem">${character.current_hp ?? '—'}/${character.max_hp ?? '—'}</div></div>
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>Proficiency</strong><div style="font-size:1.3rem">${signed(computed.proficiency)}</div></div>
                        <div style="background:#1c3f66;color:white;border-radius:8px;padding:10px;text-align:center"><strong>Passive Perception</strong><div style="font-size:1.3rem">${computed.passivePerception}</div></div>
                    </div>
                </div>
            </section>`;
    }

    return { renderDndReadOnlySheet };
}));
