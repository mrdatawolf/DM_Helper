const test = require('node:test');
const assert = require('node:assert');
const Database = require('better-sqlite3');

const { getSystem, getSystemForCampaign } = require('../src/systems/registry');

test('D&D 5e manifest exposes the system extension contract', () => {
    const system = getSystem('dnd5e');
    assert.strictEqual(system.namespace, 'system:dnd5e');
    assert.strictEqual(system.derivedStats.abilityModifier(59), 4);
    assert.strictEqual(system.dice.roll(() => 0), 1);
    assert.strictEqual(system.dice.roll(() => 0.999999), 20);
    assert.strictEqual(system.pdfExport.template, '/assets/dnd-5e-character-sheet-template.pdf');
});

test('campaign system_id selects its registered system manifest', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE campaigns (id INTEGER PRIMARY KEY, system_id TEXT NOT NULL)');
    db.prepare("INSERT INTO campaigns (id, system_id) VALUES (7, 'dnd5e')").run();
    assert.strictEqual(getSystemForCampaign(db, 7), getSystem('dnd5e'));
    assert.strictEqual(getSystemForCampaign(db, 99), undefined);
    db.close();
});
