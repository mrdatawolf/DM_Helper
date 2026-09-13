const express = require('express');
const bcrypt = require('bcrypt');
const { generateToken, verifyToken, authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/connection');
const { asyncHandler } = require('../middleware/errorHandler');
const { getSystemForCampaign } = require('../systems/registry');

const router = express.Router();

const SALT_ROUNDS = 10;

function firstCampaignId(db, userId) {
    return db.prepare('SELECT campaign_id FROM campaign_members WHERE user_id = ? ORDER BY campaign_id LIMIT 1').get(userId)?.campaign_id || null;
}

/**
 * POST /api/auth/register
 * Create new user account
 */
router.post('/register', asyncHandler(async (req, res, next) => {
    try {
        const db = getDatabase();
        const { username, password, email } = req.body;
        const is_dm = 0; // DM flag can only be granted by admin

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, email, is_dm, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const result = stmt.run(username, password_hash, email || null, is_dm ? 1 : 0);

        // Preserve the pre-tenancy sign-up behavior for the migrated campaign:
        // a newly registered player joins campaign #1 when it exists.
        if (db.prepare('SELECT id FROM campaigns WHERE id = 1').get()) {
            db.prepare("INSERT OR IGNORE INTO campaign_members (campaign_id, user_id, role) VALUES (1, ?, 'player')")
                .run(result.lastInsertRowid);
        }

        // Generate token
        const user = {
            id: result.lastInsertRowid,
            username,
            is_dm: is_dm ? 1 : 0
        };

        const token = generateToken(user, firstCampaignId(db, user.id));

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: email || null,
                is_dm: user.is_dm,
                is_admin: user.username === 'admin',
                is_super_admin: !!user.is_super_admin
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to create user' }));
    }
}));

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', asyncHandler(async (req, res, next) => {
    try {
        const db = getDatabase();
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get user
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Block archived accounts
        if (user.is_archived) {
            return res.status(403).json({ error: 'This account has been deactivated. Please contact your DM.' });
        }

        // Compatibility for the migrated campaign while the account-admin UI
        // still grants the legacy is_dm flag: reflect that grant in campaign #1.
        if (user.is_dm) {
            db.prepare("UPDATE campaign_members SET role = 'dm' WHERE campaign_id = 1 AND user_id = ?")
                .run(user.id);
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // Generate token
        const currentCampaignId = firstCampaignId(db, user.id);
        const token = generateToken(user, currentCampaignId);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_dm: user.is_dm,
                is_admin: user.username === 'admin',
                is_super_admin: !!user.is_super_admin,
                current_campaign_id: currentCampaignId
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        next(Object.assign(error, { clientMessage: 'Login failed' }));
    }
}));

/**
 * POST /api/auth/logout
 * Clear authentication cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticate, asyncHandler((req, res, next) => {
    try {
        const db = getDatabase();
        // req.user is set by authenticate middleware
        const user = db.prepare(`
            SELECT id, username, email, is_dm, is_super_admin, created_at, last_login
            FROM users
            WHERE id = ?
        `).get(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const membership = req.user.currentCampaignId ? db.prepare(
            'SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
        ).get(req.user.currentCampaignId, req.user.userId) : null;
        res.json({ user: { ...user, is_admin: user.username === 'admin', is_super_admin: !!user.is_super_admin,
            is_dm: membership?.role === 'dm' ? 1 : 0, current_campaign_id: membership ? req.user.currentCampaignId : null } });

    } catch (error) {
        console.error('Get user error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to get user info' }));
    }
}));

/**
 * GET /api/auth/characters
 * Get all characters owned by authenticated user
 */
router.get('/characters', authenticate, asyncHandler((req, res, next) => {
    try {
        const db = getDatabase();
        const characters = db.prepare(`
            SELECT
                c.id, c.name, c.species, c.class_type, c.level,
                c.shadow_origin_id, c.current_shadow_id,
                c.order_chaos_value,
                c.pattern_imprint, c.logrus_imprint,
                c.blood_purity, c.trump_artist,
                c.strength, c.dexterity, c.constitution,
                c.intelligence, c.wisdom, c.charisma,
                c.created_at
            FROM characters c
            JOIN campaign_characters cc ON cc.character_id = c.id
            WHERE c.user_id = ? AND cc.campaign_id = ?
            ORDER BY c.created_at DESC
        `).all(req.user.userId, req.user.currentCampaignId);

        const system = getSystemForCampaign(db, req.user.currentCampaignId);
        res.json({ characters: characters.map(character => {
            const sheet = system.sheet.readDocument(db, character.id).sheet;
            return { ...character, current_hp: sheet.current_hp, max_hp: sheet.max_hp };
        }) });

    } catch (error) {
        console.error('Get user characters error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to get characters' }));
    }
}));

router.get('/campaigns', authenticate, asyncHandler((req, res) => {
    const campaigns = getDatabase().prepare(`
        SELECT c.id, c.name, c.system_id, c.universe_id, cm.role
        FROM campaign_members cm JOIN campaigns c ON c.id = cm.campaign_id
        WHERE cm.user_id = ? ORDER BY c.name, c.id
    `).all(req.user.userId);
    res.json({ campaigns, current_campaign_id: req.user.currentCampaignId });
}));

router.get('/campaigns/current-system', authenticate, asyncHandler((req, res) => {
    const system = getSystemForCampaign(getDatabase(), req.user.currentCampaignId);
    if (!system) return res.status(409).json({ error: 'Select a campaign before continuing' });
    res.json({
        id: system.id,
        label: system.label,
        sheet_renderer: system.sheet.browserRenderer,
        dice_mechanic: system.dice.id,
        pdf_template: system.pdfExport.template,
        pdf_exporter: system.pdfExport.browserExporter
    });
}));

router.post('/campaigns/switch', authenticate, asyncHandler((req, res) => {
    const campaignId = Number(req.body.campaign_id);
    const db = getDatabase();
    const membership = db.prepare('SELECT role FROM campaign_members WHERE campaign_id = ? AND user_id = ?').get(campaignId, req.user.userId);
    if (!membership) return res.status(403).json({ error: 'Campaign access denied' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    const token = generateToken(user, campaignId);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ token, current_campaign_id: campaignId, role: membership.role });
}));

router.post('/campaigns', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user.is_dm && req.user.username !== 'admin' && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'DM access required to create a campaign' });
    }
    const { name, system_id = 'dnd5e', universe_id = 'amber' } = req.body;
    if (!name) return res.status(400).json({ error: 'Campaign name is required' });
    const create = db.transaction(() => {
        const result = db.prepare('INSERT INTO campaigns (name, owner_user_id, system_id, universe_id) VALUES (?, ?, ?, ?)')
            .run(name, req.user.userId, system_id, universe_id);
        db.prepare("INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, 'dm')").run(result.lastInsertRowid, req.user.userId);
        return Number(result.lastInsertRowid);
    });
    const campaignId = create();
    const token = generateToken(user, campaignId);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
    res.status(201).json({ id: campaignId, name, system_id, universe_id, token, current_campaign_id: campaignId, role: 'dm' });
}));

module.exports = router;
