const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');

function fetchSession(db, id) {
    return db.prepare('SELECT * FROM campaign_sessions WHERE id = ?').get(id);
}

function attachSessionChapters(db, sessions) {
    const ids = sessions.map(s => s.id);
    if (!ids.length) return;
    const rows = db.prepare(`
        SELECT sc.session_id,
               ch.id AS chapter_id, ch.title AS chapter_title,
               a.title  AS arc_title,
               c.name   AS character_name
        FROM session_chapters sc
        JOIN chapters    ch ON ch.id = sc.chapter_id
        JOIN story_arcs  a  ON a.id  = ch.arc_id
        LEFT JOIN characters c ON c.id = a.character_id
        WHERE sc.session_id IN (${ids.map(() => '?').join(',')})
        ORDER BY c.name ASC NULLS LAST, a.title ASC, ch.order_index ASC
    `).all(...ids);
    const map = {};
    for (const r of rows) {
        if (!map[r.session_id]) map[r.session_id] = [];
        map[r.session_id].push(r);
    }
    for (const s of sessions) s.session_chapters = map[s.id] || [];
}

// ── List all sessions ────────────────────────────────────────────────────────

router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const rows = db.prepare(
            'SELECT * FROM campaign_sessions ORDER BY session_number DESC'
        ).all();

        for (const s of rows) {
            s.session_characters = db.prepare(`
                SELECT sc.attendance, c.id, c.name AS character_name, c.player_name
                FROM session_characters sc
                JOIN characters c ON c.id = sc.character_id
                WHERE sc.session_id = ?
            `).all(s.id);
        }
        attachSessionChapters(db, rows);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Single session with full detail ─────────────────────────────────────────

router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const session = fetchSession(db, req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.character_progress = db.prepare(`
            SELECT cp.*, c.name AS character_name, s.name AS shadow_name
            FROM character_progress cp
            JOIN characters c ON cp.character_id = c.id
            LEFT JOIN shadows s ON cp.shadow_id = s.id
            WHERE cp.session_id = ?
        `).all(req.params.id);

        session.session_characters = db.prepare(`
            SELECT sc.attendance, c.id, c.name AS character_name, c.player_name
            FROM session_characters sc
            JOIN characters c ON c.id = sc.character_id
            WHERE sc.session_id = ?
        `).all(req.params.id);

        session.beats = db.prepare(`
            SELECT b.* FROM beats b
            JOIN session_beats sb ON sb.beat_id = b.id
            WHERE sb.session_id = ?
        `).all(req.params.id);

        session.npcs = db.prepare(`
            SELECT n.id, n.name, n.creature_type, sn.context
            FROM npcs n
            JOIN session_npcs sn ON sn.npc_id = n.id
            WHERE sn.session_id = ?
        `).all(req.params.id);

        attachSessionChapters(db, [session]);

        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Create session ───────────────────────────────────────────────────────────

router.post('/', (req, res) => {
    try {
        const db = getDatabase();
        const {
            session_number, session_date,
            session_title  = '',
            dm_notes       = '',
            session_status = 'planned',
            opening_notes  = '',
            mid_notes      = '',
            closing_notes  = '',
            character_ids  = [],
            chapter_ids    = []
        } = req.body;

        if (!session_number || !session_date) {
            return res.status(400).json({ error: 'Session number and date are required' });
        }

        const result = db.prepare(`
            INSERT INTO campaign_sessions
                (session_number, session_date, session_title, dm_notes,
                 session_status, opening_notes, mid_notes, closing_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            session_number, session_date, session_title, dm_notes,
            session_status, opening_notes, mid_notes, closing_notes
        );

        const sid = result.lastInsertRowid;
        const charIds = Array.isArray(character_ids) ? character_ids : [];
        for (const cid of charIds) {
            db.prepare('INSERT OR IGNORE INTO session_characters (session_id, character_id) VALUES (?, ?)').run(sid, cid);
        }
        const chapIds = Array.isArray(chapter_ids) ? chapter_ids : [];
        for (const cid of chapIds) {
            db.prepare('INSERT OR IGNORE INTO session_chapters (session_id, chapter_id) VALUES (?, ?)').run(sid, cid);
        }

        const s = fetchSession(db, sid);
        attachSessionChapters(db, [s]);
        res.status(201).json(s);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Update session ───────────────────────────────────────────────────────────

router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        if (!db.prepare('SELECT id FROM campaign_sessions WHERE id = ?').get(req.params.id)) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const allowed = [
            'session_number','session_date','session_title','dm_notes',
            'session_status','opening_notes','mid_notes','closing_notes'
        ];
        const sets = [], vals = [];
        for (const f of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, f)) {
                sets.push(`${f} = ?`);
                vals.push(req.body[f] ?? null);
            }
        }
        if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        sets.push('updated_at = CURRENT_TIMESTAMP');
        vals.push(req.params.id);
        db.prepare(`UPDATE campaign_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

        res.json(fetchSession(db, req.params.id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Delete session ───────────────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const r = db.prepare('DELETE FROM campaign_sessions WHERE id = ?').run(req.params.id);
        if (r.changes === 0) return res.status(404).json({ error: 'Session not found' });
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Character attendance ─────────────────────────────────────────────────────

router.post('/:id/characters', (req, res) => {
    try {
        const db = getDatabase();
        const { character_id, attendance = 'expected' } = req.body;
        if (!character_id) return res.status(400).json({ error: 'character_id required' });
        db.prepare('INSERT OR REPLACE INTO session_characters (session_id, character_id, attendance) VALUES (?, ?, ?)')
            .run(req.params.id, character_id, attendance);
        res.status(201).json({ session_id: +req.params.id, character_id: +character_id, attendance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/characters/:cid', (req, res) => {
    try {
        const db = getDatabase();
        const { attendance } = req.body;
        db.prepare('UPDATE session_characters SET attendance = ? WHERE session_id = ? AND character_id = ?')
            .run(attendance, req.params.id, req.params.cid);
        res.json({ session_id: +req.params.id, character_id: +req.params.cid, attendance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/characters/:cid', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM session_characters WHERE session_id = ? AND character_id = ?')
            .run(req.params.id, req.params.cid);
        res.json({ message: 'Character removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Beats ────────────────────────────────────────────────────────────────────

router.post('/:id/beats', (req, res) => {
    try {
        const db = getDatabase();
        const { beat_id } = req.body;
        if (!beat_id) return res.status(400).json({ error: 'beat_id required' });
        db.prepare('INSERT OR IGNORE INTO session_beats (session_id, beat_id) VALUES (?, ?)').run(req.params.id, beat_id);
        res.status(201).json({ session_id: +req.params.id, beat_id: +beat_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/beats/:bid', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM session_beats WHERE session_id = ? AND beat_id = ?').run(req.params.id, req.params.bid);
        res.json({ message: 'Beat removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Chapters (crossover links) ───────────────────────────────────────────────

router.post('/:id/chapters', (req, res) => {
    try {
        const db = getDatabase();
        const { chapter_id } = req.body;
        if (!chapter_id) return res.status(400).json({ error: 'chapter_id required' });
        db.prepare('INSERT OR IGNORE INTO session_chapters (session_id, chapter_id) VALUES (?, ?)').run(req.params.id, chapter_id);
        res.status(201).json({ session_id: +req.params.id, chapter_id: +chapter_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/chapters/:cid', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM session_chapters WHERE session_id = ? AND chapter_id = ?').run(req.params.id, req.params.cid);
        res.json({ message: 'Chapter unlinked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── NPCs ─────────────────────────────────────────────────────────────────────

router.post('/:id/npcs', (req, res) => {
    try {
        const db = getDatabase();
        const { npc_id, context = '' } = req.body;
        if (!npc_id) return res.status(400).json({ error: 'npc_id required' });
        db.prepare('INSERT OR REPLACE INTO session_npcs (session_id, npc_id, context) VALUES (?, ?, ?)').run(req.params.id, npc_id, context);
        res.status(201).json({ session_id: +req.params.id, npc_id: +npc_id, context });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/npcs/:nid', (req, res) => {
    try {
        const db = getDatabase();
        db.prepare('DELETE FROM session_npcs WHERE session_id = ? AND npc_id = ?').run(req.params.id, req.params.nid);
        res.json({ message: 'NPC removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
