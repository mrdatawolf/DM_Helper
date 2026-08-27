// player-state.js — shared mutable state for the player dashboard modules.
//
// A real ES module `import` binding is read-only in the importing file, so
// the fields that used to be plain reassignable globals (`let currentUser =
// ...`) are gathered into one `state` object instead: every module can
// freely do `state.currentCharacter = x`, since that's a property mutation,
// not a rebinding (see ADR-001).
export const state = {
    currentUser: null,
    currentCharacter: null,
    userCharacters: [],
    playerAllShadows: [],
};
