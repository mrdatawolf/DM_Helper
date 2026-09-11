const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const Database = require('better-sqlite3');

const { runMigrations } = require('../src/database/migrate');

const schemaSql = fs.readFileSync(
    path.join(__dirname, '../src/database/schema.sql'),
    'utf8'
);

function schemaTableNames(sql) {
    return [...sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)]
        .map(match => match[1]);
}

function tableShape(db, table) {
    return db.prepare(`PRAGMA table_info("${table}")`).all()
        .map(({ name, type, notnull, dflt_value, pk }) => ({
            name,
            type,
            notnull,
            dflt_value,
            pk
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
}

test('schema.sql tables match their fully migrated column shapes', () => {
    const schemaOnlyDb = new Database(':memory:');
    const migratedDb = new Database(':memory:');

    try {
        schemaOnlyDb.exec(schemaSql);
        migratedDb.exec(schemaSql);

        const originalLog = console.log;
        try {
            console.log = () => {};
            runMigrations(migratedDb);
        } finally {
            console.log = originalLog;
        }

        const differences = [];
        for (const table of schemaTableNames(schemaSql)) {
            const schemaShape = tableShape(schemaOnlyDb, table);
            const migratedShape = tableShape(migratedDb, table);
            if (!isDeepStrictEqual(schemaShape, migratedShape)) {
                differences.push({ table, schemaShape, migratedShape });
            }
        }

        assert.deepStrictEqual(differences, []);
    } finally {
        schemaOnlyDb.close();
        migratedDb.close();
    }
});
