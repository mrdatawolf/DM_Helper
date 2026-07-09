// Feature tables historically created by one-off scripts (now in src/database/legacy/):
// journal, story arcs/chapters/beats, session links, primal patterns, spells/feats.
// DDL captured verbatim from the production database. Everything is IF NOT EXISTS /
// column-guarded, so this is a no-op on databases that ran the legacy scripts.

const TABLES_AND_INDEXES = `
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    story_timestamp TEXT,
    session_id INTEGER,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS story_arcs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    status       TEXT DEFAULT 'planned'
                 CHECK(status IN ('planned', 'active', 'dormant', 'completed')),
    order_index  INTEGER DEFAULT 0,
    dm_notes     TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    theme        TEXT
);

CREATE TABLE IF NOT EXISTS chapters (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    arc_id      INTEGER NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    dm_notes    TEXT,
    status      TEXT DEFAULT 'planned'
                CHECK(status IN ('planned', 'active', 'completed')),
    order_index INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS beats (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT,
    dm_notes     TEXT,
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beat_chapters (
    beat_id    INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    PRIMARY KEY (beat_id, chapter_id),
    FOREIGN KEY (beat_id)    REFERENCES beats(id)    ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grand_narrative (
    id         INTEGER PRIMARY KEY CHECK(id = 1),
    title      TEXT DEFAULT 'The Grand Narrative',
    summary    TEXT,
    factions   TEXT,
    dm_notes   TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_beats (
    session_id INTEGER NOT NULL,
    beat_id    INTEGER NOT NULL,
    PRIMARY KEY (session_id, beat_id),
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (beat_id)    REFERENCES beats(id)             ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_chapters (
    session_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    PRIMARY KEY (session_id, chapter_id),
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)          ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_characters (
    session_id   INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    attendance   TEXT DEFAULT 'expected'
                 CHECK(attendance IN ('expected','attended','absent')),
    PRIMARY KEY (session_id, character_id),
    FOREIGN KEY (session_id)   REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id)        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_npcs (
    session_id INTEGER NOT NULL,
    npc_id     INTEGER NOT NULL,
    context    TEXT,
    PRIMARY KEY (session_id, npc_id),
    FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (npc_id)     REFERENCES npcs(id)              ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS primal_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    also_known_as TEXT,
    origin_figure TEXT,
    spirit_animal TEXT,
    spirit_animal_role TEXT DEFAULT 'unknown',
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS primal_pattern_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id INTEGER NOT NULL REFERENCES primal_patterns(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    player_content TEXT,
    section_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS character_pattern_lore (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES primal_pattern_sections(id) ON DELETE CASCADE,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, section_id)
);

CREATE TABLE IF NOT EXISTS character_spells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    spell_name TEXT NOT NULL,
    spell_level INTEGER NOT NULL,
    casting_time TEXT,
    range TEXT,
    concentration BOOLEAN DEFAULT 0,
    ritual BOOLEAN DEFAULT 0,
    components TEXT,
    material_components TEXT,
    is_prepared BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character_feats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    feat_name TEXT NOT NULL,
    feat_description TEXT,
    source TEXT,
    acquired_at_level INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_character ON journal_entries(character_id);
CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_public ON journal_entries(is_public);
CREATE INDEX IF NOT EXISTS idx_journal_session ON journal_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_char ON character_spells(character_id);
CREATE INDEX IF NOT EXISTS idx_character_spells_level ON character_spells(spell_level);
CREATE INDEX IF NOT EXISTS idx_character_feats ON character_feats(character_id);
`;

const SESSION_COLUMNS = [
    ['session_status', "TEXT DEFAULT 'planned'"],
    ['opening_notes', 'TEXT'],
    ['mid_notes', 'TEXT'],
    ['closing_notes', 'TEXT'],
];

function up(db) {
    db.exec(TABLES_AND_INDEXES);

    const cols = new Set(db.prepare('PRAGMA table_info(campaign_sessions)').all().map(c => c.name));
    for (const [name, def] of SESSION_COLUMNS) {
        if (!cols.has(name)) {
            db.prepare(`ALTER TABLE campaign_sessions ADD COLUMN ${name} ${def}`).run();
        }
    }
}

module.exports = { up };
