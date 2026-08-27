// Shared access rules for the session tracker (scenes, notes, combats).
//
// Visibility model ("what bleeds between comics"):
//   private -> author/creator + DM
//   session -> anyone with a character participating in the parent session/scene
//   public  -> any logged-in user
// Draft scenes are only visible to their creator and the DM, regardless of the
// visibility of anything attached to them.

const { isDMOrAdmin } = require('../middleware/auth');

function isDM(user) {
    return isDMOrAdmin(user);
}

function ownsCharacter(db, user, characterId) {
    if (!characterId) return false;
    const c = db.prepare('SELECT user_id FROM characters WHERE id = ?').get(characterId);
    return !!c && c.user_id === user.userId;
}

// Does the user have a character participating in this campaign session?
function participatesInSession(db, user, sessionId) {
    const row = db.prepare(`
        SELECT 1 FROM session_characters sc
        JOIN characters c ON c.id = sc.character_id
        WHERE sc.session_id = ? AND c.user_id = ?
        LIMIT 1
    `).get(sessionId, user.userId);
    return !!row;
}

// Is the user a participant of this scene (its character's owner or its creator)?
function participatesInScene(db, user, scene) {
    if (!scene) return false;
    if (scene.created_by === user.userId) return true;
    return ownsCharacter(db, user, scene.character_id);
}

// Can the user see the parent container at all?
// Returns the parent row (session or scene) if visible, else null.
function visibleParent(db, user, { session_id, scene_id }) {
    if (session_id) {
        const session = db.prepare('SELECT * FROM campaign_sessions WHERE id = ?').get(session_id);
        return session || null; // campaign sessions are visible to all players
    }
    if (scene_id) {
        const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(scene_id);
        if (!scene) return null;
        if (isDM(user) || participatesInScene(db, user, scene)) return scene;
        if (scene.status === 'approved' && scene.visibility === 'public') return scene;
        return null;
    }
    return null;
}

// Can the user write content (notes) into this parent?
function canWriteToParent(db, user, { session_id, scene_id }) {
    if (isDM(user)) return !!visibleParent(db, user, { session_id, scene_id });
    if (session_id) return participatesInSession(db, user, session_id);
    if (scene_id) {
        const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(scene_id);
        return participatesInScene(db, user, scene);
    }
    return false;
}

// Visibility check for an individual record (note or combat) the user did not author.
// Assumes the parent itself is visible to the user.
function recordVisible(db, user, record) {
    if (isDM(user)) return true;
    if (record.user_id === user.userId || record.created_by === user.userId) return true;
    if (record.visibility === 'public') return true;
    if (record.visibility === 'session') {
        if (record.session_id) return participatesInSession(db, user, record.session_id);
        if (record.scene_id) {
            const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(record.scene_id);
            return participatesInScene(db, user, scene);
        }
    }
    return false;
}

// A draft scene hides everything inside it from non-participants.
function parentIsVisibleDraftSafe(db, user, record) {
    if (!record.scene_id) return true;
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get(record.scene_id);
    if (!scene) return false;
    if (isDM(user) || participatesInScene(db, user, scene)) return true;
    return scene.status === 'approved';
}

module.exports = {
    isDM,
    ownsCharacter,
    participatesInSession,
    participatesInScene,
    visibleParent,
    canWriteToParent,
    recordVisible,
    parentIsVisibleDraftSafe,
};
