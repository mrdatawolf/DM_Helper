const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/journal/character/:characterId
 * Get all journal entries for a character
 * - Players see their own private entries + all public entries
 * - DMs see all entries
 */
router.get('/character/:characterId', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { characterId } = req.params;
        const isDM = req.user.isDM;
        const userId = req.user.userId;

        // Verify the character exists and user has access
        const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Players can only access their own characters' journals (+ public entries)
        // DMs can access all
        if (!isDM && character.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let entries;
        if (isDM) {
            // DM sees all entries for this character
            entries = db.prepare(`
                SELECT
                    je.*,
                    c.name as character_name,
                    u.username as author_username
                FROM journal_entries je
                JOIN characters c ON je.character_id = c.id
                JOIN users u ON je.user_id = u.id
                WHERE je.character_id = ?
                ORDER BY je.created_at DESC
            `).all(characterId);
        } else {
            // Players see their own entries + public entries for this character
            entries = db.prepare(`
                SELECT
                    je.*,
                    c.name as character_name,
                    u.username as author_username
                FROM journal_entries je
                JOIN characters c ON je.character_id = c.id
                JOIN users u ON je.user_id = u.id
                WHERE je.character_id = ?
                  AND (je.user_id = ? OR je.is_public = 1)
                ORDER BY je.created_at DESC
            `).all(characterId, userId);
        }

        res.json({ entries });

    } catch (error) {
        console.error('Get journal entries error:', error);
        res.status(500).json({ error: 'Failed to get journal entries' });
    }
});

/**
 * GET /api/journal/user
 * Get all journal entries for the authenticated user across all their characters
 */
router.get('/user', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.user.userId;
        const isDM = req.user.isDM;

        let entries;
        if (isDM) {
            // DM sees ALL entries from all characters
            entries = db.prepare(`
                SELECT
                    je.*,
                    c.name as character_name,
                    u.username as author_username
                FROM journal_entries je
                JOIN characters c ON je.character_id = c.id
                JOIN users u ON je.user_id = u.id
                ORDER BY je.created_at DESC
            `).all();
        } else {
            // Players see their own entries + all public entries
            entries = db.prepare(`
                SELECT
                    je.*,
                    c.name as character_name,
                    u.username as author_username
                FROM journal_entries je
                JOIN characters c ON je.character_id = c.id
                JOIN users u ON je.user_id = u.id
                WHERE je.user_id = ? OR je.is_public = 1
                ORDER BY je.created_at DESC
            `).all(userId);
        }

        res.json({ entries });

    } catch (error) {
        console.error('Get user journal entries error:', error);
        res.status(500).json({ error: 'Failed to get journal entries' });
    }
});

/**
 * POST /api/journal
 * Create a new journal entry
 */
router.post('/', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const {
            character_id,
            title,
            content,
            story_timestamp = null,
            session_id = null,
            is_public = 0
        } = req.body;

        // Validate required fields
        if (!character_id || !title || !content) {
            return res.status(400).json({ error: 'Character ID, title, and content are required' });
        }

        // Verify the character exists and user has access
        const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(character_id);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Players can only create entries for their own characters
        // DMs can create entries for any character
        if (!req.user.isDM && character.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stmt = db.prepare(`
            INSERT INTO journal_entries (
                character_id, user_id, title, content,
                story_timestamp, session_id, is_public
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            character_id,
            req.user.userId,
            title,
            content,
            story_timestamp,
            session_id,
            is_public ? 1 : 0
        );

        const newEntry = db.prepare(`
            SELECT
                je.*,
                c.name as character_name,
                u.username as author_username
            FROM journal_entries je
            JOIN characters c ON je.character_id = c.id
            JOIN users u ON je.user_id = u.id
            WHERE je.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json(newEntry);

    } catch (error) {
        console.error('Create journal entry error:', error);
        res.status(500).json({ error: 'Failed to create journal entry' });
    }
});

/**
 * PUT /api/journal/:id
 * Update a journal entry
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const {
            title,
            content,
            story_timestamp,
            session_id,
            is_public
        } = req.body;

        // Get the entry to verify ownership
        const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
        if (!entry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        // Only the author or DM can edit
        if (!req.user.isDM && entry.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
        }
        if (story_timestamp !== undefined) {
            updates.push('story_timestamp = ?');
            values.push(story_timestamp);
        }
        if (session_id !== undefined) {
            updates.push('session_id = ?');
            values.push(session_id);
        }
        if (is_public !== undefined) {
            updates.push('is_public = ?');
            values.push(is_public ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const query = `UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare(`
            SELECT
                je.*,
                c.name as character_name,
                u.username as author_username
            FROM journal_entries je
            JOIN characters c ON je.character_id = c.id
            JOIN users u ON je.user_id = u.id
            WHERE je.id = ?
        `).get(id);

        res.json(updated);

    } catch (error) {
        console.error('Update journal entry error:', error);
        res.status(500).json({ error: 'Failed to update journal entry' });
    }
});

/**
 * DELETE /api/journal/:id
 * Delete a journal entry
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;

        // Get the entry to verify ownership
        const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
        if (!entry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        // Only the author or DM can delete
        if (!req.user.isDM && entry.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);

        res.json({ message: 'Journal entry deleted successfully' });

    } catch (error) {
        console.error('Delete journal entry error:', error);
        res.status(500).json({ error: 'Failed to delete journal entry' });
    }
});

module.exports = router;
