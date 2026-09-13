const express = require('express');
const { getDatabase } = require('../../database/connection');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { canModifyCharacter } = require('./shared');
const { getSystemForCampaign } = require('../../systems/registry');
const { hydrateCharacterForCampaign } = require('../../universes/registry');

const router = express.Router();
const STORY_MAX_LENGTH = 20000;

function authorizeCharacter(req, res, next) {
    const character = getDatabase().prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    if (!canModifyCharacter(req.user, character)) {
        return res.status(403).json({ error: 'You do not have permission to modify this character' });
    }
    req.character = character;
    next();
}

router.put('/:id/story', authenticate, authorizeCharacter, asyncHandler((req, res) => {
    const { story } = req.body;
    if (typeof story !== 'string') {
        return res.status(400).json({ error: 'Story must be a string' });
    }
    if (story.length > STORY_MAX_LENGTH) {
        return res.status(400).json({ error: `Story must be ${STORY_MAX_LENGTH.toLocaleString()} characters or fewer` });
    }

    const db = getDatabase();
    db.prepare('UPDATE characters SET character_story = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(story, req.params.id);
    const system = getSystemForCampaign(db, req.campaign.id);
    res.json(hydrateCharacterForCampaign(db, req.campaign.id,
        system.sheet.hydrateSheet(db, db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id), system)));
}));

module.exports = router;
