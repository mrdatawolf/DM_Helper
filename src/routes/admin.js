const express = require('express');
const bcrypt = require('bcrypt');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDatabase } = require('../database/connection');

const router = express.Router();

router.use(authenticate, requireAdmin);

const USER_COLS = 'id, username, email, is_dm, is_archived, created_at, last_login';

// List all users (active + archived)
router.get('/users', (req, res) => {
    try {
        const db = getDatabase();
        const users = db.prepare(`
            SELECT ${USER_COLS} FROM users ORDER BY is_archived ASC, created_at ASC
        `).all();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user (toggle is_dm, update email)
router.put('/users/:id', (req, res) => {
    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') return res.status(400).json({ error: 'Cannot modify admin user' });

        const { is_dm, email } = req.body;
        db.prepare(`UPDATE users SET is_dm = ?, email = ? WHERE id = ?`)
            .run(is_dm ? 1 : 0, email ?? user.email, req.params.id);

        const updated = db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(req.params.id);
        res.json({ user: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Soft-delete (archive) a user
router.delete('/users/:id', (req, res) => {
    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') return res.status(400).json({ error: 'Cannot archive admin user' });

        db.prepare('UPDATE users SET is_archived = 1 WHERE id = ?').run(req.params.id);
        res.json({ message: 'User archived' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore an archived user
router.post('/users/:id/restore', (req, res) => {
    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        db.prepare('UPDATE users SET is_archived = 0 WHERE id = ?').run(req.params.id);
        res.json({ message: 'User restored' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset a user's password
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.username === 'admin') return res.status(400).json({ error: 'Cannot reset admin password here' });

        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const hash = await bcrypt.hash(password, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
