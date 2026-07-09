// Integration tests: run the real Express app against an in-memory SQLite DB.
// Env must be set before any src/ module is required.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { getDatabase, closeDatabase } = require('../src/database/connection');

// Build the schema on the in-memory DB, then let the server apply migrations.
const db = getDatabase();
db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
const { app } = require('../src/server');

let server;
let base;

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
    const res = await api('POST', '/api/auth/register', {
        body: { username, password: 'testpass123' }
    });
    assert.strictEqual(res.status, 201, `register ${username}: ${JSON.stringify(res.body)}`);
    return { token: res.body.token, user: res.body.user };
}

// Shared state across sequential tests
let alice, mallory, dm;
let charId;
let shadowId;

test('anonymous requests are rejected on protected routes', async () => {
    assert.strictEqual((await api('GET', '/api/characters')).status, 401);
    assert.strictEqual((await api('POST', '/api/characters', { body: { name: 'X', species: 'Y', class_type: 'Z' } })).status, 401);
    assert.strictEqual((await api('POST', '/api/shadows', { body: { name: 'Nope' } })).status, 401);
    assert.strictEqual((await api('PUT', '/api/shadows/1', { body: { name: 'Nope' } })).status, 401);
    assert.strictEqual((await api('POST', '/api/sessions', { body: {} })).status, 401);
});

test('public reads stay open', async () => {
    const res = await api('GET', '/api/shadows');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
});

test('a player can create a character with unified field names', async () => {
    alice = await register('alice');

    const res = await api('POST', '/api/characters', {
        token: alice.token,
        body: {
            name: 'Corwin', species: 'Amberite', class_type: 'Fighter',
            max_hp: 15, current_hp: 15, order_chaos_value: 70,
            trump_artist: 1, backstory: 'Woke in Greenwood with no memory.'
        }
    });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    charId = res.body.id;

    assert.strictEqual(res.body.species, 'Amberite');
    assert.strictEqual(res.body.class_type, 'Fighter');
    assert.strictEqual(res.body.max_hp, 15);
    assert.strictEqual(res.body.order_chaos_value, 70);
    assert.strictEqual(res.body.trump_artist, 1);
    assert.strictEqual(res.body.backstory, 'Woke in Greenwood with no memory.');
    assert.strictEqual(res.body.user_id, alice.user.id, 'character belongs to its creator');
});

test('the owner can edit their character via unified fields', async () => {
    const res = await api('PUT', `/api/characters/${charId}`, {
        token: alice.token,
        body: { max_hp: 22, current_hp: 20, class_type: 'Warlock', pattern_imprint: 1 }
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.max_hp, 22);
    assert.strictEqual(res.body.current_hp, 20);
    assert.strictEqual(res.body.class_type, 'Warlock');
    assert.strictEqual(res.body.pattern_imprint, 1);

    const fetched = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(fetched.status, 200);
    assert.strictEqual(fetched.body.max_hp, 22);
});

test("another player cannot edit or delete someone else's character", async () => {
    mallory = await register('mallory');

    const put = await api('PUT', `/api/characters/${charId}`, {
        token: mallory.token, body: { max_hp: 1 }
    });
    assert.strictEqual(put.status, 403);

    const del = await api('DELETE', `/api/characters/${charId}`, { token: mallory.token });
    assert.strictEqual(del.status, 403);

    const fetched = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(fetched.body.max_hp, 22, 'character untouched');
});

test('a DM can edit any character', async () => {
    await register('gamemaster');
    getDatabase().prepare("UPDATE users SET is_dm = 1 WHERE username = 'gamemaster'").run();
    const login = await api('POST', '/api/auth/login', {
        body: { username: 'gamemaster', password: 'testpass123' }
    });
    assert.strictEqual(login.status, 200);
    dm = { token: login.body.token, user: login.body.user };

    const res = await api('PUT', `/api/characters/${charId}`, {
        token: dm.token, body: { feat_pool: 3 }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.feat_pool, 3);
});

test('players can create shadows but only a DM can modify or delete them', async () => {
    const created = await api('POST', '/api/shadows', {
        token: alice.token, body: { name: 'Greenwood', description: 'A quiet forest world' }
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    shadowId = created.body.id;

    const playerPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: alice.token, body: { name: 'Hacked' }
    });
    assert.strictEqual(playerPut.status, 403);

    const dmPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: dm.token, body: { description: 'A quiet forest world, touched by Pattern' }
    });
    assert.strictEqual(dmPut.status, 200);

    const playerDel = await api('DELETE', `/api/shadows/${shadowId}`, { token: alice.token });
    assert.strictEqual(playerDel.status, 403);

    const dmDel = await api('DELETE', `/api/shadows/${shadowId}`, { token: dm.token });
    assert.strictEqual(dmDel.status, 200);
});

test('campaign-session writes are DM-only', async () => {
    const asPlayer = await api('POST', '/api/sessions', {
        token: alice.token, body: { session_number: 1, session_date: '2026-07-08' }
    });
    assert.strictEqual(asPlayer.status, 403);
});

test('claim allocation respects character ownership', async () => {
    const own = await api('POST', '/api/claims/allocate', {
        token: alice.token,
        body: { character_id: charId, attribute_name: 'Warfare', points_to_add: 3, justification: 'Decades of drill' }
    });
    assert.strictEqual(own.status, 200, JSON.stringify(own.body));
    assert.strictEqual(own.body.points_spent, 3);

    const other = await api('POST', '/api/claims/allocate', {
        token: mallory.token,
        body: { character_id: charId, attribute_name: 'Warfare', points_to_add: 1, justification: 'Nope' }
    });
    assert.strictEqual(other.status, 403);
});

test('/api/auth/characters returns unified column names', async () => {
    const res = await api('GET', '/api/auth/characters', { token: alice.token });
    assert.strictEqual(res.status, 200);
    const chars = res.body.characters;
    assert.strictEqual(chars.length, 1);
    const c = chars[0];
    assert.strictEqual(c.species, 'Amberite');
    assert.strictEqual(c.class_type, 'Warlock');
    assert.strictEqual(c.max_hp, 22);
    assert.ok('shadow_origin_id' in c, 'shadow_origin_id exposed for Known Shadows tab');
});

test('the owner can delete their character', async () => {
    const res = await api('DELETE', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(res.status, 200);

    const gone = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(gone.status, 404);
});
