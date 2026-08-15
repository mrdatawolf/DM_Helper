const express = require('express');
const bcrypt = require('bcrypt');
const { generateToken, verifyToken, authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/connection');

const router = express.Router();

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Create new user account
 */
router.post('/register', async (req, res) => {
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

        // Generate token
        const user = {
            id: result.lastInsertRowid,
            username,
            is_dm: is_dm ? 1 : 0
        };

        const token = generateToken(user);

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
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post('/login', async (req, res) => {
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

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // Generate token
        const token = generateToken(user);

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
                is_super_admin: !!user.is_super_admin
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

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
router.get('/me', authenticate, (req, res) => {
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

        res.json({ user: { ...user, is_admin: user.username === 'admin', is_super_admin: !!user.is_super_admin } });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * GET /api/auth/characters
 * Get all characters owned by authenticated user
 */
router.get('/characters', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const characters = db.prepare(`
            SELECT
                id, name, species, class_type, level,
                current_hp, max_hp,
                shadow_origin_id, current_shadow_id,
                order_chaos_value,
                pattern_imprint, logrus_imprint,
                blood_purity, trump_artist,
                created_at
            FROM characters
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(req.user.userId);

        res.json({ characters });

    } catch (error) {
        console.error('Get user characters error:', error);
        res.status(500).json({ error: 'Failed to get characters' });
    }
});

module.exports = router;
