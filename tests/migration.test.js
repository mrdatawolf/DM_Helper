const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const { up: unify } = require('../src/database/migrations/001-unify-character-columns');
const { up: expand } = require('../src/database/migrations/002-expand-character-columns');
const { up: features } = require('../src/database/migrations/003-feature-tables');
const { up: universalCoreAttributes } = require('../src/database/migrations/009-universal-core-attributes');
const { up: characterSheetDetails } = require('../src/database/migrations/010-character-sheet-details');
const { up: characterImage } = require('../src/database/migrations/011-character-image');
const { up: characterStory } = require('../src/database/migrations/012-character-story');
const { up: campaignTenancy, CAMPAIGN_TABLES } = require('../src/database/migrations/013-campaign-tenancy');
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
