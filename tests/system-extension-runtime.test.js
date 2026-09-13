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
let player;
let dm;
let characterId;

async function api(method, route, token, body) {
    const response = await fetch(base + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
}

async function register(username) {
    return (await api('POST', '/api/auth/register', null, { username, password: 'testpass123' })).body;
}

function extension() {
    return JSON.parse(db.prepare("SELECT data FROM character_extension_data WHERE character_id = ? AND namespace = 'system:dnd5e'").get(characterId).data);
}

test.before(async () => {
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    player = await register('extension_player');
    await register('extension_dm');
    db.prepare("UPDATE users SET is_dm = 1 WHERE username = 'extension_dm'").run();
    dm = (await api('POST', '/api/auth/login', null, { username: 'extension_dm', password: 'testpass123' })).body;
});

test.after(() => { server.close(); closeDatabase(); });

test('creation and scalar edits use only the campaign system document while preserving responses', async () => {
    const selectedSystem = await api('GET', '/api/auth/campaigns/current-system', player.token);
    assert.deepStrictEqual(selectedSystem.body, {
        id: 'dnd5e', label: 'D&D 5e', sheet_renderer: '/js/player/player-character-sheet.js',
        dice_mechanic: 'd20', pdf_template: '/assets/dnd-5e-character-sheet-template.pdf',
        pdf_exporter: 'downloadCharacterPdf'
    });
    const created = await api('POST', '/api/characters', player.token, {
        name: 'Extension Hero', species: 'Human', class_type: 'Wizard', max_hp: 27, current_hp: 19
    });
    assert.strictEqual(created.status, 201);
    characterId = created.body.id;
    assert.strictEqual(created.body.max_hp, 27);
    assert.strictEqual(created.body.armor_class, 10);
    assert.strictEqual(db.prepare('SELECT max_hp, current_hp FROM characters WHERE id = ?').get(characterId).max_hp, 10);

    const edited = await api('PUT', `/api/characters/${characterId}`, player.token, {
        armor_class: 17, skill_arcana: 2, save_intelligence: 1, spell_slots_3_total: 3
    });
    assert.strictEqual(edited.status, 200);
    assert.deepStrictEqual(
        [edited.body.armor_class, edited.body.skill_arcana, edited.body.save_intelligence, edited.body.spell_slots_3_total],
        [17, 2, 1, 3]
    );
    const legacy = db.prepare('SELECT armor_class, skill_arcana, save_intelligence, spell_slots_3_total FROM characters WHERE id = ?').get(characterId);
    assert.deepStrictEqual(legacy, { armor_class: 10, skill_arcana: 0, save_intelligence: 0, spell_slots_3_total: 0 });
    assert.strictEqual(extension().sheet.armor_class, 17);

    const shown = await api('GET', `/api/characters/${characterId}`, player.token);
    assert.strictEqual(shown.body.armor_class, 17);
    assert.strictEqual(shown.body.max_hp, 27);
});

test('gear, powers, spells, feats, and weapons CRUD use document collections and keep route shapes', async () => {
    const cases = [
        ['gear', player.token, { item_name: 'Rope' }, 'item_name', 'Silk Rope'],
        ['powers', dm.token, { power_name: 'Arcane Recovery', uses_per_day: 1 }, 'power_name', 'Greater Recovery'],
        ['spells', player.token, { spell_name: 'Shield', spell_level: 1 }, 'spell_name', 'Mage Shield'],
        ['feats', player.token, { feat_name: 'Alert', source: 'Level 4' }, 'feat_name', 'Keen Alert'],
        ['weapons', player.token, { name: 'Staff', attack_bonus: 4 }, 'name', 'Oak Staff']
    ];
    for (const [name, token, body, field, changed] of cases) {
        const created = await api('POST', `/api/characters/${characterId}/${name}`, token, body);
        assert.strictEqual(created.status, 201, name);
        assert.strictEqual(created.body.character_id, characterId);
        const edited = await api('PUT', `/api/characters/${characterId}/${name}/${created.body.id}`, token, { [field]: changed });
        assert.strictEqual(edited.status, 200, name);
        assert.strictEqual(edited.body[field], changed);
        const removed = await api('DELETE', `/api/characters/${characterId}/${name}/${created.body.id}`, token);
        assert.strictEqual(removed.status, 200, name);
    }
    for (const table of ['character_gear', 'character_powers', 'character_spells', 'character_feats', 'character_weapons']) {
        assert.strictEqual(db.prepare(`SELECT count(*) AS count FROM ${table} WHERE character_id = ?`).get(characterId).count, 0, table);
    }
    for (const name of ['gear', 'powers', 'spells', 'feats', 'weapons']) assert.deepStrictEqual(extension()[name], []);
});
