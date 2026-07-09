const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');

const { up: unify } = require('../src/database/migrations/001-unify-character-columns');
const { up: expand } = require('../src/database/migrations/002-expand-character-columns');

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
