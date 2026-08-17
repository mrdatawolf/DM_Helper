// Familiars: DM-bonded companions whose power scales automatically with the
// bonded character's level via a DM-authored growth table.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { getDatabase, closeDatabase } = require('../src/database/connection');

const db = getDatabase();
db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
const { app } = require('../src/server');

let server, base;

test.before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
    server.close();
    closeDatabase();
});

async function api(method, route, { token, body } = {}) {
    const res = await fetch(base + route, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, body: json };
}

async function register(username) {
    const res = await api('POST', '/api/auth/register', { body: { username, password: 'testpass123' } });
    assert.strictEqual(res.status, 201);
    return { token: res.body.token, user: res.body.user };
}

let alice, mallory, dm;
let charId, familiarId;

test('setup: users and a character', async () => {
    alice = await register('alice');
    mallory = await register('mallory');
    await register('dungeon_master');
    getDatabase().prepare("UPDATE users SET is_dm = 1 WHERE username = 'dungeon_master'").run();
    const login = await api('POST', '/api/auth/login', { body: { username: 'dungeon_master', password: 'testpass123' } });
    dm = { token: login.body.token };

    const char = await api('POST', '/api/characters', {
        token: alice.token,
        body: { name: 'Leluna', species: 'Amberite', class_type: 'Wizard', level: 1 }
    });
    charId = char.body.id;
});

test('only the DM can bond a familiar', async () => {
    const playerBond = await api('POST', `/api/characters/${charId}/familiars`, {
        token: alice.token, body: { name: 'Self-Bonded Dragon' }
    });
    assert.strictEqual(playerBond.status, 403);

    const bonded = await api('POST', `/api/characters/${charId}/familiars`, {
        token: dm.token,
        body: {
            name: 'Shade', creature_type: 'Dog', bond_type: 'Psychic',
            armor_class: 12, base_hit_points: 5,
            growth_table: [
                { level: 3, hp_bonus: 5, ac_bonus: 0, abilities_gained: ['Keen Senses'] },
                { level: 5, hp_bonus: 10, ac_bonus: 1, abilities_gained: ['Share Senses'] }
            ]
        }
    });
    assert.strictEqual(bonded.status, 201);
    familiarId = bonded.body.id;
    assert.strictEqual(bonded.body.effective_hp, 5, 'no growth tiers reached at level 1');
    assert.strictEqual(bonded.body.effective_ac, 12);
    assert.deepStrictEqual(bonded.body.unlocked_abilities, []);
    assert.strictEqual(bonded.body.next_tier.level, 3);
});

test('power scales automatically as the bonded character levels up', async () => {
    const leveled = await api('PUT', `/api/characters/${charId}`, {
        token: dm.token, body: { level: 5 }
    });
    assert.strictEqual(leveled.status, 200);

    const char = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    const familiar = char.body.familiars.find(f => f.id === familiarId);
    assert.strictEqual(familiar.effective_hp, 20, 'base 5 + tier3 5 + tier5 10, with no familiar edit needed');
    assert.strictEqual(familiar.effective_ac, 13);
    assert.deepStrictEqual(familiar.unlocked_abilities, ['Keen Senses', 'Share Senses']);
    assert.strictEqual(familiar.next_tier, null);
});

test('the owner can rename their familiar but not its stats; strangers cannot touch it', async () => {
    const rename = await api('PUT', `/api/characters/${charId}/familiars/${familiarId}`, {
        token: alice.token, body: { name: 'Shade the Loyal', armor_class: 99 }
    });
    assert.strictEqual(rename.status, 200);
    assert.strictEqual(rename.body.name, 'Shade the Loyal');
    assert.strictEqual(rename.body.effective_ac, 13, 'armor_class is DM-only, silently ignored for owners');

    assert.strictEqual((await api('PUT', `/api/characters/${charId}/familiars/${familiarId}`, {
        token: mallory.token, body: { name: 'Stolen' }
    })).status, 403);

    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/familiars/${familiarId}`, {
        token: alice.token
    })).status, 403, 'only the DM releases a bond');
});

test('a familiar can join combat as its own combatant with level-scaled HP', async () => {
    const session = await api('POST', '/api/sessions', {
        token: dm.token, body: { session_number: 1, session_date: '2026-01-01', session_title: 'Test Session' }
    });
    assert.strictEqual(session.status, 201);

    const encounter = await api('POST', '/api/combats', {
        token: dm.token,
        body: { session_id: session.body.id, title: 'Ambush', combatants: [{ familiar_id: familiarId, initiative: 15 }] }
    });
    assert.strictEqual(encounter.status, 201);
    const combatant = encounter.body.combatants.find(c => c.familiar_id === familiarId);
    assert.ok(combatant, 'familiar combatant was created');
    assert.strictEqual(combatant.name, 'Shade the Loyal');
    assert.strictEqual(combatant.combatant_type, 'npc');
    assert.strictEqual(combatant.max_hp, 20, 'HP defaults from the level-scaled effective_hp');
});

test('the DM can release the bond', async () => {
    const revoked = await api('DELETE', `/api/characters/${charId}/familiars/${familiarId}`, { token: dm.token });
    assert.strictEqual(revoked.status, 200);

    const char = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(char.body.familiars.length, 0);
});
