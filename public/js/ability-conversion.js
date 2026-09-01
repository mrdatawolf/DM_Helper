(function exposeAbilityConversion(root, factory) {
    const conversion = factory();
    root.AbilityConversion = conversion;
    if (typeof module === 'object' && module.exports) {
        module.exports = conversion;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createAbilityConversion() {
    // A character's stored core ability is a system-neutral percentile. D&D
    // scores span 1..30, so the 29 intervals between them map linearly to the
    // 100 intervals of 0..100. Keep both directions here so server and browser
    // call sites cannot drift apart.
    function percentileFromScore(score) {
        return Math.round((score - 1) / 29 * 100);
    }

    function scoreFromPercentile(percentile) {
        return Math.round(percentile / 100 * 29) + 1;
    }

    function dndModifier(percentile) {
        return Math.floor((scoreFromPercentile(percentile) - 10) / 2);
    }

    return { percentileFromScore, scoreFromPercentile, dndModifier };
}));
