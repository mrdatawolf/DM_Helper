const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM } = require('../middleware/auth');
const {
    isDM, visibleParent, canWriteToParent,
    recordVisible, parentIsVisibleDraftSafe,
} = require('./tracker-shared');
const { computeFamiliarPower } = require('../utils/familiars');

router.use(authenticate);

// The DM authors encounters; players run them. "Running" means advancing
// turns/rounds, adjusting HP and conditions, and closing the fight with a
// summary. Structure (combatants, initiative, visibility) stays with the DM.

function attachCombatants(db, encounters) {
    const stmt = db.prepare(`
        SELECT cb.*, c.user_id AS character_user_id
        FROM combatants cb
        LEFT JOIN characters c ON c.id = cb.character_id
        WHERE cb.encounter_id = ?
        ORDER BY cb.initiative DESC, cb.id ASC
    `);
    for (const e of encounters) {
        e.combatants = stmt.all(e.id);
    }
}

function canRun(db, user, encounter) {
    if (isDM(user)) return true;
    return canWriteToParent(db, user, { session_id: encounter.session_id, scene_id: encounter.scene_id });
}

// List encounters for a session, scene, or a character's timeline
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const { session_id, scene_id, character_id } = req.query;

        let rows;
        if (session_id) {
            rows = db.prepare('SELECT * FROM combat_encounters WHERE session_id = ? ORDER BY created_at ASC').all(session_id);
        } else if (scene_id) {
            rows = db.prepare('SELECT * FROM combat_encounters WHERE scene_id = ? ORDER BY created_at ASC').all(scene_id);
        } else if (character_id) {
            rows = db.prepare(`
                SELECT DISTINCT e.* FROM combat_encounters e
                JOIN combatants cb ON cb.encounter_id = e.id
                WHERE cb.character_id = ?
                ORDER BY e.created_at ASC
            `).all(character_id);
        } else {
            return res.status(400).json({ error: 'session_id, scene_id, or character_id is required' });
        }

        rows = rows.filter(e =>
            parentIsVisibleDraftSafe(db, req.user, e) && recordVisible(db, req.user, e)
        );
        attachCombatants(db, rows);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Single encounter with combatants
router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const encounter = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(req.params.id);
        if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
        if (!parentIsVisibleDraftSafe(db, req.user, encounter) || !recordVisible(db, req.user, encounter)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        attachCombatants(db, [encounter]);
        res.json(encounter);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create an encounter (DM only), optionally with initial combatants
router.post('/', requireDM, (req, res) => {
    try {
        const db = getDatabase();
        const { session_id = null, scene_id = null, title, visibility = 'session', combatants = [] } = req.body;

        if (!title) return res.status(400).json({ error: 'title is required' });
        if (!session_id === !scene_id) {
            return res.status(400).json({ error: 'Provide exactly one of session_id or scene_id' });
        }
        if (!visibleParent(db, req.user, { session_id, scene_id })) {
            return res.status(404).json({ error: 'Session or scene not found' });
        }

        const create = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO combat_encounters (session_id, scene_id, title, visibility, created_by)
                VALUES (?, ?, ?, ?, ?)
            `).run(session_id, scene_id, title, visibility, req.user.userId);
            const encounterId = result.lastInsertRowid;
            for (const cb of combatants) {
                insertCombatant(db, encounterId, cb);
            }
            return encounterId;
        });

        const id = create();
        const encounter = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(id);
        attachCombatants(db, [encounter]);
        res.status(201).json(encounter);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function insertCombatant(db, encounterId, cb) {
    let { character_id = null, familiar_id = null, name, combatant_type = 'npc', initiative = 10, max_hp = 10, current_hp = null } = cb;

    // Linking a PC pulls name and HP from the character sheet unless overridden
    if (character_id) {
        const c = db.prepare('SELECT name, max_hp, current_hp FROM characters WHERE id = ?').get(character_id);
        if (!c) throw new Error(`Character ${character_id} not found`);
        combatant_type = 'pc';
        name = name || c.name;
        max_hp = cb.max_hp ?? c.max_hp;
        current_hp = cb.current_hp ?? c.current_hp;
    }

    // Linking a familiar pulls name and level-scaled HP unless overridden
    if (familiar_id) {
        const f = db.prepare('SELECT * FROM familiars WHERE id = ?').get(familiar_id);
        if (!f) throw new Error(`Familiar ${familiar_id} not found`);
        const character = db.prepare('SELECT level FROM characters WHERE id = ?').get(f.character_id);
        const power = computeFamiliarPower(
            { ...f, growth_table: f.growth_table ? JSON.parse(f.growth_table) : [] },
            character ? character.level : 1
        );
        combatant_type = 'npc';
        name = name || f.name;
        max_hp = cb.max_hp ?? power.effective_hp;
        current_hp = cb.current_hp ?? max_hp;
    }

    if (!name) throw new Error('Combatant name is required');

    return db.prepare(`
        INSERT INTO combatants (encounter_id, character_id, familiar_id, name, combatant_type, initiative, max_hp, current_hp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(encounterId, character_id, familiar_id, name, combatant_type, initiative, max_hp, current_hp ?? max_hp);
}

// Update an encounter. DM: everything. Participants: run it (round, turn, close out).
router.put('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const encounter = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(req.params.id);
        if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
        if (!canRun(db, req.user, encounter)) {
            return res.status(403).json({ error: 'Your character is not part of this encounter' });
        }

        const allowed = isDM(req.user)
            ? ['title', 'status', 'round', 'turn_index', 'summary', 'visibility']
            : ['status', 'round', 'turn_index', 'summary'];

        const updates = [];
        const values = [];
        for (const field of allowed) {
            if (req.body.hasOwnProperty(field)) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

        if (req.body.status === 'completed') updates.push('ended_at = CURRENT_TIMESTAMP');

        values.push(req.params.id);
        db.prepare(`UPDATE combat_encounters SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(req.params.id);
        attachCombatants(db, [updated]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a combatant (DM only)
router.post('/:id/combatants', requireDM, (req, res) => {
    try {
        const db = getDatabase();
        const encounter = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(req.params.id);
        if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

        const result = insertCombatant(db, encounter.id, req.body);
        res.status(201).json(db.prepare('SELECT * FROM combatants WHERE id = ?').get(result.lastInsertRowid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a combatant. DM: everything. Participants: HP and conditions.
router.put('/:id/combatants/:cid', (req, res) => {
    try {
        const db = getDatabase();
        const encounter = db.prepare('SELECT * FROM combat_encounters WHERE id = ?').get(req.params.id);
        if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
        const combatant = db.prepare('SELECT * FROM combatants WHERE id = ? AND encounter_id = ?').get(req.params.cid, encounter.id);
        if (!combatant) return res.status(404).json({ error: 'Combatant not found' });
        if (!canRun(db, req.user, encounter)) {
            return res.status(403).json({ error: 'Your character is not part of this encounter' });
        }

        const allowed = isDM(req.user)
            ? ['name', 'combatant_type', 'initiative', 'max_hp', 'current_hp', 'conditions']
            : ['current_hp', 'conditions'];

        const updates = [];
        const values = [];
        for (const field of allowed) {
            if (req.body.hasOwnProperty(field)) {
                updates.push(`${field} = ?`);
                values.push(field === 'conditions' ? JSON.stringify(req.body[field]) : req.body[field]);
            }
        }
        if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

        values.push(req.params.cid);
        db.prepare(`UPDATE combatants SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        res.json(db.prepare('SELECT * FROM combatants WHERE id = ?').get(req.params.cid));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove a combatant (DM only)
router.delete('/:id/combatants/:cid', requireDM, (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM combatants WHERE id = ? AND encounter_id = ?').run(req.params.cid, req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Combatant not found' });
        res.json({ message: 'Combatant removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an encounter (DM only)
router.delete('/:id', requireDM, (req, res) => {
    try {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM combat_encounters WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Encounter not found' });
        res.json({ message: 'Encounter deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
