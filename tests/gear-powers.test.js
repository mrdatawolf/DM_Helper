// Gear & powers: gear is player bookkeeping; powers are DM-granted,
// with players spending uses and taking long rests.
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
let charId;
let gearId, powerId;

test('setup: users and a character', async () => {
    alice = await register('alice');
    mallory = await register('mallory');
    await register('dungeon_master');
    getDatabase().prepare("UPDATE users SET is_dm = 1 WHERE username = 'dungeon_master'").run();
    const login = await api('POST', '/api/auth/login', { body: { username: 'dungeon_master', password: 'testpass123' } });
    dm = { token: login.body.token };

    const char = await api('POST', '/api/characters', {
        token: alice.token,
        body: { name: 'Corwin', species: 'Amberite', class_type: 'Fighter' }
    });
    charId = char.body.id;
});

test('owners manage their own gear; strangers cannot', async () => {
    const added = await api('POST', `/api/characters/${charId}/gear`, {
        token: alice.token,
        body: { item_name: 'Grayswandir', item_type: 'Weapon', magical_properties: 'Pattern-forged blade' }
    });
    assert.strictEqual(added.status, 201);
    gearId = added.body.id;

    const edited = await api('PUT', `/api/characters/${charId}/gear/${gearId}`, {
        token: alice.token, body: { is_equipped: 1, quantity: 1 }
    });
    assert.strictEqual(edited.status, 200);
    assert.strictEqual(edited.body.is_equipped, 1);

    assert.strictEqual((await api('PUT', `/api/characters/${charId}/gear/${gearId}`, {
        token: mallory.token, body: { item_name: 'Stolen' }
    })).status, 403);
    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/gear/${gearId}`, {
        token: mallory.token
    })).status, 403);

    const junk = await api('POST', `/api/characters/${charId}/gear`, {
        token: alice.token, body: { item_name: 'Torch', quantity: 3 }
    });
    const removed = await api('DELETE', `/api/characters/${charId}/gear/${junk.body.id}`, { token: alice.token });
    assert.strictEqual(removed.status, 200);
});

test('only the DM grants, edits, or revokes powers', async () => {
    const playerGrant = await api('POST', `/api/characters/${charId}/powers`, {
        token: alice.token, body: { power_name: 'Self-Granted Godhood' }
    });
    assert.strictEqual(playerGrant.status, 403);

    const granted = await api('POST', `/api/characters/${charId}/powers`, {
        token: dm.token,
        body: { power_name: 'Pattern Step', power_type: 'Pattern', uses_per_day: 3, description: 'Slip between shadows.' }
    });
    assert.strictEqual(granted.status, 201);
    powerId = granted.body.id;
    assert.strictEqual(granted.body.current_uses, 3, 'current uses initialised to uses_per_day');

    // player cannot rename or change structure
    const rename = await api('PUT', `/api/characters/${charId}/powers/${powerId}`, {
        token: alice.token, body: { power_name: 'Better Name', uses_per_day: 99 }
    });
    assert.strictEqual(rename.status, 400, 'structural fields stripped for players -> no valid fields');

    // player cannot revoke
    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/powers/${powerId}`, {
        token: alice.token
    })).status, 403);
});

test('players spend uses and recover them on a long rest', async () => {
    const spend = await api('PUT', `/api/characters/${charId}/powers/${powerId}`, {
        token: alice.token, body: { current_uses: 2 }
    });
    assert.strictEqual(spend.status, 200);
    assert.strictEqual(spend.body.current_uses, 2);

    // stranger cannot spend someone else's uses
    assert.strictEqual((await api('PUT', `/api/characters/${charId}/powers/${powerId}`, {
        token: mallory.token, body: { current_uses: 0 }
    })).status, 403);

    const rest = await api('POST', `/api/characters/${charId}/powers/rest`, { token: alice.token });
    assert.strictEqual(rest.status, 200);
    const restored = rest.body.find(p => p.id === powerId);
    assert.strictEqual(restored.current_uses, 3, 'long rest restores uses to uses_per_day');
});

test('the DM can revoke a power', async () => {
    const revoked = await api('DELETE', `/api/characters/${charId}/powers/${powerId}`, { token: dm.token });
    assert.strictEqual(revoked.status, 200);

    const char = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(char.body.powers.length, 0);
});
