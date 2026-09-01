const test = require('node:test');
const assert = require('node:assert');

const {
    percentileFromScore,
    scoreFromPercentile,
    dndModifier
} = require('../public/js/ability-conversion');

test('ability conversion maps the endpoints and standard score 10', () => {
    assert.strictEqual(percentileFromScore(1), 0);
    assert.strictEqual(percentileFromScore(10), 31);
    assert.strictEqual(percentileFromScore(30), 100);
    assert.strictEqual(scoreFromPercentile(0), 1);
    assert.strictEqual(scoreFromPercentile(31), 10);
    assert.strictEqual(scoreFromPercentile(100), 30);
});

test('every integer D&D score round-trips through its stored percentile', () => {
    for (let score = 1; score <= 30; score += 1) {
        assert.strictEqual(scoreFromPercentile(percentileFromScore(score)), score);
    }
});

test('D&D modifiers are derived from stored percentiles', () => {
    assert.strictEqual(dndModifier(percentileFromScore(8)), -1);
    assert.strictEqual(dndModifier(percentileFromScore(10)), 0);
    assert.strictEqual(dndModifier(percentileFromScore(18)), 4);
});
