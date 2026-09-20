// Shared access rules for the session tracker (scenes, notes, combats).
//
// Visibility model ("what bleeds between comics"):
//   private -> author/creator + DM
//   session -> anyone with a character participating in the parent session/scene
//   public  -> any logged-in user
// Draft scenes are only visible to their creator and the DM, regardless of the
// visibility of anything attached to them.

function isDM(user, campaign) {
    return !!(user && campaign && (
        campaign.role === 'dm' || user.isAdmin || user.isSuperAdmin
    ));
}

function ownsCharacter(db, user, campaignId, characterId) {
    if (!characterId) return false;
    const c = db.prepare(`
        SELECT c.user_id
        FROM characters c
        JOIN campaign_characters cc ON cc.character_id = c.id
        WHERE c.id = ? AND cc.campaign_id = ?
    `).get(characterId, campaignId);
    return !!c && c.user_id === user.userId;
}

// Does the user have a character participating in this campaign session?
function participatesInSession(db, user, campaignId, sessionId) {
    const row = db.prepare(`
        SELECT 1 FROM session_characters sc
        JOIN characters c ON c.id = sc.character_id
        JOIN campaign_sessions cs ON cs.id = sc.session_id
        JOIN campaign_characters cc ON cc.character_id = c.id
        WHERE sc.session_id = ? AND c.user_id = ?
          AND sc.campaign_id = ? AND cs.campaign_id = ? AND cc.campaign_id = ?
        LIMIT 1
    `).get(sessionId, user.userId, campaignId, campaignId, campaignId);
    return !!row;
}

// Is the user a participant of this scene (its character's owner or its creator)?
function participatesInScene(db, user, campaignId, scene) {
    if (!scene) return false;
    if (scene.campaign_id !== campaignId) return false;
    if (scene.created_by === user.userId) return true;
    return ownsCharacter(db, user, campaignId, scene.character_id);
}

// Can the user see the parent container at all?
// Returns the parent row (session or scene) if visible, else null.
function visibleParent(db, user, campaign, { session_id, scene_id }) {
    if (session_id) {
        const session = db.prepare('SELECT * FROM campaign_sessions WHERE id = ? AND campaign_id = ?')
            .get(session_id, campaign.id);
        return session || null; // campaign sessions are visible to all players
    }
    if (scene_id) {
        const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
            .get(scene_id, campaign.id);
        if (!scene) return null;
        if (isDM(user, campaign) || participatesInScene(db, user, campaign.id, scene)) return scene;
        if (scene.status === 'approved' && scene.visibility === 'public') return scene;
        return null;
    }
    return null;
}

// Can the user write content (notes) into this parent?
function canWriteToParent(db, user, campaign, { session_id, scene_id }) {
    if (isDM(user, campaign)) return !!visibleParent(db, user, campaign, { session_id, scene_id });
    if (session_id) return participatesInSession(db, user, campaign.id, session_id);
    if (scene_id) {
        const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
            .get(scene_id, campaign.id);
        return participatesInScene(db, user, campaign.id, scene);
    }
    return false;
}

// Visibility check for an individual record (note or combat) the user did not author.
// Assumes the parent itself is visible to the user.
function recordVisible(db, user, campaign, record) {
    if (record.campaign_id !== campaign.id) return false;
    if (isDM(user, campaign)) return true;
    if (record.user_id === user.userId || record.created_by === user.userId) return true;
    if (record.visibility === 'public') return true;
    if (record.visibility === 'session') {
        if (record.session_id) return participatesInSession(db, user, campaign.id, record.session_id);
        if (record.scene_id) {
            const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
                .get(record.scene_id, campaign.id);
            return participatesInScene(db, user, campaign.id, scene);
        }
    }
    return false;
}

// A draft scene hides everything inside it from non-participants.
function parentIsVisibleDraftSafe(db, user, campaign, record) {
    if (record.campaign_id !== campaign.id) return false;
    if (!record.scene_id) return true;
    const scene = db.prepare('SELECT * FROM scenes WHERE id = ? AND campaign_id = ?')
        .get(record.scene_id, campaign.id);
    if (!scene) return false;
    if (isDM(user, campaign) || participatesInScene(db, user, campaign.id, scene)) return true;
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
