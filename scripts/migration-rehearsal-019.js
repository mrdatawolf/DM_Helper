#!/usr/bin/env node
// Migration rehearsal for 019-character-capabilities.
// Copies the live database, records pre-migration D&D percentiles, runs the
// migration on the copy, then verifies every character's projected scores
// are identical to the pre-migration values.
// The live database is never modified.

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DB = path.join(ROOT, 'dm_helper.db');
const COPY_DB = path.join(ROOT, `dm_helper.rehearsal-019.${Date.now()}.db`);

function abort(msg) { console.error(`\nFAIL: ${msg}`); process.exit(1); }

if (!fs.existsSync(SOURCE_DB)) abort(`Live database not found at ${SOURCE_DB}`);

console.log(`Source:  ${SOURCE_DB}`);
console.log(`Working copy: ${COPY_DB}`);

fs.copyFileSync(SOURCE_DB, COPY_DB);
console.log('Copied.\n');

const db = new Database(COPY_DB);

// ── snapshot pre-migration D&D percentiles ──────────────────────────────────
const characters = db.prepare(
    'SELECT id, name, strength, dexterity, constitution, intelligence, wisdom, charisma FROM characters'
).all();

if (!characters.length) {
    console.log('No characters in database. Migration rehearsal trivially passes.');
    db.close();
    fs.unlinkSync(COPY_DB);
    process.exit(0);
}

console.log(`Characters to migrate: ${characters.length}`);
const before = {};
for (const c of characters) {
    before[c.id] = {
        name: c.name,
        strength: c.strength,
        dexterity: c.dexterity,
        constitution: c.constitution,
        intelligence: c.intelligence,
        wisdom: c.wisdom,
        charisma: c.charisma
    };
}

// ── run migration 019 ────────────────────────────────────────────────────────
const { up: migration019 } = require('../src/database/migrations/019-character-capabilities');
const { readProfile } = require('../src/capabilities/profile');
const { projectPercentiles } = require('../src/systems/dnd5e/capability-projection');

console.log('Running migration 019 on copy...');
try {
    migration019(db);
} catch (err) {
    db.close();
    fs.unlinkSync(COPY_DB);
    abort(`Migration threw: ${err.message}`);
}
console.log('Migration complete.\n');

// ── verify idempotency ───────────────────────────────────────────────────────
console.log('Verifying idempotency (second run)...');
try {
    migration019(db);
} catch (err) {
    db.close();
    fs.unlinkSync(COPY_DB);
    abort(`Second migration run threw: ${err.message}`);
}
console.log('Idempotency confirmed.\n');

// ── compare before vs projected after ───────────────────────────────────────
const ABILITY_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
let passed = 0;
let failed = 0;

for (const c of characters) {
    let profile;
    try {
        profile = readProfile(db, c.id);
    } catch (err) {
        console.error(`  FAIL character ${c.id} (${c.name}): could not read profile — ${err.message}`);
        failed++;
        continue;
    }

    const projected = projectPercentiles(profile);
    const pre = before[c.id];
    let ok = true;

    for (const key of ABILITY_KEYS) {
        if (projected[key] !== pre[key]) {
            console.error(`  FAIL character ${c.id} (${c.name}): ${key} projected=${projected[key]} expected=${pre[key]}`);
            ok = false;
        }
    }

    if (ok) {
        passed++;
    } else {
        failed++;
    }
}

// ── verify legacy columns untouched ─────────────────────────────────────────
const afterLegacy = db.prepare(
    'SELECT id, strength, dexterity, constitution, intelligence, wisdom, charisma FROM characters'
).all();

for (const row of afterLegacy) {
    const pre = before[row.id];
    for (const key of ABILITY_KEYS) {
        if (row[key] !== pre[key]) {
            console.error(`  FAIL character ${row.id}: legacy column ${key} was modified (was ${pre[key]}, now ${row[key]})`);
            failed++;
        }
    }
}

db.close();
fs.unlinkSync(COPY_DB);
console.log(`Working copy deleted.\n`);

console.log(`Results: ${passed} passed, ${failed} failed out of ${characters.length} characters.`);

if (failed > 0) abort(`${failed} character(s) failed verification.`);

console.log('\nPASS: All characters migrated correctly. Live database was not modified.');
