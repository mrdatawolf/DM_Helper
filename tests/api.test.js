// Integration tests: run the real Express app against an in-memory SQLite DB.
// Env must be set before any src/ module is required.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { getDatabase, closeDatabase } = require('../src/database/connection');

// Build the schema on the in-memory DB, then let the server apply migrations.
const db = getDatabase();
db.exec(fs.readFileSync(path.join(__dirname, '../src/database/schema.sql'), 'utf8'));
const { app } = require('../src/server');

let server;
let base;

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
    const res = await api('POST', '/api/auth/register', {
        body: { username, password: 'testpass123' }
    });
    assert.strictEqual(res.status, 201, `register ${username}: ${JSON.stringify(res.body)}`);
    return { token: res.body.token, user: res.body.user };
}

// Shared state across sequential tests
let alice, mallory, dm;
let charId;
let shadowId;

test('anonymous requests are rejected on protected routes', async () => {
    assert.strictEqual((await api('GET', '/api/characters')).status, 401);
    assert.strictEqual((await api('POST', '/api/characters', { body: { name: 'X', species: 'Y', class_type: 'Z' } })).status, 401);
    assert.strictEqual((await api('POST', '/api/shadows', { body: { name: 'Nope' } })).status, 401);
    assert.strictEqual((await api('PUT', '/api/shadows/1', { body: { name: 'Nope' } })).status, 401);
    assert.strictEqual((await api('POST', '/api/sessions', { body: {} })).status, 401);
});

test('campaign-owned reads require authentication', async () => {
    const res = await api('GET', '/api/shadows');
    assert.strictEqual(res.status, 401);
});

test('a player can create a character with unified field names', async () => {
    alice = await register('alice');

    const res = await api('POST', '/api/characters', {
        token: alice.token,
        body: {
            name: 'Corwin', species: 'Amberite', class_type: 'Fighter',
            strength: 18,
            max_hp: 15, current_hp: 15, order_chaos_value: 70,
            trump_artist: 1, backstory: 'Woke in Greenwood with no memory.'
        }
    });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    charId = res.body.id;

    assert.strictEqual(res.body.species, 'Amberite');
    assert.strictEqual(res.body.class_type, 'Fighter');
    assert.strictEqual(res.body.strength, 59, 'D&D score 18 is stored as a percentile');
    assert.strictEqual(res.body.max_hp, 15);
    assert.strictEqual(res.body.order_chaos_value, 70);
    assert.strictEqual(res.body.trump_artist, 1);
    assert.strictEqual(res.body.backstory, 'Woke in Greenwood with no memory.');
    assert.strictEqual(res.body.user_id, alice.user.id, 'character belongs to its creator');
});

test('the owner can edit their character via unified fields', async () => {
    const res = await api('PUT', `/api/characters/${charId}`, {
        token: alice.token,
        body: { max_hp: 22, current_hp: 20, class_type: 'Warlock', pattern_imprint: 1 }
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.max_hp, 22);
    assert.strictEqual(res.body.current_hp, 20);
    assert.strictEqual(res.body.class_type, 'Warlock');
    assert.strictEqual(res.body.pattern_imprint, 1);

    const fetched = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(fetched.status, 200);
    assert.strictEqual(fetched.body.max_hp, 22);
});

test("another player cannot edit or delete someone else's character", async () => {
    mallory = await register('mallory');

    const put = await api('PUT', `/api/characters/${charId}`, {
        token: mallory.token, body: { max_hp: 1 }
    });
    assert.strictEqual(put.status, 403);

    const del = await api('DELETE', `/api/characters/${charId}`, { token: mallory.token });
    assert.strictEqual(del.status, 403);

    const fetched = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(fetched.body.max_hp, 22, 'character untouched');
});

test('a DM can edit any character', async () => {
    await register('gamemaster');
    getDatabase().prepare("UPDATE users SET is_dm = 1 WHERE username = 'gamemaster'").run();
    const login = await api('POST', '/api/auth/login', {
        body: { username: 'gamemaster', password: 'testpass123' }
    });
    assert.strictEqual(login.status, 200);
    dm = { token: login.body.token, user: login.body.user };
    getDatabase().prepare("UPDATE campaign_members SET role = 'dm' WHERE campaign_id = 1 AND user_id = ?")
        .run(dm.user.id);

    const res = await api('PUT', `/api/characters/${charId}`, {
        token: dm.token, body: { feat_pool: 3 }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.feat_pool, 3);
});

test('weapon and spell CRUD is restricted to the character owner or DM', async () => {
    const weapon = await api('POST', `/api/characters/${charId}/weapons`, {
        token: alice.token,
        body: { name: 'Longsword', attack_bonus: 6, damage_type: '1d8+4 slashing' }
    });
    assert.strictEqual(weapon.status, 201, JSON.stringify(weapon.body));

    const spell = await api('POST', `/api/characters/${charId}/spells`, {
        token: alice.token,
        body: { spell_name: 'Light', spell_level: 0, casting_time: '1 action', is_prepared: 1 }
    });
    assert.strictEqual(spell.status, 201, JSON.stringify(spell.body));

    assert.strictEqual((await api('PUT', `/api/characters/${charId}/weapons/${weapon.body.id}`, {
        token: mallory.token, body: { name: 'Stolen sword' }
    })).status, 403);
    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/spells/${spell.body.id}`, {
        token: mallory.token
    })).status, 403);

    const fetched = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(fetched.status, 200);
    assert.strictEqual(fetched.body.weapons[0].name, 'Longsword');
    assert.strictEqual(fetched.body.spells[0].spell_name, 'Light');

    const updatedWeapon = await api('PUT', `/api/characters/${charId}/weapons/${weapon.body.id}`, {
        token: alice.token, body: { attack_bonus: 7 }
    });
    assert.strictEqual(updatedWeapon.status, 200);
    assert.strictEqual(updatedWeapon.body.attack_bonus, 7);

    const updatedSpell = await api('PUT', `/api/characters/${charId}/spells/${spell.body.id}`, {
        token: dm.token, body: { is_prepared: 0 }
    });
    assert.strictEqual(updatedSpell.status, 200);
    assert.strictEqual(updatedSpell.body.is_prepared, 0);

    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/weapons/${weapon.body.id}`, { token: alice.token })).status, 200);
    assert.strictEqual((await api('DELETE', `/api/characters/${charId}/spells/${spell.body.id}`, { token: alice.token })).status, 200);
});

test('shadow creators manage their own shadows and super admins can override ownership', async () => {
    const created = await api('POST', '/api/shadows', {
        token: alice.token, body: { name: 'Greenwood', description: 'A quiet forest world' }
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    shadowId = created.body.id;

    const ownerPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: alice.token, body: { name: 'Hacked' }
    });
    assert.strictEqual(ownerPut.status, 200);
    assert.strictEqual(ownerPut.body.name, 'Hacked');

    const otherPlayerPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: mallory.token, body: { name: 'Stolen' }
    });
    assert.strictEqual(otherPlayerPut.status, 403);

    const otherPlayerDel = await api('DELETE', `/api/shadows/${shadowId}`, { token: mallory.token });
    assert.strictEqual(otherPlayerDel.status, 403);

    const dmPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: dm.token, body: { description: 'A quiet forest world, touched by Pattern' }
    });
    assert.strictEqual(dmPut.status, 403, 'ordinary DMs do not override shadow ownership');

    await register('shadowadmin');
    getDatabase().prepare("UPDATE users SET is_super_admin = 1 WHERE username = 'shadowadmin'").run();
    const adminLogin = await api('POST', '/api/auth/login', {
        body: { username: 'shadowadmin', password: 'testpass123' }
    });
    assert.strictEqual(adminLogin.status, 200);

    const adminPut = await api('PUT', `/api/shadows/${shadowId}`, {
        token: adminLogin.body.token,
        body: { description: 'A quiet forest world, touched by Pattern' }
    });
    assert.strictEqual(adminPut.status, 200);

    const adminDel = await api('DELETE', `/api/shadows/${shadowId}`, {
        token: adminLogin.body.token
    });
    assert.strictEqual(adminDel.status, 200);
});

test('campaign-session writes are DM-only', async () => {
    const asPlayer = await api('POST', '/api/sessions', {
        token: alice.token, body: { session_number: 1, session_date: '2026-07-08' }
    });
    assert.strictEqual(asPlayer.status, 403);
});

test('claim allocation respects character ownership', async () => {
    const own = await api('POST', '/api/claims/allocate', {
        token: alice.token,
        body: { character_id: charId, attribute_name: 'Warfare', points_to_add: 3, justification: 'Decades of drill' }
    });
    assert.strictEqual(own.status, 200, JSON.stringify(own.body));
    assert.strictEqual(own.body.points_spent, 3);

    const other = await api('POST', '/api/claims/allocate', {
        token: mallory.token,
        body: { character_id: charId, attribute_name: 'Warfare', points_to_add: 1, justification: 'Nope' }
    });
    assert.strictEqual(other.status, 403);
});

test('claim resolution derives its ability bonus from the stored percentile', async () => {
    const resolved = await api('POST', '/api/claims/resolve', {
        token: alice.token,
        body: { character_id: charId, attribute_name: 'Strength', roll_result: 12 }
    });
    assert.strictEqual(resolved.status, 200, JSON.stringify(resolved.body));
    assert.strictEqual(resolved.body.ability_bonus, 4, 'stored percentile 59 converts back to D&D score 18');
    assert.strictEqual(resolved.body.final_result, 16);
});

test('/api/auth/characters returns unified column names', async () => {
    const res = await api('GET', '/api/auth/characters', { token: alice.token });
    assert.strictEqual(res.status, 200);
    const chars = res.body.characters;
    assert.strictEqual(chars.length, 1);
    const c = chars[0];
    assert.strictEqual(c.species, 'Amberite');
    assert.strictEqual(c.class_type, 'Warlock');
    assert.strictEqual(c.max_hp, 22);
    assert.ok('shadow_origin_id' in c, 'shadow_origin_id exposed for Known Shadows tab');
});

test('campaign switching scopes character access and rejects non-members', async () => {
    const createdCampaign = await api('POST', '/api/auth/campaigns', {
        token: dm.token,
        body: { name: 'Second Campaign', system_id: 'dnd5e', universe_id: 'amber' }
    });
    assert.strictEqual(createdCampaign.status, 201, JSON.stringify(createdCampaign.body));
    assert.strictEqual(db.prepare('SELECT count(*) count FROM shadows WHERE campaign_id = ?').get(createdCampaign.body.id).count, 11);
    assert.strictEqual(db.prepare('SELECT count(*) count FROM primal_patterns WHERE campaign_id = ?').get(createdCampaign.body.id).count, 3);
    assert.strictEqual(db.prepare('SELECT count(*) count FROM primal_pattern_sections WHERE campaign_id = ?').get(createdCampaign.body.id).count, 17);
    const wizardContent = await api('GET', '/api/universe/content/wizard', { token: createdCampaign.body.token });
    assert.strictEqual(wizardContent.status, 200);
    assert.strictEqual(wizardContent.body.IMPRINT_LORE.FirstPattern.title, 'The Pattern');
    const guideResponse = await fetch(base + '/api/universe/content/guide', {
        headers: { Authorization: `Bearer ${createdCampaign.body.token}` }
    });
    assert.strictEqual(guideResponse.status, 200);
    assert.strictEqual(await guideResponse.text(), fs.readFileSync(path.join(__dirname, '../src/universes/amber/content/PLAYER_GUIDE.md'), 'utf8'));
    assert.strictEqual((await api('POST', '/api/shadows', {
        token: createdCampaign.body.token,
        body: { name: 'Invalid Amber Influence', pattern_influence: 'Homebrew Power' }
    })).status, 400);

    const secondCampaignToken = createdCampaign.body.token;
    const secondShadow = await api('POST', '/api/shadows', {
        token: secondCampaignToken,
        body: { name: 'Second Campaign Shadow', description: 'Campaign two only' }
    });
    assert.strictEqual(secondShadow.status, 201, JSON.stringify(secondShadow.body));
    assert.strictEqual((await api('GET', `/api/shadows/${secondShadow.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign shadow access is allowed');
    assert.strictEqual((await api('GET', `/api/shadows/${secondShadow.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see the shadow');

    const secondNpc = await api('POST', '/api/npcs', {
        token: secondCampaignToken,
        body: { name: 'Second Campaign NPC', description: 'Campaign two only' }
    });
    assert.strictEqual(secondNpc.status, 201, JSON.stringify(secondNpc.body));
    assert.strictEqual((await api('GET', `/api/npcs/${secondNpc.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign NPC access is allowed');
    assert.strictEqual((await api('GET', `/api/npcs/${secondNpc.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see the NPC');

    const secondCharacter = await api('POST', '/api/characters', {
        token: secondCampaignToken,
        body: { name: 'Elsewhere', species: 'Human', class_type: 'Rogue' }
    });
    assert.strictEqual(secondCharacter.status, 201, JSON.stringify(secondCharacter.body));

    assert.strictEqual((await api('GET', `/api/characters/${secondCharacter.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign character access is allowed');
    assert.strictEqual((await api('GET', `/api/characters/${secondCharacter.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see the character');

    const secondSession = await api('POST', '/api/sessions', {
        token: secondCampaignToken,
        body: { session_number: 9028, session_date: '2026-09-13', session_title: 'Campaign Two Session' }
    });
    assert.strictEqual(secondSession.status, 201, JSON.stringify(secondSession.body));
    assert.strictEqual((await api('GET', `/api/sessions/${secondSession.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign session access is allowed');
    assert.strictEqual((await api('GET', `/api/sessions/${secondSession.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see the session');

    const secondScene = await api('POST', '/api/scenes', {
        token: secondCampaignToken,
        body: { character_id: secondCharacter.body.id, title: 'Campaign Two Scene', status: 'approved' }
    });
    assert.strictEqual(secondScene.status, 201, JSON.stringify(secondScene.body));
    const sameCampaignScenes = await api('GET', '/api/scenes', { token: secondCampaignToken });
    const otherCampaignScenes = await api('GET', '/api/scenes', { token: dm.token });
    assert.ok(sameCampaignScenes.body.some(scene => scene.id === secondScene.body.id),
        'same-campaign scene access is allowed');
    assert.ok(!otherCampaignScenes.body.some(scene => scene.id === secondScene.body.id),
        'a token in another campaign cannot see the scene');

    const secondNote = await api('POST', '/api/session-notes', {
        token: secondCampaignToken,
        body: { session_id: secondSession.body.id, content: 'Campaign two only', visibility: 'public' }
    });
    assert.strictEqual(secondNote.status, 201, JSON.stringify(secondNote.body));
    const sameCampaignNotes = await api('GET',
        `/api/session-notes?session_id=${secondSession.body.id}`, { token: secondCampaignToken });
    const otherCampaignNotes = await api('GET',
        `/api/session-notes?session_id=${secondSession.body.id}`, { token: dm.token });
    assert.ok(sameCampaignNotes.body.some(note => note.id === secondNote.body.id),
        'same-campaign session-note access is allowed');
    assert.strictEqual(otherCampaignNotes.body.length, 0,
        'a token in another campaign cannot see session notes');

    const secondCombat = await api('POST', '/api/combats', {
        token: secondCampaignToken,
        body: { session_id: secondSession.body.id, title: 'Campaign Two Combat' }
    });
    assert.strictEqual(secondCombat.status, 201, JSON.stringify(secondCombat.body));
    assert.strictEqual((await api('GET', `/api/combats/${secondCombat.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign combat access is allowed');
    assert.strictEqual((await api('GET', `/api/combats/${secondCombat.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see the combat');

    const secondProgress = await api('POST', '/api/progress', {
        token: secondCampaignToken,
        body: {
            character_id: secondCharacter.body.id,
            session_id: secondSession.body.id,
            summary: 'Campaign two progress'
        }
    });
    assert.strictEqual(secondProgress.status, 201, JSON.stringify(secondProgress.body));
    assert.strictEqual((await api('GET', `/api/progress/${secondProgress.body.id}`, {
        token: secondCampaignToken
    })).status, 200, 'same-campaign progress access is allowed');
    assert.strictEqual((await api('GET', `/api/progress/${secondProgress.body.id}`, {
        token: dm.token
    })).status, 404, 'a token in another campaign cannot see progress');

    const deniedSwitch = await api('POST', '/api/auth/campaigns/switch', {
        token: alice.token, body: { campaign_id: createdCampaign.body.id }
    });
    assert.strictEqual(deniedSwitch.status, 403, 'non-members cannot switch into a campaign');

    const switchedBack = await api('POST', '/api/auth/campaigns/switch', {
        token: secondCampaignToken, body: { campaign_id: 1 }
    });
    assert.strictEqual(switchedBack.status, 200);
    assert.strictEqual((await api('GET', `/api/characters/${charId}`, { token: switchedBack.body.token })).status, 200);
});

test('a campaign with no universe receives no Amber attributes, content, or seeds', async () => {
    const campaign = await api('POST', '/api/auth/campaigns', {
        token: dm.token,
        body: { name: 'Homebrew', system_id: 'dnd5e', universe_id: null }
    });
    assert.strictEqual(campaign.status, 201, JSON.stringify(campaign.body));
    assert.strictEqual(campaign.body.universe_id, null);
    assert.strictEqual(db.prepare('SELECT count(*) count FROM shadows WHERE campaign_id = ?').get(campaign.body.id).count, 0);
    assert.strictEqual(db.prepare('SELECT count(*) count FROM primal_patterns WHERE campaign_id = ?').get(campaign.body.id).count, 0);
    assert.strictEqual(db.prepare('SELECT count(*) count FROM primal_pattern_sections WHERE campaign_id = ?').get(campaign.body.id).count, 0);
    assert.strictEqual((await api('GET', '/api/universe/content/wizard', { token: campaign.body.token })).status, 404);
    assert.strictEqual((await api('GET', '/api/universe/content/guide', { token: campaign.body.token })).status, 404);
    assert.strictEqual((await api('POST', '/api/shadows', {
        token: campaign.body.token,
        body: { name: 'Homebrew Influence', pattern_influence: 'Homebrew Power' }
    })).status, 201);

    const character = await api('POST', '/api/characters', {
        token: campaign.body.token,
        body: { name: 'Generic', species: 'Human', class_type: 'Fighter', blood_purity: 'Pure', pattern_imprint: 1 }
    });
    assert.strictEqual(character.status, 201, JSON.stringify(character.body));
    assert.ok(!('blood_purity' in character.body));
    assert.ok(!('pattern_imprint' in character.body));
    assert.strictEqual(db.prepare("SELECT count(*) count FROM character_extension_data WHERE character_id = ? AND namespace = 'universe:amber'").get(character.body.id).count, 0);
});

test('account-level admin authorization remains global', async () => {
    const admin = await register('admin');
    const users = await api('GET', '/api/admin/users', { token: admin.token });
    assert.strictEqual(users.status, 200);
    assert.ok(Array.isArray(users.body.users));
});

test('the owner can delete their character', async () => {
    const res = await api('DELETE', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(res.status, 200);

    const gone = await api('GET', `/api/characters/${charId}`, { token: alice.token });
    assert.strictEqual(gone.status, 404);
});
