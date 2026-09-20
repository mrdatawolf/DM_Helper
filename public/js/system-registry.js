(function exposeSystemRegistry(root, factory) {
    const registry = factory(root.FaseripSheet, root.DndReadOnlySheet, root.DndFullSheet, root.FaseripFullSheet);
    root.CharacterSystemRegistry = registry;
    if (typeof module === 'object' && module.exports) {
        module.exports = registry;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createSystemRegistry(faseripSheet, dndReadOnlySheet, dndFullSheet, faseripFullSheet) {

const CHARACTER_SYSTEMS = Object.freeze([
    Object.freeze({ id: 'dnd5e', label: 'D&D 5e — Summary', render: dndReadOnlySheet.renderDndReadOnlySheet }),
    Object.freeze({ id: 'dnd5e-full', label: 'D&D 5e — Full Sheet', render: dndFullSheet.renderDndFullSheet }),
    Object.freeze({ id: 'faserip', label: 'FASERIP — Summary', render: faseripSheet.renderFaseripSheet }),
    Object.freeze({ id: 'faserip-full', label: 'FASERIP — Full Sheet', render: faseripFullSheet.renderFaseripFullSheet }),
]);

const runtimeSystems = new Map();
let activeSystemId = null;

function registerRuntime(system) {
    runtimeSystems.set(system.id, Object.freeze(system));
}

function setActiveSystem(id) {
    if (!runtimeSystems.has(id)) throw new Error(`Unknown system: ${id}`);
    activeSystemId = id;
    return runtimeSystems.get(id);
}

function getActiveSystem() {
    if (!activeSystemId) throw new Error('The active campaign system has not been loaded');
    return runtimeSystems.get(activeSystemId);
}

async function loadActiveSystem(token) {
    const response = await fetch('/api/auth/campaigns/current-system', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Unable to load the active campaign system');
    return setActiveSystem((await response.json()).id);
}

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

return { CHARACTER_SYSTEMS, getCharacterSystem, renderSystemPicker,
    getActiveSystem, loadActiveSystem, registerRuntime, setActiveSystem };
}));
