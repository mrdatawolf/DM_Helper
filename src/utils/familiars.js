// Shared power-scaling logic for familiars. A familiar's growth_table is a
// DM-authored JSON array of level-gated tiers:
//   [{ level: 3, hp_bonus: 5, ac_bonus: 0, abilities_gained: ['Keen Senses'], notes: '...' }, ...]
// Effective power is computed at read time from the bonded character's
// current level, so leveling the character up automatically grows the
// familiar with no manual re-editing.

function computeFamiliarPower(familiar, characterLevel) {
    const growthTable = Array.isArray(familiar.growth_table) ? familiar.growth_table : [];
    const sorted = [...growthTable].sort((a, b) => (a.level || 0) - (b.level || 0));

    const reached = sorted.filter(t => (t.level || 0) <= characterLevel);
    const nextTier = sorted.find(t => (t.level || 0) > characterLevel) || null;

    const hpBonus = reached.reduce((sum, t) => sum + (t.hp_bonus || 0), 0);
    const acBonus = reached.reduce((sum, t) => sum + (t.ac_bonus || 0), 0);
    const unlockedAbilities = [...new Set(reached.flatMap(t => t.abilities_gained || []))];
    const currentTierLevel = reached.length ? reached[reached.length - 1].level : 0;

    return {
        effective_hp: (familiar.base_hit_points || 0) + hpBonus,
        effective_ac: (familiar.armor_class || 0) + acBonus,
        unlocked_abilities: unlockedAbilities,
        current_tier_level: currentTierLevel,
        next_tier: nextTier
    };
}

function serializeFamiliar(familiar, characterLevel, isDM) {
    const { dm_notes, base_stats, growth_table, ...rest } = familiar;
    const parsed = {
        ...rest,
        base_stats: base_stats ? JSON.parse(base_stats) : null,
        growth_table: growth_table ? JSON.parse(growth_table) : [],
        ...(isDM ? { dm_notes } : {})
    };
    return {
        ...parsed,
        ...computeFamiliarPower(parsed, characterLevel)
    };
}

module.exports = { computeFamiliarPower, serializeFamiliar };
