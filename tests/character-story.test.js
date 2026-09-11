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

let server;
let base;
let owner;
let stranger;

test.before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    owner = await register('story_owner');
    stranger = await register('story_stranger');
});

test.after(() => {
    server.close();
    closeDatabase();
});

async function api(method, route, { token, body } = {}) {
    const response = await fetch(base + route, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
}

async function register(username) {
    const response = await api('POST', '/api/auth/register', {
        body: { username, password: 'testpass123' },
    });
    assert.strictEqual(response.status, 201);
    return response.body;
}

async function createCharacter(name) {
    const response = await api('POST', '/api/characters', {
        token: owner.token,
        body: { name, species: 'Amberite', class_type: 'Fighter' },
    });
    assert.strictEqual(response.status, 201);
    return response.body;
}

test('valid story update stores text and returns the updated character', async () => {
    const character = await createCharacter('Story Update');
    const story = 'A beginning.\n\nA second paragraph.';
    const response = await api('PUT', `/api/characters/${character.id}/story`, {
        token: owner.token,
        body: { story },
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.character_story, story);
    assert.strictEqual(db.prepare('SELECT character_story FROM characters WHERE id = ?').get(character.id).character_story, story);
});

test('non-string, missing, and oversized stories return 400 without changing the database', async () => {
    const character = await createCharacter('Story Validation');
    db.prepare('UPDATE characters SET character_story = ? WHERE id = ?').run('unchanged', character.id);

    for (const body of [{}, { story: null }, { story: 42 }, { story: 'x'.repeat(20001) }]) {
        const response = await api('PUT', `/api/characters/${character.id}/story`, {
            token: owner.token,
            body,
        });
        assert.strictEqual(response.status, 400);
        assert.strictEqual(
            db.prepare('SELECT character_story FROM characters WHERE id = ?').get(character.id).character_story,
            'unchanged'
        );
    }
});

test('an empty string clears a story', async () => {
    const character = await createCharacter('Story Clear');
    db.prepare('UPDATE characters SET character_story = ? WHERE id = ?').run('existing', character.id);

    const response = await api('PUT', `/api/characters/${character.id}/story`, {
        token: owner.token,
        body: { story: '' },
    });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.character_story, '');
});

test('a non-owner gets 403 when updating a story', async () => {
    const character = await createCharacter('Story Authorization');
    const response = await api('PUT', `/api/characters/${character.id}/story`, {
        token: stranger.token,
        body: { story: 'not allowed' },
    });

    assert.strictEqual(response.status, 403);
    assert.strictEqual(db.prepare('SELECT character_story FROM characters WHERE id = ?').get(character.id).character_story, null);
});

test('generic character update cannot set character_story', async () => {
    const character = await createCharacter('Story Generic Update');
    const response = await api('PUT', `/api/characters/${character.id}`, {
        token: owner.token,
        body: { character_story: 'not through this route' },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(db.prepare('SELECT character_story FROM characters WHERE id = ?').get(character.id).character_story, null);
});
