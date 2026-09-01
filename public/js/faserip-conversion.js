(function exposeFaseripConversion(root, factory) {
    const conversion = factory();
    root.FaseripConversion = conversion;
    if (typeof module === 'object' && module.exports) {
        module.exports = conversion;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createFaseripConversion() {
    const FASERIP_RANKS = Object.freeze([
        Object.freeze({ name: 'Shift 0', abbreviation: 'Sh0', min: 0, max: 0 }),
        Object.freeze({ name: 'Feeble', abbreviation: 'Fe', min: 1, max: 2 }),
        Object.freeze({ name: 'Poor', abbreviation: 'Pr', min: 3, max: 4 }),
        Object.freeze({ name: 'Typical', abbreviation: 'Ty', min: 5, max: 6 }),
        Object.freeze({ name: 'Good', abbreviation: 'Gd', min: 7, max: 10 }),
        Object.freeze({ name: 'Excellent', abbreviation: 'Ex', min: 11, max: 20 }),
        Object.freeze({ name: 'Remarkable', abbreviation: 'Rm', min: 21, max: 30 }),
        Object.freeze({ name: 'Incredible', abbreviation: 'In', min: 31, max: 40 }),
        Object.freeze({ name: 'Amazing', abbreviation: 'Am', min: 41, max: 50 }),
        Object.freeze({ name: 'Monstrous', abbreviation: 'Mn', min: 51, max: 75 }),
        Object.freeze({ name: 'Unearthly', abbreviation: 'Un', min: 76, max: 100 }),
    ]);

    const RANK_ANCHORS = [
        [0, 1], [24, 5], [33, 6], [45, 9], [52, 14],
        [59, 22], [66, 30], [79, 40], [90, 60], [100, 100],
    ];

    function percentileToRank(percentile) {
        const value = Math.min(100, Math.max(0, Number(percentile)));
        for (let i = 1; i < RANK_ANCHORS.length; i += 1) {
            const [upperPercentile, upperRank] = RANK_ANCHORS[i];
            if (value <= upperPercentile) {
                const [lowerPercentile, lowerRank] = RANK_ANCHORS[i - 1];
                const progress = (value - lowerPercentile) / (upperPercentile - lowerPercentile);
                return Math.round(lowerRank + progress * (upperRank - lowerRank));
            }
        }
        return 100;
    }

    function rankName(number) {
        const value = Math.min(100, Math.max(0, Math.round(Number(number))));
        const rank = FASERIP_RANKS.find(band => value >= band.min && value <= band.max);
        return { name: rank.name, abbreviation: rank.abbreviation };
    }

    function stat(percentile) {
        const number = percentileToRank(percentile);
        return { number, ...rankName(number) };
    }

    function computeFaseripCharacter(character) {
        const fighting = stat((Number(character.strength) + Number(character.dexterity)) / 2);
        const agility = stat(character.dexterity);
        const strength = stat(character.strength);
        const endurance = stat(character.constitution);
        const reason = stat(character.intelligence);
        const intuition = stat(character.wisdom);
        const psyche = stat(character.charisma);

        return {
            fighting, agility, strength, endurance, reason, intuition, psyche,
            health: fighting.number + agility.number + strength.number + endurance.number,
            karma: reason.number + intuition.number + psyche.number,
        };
    }

    return { FASERIP_RANKS, percentileToRank, rankName, computeFaseripCharacter };
}));
