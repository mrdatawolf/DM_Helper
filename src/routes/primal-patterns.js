const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

// Write operations require a logged-in DM; reads stay open
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    authenticate(req, res, () => requireDM(req, res, next));
});

// ── Routes with literal path prefixes must come before /:id ──

// GET lore unlocked for a specific character (used by player dashboard)
router.get('/character/:characterId', asyncHandler((req, res) => {
    const db = getDatabase();
    const sections = db.prepare(`
        SELECT pps.id, pps.section_key, pps.title, pps.player_content,
               pps.section_order,
               pp.name as pattern_name, pp.spirit_animal, pp.spirit_animal_role,
               pp.display_order as pattern_order,
               cpl.granted_at
        FROM character_pattern_lore cpl
        JOIN primal_pattern_sections pps ON pps.id = cpl.section_id
        JOIN primal_patterns pp ON pp.id = pps.pattern_id
        WHERE cpl.character_id = ?
        ORDER BY pp.display_order ASC, pps.section_order ASC
    `).all(req.params.characterId);
    res.json(sections);
}));

// POST grant section access to characters
router.post('/sections/:sid/grant', asyncHandler((req, res) => {
    const db = getDatabase();
    const section = db.prepare('SELECT id FROM primal_pattern_sections WHERE id = ?').get(req.params.sid);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const { character_ids } = req.body;
    if (!Array.isArray(character_ids) || character_ids.length === 0) {
        return res.status(400).json({ error: 'character_ids array is required' });
    }

    const insert = db.prepare(
        'INSERT OR IGNORE INTO character_pattern_lore (character_id, section_id) VALUES (?, ?)'
    );
    const grantAll = db.transaction((ids) => {
        for (const cid of ids) insert.run(cid, req.params.sid);
    });
    grantAll(character_ids);

    res.json({ message: `Section granted to ${character_ids.length} character(s)` });
}));

// DELETE revoke section access from one character
router.delete('/sections/:sid/revoke/:characterId', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(
        'DELETE FROM character_pattern_lore WHERE section_id = ? AND character_id = ?'
    ).run(req.params.sid, req.params.characterId);
    if (result.changes === 0) return res.status(404).json({ error: 'Grant not found' });
    res.json({ message: 'Lore access revoked' });
}));

// GET all patterns with full sections, grouped by category (DM lore view)
router.get('/lore', asyncHandler((req, res) => {
    const db = getDatabase();
    const patterns = db.prepare(`
        SELECT * FROM primal_patterns ORDER BY display_order ASC, id ASC
    `).all();
    const getSections = db.prepare(`
        SELECT * FROM primal_pattern_sections WHERE pattern_id = ? ORDER BY section_order ASC
    `);
    const result = patterns.map(p => ({ ...p, sections: getSections.all(p.id) }));
    res.json(result);
}));

// ── Standard CRUD ──

// GET all patterns (with section count)
router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const patterns = db.prepare(`
        SELECT pp.*, COUNT(pps.id) as section_count
        FROM primal_patterns pp
        LEFT JOIN primal_pattern_sections pps ON pps.pattern_id = pp.id
        GROUP BY pp.id
        ORDER BY pp.display_order ASC, pp.id ASC
    `).all();
    res.json(patterns);
}));

// POST create pattern
router.post('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const {
        name, also_known_as, origin_figure,
        spirit_animal, spirit_animal_role = 'unknown', display_order = 0,
        category = 'Pattern'
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = db.prepare(`
        INSERT INTO primal_patterns (name, also_known_as, origin_figure, spirit_animal, spirit_animal_role, display_order, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, also_known_as || null, origin_figure || null,
           spirit_animal || null, spirit_animal_role, display_order, category);

    const created = db.prepare('SELECT * FROM primal_patterns WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
}));

// GET single pattern with sections and grant info
router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const pattern = db.prepare('SELECT * FROM primal_patterns WHERE id = ?').get(req.params.id);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    const sections = db.prepare(`
        SELECT * FROM primal_pattern_sections WHERE pattern_id = ? ORDER BY section_order ASC
    `).all(req.params.id);

    const getGrants = db.prepare(`
        SELECT cpl.character_id, c.name as character_name
        FROM character_pattern_lore cpl
        JOIN characters c ON c.id = cpl.character_id
        WHERE cpl.section_id = ?
    `);

    const sectionsWithGrants = sections.map(s => ({
        ...s,
        grants: getGrants.all(s.id)
    }));

    res.json({ ...pattern, sections: sectionsWithGrants });
}));

// PUT update pattern meta
router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM primal_patterns WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Pattern not found' });

    const allowed = ['name', 'also_known_as', 'origin_figure', 'spirit_animal', 'spirit_animal_role', 'display_order', 'category'];
    const query = buildUpdateQuery('primal_patterns', allowed, req.body, req.params.id);
    if (!query) return res.status(400).json({ error: 'No fields to update' });

    db.prepare(query.sql).run(...query.values);
    const updated = db.prepare('SELECT * FROM primal_patterns WHERE id = ?').get(req.params.id);
    res.json(updated);
}));

// DELETE pattern (cascades to sections and grants)
router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM primal_patterns WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Pattern not found' });
    res.json({ message: 'Pattern deleted' });
}));

// POST add section to pattern
router.post('/:id/sections', asyncHandler((req, res) => {
    const db = getDatabase();
    const pattern = db.prepare('SELECT id FROM primal_patterns WHERE id = ?').get(req.params.id);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    const { section_key, title, content, player_content, section_order = 0 } = req.body;
    if (!section_key || !title) return res.status(400).json({ error: 'section_key and title are required' });

    const result = db.prepare(`
        INSERT INTO primal_pattern_sections (pattern_id, section_key, title, content, player_content, section_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, section_key, title, content || null, player_content || null, section_order);

    const created = db.prepare('SELECT * FROM primal_pattern_sections WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
}));

// PUT update section
router.put('/:id/sections/:sid', asyncHandler((req, res) => {
    const db = getDatabase();
    const section = db.prepare(
        'SELECT id FROM primal_pattern_sections WHERE id = ? AND pattern_id = ?'
    ).get(req.params.sid, req.params.id);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const allowed = ['section_key', 'title', 'content', 'player_content', 'section_order'];
    const query = buildUpdateQuery('primal_pattern_sections', allowed, req.body, req.params.sid);
    if (!query) return res.status(400).json({ error: 'No fields to update' });

    db.prepare(query.sql).run(...query.values);
    const updated = db.prepare('SELECT * FROM primal_pattern_sections WHERE id = ?').get(req.params.sid);
    res.json(updated);
}));

// DELETE section
router.delete('/:id/sections/:sid', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(
        'DELETE FROM primal_pattern_sections WHERE id = ? AND pattern_id = ?'
    ).run(req.params.sid, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Section not found' });
    res.json({ message: 'Section deleted' });
}));

module.exports = router;
