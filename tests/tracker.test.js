// Session tracker integration tests: scenes (draft/approve), note visibility,
// and combat permissions (DM authors, players run).
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
let aliceChar, malloryChar;
let sessionId, otherSessionId;
let sceneId;
let encounterId, pcCombatantId;

test('setup: users, characters, DM session with alice attending', async () => {
    alice = await register('alice');
    mallory = await register('mallory');
    await register('dungeon_master');
    getDatabase().prepare("UPDATE users SET is_dm = 1 WHERE username = 'dungeon_master'").run();
    const login = await api('POST', '/api/auth/login', { body: { username: 'dungeon_master', password: 'testpass123' } });
    dm = { token: login.body.token, user: login.body.user };

    aliceChar = (await api('POST', '/api/characters', {
        token: alice.token,
        body: { name: 'Corwin', species: 'Amberite', class_type: 'Fighter', max_hp: 20, current_hp: 18 }
    })).body;
    malloryChar = (await api('POST', '/api/characters', {
        token: mallory.token,
        body: { name: 'Fiona', species: 'Amberite', class_type: 'Wizard' }
    })).body;

    const session = await api('POST', '/api/sessions', {
        token: dm.token,
        body: { session_number: 1, session_date: '2026-07-08', session_title: 'The Docks', character_ids: [aliceChar.id] }
    });
    assert.strictEqual(session.status, 201);
    sessionId = session.body.id;

    const other = await api('POST', '/api/sessions', {
        token: dm.token,
        body: { session_number: 2, session_date: '2026-07-09', session_title: 'Elsewhere' }
    });
    otherSessionId = other.body.id;
});

// ── Scenes ───────────────────────────────────────────────────────────────────

test('players draft scenes for their own characters only; drafts stay hidden', async () => {
    const forbidden = await api('POST', '/api/scenes', {
        token: alice.token, body: { character_id: malloryChar.id, title: 'Hijack' }
    });
    assert.strictEqual(forbidden.status, 403);

    const draft = await api('POST', '/api/scenes', {
        token: alice.token,
        body: { character_id: aliceChar.id, title: 'Midnight in Greenwood', summary: 'A solo issue', status: 'approved' }
    });
    assert.strictEqual(draft.status, 201);
    assert.strictEqual(draft.body.status, 'draft', 'players cannot self-approve');
    sceneId = draft.body.id;

    const asMallory = await api('GET', '/api/scenes', { token: mallory.token });
    assert.ok(!asMallory.body.some(s => s.id === sceneId), 'draft invisible to other players');

    const asDM = await api('GET', '/api/scenes', { token: dm.token });
    assert.ok(asDM.body.some(s => s.id === sceneId), 'DM sees drafts');
});

test('only the DM can approve a scene; public approved scenes become visible', async () => {
    const playerApprove = await api('POST', `/api/scenes/${sceneId}/approve`, { token: alice.token });
    assert.strictEqual(playerApprove.status, 403);

    const approve = await api('POST', `/api/scenes/${sceneId}/approve`, { token: dm.token });
    assert.strictEqual(approve.status, 200);
    assert.strictEqual(approve.body.status, 'approved');

    // session-visibility scene still hidden from non-participants
    let asMallory = await api('GET', '/api/scenes', { token: mallory.token });
    assert.ok(!asMallory.body.some(s => s.id === sceneId));

    // public it — now visible
    await api('PUT', `/api/scenes/${sceneId}`, { token: alice.token, body: { visibility: 'public' } });
    asMallory = await api('GET', '/api/scenes', { token: mallory.token });
    assert.ok(asMallory.body.some(s => s.id === sceneId), 'public approved scene visible to all');
});

// ── Notes ────────────────────────────────────────────────────────────────────

test('note visibility controls what bleeds between books', async () => {
    // alice cannot write into a session her character is not part of
    const wrongSession = await api('POST', '/api/session-notes', {
        token: alice.token,
        body: { session_id: otherSessionId, character_id: aliceChar.id, content: 'sneaky' }
    });
    assert.strictEqual(wrongSession.status, 403);

    const note = await api('POST', '/api/session-notes', {
        token: alice.token,
        body: { session_id: sessionId, character_id: aliceChar.id, content: 'The dock master lied to us.' }
    });
    assert.strictEqual(note.status, 201, JSON.stringify(note.body));
    assert.strictEqual(note.body.visibility, 'session');

    // mallory has no character in session 1 -> session-visible note is hidden
    let asMallory = await api('GET', `/api/session-notes?session_id=${sessionId}`, { token: mallory.token });
    assert.strictEqual(asMallory.body.length, 0, 'session note hidden from non-participants');

    // DM always sees it
    const asDM = await api('GET', `/api/session-notes?session_id=${sessionId}`, { token: dm.token });
    assert.strictEqual(asDM.body.length, 1);

    // author flips it public -> mallory sees it
    await api('PUT', `/api/session-notes/${note.body.id}`, { token: alice.token, body: { visibility: 'public' } });
    asMallory = await api('GET', `/api/session-notes?session_id=${sessionId}`, { token: mallory.token });
    assert.strictEqual(asMallory.body.length, 1, 'public note visible to everyone');

    // flips it private -> hidden again, and mallory cannot edit or delete it
    await api('PUT', `/api/session-notes/${note.body.id}`, { token: alice.token, body: { visibility: 'private' } });
    asMallory = await api('GET', `/api/session-notes?session_id=${sessionId}`, { token: mallory.token });
    assert.strictEqual(asMallory.body.length, 0);
    assert.strictEqual((await api('PUT', `/api/session-notes/${note.body.id}`, { token: mallory.token, body: { content: 'hacked' } })).status, 403);
    assert.strictEqual((await api('DELETE', `/api/session-notes/${note.body.id}`, { token: mallory.token })).status, 403);
});

// ── Combats ──────────────────────────────────────────────────────────────────

test('only the DM can author encounters; PC links pull stats from the sheet', async () => {
    const playerCreate = await api('POST', '/api/combats', {
        token: alice.token, body: { session_id: sessionId, title: 'Nope' }
    });
    assert.strictEqual(playerCreate.status, 403);

    const created = await api('POST', '/api/combats', {
        token: dm.token,
        body: {
            session_id: sessionId,
            title: 'Ambush at the docks',
            combatants: [
                { character_id: aliceChar.id, initiative: 15 },
                { name: 'Shadow Eater', combatant_type: 'monster', initiative: 12, max_hp: 30 }
            ]
        }
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    encounterId = created.body.id;
    assert.strictEqual(created.body.combatants.length, 2);

    const pc = created.body.combatants.find(c => c.character_id === aliceChar.id);
    pcCombatantId = pc.id;
    assert.strictEqual(pc.name, 'Corwin', 'PC name pulled from character');
    assert.strictEqual(pc.max_hp, 20, 'PC max HP pulled from character');
    assert.strictEqual(pc.current_hp, 18, 'PC current HP pulled from character');
    assert.strictEqual(pc.combatant_type, 'pc');
});

test('participants run the fight; outsiders and structural edits are blocked', async () => {
    // alice (participant) advances the round and adjusts HP
    const turn = await api('PUT', `/api/combats/${encounterId}`, {
        token: alice.token, body: { turn_index: 1, round: 1 }
    });
    assert.strictEqual(turn.status, 200);

    const hp = await api('PUT', `/api/combats/${encounterId}/combatants/${pcCombatantId}`, {
        token: alice.token, body: { current_hp: 12, conditions: ['Prone'] }
    });
    assert.strictEqual(hp.status, 200);
    assert.strictEqual(hp.body.current_hp, 12);
    assert.deepStrictEqual(JSON.parse(hp.body.conditions), ['Prone']);

    // alice cannot change structure (initiative is DM-only -> no valid fields)
    const structural = await api('PUT', `/api/combats/${encounterId}/combatants/${pcCombatantId}`, {
        token: alice.token, body: { initiative: 25 }
    });
    assert.strictEqual(structural.status, 400);

    // alice cannot add combatants
    const addCombatant = await api('POST', `/api/combats/${encounterId}/combatants`, {
        token: alice.token, body: { name: 'My Pet Dragon', max_hp: 100 }
    });
    assert.strictEqual(addCombatant.status, 403);

    // mallory (not in the session) cannot run it or see it
    const outsider = await api('PUT', `/api/combats/${encounterId}`, {
        token: mallory.token, body: { round: 9 }
    });
    assert.strictEqual(outsider.status, 403);
    const view = await api('GET', `/api/combats?session_id=${sessionId}`, { token: mallory.token });
    assert.strictEqual(view.body.length, 0, 'session-visible combat hidden from non-participants');

    // alice closes it out with a summary
    const done = await api('PUT', `/api/combats/${encounterId}`, {
        token: alice.token, body: { status: 'completed', summary: 'Drove them into the bay.' }
    });
    assert.strictEqual(done.status, 200);
    assert.strictEqual(done.body.status, 'completed');
    assert.ok(done.body.ended_at, 'ended_at stamped on completion');
});

test("a character's timeline surfaces their encounters", async () => {
    const timeline = await api('GET', `/api/combats?character_id=${aliceChar.id}`, { token: alice.token });
    assert.strictEqual(timeline.status, 200);
    assert.strictEqual(timeline.body.length, 1);
    assert.strictEqual(timeline.body[0].id, encounterId);
});
