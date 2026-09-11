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

const uploadsDirectory = path.join(__dirname, '../public/uploads/characters');
const createdFiles = new Set();
let server;
let base;
let owner;
let stranger;

test.before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    owner = await register('image_owner');
    stranger = await register('image_stranger');
});

test.after(() => {
    server.close();
    for (const filePath of createdFiles) {
        try { fs.unlinkSync(filePath); } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    closeDatabase();
});

async function jsonApi(method, route, { token, body } = {}) {
    const response = await fetch(base + route, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
}

async function register(username) {
    const response = await jsonApi('POST', '/api/auth/register', {
        body: { username, password: 'testpass123' },
    });
    assert.strictEqual(response.status, 201);
    return response.body;
}

async function createCharacter(name = 'Corwin') {
    const response = await jsonApi('POST', '/api/characters', {
        token: owner.token,
        body: { name, species: 'Amberite', class_type: 'Fighter' },
    });
    assert.strictEqual(response.status, 201);
    return response.body;
}

function filePathFromUrl(imageUrl) {
    const filePath = path.join(uploadsDirectory, path.basename(imageUrl));
    createdFiles.add(filePath);
    return filePath;
}

async function upload(characterId, token, { bytes = 'image data', type = 'image/png', name = 'portrait.png' } = {}) {
    const form = new FormData();
    form.append('image', new Blob([bytes], { type }), name);
    const response = await fetch(`${base}/api/characters/${characterId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    return { status: response.status, body: await response.json() };
}

test('valid image upload stores a file and returns the updated character', async () => {
    const character = await createCharacter('Valid Upload');
    const response = await upload(character.id, owner.token);

    assert.strictEqual(response.status, 200);
    assert.match(response.body.image_url, /^\/uploads\/characters\//);
    assert.ok(fs.existsSync(filePathFromUrl(response.body.image_url)));
    assert.strictEqual(
        db.prepare('SELECT image_url FROM characters WHERE id = ?').get(character.id).image_url,
        response.body.image_url
    );
});

test('non-image and oversized uploads return 400 without leaving files', async () => {
    const character = await createCharacter('Rejected Uploads');
    const before = new Set(fs.readdirSync(uploadsDirectory));

    const nonImage = await upload(character.id, owner.token, {
        bytes: 'plain text', type: 'text/plain', name: 'notes.txt',
    });
    assert.strictEqual(nonImage.status, 400);
    assert.match(nonImage.body.error, /JPEG, PNG, WebP, or GIF/);

    const oversized = await upload(character.id, owner.token, {
        bytes: new Uint8Array(5 * 1024 * 1024 + 1),
    });
    assert.strictEqual(oversized.status, 400);
    assert.match(oversized.body.error, /5 MB or smaller/);

    assert.deepStrictEqual(new Set(fs.readdirSync(uploadsDirectory)), before);
    assert.strictEqual(db.prepare('SELECT image_url FROM characters WHERE id = ?').get(character.id).image_url, null);
});

test('a replacement gets a new URL and deletes the old file', async () => {
    const character = await createCharacter('Replacement');
    const first = await upload(character.id, owner.token, { bytes: 'first' });
    const firstPath = filePathFromUrl(first.body.image_url);
    assert.ok(fs.existsSync(firstPath));

    const second = await upload(character.id, owner.token, { bytes: 'second' });
    const secondPath = filePathFromUrl(second.body.image_url);
    assert.strictEqual(second.status, 200);
    assert.notStrictEqual(second.body.image_url, first.body.image_url);
    assert.ok(!fs.existsSync(firstPath));
    assert.ok(fs.existsSync(secondPath));
});

test('delete clears image_url and removes the stored file', async () => {
    const character = await createCharacter('Deletion');
    const uploaded = await upload(character.id, owner.token);
    const storedPath = filePathFromUrl(uploaded.body.image_url);

    const deleted = await jsonApi('DELETE', `/api/characters/${character.id}/image`, { token: owner.token });
    assert.strictEqual(deleted.status, 200);
    assert.strictEqual(deleted.body.image_url, null);
    assert.ok(!fs.existsSync(storedPath));
    assert.strictEqual(db.prepare('SELECT image_url FROM characters WHERE id = ?').get(character.id).image_url, null);
});

test('a non-owner gets 403 for upload and delete', async () => {
    const character = await createCharacter('Authorization');
    assert.strictEqual((await upload(character.id, stranger.token)).status, 403);
    assert.strictEqual((await jsonApi('DELETE', `/api/characters/${character.id}/image`, {
        token: stranger.token,
    })).status, 403);
});

test('generic character update cannot set image_url', async () => {
    const character = await createCharacter('Generic Update');
    const response = await jsonApi('PUT', `/api/characters/${character.id}`, {
        token: owner.token,
        body: { image_url: '/uploads/characters/not-uploaded.png' },
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(db.prepare('SELECT image_url FROM characters WHERE id = ?').get(character.id).image_url, null);
});
