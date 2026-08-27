// Regression test for TASK-010's decided status-code policy: the
// centralized error handler trusts an error's own `err.status` (or
// `err.statusCode`), defaulting to 500 only when neither is set. This
// exercises the concrete case the policy was decided against: a malformed
// JSON body, rejected by express.json() with `err.status = 400` before any
// route runs.
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

test('a malformed JSON body produces 400 with the parse error message, not a generic 500', async () => {
    const res = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json'
    });
    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
    // The old dead-code fallback middleware this replaced always returned
    // 500 with a fixed 'Internal server error' wrapper — assert we're not
    // back to that shape.
    assert.notStrictEqual(body.error, 'Internal server error');
});

test('a route error with no status set still defaults to 500', async () => {
    // /api/shadows/:id/lore reads a file from disk; an id that can't match
    // any shadow returns a clean 404 via an explicit route check, not a
    // thrown error, so instead confirm the default via a route that throws
    // from a genuine unhandled condition: an unbindable SQL parameter type
    // on a real authenticated write.
    const reg = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'error_handling_test_user', password: 'testpass123' })
    });
    const { token } = await reg.json();

    const res = await fetch(`${base}/api/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'X', species: 'Y', class_type: 'Z', level: { bad: 'type' } })
    });
    const body = await res.json();

    assert.strictEqual(res.status, 500);
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
});
