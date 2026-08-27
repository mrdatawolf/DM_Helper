const { isDMOrAdmin } = require('../../middleware/auth');

// Owner or DM (or admin-equivalent) may modify a character
function canModifyCharacter(reqUser, character) {
    return isDMOrAdmin(reqUser) || character.user_id === reqUser.userId;
}

// Powers are earned at the table: only the DM grants, edits, or revokes them.
// Also reused as-is for bonding/releasing a familiar (both are DM-only
// actions on a character) — the response message says "Powers" even for
// familiars, a pre-existing wording quirk carried over unchanged from
// before this file split, not something this refactor is meant to fix.
function requireDMUser(req, res) {
    if (!isDMOrAdmin(req.user)) {
        res.status(403).json({ error: 'Powers are granted by the DM' });
        return false;
    }
    return true;
}

module.exports = { canModifyCharacter, requireDMUser };
