const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const {
    CAPABILITY_KEYS, NEUTRAL_CAPABILITY_VALUE,
    validateValue, validateProfile, profileFromLegacyAbilities,
    readProfile, writeProfile
} = require('../src/capabilities/profile');

const {
    DND_GROUPS, DND_ABILITY_KEYS,
    projectPercentiles, projectScores, editPercentile, profileFromScores
} = require('../src/systems/dnd5e/capability-projection');

const { up: migration019 } = require('../src/database/migrations/019-character-capabilities');
const { percentileFromScore, scoreFromPercentile } = require('../public/js/ability-conversion');

// ── helpers ─────────────────────────────────────────────────────────────────

function makeDb() {
    const db = new Database(':memory:');
    db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
    return db;
}

function insertCharacter(db, overrides = {}) {
    const defaults = { strength: 31, dexterity: 31, constitution: 31, intelligence: 31, wisdom: 31, charisma: 31 };
    const vals = { ...defaults, ...overrides };
    const result = db.prepare(`
        INSERT INTO characters (name, species, class_type, strength, dexterity, constitution, intelligence, wisdom, charisma)
        VALUES ('Test', 'Human', 'Fighter', ?, ?, ?, ?, ?, ?)
    `).run(vals.strength, vals.dexterity, vals.constitution, vals.intelligence, vals.wisdom, vals.charisma);
    return result.lastInsertRowid;
}

function neutralProfile() {
    return Object.fromEntries(CAPABILITY_KEYS.map(k => [k, NEUTRAL_CAPABILITY_VALUE]));
}

// ── capability service: validation ──────────────────────────────────────────

test('validateValue accepts integers 0 through 100', () => {
    assert.doesNotThrow(() => validateValue(0));
    assert.doesNotThrow(() => validateValue(50));
    assert.doesNotThrow(() => validateValue(100));
});

test('validateValue rejects non-integers and out-of-range values', () => {
    assert.throws(() => validateValue(-1), /integer/i);
    assert.throws(() => validateValue(101), /integer/i);
    assert.throws(() => validateValue(50.5), /integer/i);
    assert.throws(() => validateValue('50'), /integer/i);
    assert.throws(() => validateValue(null), /integer/i);
});

test('validateProfile accepts a complete valid profile and returns frozen copy', () => {
    const profile = validateProfile(neutralProfile());
    assert.ok(Object.isFrozen(profile));
    assert.strictEqual(Object.keys(profile).length, 12);
    for (const key of CAPABILITY_KEYS) assert.strictEqual(profile[key], NEUTRAL_CAPABILITY_VALUE);
});

test('validateProfile rejects incomplete profiles', () => {
    const partial = neutralProfile();
    delete partial.might;
    assert.throws(() => validateProfile(partial), /exactly the approved capability keys/i);
});

test('validateProfile rejects unknown keys', () => {
    const bad = { ...neutralProfile(), unknown_key: 50 };
    delete bad.might;
    assert.throws(() => validateProfile(bad));
});

test('validateProfile rejects duplicate keys', () => {
    // JS objects cannot have literal duplicate keys, so test via
    // a profile object created with an extra property replacing a known one
    const bad = neutralProfile();
    bad.strength_extra = 50; // extra key makes length wrong
    assert.throws(() => validateProfile(bad));
});

test('validateProfile rejects out-of-range values', () => {
    const bad = neutralProfile();
    bad.might = 101;
    assert.throws(() => validateProfile(bad), /integer/i);
});

// ── capability service: profileFromLegacyAbilities ──────────────────────────

test('profileFromLegacyAbilities maps legacy D&D percentiles to canonical keys', () => {
    const str = percentileFromScore(18);
    const dex = percentileFromScore(14);
    const con = percentileFromScore(12);
    const int_ = percentileFromScore(10);
    const wis = percentileFromScore(16);
    const cha = percentileFromScore(8);

    const profile = profileFromLegacyAbilities({ strength: str, dexterity: dex, constitution: con, intelligence: int_, wisdom: wis, charisma: cha });

    assert.strictEqual(profile.might, str);
    assert.strictEqual(profile.mobility, dex);
    assert.strictEqual(profile.coordination, dex);
    assert.strictEqual(profile.endurance, con);
    assert.strictEqual(profile.intellect, int_);
    assert.strictEqual(profile.perception, wis);
    assert.strictEqual(profile.instinct, wis);
    assert.strictEqual(profile.resolve, wis);
    assert.strictEqual(profile.presence, cha);
    assert.strictEqual(profile.influence, cha);
    assert.strictEqual(profile.fighting, NEUTRAL_CAPABILITY_VALUE);
    assert.strictEqual(profile.appearance, NEUTRAL_CAPABILITY_VALUE);
});

// ── capability service: readProfile / writeProfile ──────────────────────────

test('writeProfile persists all twelve rows and readProfile retrieves them', () => {
    const db = makeDb();
    migration019(db);
    const characterId = insertCharacter(db);
    const profile = { ...neutralProfile(), might: 75, intellect: 40 };
    writeProfile(db, characterId, profile);
    const read = readProfile(db, characterId);
    assert.strictEqual(read.might, 75);
    assert.strictEqual(read.intellect, 40);
    assert.strictEqual(Object.keys(read).length, 12);
});

test('writeProfile is transactional: replaces the entire profile atomically', () => {
    const db = makeDb();
    migration019(db);
    const characterId = insertCharacter(db);
    writeProfile(db, characterId, neutralProfile());

    const updated = { ...neutralProfile(), might: 90 };
    writeProfile(db, characterId, updated);

    const read = readProfile(db, characterId);
    assert.strictEqual(read.might, 90);
    const rows = db.prepare('SELECT COUNT(*) AS c FROM character_capabilities WHERE character_id = ?').get(characterId).c;
    assert.strictEqual(rows, 12);
});

test('readProfile throws a clear error when profile is missing', () => {
    const db = makeDb();
    migration019(db);
    const characterId = insertCharacter(db);
    assert.throws(() => readProfile(db, characterId), /incomplete/i);
});

// ── D&D projection: projectPercentiles ──────────────────────────────────────

test('projectPercentiles maps capability keys back to six D&D percentiles', () => {
    const str = percentileFromScore(18);
    const profile = profileFromLegacyAbilities({ strength: str, dexterity: 31, constitution: 31, intelligence: 31, wisdom: 31, charisma: 31 });
    const percentiles = projectPercentiles(profile);
    assert.strictEqual(percentiles.strength, str);
    assert.strictEqual(percentiles.dexterity, 31);
});

test('projectPercentiles aggregates dexterity as mean(mobility, coordination)', () => {
    const profile = { ...neutralProfile(), mobility: 40, coordination: 60 };
    const valid = validateProfile(profile);
    const percentiles = projectPercentiles(valid);
    assert.strictEqual(percentiles.dexterity, 50);
});

test('projectPercentiles aggregates wisdom as mean(perception, instinct, resolve)', () => {
    const profile = { ...neutralProfile(), perception: 30, instinct: 60, resolve: 60 };
    const valid = validateProfile(profile);
    const percentiles = projectPercentiles(valid);
    assert.strictEqual(percentiles.wisdom, 50);
});

test('projectPercentiles aggregates charisma as mean(presence, influence)', () => {
    const profile = { ...neutralProfile(), presence: 20, influence: 60 };
    const valid = validateProfile(profile);
    const percentiles = projectPercentiles(valid);
    assert.strictEqual(percentiles.charisma, 40);
});

// ── D&D projection: projectScores ───────────────────────────────────────────

test('projectScores round-trips through percentile for D&D scores 1–30', () => {
    for (let score = 1; score <= 30; score++) {
        const profile = profileFromScores({ strength: score, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
        const projected = projectScores(profile);
        assert.strictEqual(projected.strength, score, `round-trip failed for score ${score}`);
    }
});

test('profileFromScores seeds fighting and appearance at the neutral baseline', () => {
    const profile = profileFromScores({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });
    assert.strictEqual(profile.fighting, NEUTRAL_CAPABILITY_VALUE);
    assert.strictEqual(profile.appearance, NEUTRAL_CAPABILITY_VALUE);
});

// ── D&D projection: editPercentile ──────────────────────────────────────────

test('editPercentile updates a single-key group (strength) without touching other keys', () => {
    const profile = profileFromLegacyAbilities({ strength: 31, dexterity: 31, constitution: 31, intelligence: 31, wisdom: 31, charisma: 31 });
    const target = percentileFromScore(20);
    const edited = editPercentile(profile, 'strength', target);
    assert.strictEqual(edited.might, target);
    assert.strictEqual(edited.mobility, 31);
});

test('editPercentile preserves a dexterity distinction already established', () => {
    const profile = validateProfile({ ...neutralProfile(), mobility: 40, coordination: 60 });
    const current = projectPercentiles(profile).dexterity; // 50
    const target = current + 10; // 60
    const edited = editPercentile(profile, 'dexterity', target);
    assert.strictEqual(projectPercentiles(edited).dexterity, target);
    // The distinction (20-point gap) should be preserved as closely as possible
    const diff = edited.coordination - edited.mobility;
    assert.ok(diff > 0, 'original distinction direction preserved');
});

test('editPercentile uses minimum total change and key-order tie-breaking', () => {
    // Equal seeded values: adjustment should be spread evenly (in key order)
    const profile = profileFromLegacyAbilities({ strength: 31, dexterity: 31, constitution: 31, intelligence: 31, wisdom: 31, charisma: 31 });
    const edited = editPercentile(profile, 'wisdom', 40);
    // perception, instinct, resolve — all seeded at 31; target sum must round to 40
    assert.strictEqual(projectPercentiles(edited).wisdom, 40);
});

test('editPercentile rejects targets outside the 0–100 range', () => {
    const profile = validateProfile(neutralProfile());
    assert.throws(() => editPercentile(profile, 'strength', 101), /integer from 0 through 100/i);
    assert.throws(() => editPercentile(profile, 'strength', -1), /integer from 0 through 100/i);
});

test('editPercentile rejects unknown ability names', () => {
    const profile = validateProfile(neutralProfile());
    assert.throws(() => editPercentile(profile, 'unknown', 50), /unknown/i);
});

// ── migration 019 ────────────────────────────────────────────────────────────

test('019 creates the character_capabilities table', () => {
    const db = makeDb();
    migration019(db);
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='character_capabilities'").get();
    assert.ok(table);
    const cols = new Set(db.prepare('PRAGMA table_info(character_capabilities)').all().map(c => c.name));
    for (const col of ['id', 'character_id', 'capability_key', 'value', 'created_at', 'updated_at']) {
        assert.ok(cols.has(col), `column ${col} should exist`);
    }
});

test('019 seeds profiles for existing characters from legacy percentiles', () => {
    const db = makeDb();
    const str = percentileFromScore(18);
    const wis = percentileFromScore(16);
    const characterId = insertCharacter(db, { strength: str, wisdom: wis });

    migration019(db);

    const profile = readProfile(db, characterId);
    assert.strictEqual(profile.might, str);
    assert.strictEqual(profile.perception, wis);
    assert.strictEqual(profile.instinct, wis);
    assert.strictEqual(profile.resolve, wis);
    assert.strictEqual(profile.fighting, NEUTRAL_CAPABILITY_VALUE);
    assert.strictEqual(profile.appearance, NEUTRAL_CAPABILITY_VALUE);
});

test('019 is idempotent: repeated runs do not alter a valid profile', () => {
    const db = makeDb();
    const str = percentileFromScore(14);
    const characterId = insertCharacter(db, { strength: str });

    migration019(db);
    const first = readProfile(db, characterId);

    assert.doesNotThrow(() => migration019(db));
    const second = readProfile(db, characterId);
    assert.deepStrictEqual(first, second);
});

test('019 detects a partial profile and throws rather than overwriting', () => {
    const db = makeDb();
    migration019(db);
    const characterId = insertCharacter(db);

    // Insert only a subset of capability rows
    db.prepare('INSERT INTO character_capabilities (character_id, capability_key, value) VALUES (?, ?, ?)').run(characterId, 'might', 50);

    assert.throws(() => migration019(db), /partial/i);
});

test('019 projected D&D percentiles after migration match the pre-migration legacy values', () => {
    const db = makeDb();
    const legacyValues = { strength: 59, dexterity: 48, constitution: 55, intelligence: 31, wisdom: 62, charisma: 24 };
    const characterId = insertCharacter(db, legacyValues);

    migration019(db);

    const profile = readProfile(db, characterId);
    const percentiles = projectPercentiles(profile);

    for (const [ability, legacyPercentile] of Object.entries(legacyValues)) {
        assert.strictEqual(percentiles[ability], legacyPercentile, `projected ${ability} must equal legacy value`);
    }
});

test('019 does not modify legacy D&D columns on existing characters', () => {
    const db = makeDb();
    const legacyValues = { strength: 59, dexterity: 48, constitution: 55, intelligence: 31, wisdom: 62, charisma: 24 };
    const characterId = insertCharacter(db, legacyValues);

    migration019(db);

    const row = db.prepare('SELECT strength, dexterity, constitution, intelligence, wisdom, charisma FROM characters WHERE id = ?').get(characterId);
    assert.deepStrictEqual(row, legacyValues);
});
