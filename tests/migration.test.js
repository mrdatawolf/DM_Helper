const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const { up: unify } = require('../src/database/migrations/001-unify-character-columns');
const { up: expand } = require('../src/database/migrations/002-expand-character-columns');
const { up: features } = require('../src/database/migrations/003-feature-tables');
const { up: primalPatternCategory } = require('../src/database/migrations/008-primal-pattern-category');
const { up: universalCoreAttributes } = require('../src/database/migrations/009-universal-core-attributes');
const { up: characterSheetDetails } = require('../src/database/migrations/010-character-sheet-details');
const { up: characterImage } = require('../src/database/migrations/011-character-image');
const { up: characterStory } = require('../src/database/migrations/012-character-story');
const { up: campaignTenancy, CAMPAIGN_TABLES } = require('../src/database/migrations/013-campaign-tenancy');
const { up: characterExtensionData, DND5E_CHARACTER_COLUMNS } = require('../src/database/migrations/014-character-extension-data');
const { up: amberExtensionData, AMBER_CHARACTER_COLUMNS } = require('../src/database/migrations/015-amber-universe-extension-data');
const { percentileFromScore } = require('../public/js/ability-conversion');

function legacyDb() {
    const db = new Database(':memory:');
    db.exec(`
        CREATE TABLE characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            race TEXT NOT NULL,
            species TEXT,
            class TEXT NOT NULL,
            max_hit_points INTEGER DEFAULT 10,
            current_hit_points INTEGER DEFAULT 10,
            order_chaos_balance INTEGER DEFAULT 50,
            has_pattern_imprint BOOLEAN DEFAULT 0,
            has_logrus_imprint BOOLEAN DEFAULT 0,
            has_trump_artistry BOOLEAN DEFAULT 0
        );
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
    `);
    return db;
}

test('001 renames legacy columns and fills empty species from race', () => {
    const db = legacyDb();
    const insert = db.prepare(`
        INSERT INTO characters (name, race, species, class, max_hit_points, current_hit_points, order_chaos_balance, has_pattern_imprint, has_logrus_imprint, has_trump_artistry)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('Aria', 'Elf', null, 'Wizard', 12, 7, 60, 1, 0, 1);
    insert.run('Brand', 'Human', 'Chaosborn', 'Fighter', 20, 18, 30, 0, 1, 0);

    unify(db);

    const cols = new Set(db.prepare('PRAGMA table_info(characters)').all().map(c => c.name));
    for (const legacy of ['race', 'class', 'max_hit_points', 'current_hit_points', 'order_chaos_balance', 'has_pattern_imprint', 'has_logrus_imprint', 'has_trump_artistry']) {
        assert.ok(!cols.has(legacy), `legacy column ${legacy} should be gone`);
    }
    for (const modern of ['species', 'class_type', 'max_hp', 'current_hp', 'order_chaos_value', 'pattern_imprint', 'logrus_imprint', 'trump_artist']) {
        assert.ok(cols.has(modern), `column ${modern} should exist`);
    }

    const aria = db.prepare("SELECT * FROM characters WHERE name = 'Aria'").get();
    assert.strictEqual(aria.species, 'Elf', 'empty species filled from race');
    assert.strictEqual(aria.class_type, 'Wizard');
    assert.strictEqual(aria.max_hp, 12);
    assert.strictEqual(aria.current_hp, 7);
    assert.strictEqual(aria.order_chaos_value, 60);
    assert.strictEqual(aria.pattern_imprint, 1);
    assert.strictEqual(aria.trump_artist, 1);

    const brand = db.prepare("SELECT * FROM characters WHERE name = 'Brand'").get();
    assert.strictEqual(brand.species, 'Chaosborn', 'existing species wins over race');
    assert.strictEqual(brand.logrus_imprint, 1);
});

test('001 is a no-op on an already-unified schema', () => {
    const db = new Database(':memory:');
    db.exec(`
        CREATE TABLE characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            species TEXT NOT NULL,
            class_type TEXT NOT NULL
        );
    `);
    db.prepare("INSERT INTO characters (name, species, class_type) VALUES ('X', 'Human', 'Rogue')").run();

    assert.doesNotThrow(() => unify(db));

    const row = db.prepare('SELECT * FROM characters').get();
    assert.strictEqual(row.species, 'Human');
    assert.strictEqual(row.class_type, 'Rogue');
});

test('002 adds expanded columns to a bare schema and is idempotent', () => {
    const db = legacyDb();
    unify(db);
    expand(db);
    assert.doesNotThrow(() => expand(db), '002 must be idempotent');

    const cols = new Set(db.prepare('PRAGMA table_info(characters)').all().map(c => c.name));
    for (const col of ['user_id', 'subclass', 'backstory', 'skill_stealth', 'spell_slots_9_expended', 'gold_pieces', 'broken_imprint', 'hit_dice_total']) {
        assert.ok(cols.has(col), `expanded column ${col} should exist`);
    }

    const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
    assert.ok(userCols.has('is_archived'), 'users.is_archived should exist');

    // Defaults are usable for inserts that only supply the base fields
    db.prepare("INSERT INTO characters (name, species, class_type) VALUES ('Y', 'Elf', 'Bard')").run();
    const y = db.prepare("SELECT * FROM characters WHERE name = 'Y'").get();
    assert.strictEqual(y.size, 'Medium');
    assert.strictEqual(y.attunement_slots_max, 3);
    assert.strictEqual(y.spell_save_dc, 8);
});

test('009 converts core abilities once and creates system-neutral schema', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    expand(db);
    features(db);
    db.prepare(`
        INSERT INTO characters
            (name, species, class_type, strength, dexterity, constitution, intelligence, wisdom, charisma)
        VALUES ('Corwin', 'Human', 'Fighter', 8, 10, 12, 14, 18, 30)
    `).run();

    universalCoreAttributes(db);
    const afterFirstRun = db.prepare(`
        SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
        FROM characters WHERE name = 'Corwin'
    `).get();
    assert.deepStrictEqual(afterFirstRun, {
        strength: percentileFromScore(8),
        dexterity: percentileFromScore(10),
        constitution: percentileFromScore(12),
        intelligence: percentileFromScore(14),
        wisdom: percentileFromScore(18),
        charisma: percentileFromScore(30)
    });

    assert.doesNotThrow(() => universalCoreAttributes(db));
    assert.deepStrictEqual(
        db.prepare(`
            SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
            FROM characters WHERE name = 'Corwin'
        `).get(),
        afterFirstRun,
        'a second run must not convert percentiles as though they were D&D scores'
    );

    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'character_system_data'").get());
    const arcColumns = new Set(db.prepare('PRAGMA table_info(story_arcs)').all().map(column => column.name));
    assert.ok(arcColumns.has('game_system'));
    db.prepare("INSERT INTO story_arcs (title) VALUES ('Test arc')").run();
    assert.strictEqual(db.prepare("SELECT game_system FROM story_arcs WHERE title = 'Test arc'").get().game_system, 'dnd5e');
});

test('010 adds character-sheet details and weapons idempotently', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    expand(db);
    characterSheetDetails(db);
    assert.doesNotThrow(() => characterSheetDetails(db));

    const columns = new Set(db.prepare('PRAGMA table_info(characters)').all().map(column => column.name));
    for (const column of ['age', 'height', 'weight', 'eyes', 'skin', 'hair', 'desires', 'fears', 'allies_organizations', 'treasure']) {
        assert.ok(columns.has(column), `character detail ${column} should exist`);
    }
    const weaponColumns = new Set(db.prepare('PRAGMA table_info(character_weapons)').all().map(column => column.name));
    for (const column of ['id', 'character_id', 'name', 'attack_bonus', 'damage_type', 'sort_order', 'created_at']) {
        assert.ok(weaponColumns.has(column), `weapon column ${column} should exist`);
    }
});

test('011 adds a nullable character image URL idempotently', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));

    characterImage(db);
    assert.doesNotThrow(() => characterImage(db));

    const column = db.prepare('PRAGMA table_info(characters)').all()
        .find(candidate => candidate.name === 'image_url');
    assert.ok(column);
    assert.strictEqual(column.notnull, 0);
    assert.strictEqual(column.dflt_value, null);
});

test('012 adds a nullable character story idempotently', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));

    characterStory(db);
    assert.doesNotThrow(() => characterStory(db));

    const column = db.prepare('PRAGMA table_info(characters)').all()
        .find(candidate => candidate.name === 'character_story');
    assert.ok(column);
    assert.strictEqual(column.notnull, 0);
    assert.strictEqual(column.dflt_value, null);
});

test('013 creates and idempotently backfills campaign tenancy', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    features(db);
    require('../src/database/migrations/004-session-tracker').up(db);
    require('../src/database/migrations/008-primal-pattern-category').up(db);

    const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, is_dm) VALUES (?, ?, ?, ?)');
    insertUser.run(1, 'testdm', 'hash', 1);
    insertUser.run(2, 'player', 'hash', 0);
    insertUser.run(3, 'mrdatawolf', 'hash', 1);
    insertUser.run(6, 'lucas.norman@gmail.com', 'hash', 1);
    db.prepare("INSERT INTO shadows (id, name) VALUES (1, 'Amber')").run();
    db.prepare("INSERT INTO characters (id, name, species, class_type, user_id, current_shadow_id) VALUES (1, 'Corwin', 'Human', 'Fighter', 2, 1)").run();
    db.prepare("INSERT INTO npcs (id, name) VALUES (1, 'Dworkin')").run();
    db.prepare("INSERT INTO campaign_sessions (id, session_number, session_date) VALUES (1, 1, '2026-01-01')").run();

    campaignTenancy(db);
    assert.doesNotThrow(() => campaignTenancy(db));

    assert.deepStrictEqual(db.prepare('SELECT id, name, owner_user_id, system_id, universe_id FROM campaigns').get(), {
        id: 1,
        name: 'The Shattering of the Liminal',
        owner_user_id: 3,
        system_id: 'dnd5e',
        universe_id: 'amber'
    });
    assert.deepStrictEqual(
        db.prepare('SELECT user_id, role FROM campaign_members ORDER BY user_id').all(),
        [
            { user_id: 1, role: 'dm' },
            { user_id: 2, role: 'player' },
            { user_id: 3, role: 'dm' },
            { user_id: 6, role: 'dm' }
        ]
    );
    assert.deepStrictEqual(
        db.prepare('SELECT campaign_id, character_id, current_shadow_id FROM campaign_characters').all(),
        [{ campaign_id: 1, character_id: 1, current_shadow_id: 1 }]
    );
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM campaigns').get().count, 1);
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM campaign_members').get().count, 4);
    assert.strictEqual(db.prepare('SELECT COUNT(*) AS count FROM campaign_characters').get().count, 1);
    assert.strictEqual(db.prepare('SELECT campaign_id FROM shadows WHERE id = 1').get().campaign_id, 1);
    assert.strictEqual(db.prepare('SELECT campaign_id FROM npcs WHERE id = 1').get().campaign_id, 1);
    assert.strictEqual(db.prepare('SELECT campaign_id FROM campaign_sessions WHERE id = 1').get().campaign_id, 1);
    assert.ok(!new Set(db.prepare('PRAGMA table_info(characters)').all().map(column => column.name)).has('campaign_id'));

    for (const table of CAMPAIGN_TABLES) {
        const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
        assert.ok(columns.has('campaign_id'), `${table}.campaign_id should exist`);
        const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
        assert.ok(foreignKeys.some(key => key.from === 'campaign_id' && key.table === 'campaigns'));
    }
});

test('014 snapshots D&D character data and related rows exactly once', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    features(db);
    characterSheetDetails(db);
    const characterId = Number(db.prepare(`
        INSERT INTO characters
            (name, species, class_type, armor_class, skill_perception, save_wisdom,
             spell_slots_3_total, spell_slots_3_expended, gold_pieces)
        VALUES ('Mira', 'Human', 'Wizard', 17, 2, 1, 3, 1, 42)
    `).run().lastInsertRowid);
    db.prepare("INSERT INTO character_gear (character_id, item_name, quantity) VALUES (?, 'Spellbook', 1)").run(characterId);
    db.prepare("INSERT INTO character_spells (character_id, spell_name, spell_level) VALUES (?, 'Fireball', 3)").run(characterId);
    db.prepare("INSERT INTO character_weapons (character_id, name, attack_bonus) VALUES (?, 'Dagger', 5)").run(characterId);

    characterExtensionData(db);
    const first = db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'system:dnd5e'").get(characterId);
    const data = JSON.parse(first.data);
    assert.strictEqual(data.schema_version, 1);
    assert.strictEqual(data.sheet.armor_class, 17);
    assert.strictEqual(data.sheet.skill_perception, 2);
    assert.strictEqual(data.sheet.save_wisdom, 1);
    assert.strictEqual(data.sheet.spell_slots_3_total, 3);
    assert.strictEqual(data.sheet.spell_slots_3_expended, 1);
    assert.strictEqual(data.sheet.gold_pieces, 42);
    assert.strictEqual(data.gear[0].item_name, 'Spellbook');
    assert.strictEqual(data.spells[0].spell_name, 'Fireball');
    assert.strictEqual(data.weapons[0].name, 'Dagger');
    assert.deepStrictEqual(Object.keys(data.sheet), DND5E_CHARACTER_COLUMNS);

    db.prepare('UPDATE characters SET armor_class = 99 WHERE id = ?').run(characterId);
    characterExtensionData(db);
    const second = db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'system:dnd5e'").get(characterId);
    assert.strictEqual(second.data, first.data, 'a direct second run must not overwrite the migrated snapshot');
    assert.strictEqual(db.prepare("SELECT count(*) AS count FROM character_extension_data WHERE character_id = ? AND namespace = 'system:dnd5e'").get(characterId).count, 1);
    db.close();
});

test('014 preserves data from the superseded character_system_data table', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    features(db);
    universalCoreAttributes(db);
    const characterId = Number(db.prepare("INSERT INTO characters (name, species, class_type) VALUES ('Legacy', 'Elf', 'Bard')").run().lastInsertRowid);
    db.prepare("INSERT INTO character_system_data (character_id, game_system, data) VALUES (?, 'dnd5e', ?)")
        .run(characterId, JSON.stringify({ custom: 'kept' }));

    characterExtensionData(db);
    const migrated = JSON.parse(db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'system:dnd5e'").get(characterId).data);
    assert.deepStrictEqual(migrated.legacy_data, { custom: 'kept' });
    assert.strictEqual(migrated.schema_version, 1);
    db.close();
});

test('015 snapshots every Amber schema column exactly once and removes only the global shadow constraint', () => {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    primalPatternCategory(db);
    campaignTenancy(db);
    const characterId = Number(db.prepare(`
        INSERT INTO characters
            (name, species, class_type, shadow_origin_id, blood_purity, order_chaos_value,
             pattern_imprint, pattern_mastery_level, trump_artist, pattern_type,
             amber_flaws, amber_traits, broken_imprint)
        VALUES ('Fiona', 'Amberite', 'Wizard', NULL, 'Pure', 91, 1, 3, 1,
            'Pattern', '["burn"]', '["sight"]', 1)
    `).run().lastInsertRowid);

    amberExtensionData(db);
    const first = db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'universe:amber'").get(characterId);
    const data = JSON.parse(first.data);
    assert.deepStrictEqual(Object.keys(data.attributes), AMBER_CHARACTER_COLUMNS);
    assert.strictEqual(data.attributes.blood_purity, 'Pure');
    assert.strictEqual(data.attributes.order_chaos_value, 91);
    assert.strictEqual(data.attributes.pattern_mastery_level, 3);
    assert.strictEqual(data.attributes.amber_flaws, '["burn"]');
    assert.doesNotMatch(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='shadows'").get().sql, /pattern_influence\s+IN/i);
    assert.strictEqual(db.prepare("SELECT count(*) count FROM shadows WHERE campaign_id = 1").get().count, 11);
    assert.strictEqual(db.prepare("SELECT count(*) count FROM primal_pattern_sections WHERE campaign_id = 1").get().count, 17);

    db.prepare('UPDATE characters SET blood_purity = ? WHERE id = ?').run('None', characterId);
    amberExtensionData(db);
    assert.strictEqual(db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'universe:amber'").get(characterId).data, first.data);
    assert.strictEqual(db.pragma('foreign_key_check').length, 0);
    db.close();
});
