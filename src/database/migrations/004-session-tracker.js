// Server-side session tracker: player scenes (solo "issues" in each character's
// comic), session/scene notes, and DM-authored combat encounters that players run.
//
// The comic-book model: every character has their own timeline made of DM
// campaign sessions (shared issues / team-ups) and personal scenes (solo issues,
// draft until the DM approves them). Notes and combats attach to exactly one
// session or scene, and carry a visibility level that controls what other
// characters' "books" can see:
//   private -> author + DM,  session -> participants of that session/scene,
//   public  -> the whole table.

const DDL = `
CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    scene_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','approved')),
    visibility TEXT DEFAULT 'session' CHECK(visibility IN ('private','session','public')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visibility TEXT DEFAULT 'session' CHECK(visibility IN ('private','session','public')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK ((session_id IS NULL) != (scene_id IS NULL))
);

CREATE TABLE IF NOT EXISTS combat_encounters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed')),
    round INTEGER DEFAULT 1,
    turn_index INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'session' CHECK(visibility IN ('private','session','public')),
    summary TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    CHECK ((session_id IS NULL) != (scene_id IS NULL))
);

CREATE TABLE IF NOT EXISTS combatants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    encounter_id INTEGER NOT NULL REFERENCES combat_encounters(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    combatant_type TEXT DEFAULT 'npc' CHECK(combatant_type IN ('pc','npc','monster')),
    initiative INTEGER DEFAULT 10,
    max_hp INTEGER DEFAULT 10,
    current_hp INTEGER DEFAULT 10,
    conditions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scenes_character ON scenes(character_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_scene ON session_notes(scene_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_session ON combat_encounters(session_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_scene ON combat_encounters(scene_id);
CREATE INDEX IF NOT EXISTS idx_combatants_encounter ON combatants(encounter_id);
`;

function up(db) {
    db.exec(DDL);
}

module.exports = { up };
