const { validateProfile, validateValue, profileFromLegacyAbilities } = require('../../capabilities/profile');
const { percentileFromScore, scoreFromPercentile } = require('../../../public/js/ability-conversion');

const DND_GROUPS = Object.freeze({
    strength: Object.freeze(['might']), dexterity: Object.freeze(['mobility', 'coordination']),
    constitution: Object.freeze(['endurance']), intelligence: Object.freeze(['intellect']),
    wisdom: Object.freeze(['perception', 'instinct', 'resolve']), charisma: Object.freeze(['presence', 'influence'])
});
const DND_ABILITY_KEYS = Object.freeze(Object.keys(DND_GROUPS));
function roundedMean(values) { return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length); }
function projectPercentiles(profile) {
    const valid = validateProfile(profile);
    return Object.fromEntries(DND_ABILITY_KEYS.map(ability => [ability, roundedMean(DND_GROUPS[ability].map(key => valid[key]))]));
}
function projectScores(profile) { return Object.fromEntries(Object.entries(projectPercentiles(profile)).map(([key, value]) => [key, scoreFromPercentile(value)])); }
function candidateSums(length, target) {
    const sums = [];
    for (let sum = 0; sum <= 100 * length; sum += 1) if (Math.round(sum / length) === target) sums.push(sum);
    return sums;
}
function editPercentile(profile, ability, target) {
    const valid = validateProfile(profile);
    if (!Object.hasOwn(DND_GROUPS, ability)) throw new Error(`Unknown D&D ability ${ability}`);
    validateValue(target, ability);
    const keys = DND_GROUPS[ability];
    const current = keys.map(key => valid[key]);
    const sum = current.reduce((total, value) => total + value, 0);
    const sums = candidateSums(keys.length, target).sort((a, b) => Math.abs(a - sum) - Math.abs(b - sum) || a - b);
    for (const desiredSum of sums) {
        let remaining = desiredSum - sum;
        const next = [...current];
        const direction = Math.sign(remaining);
        let index = 0;
        while (remaining !== 0 && index < 1000) {
            const slot = index % next.length;
            if ((direction > 0 && next[slot] < 100) || (direction < 0 && next[slot] > 0)) {
                next[slot] += direction;
                remaining -= direction;
            }
            index += 1;
        }
        if (!remaining) {
            const edited = { ...valid };
            keys.forEach((key, index) => { edited[key] = next[index]; });
            if (projectPercentiles(edited)[ability] === target) return validateProfile(edited);
        }
    }
    throw new Error(`The requested ${ability} score cannot be represented within the shared capability range`);
}
function profileFromScores(scores) {
    return profileFromLegacyAbilities(Object.fromEntries(DND_ABILITY_KEYS.map(key => [key, percentileFromScore(scores[key])])))
}
module.exports = { DND_GROUPS, DND_ABILITY_KEYS, projectPercentiles, projectScores, editPercentile, profileFromScores };
