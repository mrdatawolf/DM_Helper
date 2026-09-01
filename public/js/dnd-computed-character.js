(function exposeDndComputedCharacter(root, factory) {
    const computed = factory(root.AbilityConversion);
    root.DndComputedCharacter = computed;
    if (typeof module === 'object' && module.exports) {
        module.exports = computed;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDndComputedCharacter(AbilityConversion) {
    const { scoreFromPercentile, dndModifier } = AbilityConversion;

    const ABILITIES = [
        ['strength', 'STR', 'Strength'], ['dexterity', 'DEX', 'Dexterity'],
        ['constitution', 'CON', 'Constitution'], ['intelligence', 'INT', 'Intelligence'],
        ['wisdom', 'WIS', 'Wisdom'], ['charisma', 'CHA', 'Charisma'],
    ];
    const SKILLS = [
        ['acrobatics', 'Acrobatics', 'dexterity'], ['animal_handling', 'Animal Handling', 'wisdom'],
        ['arcana', 'Arcana', 'intelligence'], ['athletics', 'Athletics', 'strength'],
        ['deception', 'Deception', 'charisma'], ['history', 'History', 'intelligence'],
        ['insight', 'Insight', 'wisdom'], ['intimidation', 'Intimidation', 'charisma'],
        ['investigation', 'Investigation', 'intelligence'], ['medicine', 'Medicine', 'wisdom'],
        ['nature', 'Nature', 'intelligence'], ['perception', 'Perception', 'wisdom'],
        ['performance', 'Performance', 'charisma'], ['persuasion', 'Persuasion', 'charisma'],
        ['religion', 'Religion', 'intelligence'], ['sleight_of_hand', 'Sleight of Hand', 'dexterity'],
        ['stealth', 'Stealth', 'dexterity'], ['survival', 'Survival', 'wisdom'],
    ];

    const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

    // The single source of truth for derived D&D 5e values (modifiers, saves,
    // skill bonuses, initiative, passive perception, spellcasting DC/attack)
    // from a character's stored percentiles. Used by the editable D&D sheet
    // (public/js/player/player-character-sheet.js, which loads this as a
    // classic-script global the same way it already does AbilityConversion)
    // and by the read-only "View As..." D&D card
    // (public/js/dnd-readonly-sheet.js) on both the player and DM dashboards
    // — a plain classic-script module rather than living inside an ES module
    // specifically so both dashboards can load it, not just the player one.
    function computedCharacter(character) {
        const proficiency = number(character.proficiency_bonus, 2);
        const ability = Object.fromEntries(ABILITIES.map(([key]) => [key, {
            score: scoreFromPercentile(number(character[key], 31)),
            modifier: dndModifier(number(character[key], 31)),
            save: dndModifier(number(character[key], 31)) + proficiency * number(character[`save_${key}`]),
        }]));
        const skills = Object.fromEntries(SKILLS.map(([key, , abilityKey]) => [key,
            ability[abilityKey].modifier + proficiency * number(character[`skill_${key}`])
        ]));
        const spellAbility = String(character.spellcasting_ability || '').toLowerCase();
        const spellModifier = ability[spellAbility]?.modifier ?? 0;
        return {
            ability, skills, proficiency,
            initiative: ability.dexterity.modifier + number(character.initiative_bonus),
            passivePerception: 10 + skills.perception,
            spellSaveDc: 8 + proficiency + spellModifier,
            spellAttackBonus: proficiency + spellModifier,
        };
    }

    return { ABILITIES, SKILLS, computedCharacter };
}));
