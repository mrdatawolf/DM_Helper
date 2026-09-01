const test = require('node:test');
const assert = require('node:assert/strict');
const { percentileFromScore } = require('../public/js/ability-conversion');
const {
    FASERIP_RANKS, percentileToRank, rankName, computeFaseripCharacter,
} = require('../public/js/faserip-conversion');

test('percentileToRank hits every specified anchor exactly', () => {
    const anchors = [[0, 1], [24, 5], [33, 6], [45, 9], [52, 14], [59, 22], [66, 30], [79, 40], [90, 60], [100, 100]];
    for (const [percentile, rank] of anchors) assert.equal(percentileToRank(percentile), rank);
});

test('rankName names every rank-band boundary', () => {
    for (const band of FASERIP_RANKS) {
        assert.deepEqual(rankName(band.min), { name: band.name, abbreviation: band.abbreviation });
        assert.deepEqual(rankName(band.max), { name: band.name, abbreviation: band.abbreviation });
    }
});

function characterFromScores(scores) {
    const keys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    return Object.fromEntries(keys.map((key, index) => [key, percentileFromScore(scores[index])]));
}

test('all-percentile-31 ordinary character has Typical stats, Health 24, and Karma 18', () => {
    const result = computeFaseripCharacter({ strength: 31, dexterity: 31, constitution: 31, intelligence: 31, wisdom: 31, charisma: 31 });
    for (const stat of ['fighting', 'agility', 'strength', 'endurance', 'reason', 'intuition', 'psyche']) {
        assert.deepEqual(result[stat], { number: 6, name: 'Typical', abbreviation: 'Ty' });
    }
    assert.equal(result.health, 24);
    assert.equal(result.karma, 18);
});

test('STR15/DEX14/CON13/INT12/WIS10/CHA8 has Health 38 and corrected Karma 18', () => {
    const result = computeFaseripCharacter(characterFromScores([15, 14, 13, 12, 10, 8]));
    assert.equal(result.health, 38);
    assert.equal(result.karma, 18);
});

test('STR18/DEX16/CON15/INT10/WIS12/CHA14 has Health 65 and Karma 22', () => {
    const result = computeFaseripCharacter(characterFromScores([18, 16, 15, 10, 12, 14]));
    assert.equal(result.health, 65);
    assert.equal(result.karma, 22);
});
