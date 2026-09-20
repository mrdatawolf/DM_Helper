const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '../public/js/campaign-branding.js'), 'utf8');

function browser() {
    const dom = new JSDOM(`<!doctype html><html data-brand-page="home"><head><title>old</title></head><body>
        <h1 data-campaign-name></h1><p data-campaign-context></p><p data-campaign-tagline></p>
        <img data-campaign-logo src="old.png" alt="old">
    </body></html>`, { runScripts: 'dangerously', url: 'http://localhost/' });
    dom.window.fetch = async () => ({ ok: false });
    dom.window.eval(script);
    return dom;
}

test('campaign branding applies an active campaign and its universe presentation', () => {
    const dom = browser();
    dom.window.CampaignBranding.apply({
        name: 'The Shattering of the Liminal',
        universe_label: 'Amber',
        branding: { logo: '/logo.png', tagline: 'Amber-specific tagline' }
    });
    assert.strictEqual(dom.window.document.title, 'The Shattering of the Liminal');
    assert.strictEqual(dom.window.document.querySelector('[data-campaign-name]').textContent, 'The Shattering of the Liminal');
    assert.strictEqual(dom.window.document.querySelector('[data-campaign-context]').textContent, 'The Shattering of the Liminal');
    assert.strictEqual(dom.window.document.querySelector('[data-campaign-tagline]').textContent, 'Amber-specific tagline');
    const logo = dom.window.document.querySelector('[data-campaign-logo]');
    assert.strictEqual(logo.hidden, false);
    assert.strictEqual(logo.getAttribute('src'), '/logo.png');
});

test('campaign branding neutral state contains no Amber identity and hides the campaign logo', () => {
    const dom = browser();
    dom.window.CampaignBranding.apply(dom.window.CampaignBranding.neutral);
    assert.strictEqual(dom.window.document.title, 'DM Helper');
    assert.strictEqual(dom.window.document.querySelector('[data-campaign-name]').textContent, 'DM Helper');
    assert.strictEqual(dom.window.document.querySelector('[data-campaign-context]').textContent, 'No campaign selected');
    assert.doesNotMatch(dom.window.document.body.textContent, /Amber|Shattering/i);
    const logo = dom.window.document.querySelector('[data-campaign-logo]');
    assert.strictEqual(logo.hidden, true);
    assert.strictEqual(logo.hasAttribute('src'), false);
});

test('every scoped runtime page declares neutral chrome and loads campaign branding', () => {
    const pages = {
        'index.html': 'DM Helper',
        'guide.html': "Player's Guide — DM Helper",
        'dm-dashboard.html': 'DM Dashboard — DM Helper',
        'player-dashboard.html': 'Player Dashboard — DM Helper',
        'admin.html': 'User Management — DM Helper',
        'player-login.html': 'Player Login — DM Helper'
    };
    Object.entries(pages).forEach(([filename, expectedTitle]) => {
        const html = fs.readFileSync(path.join(__dirname, '../public', filename), 'utf8');
        const dom = new JSDOM(html);
        assert.strictEqual(dom.window.document.title, expectedTitle, filename);
        assert.match(html, /\/js\/campaign-branding\.js/, filename);
        assert.doesNotMatch(html, /Amber Campaign|The Shattering of the Liminal|Amber multiverse/i, filename);
    });
});
