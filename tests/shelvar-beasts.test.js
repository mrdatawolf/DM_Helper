// Migration 016 seeds the Shelvar beasts as NPCs in campaign 1.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { getDatabase, closeDatabase } = require('../src/database/connection');
const { runMigrations } = require('../src/database/migrate');
const { up, CREATURES } = require('../src/database/migrations/016-shelvar-beasts');

const db = getDatabase();
db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
runMigrations(db);

test.after(() => closeDatabase());

const rows = () => db.prepare("SELECT * FROM npcs WHERE name IN (" + CREATURES.map(() => '?').join(',') + ")")
    .all(...CREATURES.map(c => c.name));

test('seeds all six Shelvar beasts into campaign 1', () => {
    assert.strictEqual(CREATURES.length, 6);
    const seeded = rows();
    assert.strictEqual(seeded.length, 6);
    for (const npc of seeded) assert.strictEqual(npc.campaign_id, 1);
});

test('stored stats are well-formed and HP matches the hit dice', () => {
    for (const npc of rows()) {
        const stats = JSON.parse(npc.stats);
        assert.ok(stats.challenge_rating, `${npc.name} has a CR`);
        assert.ok(stats.actions.length >= 1, `${npc.name} has an action`);
        for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
            assert.ok(Number.isInteger(stats.abilities[k]), `${npc.name} ${k}`);
        }
        assert.ok(npc.order_chaos_value >= 0 && npc.order_chaos_value <= 100);
    }
    const hitDice = { 'Sapheart Ursarch': [16, 10, 80], 'Sap-Sick Hound': [2, 8, 2] };
    for (const npc of rows().filter(r => hitDice[r.name])) {
        const [n, d, bonus] = hitDice[npc.name];
        assert.strictEqual(npc.hit_points, Math.floor(n * (d + 1) / 2) + bonus);
    }
});

test('re-running the migration does not duplicate creatures', () => {
    up(db);
    assert.strictEqual(rows().length, 6);
});
