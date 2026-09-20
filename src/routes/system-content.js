const express = require('express');
const { authenticate, requireCampaignMembership } = require('../middleware/auth');
const { getSystemForCampaign } = require('../systems/registry');
const { getDatabase } = require('../database/connection');

const router = express.Router();
router.use(authenticate, requireCampaignMembership);

router.get('/wizard', (req, res) => {
    const system = getSystemForCampaign(getDatabase(), req.campaign.id);
    if (!system?.content?.wizard) {
        return res.status(404).json({ error: 'No system wizard content is available for this campaign' });
    }
    res.json(system.content.wizard);
});

module.exports = router;
