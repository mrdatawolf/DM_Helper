const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireCampaignMembership, requireCampaignRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildUpdateQuery } = require('../utils/buildUpdateQuery');

router.use(authenticate, requireCampaignMembership);

// Writes require the live DM role; campaign members may read sessions.
router.use((req, res, next) => {
    if (req.method === 'GET') return next();
    requireCampaignRole('dm')(req, res, next);
});

function fetchSession(db, campaignId, id) {
    return db.prepare('SELECT * FROM campaign_sessions WHERE id = ? AND campaign_id = ?')
        .get(id, campaignId);
}

function sessionAndResourceExist(db, campaignId, sessionId, table, idColumn, resourceId) {
    return !!db.prepare(`
        SELECT 1 FROM campaign_sessions cs, ${table} resource
        WHERE cs.id = ? AND cs.campaign_id = ?
          AND resource.${idColumn} = ? AND resource.campaign_id = ?
    `).get(sessionId, campaignId, resourceId, campaignId);
}

function attachSessionChapters(db, campaignId, sessions) {
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
          AND sc.campaign_id = ? AND ch.campaign_id = ? AND a.campaign_id = ?
        ORDER BY c.name ASC NULLS LAST, a.title ASC, ch.order_index ASC
    `).all(...ids, campaignId, campaignId, campaignId);
    const map = {};
    for (const r of rows) {
        if (!map[r.session_id]) map[r.session_id] = [];
        map[r.session_id].push(r);
    }
    for (const s of sessions) s.session_chapters = map[s.id] || [];
}

// ── List all sessions ────────────────────────────────────────────────────────

router.get('/', asyncHandler((req, res) => {
    const db = getDatabase();
    const rows = db.prepare(
        'SELECT * FROM campaign_sessions WHERE campaign_id = ? ORDER BY session_number DESC'
    ).all(req.campaign.id);

    for (const s of rows) {
        s.session_characters = db.prepare(`
            SELECT sc.attendance, c.id, c.name AS character_name, c.player_name
            FROM session_characters sc
            JOIN characters c ON c.id = sc.character_id
            JOIN campaign_characters cc ON cc.character_id = c.id
            WHERE sc.session_id = ? AND sc.campaign_id = ? AND cc.campaign_id = ?
        `).all(s.id, req.campaign.id, req.campaign.id);
    }
    attachSessionChapters(db, req.campaign.id, rows);

    res.json(rows);
}));

// ── Single session with full detail ─────────────────────────────────────────

router.get('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const session = fetchSession(db, req.campaign.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.character_progress = db.prepare(`
        SELECT cp.*, c.name AS character_name, s.name AS shadow_name
        FROM character_progress cp
        JOIN characters c ON cp.character_id = c.id
        JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = cp.campaign_id
        LEFT JOIN shadows s ON cp.shadow_id = s.id AND s.campaign_id = cp.campaign_id
        WHERE cp.session_id = ? AND cp.campaign_id = ?
    `).all(req.params.id, req.campaign.id);

    session.session_characters = db.prepare(`
        SELECT sc.attendance, c.id, c.name AS character_name, c.player_name
        FROM session_characters sc
        JOIN characters c ON c.id = sc.character_id
        JOIN campaign_characters cc ON cc.character_id = c.id
        WHERE sc.session_id = ? AND sc.campaign_id = ? AND cc.campaign_id = ?
    `).all(req.params.id, req.campaign.id, req.campaign.id);

    session.beats = db.prepare(`
        SELECT b.* FROM beats b
        JOIN session_beats sb ON sb.beat_id = b.id
        WHERE sb.session_id = ? AND sb.campaign_id = ? AND b.campaign_id = ?
    `).all(req.params.id, req.campaign.id, req.campaign.id);

    session.npcs = db.prepare(`
        SELECT n.id, n.name, n.creature_type, sn.context
        FROM npcs n
        JOIN session_npcs sn ON sn.npc_id = n.id
        WHERE sn.session_id = ? AND sn.campaign_id = ? AND n.campaign_id = ?
    `).all(req.params.id, req.campaign.id, req.campaign.id);

    attachSessionChapters(db, req.campaign.id, [session]);

    res.json(session);
}));

// ── Create session ───────────────────────────────────────────────────────────

router.post('/', asyncHandler((req, res) => {
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
             session_status, opening_notes, mid_notes, closing_notes, campaign_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        session_number, session_date, session_title, dm_notes,
        session_status, opening_notes, mid_notes, closing_notes, req.campaign.id
    );

    const sid = result.lastInsertRowid;
    const charIds = Array.isArray(character_ids) ? character_ids : [];
    for (const cid of charIds) {
        db.prepare(`
            INSERT OR IGNORE INTO session_characters (session_id, character_id, campaign_id)
            SELECT ?, cc.character_id, ? FROM campaign_characters cc
            WHERE cc.character_id = ? AND cc.campaign_id = ?
        `).run(sid, req.campaign.id, cid, req.campaign.id);
    }
    const chapIds = Array.isArray(chapter_ids) ? chapter_ids : [];
    for (const cid of chapIds) {
        db.prepare(`
            INSERT OR IGNORE INTO session_chapters (session_id, chapter_id, campaign_id)
            SELECT ?, ch.id, ? FROM chapters ch WHERE ch.id = ? AND ch.campaign_id = ?
        `).run(sid, req.campaign.id, cid, req.campaign.id);
    }

    const s = fetchSession(db, req.campaign.id, sid);
    attachSessionChapters(db, req.campaign.id, [s]);
    res.status(201).json(s);
}));

// ── Update session ───────────────────────────────────────────────────────────

router.put('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    if (!fetchSession(db, req.campaign.id, req.params.id)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const allowed = [
        'session_number','session_date','session_title','dm_notes',
        'session_status','opening_notes','mid_notes','closing_notes'
    ];
    const query = buildUpdateQuery('campaign_sessions', allowed, req.body, req.params.id);
    if (!query) return res.status(400).json({ error: 'No valid fields to update' });

    db.prepare(query.sql.replace('WHERE id = ?', 'WHERE id = ? AND campaign_id = ?'))
        .run(...query.values, req.campaign.id);

    res.json(fetchSession(db, req.campaign.id, req.params.id));
}));

// ── Delete session ───────────────────────────────────────────────────────────

router.delete('/:id', asyncHandler((req, res) => {
    const db = getDatabase();
    const r = db.prepare('DELETE FROM campaign_sessions WHERE id = ? AND campaign_id = ?')
        .run(req.params.id, req.campaign.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'Session deleted successfully' });
}));

// ── Character attendance ─────────────────────────────────────────────────────

router.post('/:id/characters', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, attendance = 'expected' } = req.body;
    if (!character_id) return res.status(400).json({ error: 'character_id required' });
    if (!sessionAndResourceExist(db, req.campaign.id, req.params.id,
        'campaign_characters', 'character_id', character_id)) {
        return res.status(404).json({ error: 'Session or character not found' });
    }
    db.prepare(`
        INSERT OR REPLACE INTO session_characters
            (session_id, character_id, attendance, campaign_id)
        SELECT cs.id, cc.character_id, ?, ?
        FROM campaign_sessions cs, campaign_characters cc
        WHERE cs.id = ? AND cs.campaign_id = ?
          AND cc.character_id = ? AND cc.campaign_id = ?
    `).run(attendance, req.campaign.id, req.params.id, req.campaign.id,
        character_id, req.campaign.id);
    res.status(201).json({ session_id: +req.params.id, character_id: +character_id, attendance });
}));

router.put('/:id/characters/:cid', asyncHandler((req, res) => {
    const db = getDatabase();
    const { attendance } = req.body;
    const result = db.prepare(`UPDATE session_characters SET attendance = ?
        WHERE session_id = ? AND character_id = ? AND campaign_id = ?`)
        .run(attendance, req.params.id, req.params.cid, req.campaign.id);
    if (!result.changes) return res.status(404).json({ error: 'Session character not found' });
    res.json({ session_id: +req.params.id, character_id: +req.params.cid, attendance });
}));

router.delete('/:id/characters/:cid', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM session_characters
        WHERE session_id = ? AND character_id = ? AND campaign_id = ?`)
        .run(req.params.id, req.params.cid, req.campaign.id);
    if (!result.changes) return res.status(404).json({ error: 'Session character not found' });
    res.json({ message: 'Character removed' });
}));

// ── Beats ────────────────────────────────────────────────────────────────────

router.post('/:id/beats', asyncHandler((req, res) => {
    const db = getDatabase();
    const { beat_id } = req.body;
    if (!beat_id) return res.status(400).json({ error: 'beat_id required' });
    if (!sessionAndResourceExist(db, req.campaign.id, req.params.id, 'beats', 'id', beat_id)) {
        return res.status(404).json({ error: 'Session or beat not found' });
    }
    db.prepare(`
        INSERT OR IGNORE INTO session_beats (session_id, beat_id, campaign_id)
        SELECT cs.id, b.id, ? FROM campaign_sessions cs, beats b
        WHERE cs.id = ? AND cs.campaign_id = ? AND b.id = ? AND b.campaign_id = ?
    `).run(req.campaign.id, req.params.id, req.campaign.id, beat_id, req.campaign.id);
    res.status(201).json({ session_id: +req.params.id, beat_id: +beat_id });
}));

router.delete('/:id/beats/:bid', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM session_beats
        WHERE session_id = ? AND beat_id = ? AND campaign_id = ?`)
        .run(req.params.id, req.params.bid, req.campaign.id);
    if (!result.changes) return res.status(404).json({ error: 'Session beat not found' });
    res.json({ message: 'Beat removed' });
}));

// ── Chapters (crossover links) ───────────────────────────────────────────────

router.post('/:id/chapters', asyncHandler((req, res) => {
    const db = getDatabase();
    const { chapter_id } = req.body;
    if (!chapter_id) return res.status(400).json({ error: 'chapter_id required' });
    if (!sessionAndResourceExist(db, req.campaign.id, req.params.id, 'chapters', 'id', chapter_id)) {
        return res.status(404).json({ error: 'Session or chapter not found' });
    }
    db.prepare(`
        INSERT OR IGNORE INTO session_chapters (session_id, chapter_id, campaign_id)
        SELECT cs.id, ch.id, ? FROM campaign_sessions cs, chapters ch
        WHERE cs.id = ? AND cs.campaign_id = ? AND ch.id = ? AND ch.campaign_id = ?
    `).run(req.campaign.id, req.params.id, req.campaign.id, chapter_id, req.campaign.id);
    res.status(201).json({ session_id: +req.params.id, chapter_id: +chapter_id });
}));

router.delete('/:id/chapters/:cid', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM session_chapters
        WHERE session_id = ? AND chapter_id = ? AND campaign_id = ?`)
        .run(req.params.id, req.params.cid, req.campaign.id);
    if (!result.changes) return res.status(404).json({ error: 'Session chapter not found' });
    res.json({ message: 'Chapter unlinked' });
}));

// ── NPCs ─────────────────────────────────────────────────────────────────────

router.post('/:id/npcs', asyncHandler((req, res) => {
    const db = getDatabase();
    const { npc_id, context = '' } = req.body;
    if (!npc_id) return res.status(400).json({ error: 'npc_id required' });
    if (!sessionAndResourceExist(db, req.campaign.id, req.params.id, 'npcs', 'id', npc_id)) {
        return res.status(404).json({ error: 'Session or NPC not found' });
    }
    db.prepare(`
        INSERT OR REPLACE INTO session_npcs (session_id, npc_id, context, campaign_id)
        SELECT cs.id, n.id, ?, ? FROM campaign_sessions cs, npcs n
        WHERE cs.id = ? AND cs.campaign_id = ? AND n.id = ? AND n.campaign_id = ?
    `).run(context, req.campaign.id, req.params.id, req.campaign.id, npc_id, req.campaign.id);
    res.status(201).json({ session_id: +req.params.id, npc_id: +npc_id, context });
}));

router.delete('/:id/npcs/:nid', asyncHandler((req, res) => {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM session_npcs
        WHERE session_id = ? AND npc_id = ? AND campaign_id = ?`)
        .run(req.params.id, req.params.nid, req.campaign.id);
    if (!result.changes) return res.status(404).json({ error: 'Session NPC not found' });
    res.json({ message: 'NPC removed' });
}));

module.exports = router;
