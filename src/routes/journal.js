const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/journal/character/:characterId
 * Get all journal entries for a character
 * - Players see their own private entries + all public entries
 * - DMs see all entries
 */
router.use(authenticate, requireCampaignMembership);

function sessionBelongsToCampaign(db, sessionId, campaignId) {
    return sessionId == null || Boolean(db.prepare(
        'SELECT 1 FROM campaign_sessions WHERE id = ? AND campaign_id = ?'
    ).get(sessionId, campaignId));
}

router.get('/character/:characterId', asyncHandler((req, res, next) => {
    try {
        const db = getDatabase();
        const { characterId } = req.params;
        const isDM = req.campaign.role === 'dm';
        const userId = req.user.userId;

        // Verify the character exists and user has access
        const character = db.prepare(`
            SELECT c.* FROM characters c
            JOIN campaign_characters cc ON cc.character_id = c.id
            WHERE c.id = ? AND cc.campaign_id = ?
        `).get(characterId, req.campaign.id);
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
                WHERE je.character_id = ? AND je.campaign_id = ?
                ORDER BY je.created_at DESC
            `).all(characterId, req.campaign.id);
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
                WHERE je.character_id = ? AND je.campaign_id = ?
                  AND (je.user_id = ? OR je.is_public = 1)
                ORDER BY je.created_at DESC
            `).all(characterId, req.campaign.id, userId);
        }

        res.json({ entries });

    } catch (error) {
        console.error('Get journal entries error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to get journal entries' }));
    }
}));

/**
 * GET /api/journal/user
 * Get all journal entries for the authenticated user across all their characters
 */
router.get('/user', asyncHandler((req, res, next) => {
    try {
        const db = getDatabase();
        const userId = req.user.userId;
        const isDM = req.campaign.role === 'dm';

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
                WHERE je.campaign_id = ?
                ORDER BY je.created_at DESC
            `).all(req.campaign.id);
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
                WHERE je.campaign_id = ? AND (je.user_id = ? OR je.is_public = 1)
                ORDER BY je.created_at DESC
            `).all(req.campaign.id, userId);
        }

        res.json({ entries });

    } catch (error) {
        console.error('Get user journal entries error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to get journal entries' }));
    }
}));

/**
 * POST /api/journal
 * Create a new journal entry
 */
router.post('/', asyncHandler((req, res, next) => {
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
        const character = db.prepare(`
            SELECT c.* FROM characters c
            JOIN campaign_characters cc ON cc.character_id = c.id
            WHERE c.id = ? AND cc.campaign_id = ?
        `).get(character_id, req.campaign.id);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        // Players can only create entries for their own characters
        // DMs can create entries for any character
        if (req.campaign.role !== 'dm' && character.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!sessionBelongsToCampaign(db, session_id, req.campaign.id)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO journal_entries (
                character_id, user_id, title, content,
                story_timestamp, session_id, is_public, campaign_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            character_id,
            req.user.userId,
            title,
            content,
            story_timestamp,
            session_id,
            is_public ? 1 : 0,
            req.campaign.id
        );

        const newEntry = db.prepare(`
            SELECT
                je.*,
                c.name as character_name,
                u.username as author_username
            FROM journal_entries je
            JOIN characters c ON je.character_id = c.id
            JOIN users u ON je.user_id = u.id
            WHERE je.id = ? AND je.campaign_id = ?
        `).get(result.lastInsertRowid, req.campaign.id);

        res.status(201).json(newEntry);

    } catch (error) {
        console.error('Create journal entry error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to create journal entry' }));
    }
}));

/**
 * PUT /api/journal/:id
 * Update a journal entry
 */
router.put('/:id', asyncHandler((req, res, next) => {
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
        const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND campaign_id = ?')
            .get(id, req.campaign.id);
        if (!entry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        // Only the author or DM can edit
        if (req.campaign.role !== 'dm' && entry.user_id !== req.user.userId) {
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
        if (session_id !== undefined && !sessionBelongsToCampaign(db, session_id, req.campaign.id)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id, req.campaign.id);

        const query = `UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ? AND campaign_id = ?`;
        db.prepare(query).run(...values);

        const updated = db.prepare(`
            SELECT
                je.*,
                c.name as character_name,
                u.username as author_username
            FROM journal_entries je
            JOIN characters c ON je.character_id = c.id
            JOIN users u ON je.user_id = u.id
            WHERE je.id = ? AND je.campaign_id = ?
        `).get(id, req.campaign.id);

        res.json(updated);

    } catch (error) {
        console.error('Update journal entry error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to update journal entry' }));
    }
}));

/**
 * DELETE /api/journal/:id
 * Delete a journal entry
 */
router.delete('/:id', asyncHandler((req, res, next) => {
    try {
        const db = getDatabase();
        const { id } = req.params;

        // Get the entry to verify ownership
        const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND campaign_id = ?')
            .get(id, req.campaign.id);
        if (!entry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        // Only the author or DM can delete
        if (req.campaign.role !== 'dm' && entry.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        db.prepare('DELETE FROM journal_entries WHERE id = ? AND campaign_id = ?')
            .run(id, req.campaign.id);

        res.json({ message: 'Journal entry deleted successfully' });

    } catch (error) {
        console.error('Delete journal entry error:', error);
        next(Object.assign(error, { clientMessage: 'Failed to delete journal entry' }));
    }
}));

module.exports = router;
