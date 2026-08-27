// Unit tests for the shared dynamic-UPDATE helper. Deliberately does not
// touch Express or a live database — buildUpdateQuery/collectUpdateFields
// only produce a SQL string and a parameter array.
const test = require('node:test');
const assert = require('node:assert');

const { buildUpdateQuery, collectUpdateFields } = require('../src/utils/buildUpdateQuery');

test('buildUpdateQuery: builds a SET clause and values for present fields only', () => {
    const result = buildUpdateQuery(
        'characters',
        ['name', 'level', 'backstory'],
        { name: 'Corwin', level: 5, unrelated_field: 'ignored' },
        42
    );

    assert.ok(result);
    assert.strictEqual(
        result.sql,
        'UPDATE characters SET name = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    assert.deepStrictEqual(result.values, ['Corwin', 5, 42]);
});

test('buildUpdateQuery: returns null when no allowed field is present in the body', () => {
    const result = buildUpdateQuery('characters', ['name', 'level'], { unrelated_field: 'x' }, 42);
    assert.strictEqual(result, null);
});

test('buildUpdateQuery: returns null for an empty body', () => {
    const result = buildUpdateQuery('characters', ['name', 'level'], {}, 42);
    assert.strictEqual(result, null);
});

test('buildUpdateQuery: field-name safety — only allowlisted fields are ever interpolated into SQL', () => {
    // A body carrying a key that looks like a SQL-injection attempt via the
    // field name itself must never reach the generated SQL string, since
    // only names from `allowedFields` are ever used to build a clause.
    const maliciousBody = {
        name: 'Corwin',
        'id = 1; DROP TABLE characters; --': 'ignored',
    };
    const result = buildUpdateQuery('characters', ['name'], maliciousBody, 42);

    assert.ok(result);
    assert.strictEqual(result.sql, 'UPDATE characters SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    assert.ok(!result.sql.includes('DROP TABLE'));
    assert.deepStrictEqual(result.values, ['Corwin', 42]);
});

test('buildUpdateQuery: touchUpdatedAt: false omits the updated_at clause', () => {
    const result = buildUpdateQuery('scenes', ['title'], { title: 'x' }, 1, { touchUpdatedAt: false });
    assert.strictEqual(result.sql, 'UPDATE scenes SET title = ? WHERE id = ?');
});

test('buildUpdateQuery: idColumn option changes the WHERE clause column', () => {
    const result = buildUpdateQuery('primal_pattern_sections', ['title'], { title: 'x' }, 7, { idColumn: 'section_id' });
    assert.match(result.sql, /WHERE section_id = \?$/);
});

test('collectUpdateFields: lets a caller layer an extra transformed field on top', () => {
    // Mirrors npcs.js, which JSON-encodes `stats` before storing it — a
    // genuine divergence from the plain pass-through pattern, kept explicit
    // in the caller rather than baked into the shared helper.
    const body = { name: 'Goblin', stats: { hp: 7 } };
    const { setClauses, values } = collectUpdateFields(['name'], body);

    if (Object.prototype.hasOwnProperty.call(body, 'stats')) {
        setClauses.push('stats = ?');
        values.push(JSON.stringify(body.stats));
    }

    assert.deepStrictEqual(setClauses, ['name = ?', 'stats = ?']);
    assert.deepStrictEqual(values, ['Goblin', '{"hp":7}']);
});
