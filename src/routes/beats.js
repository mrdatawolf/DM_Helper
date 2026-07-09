const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');

// Write operations require a logged-in DM; reads stay open
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    authenticate(req, res, () => requireDM(req, res, next));
});

function withAssignments(db, beat) {
    beat.assignments = db.prepare(`
        SELECT bc.chapter_id, ch.title AS chapter_title, a.title AS arc_title, a.id AS arc_id
        FROM beat_chapters bc
        JOIN chapters ch ON ch.id = bc.chapter_id
        JOIN story_arcs a ON a.id = ch.arc_id
        WHERE bc.beat_id = ?
        ORDER BY a.title ASC, ch.order_index ASC
    `).all(beat.id);
    return beat;
}

// List all beats with chapter assignments
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const beats = db.prepare('SELECT * FROM beats ORDER BY is_completed ASC, created_at DESC').all();
        res.json(beats.map(b => withAssignments(db, b)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create beat (optionally assign to a chapter immediately)
router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const { title, description, dm_notes, chapter_id } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const result = db.prepare(
            'INSERT INTO beats (title, description, dm_notes) VALUES (?, ?, ?)'
        ).run(title, description || null, dm_notes || null);

        if (chapter_id && db.prepare('SELECT id FROM chapters WHERE id = ?').get(chapter_id)) {
            db.prepare('INSERT OR IGNORE INTO beat_chapters (beat_id, chapter_id) VALUES (?, ?)')
                .run(result.lastInsertRowid, chapter_id);
        }

        const beat = db.prepare('SELECT * FROM beats WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(withAssignments(db, beat));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update beat
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const beat = db.prepare('SELECT * FROM beats WHERE id = ?').get(req.params.id);
        if (!beat) return res.status(404).json({ error: 'Beat not found' });

        const { title, description, dm_notes, is_completed } = req.body;
        const completed = is_completed ? 1 : 0;
        const completedAt = completed && !beat.is_completed
            ? 'CURRENT_TIMESTAMP'
            : beat.completed_at ? `'${beat.completed_at}'` : 'NULL';

        db.prepare(`
            UPDATE beats
            SET title = ?, description = ?, dm_notes = ?, is_completed = ?,
                completed_at = ${completedAt}
            WHERE id = ?
        `).run(
            title ?? beat.title, description ?? beat.description,
            dm_notes ?? beat.dm_notes, completed,
            req.params.id
        );
        res.json(db.prepare('SELECT * FROM beats WHERE id = ?').get(req.params.id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete beat
router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM beats WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Beat not found' });
        }
        db.prepare('DELETE FROM beats WHERE id = ?').run(req.params.id);
        res.json({ message: 'Beat deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clone beat (new unassigned, uncompleted copy)
router.post('/:id/clone', (req, res) => {
    try {
        const db = getDatabase();
        const original = db.prepare('SELECT * FROM beats WHERE id = ?').get(req.params.id);
        if (!original) return res.status(404).json({ error: 'Beat not found' });

        const result = db.prepare(
            'INSERT INTO beats (title, description, dm_notes) VALUES (?, ?, ?)'
        ).run(`${original.title} (copy)`, original.description, original.dm_notes);

        const clone = db.prepare('SELECT * FROM beats WHERE id = ?').get(result.lastInsertRowid);
        clone.assignments = [];
        res.status(201).json(clone);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assign beat to a chapter
router.post('/:id/assign', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM beats WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Beat not found' });
        }
        const { chapter_id } = req.body;
        if (!chapter_id) return res.status(400).json({ error: 'chapter_id required' });
        if (!db.prepare('SELECT id FROM chapters WHERE id = ?').get(chapter_id)) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        db.prepare('INSERT OR IGNORE INTO beat_chapters (beat_id, chapter_id) VALUES (?, ?)')
            .run(req.params.id, chapter_id);
        res.status(201).json({ message: 'Beat assigned' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unassign beat from a chapter
router.delete('/:id/chapters/:chapterId', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM beat_chapters WHERE beat_id = ? AND chapter_id = ?')
            .run(req.params.id, req.params.chapterId);
        res.json({ message: 'Beat unassigned' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
