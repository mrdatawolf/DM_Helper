const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/connection');
const { authenticate, requireDM, isDMOrAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// True if the requesting user owns the character (or is DM/admin)
function ownsCharacter(db, reqUser, characterId) {
    if (isDMOrAdmin(reqUser)) return true;
    const c = db.prepare('SELECT user_id FROM characters WHERE id = ?').get(characterId);
    return !!c && c.user_id === reqUser.userId;
}

// Get character's claim point pool
router.get('/pool/:character_id', asyncHandler((req, res) => {
    const db = getDatabase();
    const pool = db.prepare(`
        SELECT * FROM claim_point_pools WHERE character_id = ?
    `).get(req.params.character_id);

    if (!pool) {
        return res.status(404).json({ error: 'Character not found or pool not initialized' });
    }

    res.json(pool);
}));

// Get all claims for a character
router.get('/character/:character_id', asyncHandler((req, res) => {
    const db = getDatabase();
    const claims = db.prepare(`
        SELECT * FROM attribute_claims
        WHERE character_id = ?
        ORDER BY attribute_name
    `).all(req.params.character_id);

    res.json(claims);
}));

// Get ACTUAL rankings for an attribute (DM view - truth)
router.get('/rankings/actual/:attribute_name', asyncHandler((req, res) => {
    const db = getDatabase();
    const rankings = db.prepare(`
        SELECT
            ac.character_id,
            c.name as character_name,
            ac.attribute_name,
            ac.points_spent,
            ac.justification,
            ac.updated_at
        FROM attribute_claims ac
        JOIN characters c ON ac.character_id = c.id
        WHERE ac.attribute_name = ?
        ORDER BY ac.points_spent DESC, ac.updated_at ASC
    `).all(req.params.attribute_name);

    res.json(rankings);
}));

// Get PERCEIVED rankings for a character (what they think)
router.get('/rankings/perceived/:character_id/:attribute_name', asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, attribute_name } = req.params;

    // Get perceived rankings
    const perceived = db.prepare(`
        SELECT
            pr.target_character_id,
            c.name as character_name,
            pr.perceived_points,
            pr.perception_notes,
            pr.updated_at
        FROM perceived_rankings pr
        JOIN characters c ON pr.target_character_id = c.id
        WHERE pr.observer_character_id = ?
        AND pr.attribute_name = ?
        ORDER BY pr.perceived_points DESC
    `).all(character_id, attribute_name);

    // Get the character's own actual claim
    const ownClaim = db.prepare(`
        SELECT points_spent
        FROM attribute_claims
        WHERE character_id = ? AND attribute_name = ?
    `).get(character_id, attribute_name);

    res.json({
        own_points: ownClaim ? ownClaim.points_spent : 0,
        perceived_others: perceived
    });
}));

// Get all attribute rankings (for DM dashboard overview)
router.get('/rankings/all', asyncHandler((req, res) => {
    const db = getDatabase();

    // Get all distinct attributes that have claims
    const attributes = db.prepare(`
        SELECT DISTINCT attribute_name FROM attribute_claims ORDER BY attribute_name
    `).all();

    const allRankings = {};

    for (const attr of attributes) {
        const rankings = db.prepare(`
            SELECT
                ac.character_id,
                c.name as character_name,
                ac.points_spent,
                ac.justification
            FROM attribute_claims ac
            JOIN characters c ON ac.character_id = c.id
            WHERE ac.attribute_name = ?
            ORDER BY ac.points_spent DESC, ac.updated_at ASC
        `).all(attr.attribute_name);

        allRankings[attr.attribute_name] = rankings;
    }

    res.json(allRankings);
}));

// Allocate/update claim points for an attribute
router.post('/allocate', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, attribute_name, points_to_add, justification } = req.body;

    if (!character_id || !attribute_name || points_to_add === undefined || !justification) {
        return res.status(400).json({
            error: 'character_id, attribute_name, points_to_add, and justification are required'
        });
    }

    if (!ownsCharacter(db, req.user, character_id)) {
        return res.status(403).json({ error: 'You can only allocate points for your own characters' });
    }

    // Get current pool
    const pool = db.prepare('SELECT * FROM claim_point_pools WHERE character_id = ?').get(character_id);
    if (!pool) {
        return res.status(404).json({ error: 'Character claim pool not found' });
    }

    // Check if enough points available
    if (points_to_add > pool.total_points - pool.spent_points) {
        return res.status(400).json({
            error: `Not enough points available. Have ${pool.total_points - pool.spent_points}, need ${points_to_add}`
        });
    }

    // Get current claim for this attribute
    const currentClaim = db.prepare(`
        SELECT * FROM attribute_claims
        WHERE character_id = ? AND attribute_name = ?
    `).get(character_id, attribute_name);

    const newTotal = (currentClaim ? currentClaim.points_spent : 0) + points_to_add;

    db.exec('BEGIN TRANSACTION');

    try {
        if (currentClaim) {
            // Update existing claim
            db.prepare(`
                UPDATE attribute_claims
                SET points_spent = ?, justification = ?, updated_at = CURRENT_TIMESTAMP
                WHERE character_id = ? AND attribute_name = ?
            `).run(newTotal, justification, character_id, attribute_name);
        } else {
            // Create new claim
            db.prepare(`
                INSERT INTO attribute_claims (character_id, attribute_name, points_spent, justification)
                VALUES (?, ?, ?, ?)
            `).run(character_id, attribute_name, newTotal, justification);
        }

        // Update spent points in pool
        db.prepare(`
            UPDATE claim_point_pools
            SET spent_points = spent_points + ?
            WHERE character_id = ?
        `).run(points_to_add, character_id);

        // Log the change
        db.prepare(`
            INSERT INTO claim_history (character_id, attribute_name, points_change, justification)
            VALUES (?, ?, ?, ?)
        `).run(character_id, attribute_name, points_to_add, justification);

        db.exec('COMMIT');

        // Return updated claim
        const updated = db.prepare(`
            SELECT * FROM attribute_claims
            WHERE character_id = ? AND attribute_name = ?
        `).get(character_id, attribute_name);

        res.json(updated);

    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }

}));

// Set perceived ranking (what a character thinks about another)
router.post('/perception', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const {
        observer_character_id,
        target_character_id,
        attribute_name,
        perceived_points,
        perception_notes
    } = req.body;

    if (!observer_character_id || !target_character_id || !attribute_name || perceived_points === undefined) {
        return res.status(400).json({
            error: 'observer_character_id, target_character_id, attribute_name, and perceived_points are required'
        });
    }

    if (!ownsCharacter(db, req.user, observer_character_id)) {
        return res.status(403).json({ error: 'You can only record perceptions for your own characters' });
    }

    const stmt = db.prepare(`
        INSERT INTO perceived_rankings
        (observer_character_id, target_character_id, attribute_name, perceived_points, perception_notes)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(observer_character_id, target_character_id, attribute_name)
        DO UPDATE SET
            perceived_points = excluded.perceived_points,
            perception_notes = excluded.perception_notes,
            updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(observer_character_id, target_character_id, attribute_name, perceived_points, perception_notes);

    res.json({
        message: 'Perception updated',
        observer_character_id,
        target_character_id,
        attribute_name,
        perceived_points
    });

}));

// Grant additional claim points to a character (DM function)
router.post('/grant-points', authenticate, requireDM, asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, points, reason } = req.body;

    if (!character_id || !points || !reason) {
        return res.status(400).json({ error: 'character_id, points, and reason are required' });
    }

    db.prepare(`
        UPDATE claim_point_pools
        SET total_points = total_points + ?
        WHERE character_id = ?
    `).run(points, character_id);

    // Log it in history
    db.prepare(`
        INSERT INTO claim_history (character_id, attribute_name, points_change, justification)
        VALUES (?, 'POOL_GRANT', ?, ?)
    `).run(character_id, points, reason);

    const updated = db.prepare('SELECT * FROM claim_point_pools WHERE character_id = ?').get(character_id);
    res.json(updated);

}));

// Get claim history for a character
router.get('/history/:character_id', asyncHandler((req, res) => {
    const db = getDatabase();
    const history = db.prepare(`
        SELECT * FROM claim_history
        WHERE character_id = ?
        ORDER BY changed_at DESC
    `).all(req.params.character_id);

    res.json(history);
}));

// Which D&D ability score each claim attribute draws its modifier from.
const ATTRIBUTE_ABILITY_MAP = {
    Strength: 'strength',
    Speed: 'dexterity',
    Combat: 'strength',
    Stealth: 'dexterity',
    Intelligence: 'intelligence',
    Persuasion: 'charisma',
    Endurance: 'constitution',
    Archery: 'dexterity',
    Swordsmanship: 'strength',
    Magic: 'intelligence',
    Perception: 'wisdom',
    Charisma: 'charisma',
    Wisdom: 'wisdom',
    Leadership: 'charisma',
    Tactics: 'intelligence'
};

function abilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

// Resolve a claim for an attribute check (returns bonuses for player; no writes)
router.post('/resolve', authenticate, asyncHandler((req, res) => {
    const db = getDatabase();
    const { character_id, attribute_name, roll_result } = req.body;

    if (!character_id || !attribute_name || roll_result === undefined) {
        return res.status(400).json({
            error: 'character_id, attribute_name, and roll_result are required'
        });
    }

    const abilityColumn = ATTRIBUTE_ABILITY_MAP[attribute_name];
    let abilityBonus = 0;
    if (abilityColumn) {
        const character = db.prepare(`SELECT ${abilityColumn} FROM characters WHERE id = ?`).get(character_id);
        if (character) {
            abilityBonus = abilityModifier(character[abilityColumn]);
        }
    }

    // Get this character's claim
    const claim = db.prepare(`
        SELECT * FROM attribute_claims
        WHERE character_id = ? AND attribute_name = ?
    `).get(character_id, attribute_name);

    if (!claim || claim.points_spent === 0) {
        // No claim made — ability modifier still applies
        return res.json({
            base_roll: roll_result,
            ability_bonus: abilityBonus,
            claim_bonus: 0,
            total_bonus: abilityBonus,
            final_result: roll_result + abilityBonus,
            message: abilityBonus !== 0 ? 'Ability bonus applied' : 'No bonus'
        });
    }

    // Get all claims for this attribute to determine if character is truly the best
    const allClaims = db.prepare(`
        SELECT character_id, points_spent
        FROM attribute_claims
        WHERE attribute_name = ?
        ORDER BY points_spent DESC, updated_at ASC
    `).all(attribute_name);

    // Check if this character is the best (highest points, or tied for highest with earliest timestamp)
    const isBest = allClaims.length > 0 && allClaims[0].character_id === character_id;

    // Calculate bonuses
    const claimBonus = 1;  // +1 for making a claim
    const hiddenBonus = isBest ? 1 : 0;  // +1 hidden bonus if truly the best
    const totalBonus = abilityBonus + claimBonus + hiddenBonus;

    res.json({
        base_roll: roll_result,
        ability_bonus: abilityBonus,
        claim_bonus: claimBonus,  // Player sees this
        total_bonus: totalBonus,  // DM sees the full bonus including hidden +1
        final_result: roll_result + totalBonus,
        message: 'Claimed Best',
        is_actually_best: isBest  // DM only info
    });

}));

// Get rankings with 'best' indicator (enhanced DM view)
router.get('/rankings/actual/:attribute_name/with-best', asyncHandler((req, res) => {
    const db = getDatabase();
    const rankings = db.prepare(`
        SELECT
            ac.character_id,
            c.name as character_name,
            ac.attribute_name,
            ac.points_spent,
            ac.justification,
            ac.updated_at
        FROM attribute_claims ac
        JOIN characters c ON ac.character_id = c.id
        WHERE ac.attribute_name = ?
        ORDER BY ac.points_spent DESC, ac.updated_at ASC
    `).all(req.params.attribute_name);

    // Mark the best (first in sorted order)
    const result = rankings.map((rank, index) => ({
        ...rank,
        is_best: index === 0,
        rank_position: index + 1
    }));

    res.json(result);
}));

// Get all rankings with best indicators (enhanced DM overview)
router.get('/rankings/all/with-best', asyncHandler((req, res) => {
    const db = getDatabase();

    // Get all distinct attributes that have claims
    const attributes = db.prepare(`
        SELECT DISTINCT attribute_name FROM attribute_claims ORDER BY attribute_name
    `).all();

    const allRankings = {};

    for (const attr of attributes) {
        const rankings = db.prepare(`
            SELECT
                ac.character_id,
                c.name as character_name,
                ac.points_spent,
                ac.justification,
                ac.updated_at
            FROM attribute_claims ac
            JOIN characters c ON ac.character_id = c.id
            WHERE ac.attribute_name = ?
            ORDER BY ac.points_spent DESC, ac.updated_at ASC
        `).all(attr.attribute_name);

        // Mark the best
        allRankings[attr.attribute_name] = rankings.map((rank, index) => ({
            ...rank,
            is_best: index === 0,
            rank_position: index + 1
        }));
    }

    res.json(allRankings);
}));

module.exports = router;
