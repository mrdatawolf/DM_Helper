const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

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
