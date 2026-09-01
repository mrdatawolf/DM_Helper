(function exposeSystemRegistry(root, factory) {
    const registry = factory(root.FaseripSheet);
    root.CharacterSystemRegistry = registry;
    if (typeof module === 'object' && module.exports) {
        module.exports = registry;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSystemRegistry(faseripSheet) {

const CHARACTER_SYSTEMS = Object.freeze([
    Object.freeze({ id: 'faserip', label: 'FASERIP', render: faseripSheet.renderFaseripSheet }),
]);

function getCharacterSystem(id) {
    return CHARACTER_SYSTEMS.find(system => system.id === id);
}

function renderSystemPicker(selectFunctionName, characterId) {
    return `
        <div class="system-picker">
            <p>Choose a system for this read-only converted view.</p>
            <div style="display:grid;gap:10px">
                ${CHARACTER_SYSTEMS.map(system => `
                    <button class="btn-secondary" onclick="${selectFunctionName}(${characterId}, '${system.id}')">
                        ${system.label}
                    </button>`).join('')}
            </div>
        </div>`;
}

return { CHARACTER_SYSTEMS, getCharacterSystem, renderSystemPicker };
}));
