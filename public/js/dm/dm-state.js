// dm-state.js — the DM dashboard's shared, explicit application state.
// Replaces dm-core.js's previous top-level `let` globals (implicit,
// load-order-dependent) with one object every module imports explicitly.
// See ADR-001 (docs/decisions/ADR-001-frontend-module-migration.md) for why
// this is one shared object rather than per-domain stores.

// Was previously a top-level const in dm-core.js; moved here so every file
// that needs it can get it from the same no-dependencies import as `state`,
// rather than depending on dm-core.js (which nothing else should need to
// import from except its two exported helper functions).
export const API_BASE = '/api';

export const state = {
    currentUser: JSON.parse(localStorage.getItem('user') || 'null'),
    characters: [],
    shadows: [],
    shadowActiveFilter: 'All',
    shadowSearchQuery: '',
    creatureActiveFilter: 'All',
    sessions: [],
    progress: [],
    journalEntries: [],
    primalPatterns: [],
    activePatternId: null,
    openSections: new Set(),
    sectionGrantsCache: {},
    storyArcs: [],
    activeArcId: null,
    beats: [],
    npcs: [],
    grandNarrative: {},
};
