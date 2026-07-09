const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');

// Write operations require a logged-in DM; reads stay open
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    authenticate(req, res, () => requireDM(req, res, next));
});

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const npcs = db.prepare(
            'SELECT id, name, creature_type, alignment, faction FROM npcs ORDER BY name ASC'
        ).all();
        res.json(npcs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
