const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

// ── Grand Narrative (must be before /:id to avoid param capture) ──

router.get('/grand-narrative', (req, res) => {
    try {
        const db = getDatabase();
        res.json(db.prepare('SELECT * FROM grand_narrative WHERE id = 1').get() || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/grand-narrative', (req, res) => {
    try {
        const db = getDatabase();
        const { title, summary, factions, dm_notes } = req.body;
        db.prepare(`
            UPDATE grand_narrative
            SET title = ?, summary = ?, factions = ?, dm_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(title || 'The Grand Narrative', summary || null, factions || null, dm_notes || null);
        res.json(db.prepare('SELECT * FROM grand_narrative WHERE id = 1').get());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Story Arcs ─────────────────────────────────────────────────

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const arcs = db.prepare(`
            SELECT
                a.*,
                c.name AS character_name,
                COUNT(DISTINCT ch.id)                                    AS chapter_total,
                SUM(CASE WHEN ch.status = 'completed' THEN 1 ELSE 0 END) AS chapter_done
            FROM story_arcs a
            LEFT JOIN characters c  ON c.id  = a.character_id
            LEFT JOIN chapters   ch ON ch.arc_id = a.id
            GROUP BY a.id
            ORDER BY c.name ASC NULLS LAST, a.order_index ASC, a.created_at ASC
        `).all();

        for (const arc of arcs) {
            arc.chapters = db.prepare(
                'SELECT id, title, status FROM chapters WHERE arc_id = ? ORDER BY order_index ASC, id ASC'
            ).all(arc.id);
        }

        res.json(arcs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const { character_id, title, theme, description, status = 'planned', dm_notes } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const maxOrder = db.prepare(
            'SELECT COALESCE(MAX(order_index), -1) AS m FROM story_arcs WHERE character_id IS ?'
        ).get(character_id || null).m;

        const result = db.prepare(`
            INSERT INTO story_arcs (character_id, title, theme, description, status, dm_notes, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(character_id || null, title, theme || null, description || null, status, dm_notes || null, maxOrder + 1);

        const arc = db.prepare(`
            SELECT a.*, c.name AS character_name
            FROM story_arcs a LEFT JOIN characters c ON c.id = a.character_id
            WHERE a.id = ?
        `).get(result.lastInsertRowid);
        arc.chapters = [];

        res.status(201).json(arc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const arc = db.prepare(`
            SELECT a.*, c.name AS character_name
            FROM story_arcs a LEFT JOIN characters c ON c.id = a.character_id
            WHERE a.id = ?
        `).get(req.params.id);
        if (!arc) return res.status(404).json({ error: 'Arc not found' });

        const chapters = db.prepare(
            'SELECT * FROM chapters WHERE arc_id = ? ORDER BY order_index ASC, id ASC'
        ).all(arc.id);

        for (const ch of chapters) {
            ch.beats = db.prepare(`
                SELECT b.* FROM beats b
                JOIN beat_chapters bc ON bc.beat_id = b.id
                WHERE bc.chapter_id = ?
                ORDER BY b.created_at ASC
            `).all(ch.id);
        }

        res.json({ ...arc, chapters });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM story_arcs WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Arc not found' });
        }
        const { character_id, title, theme, description, status, dm_notes, order_index } = req.body;
        db.prepare(`
            UPDATE story_arcs
            SET character_id = ?, title = ?, theme = ?, description = ?, status = ?, dm_notes = ?,
                order_index  = COALESCE(?, order_index),
                updated_at   = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            character_id || null, title, theme ?? null, description || null,
            status, dm_notes || null, order_index ?? null,
            req.params.id
        );
        const arc = db.prepare(`
            SELECT a.*, c.name AS character_name
            FROM story_arcs a LEFT JOIN characters c ON c.id = a.character_id
            WHERE a.id = ?
        `).get(req.params.id);
        res.json(arc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM story_arcs WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Arc not found' });
        }
        db.prepare('DELETE FROM story_arcs WHERE id = ?').run(req.params.id);
        res.json({ message: 'Arc deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Chapters ───────────────────────────────────────────────────

router.post('/:id/chapters', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM story_arcs WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Arc not found' });
        }
        const { title, description, dm_notes, status = 'planned' } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const maxOrder = db.prepare(
            'SELECT COALESCE(MAX(order_index), -1) AS m FROM chapters WHERE arc_id = ?'
        ).get(req.params.id).m;

        const result = db.prepare(`
            INSERT INTO chapters (arc_id, title, description, dm_notes, status, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.params.id, title, description || null, dm_notes || null, status, maxOrder + 1);

        res.status(201).json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(result.lastInsertRowid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/chapters/:cid', (req, res) => {
    try {
        const db = getDatabase();
        const ch = db.prepare('SELECT * FROM chapters WHERE id = ? AND arc_id = ?')
            .get(req.params.cid, req.params.id);
        if (!ch) return res.status(404).json({ error: 'Chapter not found' });

        const { title, description, dm_notes, status, order_index } = req.body;
        db.prepare(`
            UPDATE chapters
            SET title = ?, description = ?, dm_notes = ?, status = ?,
                order_index = COALESCE(?, order_index)
            WHERE id = ?
        `).run(
            title ?? ch.title, description ?? ch.description,
            dm_notes ?? ch.dm_notes, status ?? ch.status,
            order_index ?? null, req.params.cid
        );
        res.json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.cid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/chapters/:cid', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM chapters WHERE id = ? AND arc_id = ?').get(req.params.cid, req.params.id)) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.cid);
        res.json({ message: 'Chapter deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
