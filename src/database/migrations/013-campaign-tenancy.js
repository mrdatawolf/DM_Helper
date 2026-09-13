const CAMPAIGN_ID = 1;
const CAMPAIGN_NAME = 'The Shattering of the Liminal';

const CAMPAIGN_TABLES = [
    'shadows',
    'npcs',
    'campaign_sessions',
    'character_progress',
    'feat_log',
    'attribute_claims',
    'perceived_rankings',
    'claim_point_pools',
    'claim_history',
    'journal_entries',
    'story_arcs',
    'chapters',
    'beats',
    'beat_chapters',
    'grand_narrative',
    'session_beats',
    'session_chapters',
    'session_characters',
    'session_npcs',
    'primal_patterns',
    'primal_pattern_sections',
    'scenes',
    'session_notes',
    'combat_encounters',
    'combatants'
];

function tableExists(db, table) {
    return Boolean(db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(table));
}

function addCampaignColumn(db, table) {
    if (!tableExists(db, table)) return;
    const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
    if (!columns.has('campaign_id')) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)`);
    }
}

function chooseOwnerUserId(db) {
    // Campaign #1's live-data owner was explicitly resolved as user 3. The
    // fallback keeps fresh/test databases usable when that historical id is
    // absent, without manufacturing a dangling foreign key.
    const resolvedOwner = db.prepare('SELECT id FROM users WHERE id = 3 AND is_dm = 1').get();
    if (resolvedOwner) return resolvedOwner.id;
    const firstDm = db.prepare('SELECT id FROM users WHERE is_dm = 1 ORDER BY id LIMIT 1').get();
    return firstDm ? firstDm.id : null;
}

function up(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            owner_user_id INTEGER REFERENCES users(id),
            system_id TEXT NOT NULL,
            universe_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaign_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('dm', 'player')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(campaign_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS campaign_characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
            character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
            current_shadow_id INTEGER REFERENCES shadows(id) ON DELETE SET NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(campaign_id, character_id)
        );
    `);

    for (const table of CAMPAIGN_TABLES) addCampaignColumn(db, table);

    db.prepare(`
        INSERT INTO campaigns (id, name, owner_user_id, system_id, universe_id)
        VALUES (?, ?, ?, 'dnd5e', 'amber')
        ON CONFLICT(id) DO NOTHING
    `).run(CAMPAIGN_ID, CAMPAIGN_NAME, chooseOwnerUserId(db));

    db.prepare(`
        INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role)
        SELECT ?, id, CASE WHEN is_dm = 1 THEN 'dm' ELSE 'player' END FROM users
    `).run(CAMPAIGN_ID);

    db.prepare(`
        INSERT OR IGNORE INTO campaign_characters
            (campaign_id, character_id, current_shadow_id)
        SELECT ?, id, current_shadow_id FROM characters
    `).run(CAMPAIGN_ID);

    for (const table of CAMPAIGN_TABLES) {
        if (tableExists(db, table)) {
            db.prepare(`UPDATE ${table} SET campaign_id = ? WHERE campaign_id IS NULL`).run(CAMPAIGN_ID);
        }
    }
}

module.exports = { up, CAMPAIGN_TABLES };
