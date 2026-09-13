const express = require('express');
const fs = require('fs');
const { authenticate, requireCampaignMembership } = require('../middleware/auth');
const { getUniverseForCampaign } = require('../universes/registry');
const { getDatabase } = require('../database/connection');

const router = express.Router();
router.use(authenticate, requireCampaignMembership);

function activeUniverse(req, res) {
    const universe = getUniverseForCampaign(getDatabase(), req.campaign.id);
    if (!universe?.content) {
        res.status(404).json({ error: 'No universe content is available for this campaign' });
        return null;
    }
    return universe;
}

router.get('/guide', (req, res) => {
    const universe = activeUniverse(req, res);
    if (universe) res.type('text/markdown').send(fs.readFileSync(universe.content.guidePath, 'utf8'));
});

router.get('/wizard', (req, res) => {
    const universe = activeUniverse(req, res);
    if (universe) res.json(universe.content.wizard);
});

module.exports = router;
