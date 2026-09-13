const NAMESPACE = 'universe:amber';

// Verified directly against the Amber-specific blocks in schema.sql. Legacy
// columns remain as inactive compatibility storage, matching migration 014.
const AMBER_CHARACTER_COLUMNS = [
    'shadow_origin_id', 'blood_purity', 'order_chaos_value',
    'pattern_imprint', 'logrus_imprint',
    'pattern_mastery_level', 'logrus_mastery_level',
    'trump_artist', 'trump_mastery_level',
    'pattern_type', 'amber_flaws', 'amber_traits', 'broken_imprint'
];

function amberSnapshot(character) {
    return {
        schema_version: 1,
        attributes: Object.fromEntries(AMBER_CHARACTER_COLUMNS.map(column => [column, character[column]]))
    };
}

function removeGlobalShadowConstraint(db) {
    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'shadows'").get()?.sql || '';
    if (!/CHECK\s*\(\s*pattern_influence\s+IN/i.test(sql)) return;

    db.exec(`
            CREATE TABLE shadows_amber_universe_migration (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                order_level INTEGER DEFAULT 50,
                chaos_level INTEGER DEFAULT 50,
                dream_level INTEGER DEFAULT 0,
                pattern_influence TEXT,
                corruption_status TEXT,
                is_starting_shadow BOOLEAN DEFAULT 0,
                is_spoiler BOOLEAN DEFAULT 0,
                created_by INTEGER,
                campaign_id INTEGER REFERENCES campaigns(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO shadows_amber_universe_migration
                SELECT id, name, description, order_level, chaos_level, dream_level,
                    pattern_influence, corruption_status, is_starting_shadow, is_spoiler,
                    created_by, campaign_id, created_at, updated_at
                FROM shadows;
            DROP TABLE shadows;
            ALTER TABLE shadows_amber_universe_migration RENAME TO shadows;
            CREATE UNIQUE INDEX IF NOT EXISTS idx_shadows_campaign_name ON shadows(COALESCE(campaign_id, 0), name);
    `);
}

function up(db) {
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    db.pragma('foreign_keys = OFF');
    try {
        db.transaction(() => {
    const available = new Set(db.prepare('PRAGMA table_info(characters)').all().map(column => column.name));
    const columns = AMBER_CHARACTER_COLUMNS.filter(column => available.has(column));
    const characters = db.prepare(`SELECT id${columns.length ? `, ${columns.join(', ')}` : ''} FROM characters`).all();
    const existingRow = db.prepare(`SELECT id, data FROM character_extension_data WHERE character_id = ? AND namespace = ?`);
    const insert = db.prepare('INSERT INTO character_extension_data (character_id, namespace, data) VALUES (?, ?, ?)');
    const update = db.prepare('UPDATE character_extension_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

    for (const character of characters) {
        const existing = existingRow.get(character.id, NAMESPACE);
        const existingData = existing ? JSON.parse(existing.data) : null;
        if (existingData?.schema_version === 1) continue;
        const snapshot = amberSnapshot(character);
        if (existingData && Object.keys(existingData).length) snapshot.legacy_data = existingData;
        if (existing) update.run(JSON.stringify(snapshot), existing.id);
        else insert.run(character.id, NAMESPACE, JSON.stringify(snapshot));
    }

            removeGlobalShadowConstraint(db);
            const seedAmber = require('../../universes/amber/seed').seed;
            for (const campaign of db.prepare("SELECT id FROM campaigns WHERE universe_id = 'amber'").all()) {
                seedAmber(db, campaign.id);
            }
            const violations = db.pragma('foreign_key_check');
            if (violations.length) throw new Error(`Amber migration created ${violations.length} foreign-key violation(s)`);
        })();
    } finally {
        db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
    }
}

module.exports = { up, transactional: false, NAMESPACE, AMBER_CHARACTER_COLUMNS, amberSnapshot, removeGlobalShadowConstraint };
