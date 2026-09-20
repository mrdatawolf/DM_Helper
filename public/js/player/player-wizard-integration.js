const UNIVERSAL_FIELDS = Object.freeze([
    'name', 'player_name', 'species', 'class_type', 'subclass', 'level', 'background', 'alignment', 'size',
    'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
    'languages', 'appearance', 'personality', 'backstory', 'character_notes', 'age', 'height', 'weight',
    'eyes', 'skin', 'hair', 'desires', 'fears', 'allies_organizations', 'feat_pool', 'total_feats_earned',
    'experience_points', 'points_to_next_level', 'current_shadow_id', 'current_story_timestamp', 'is_active'
]);
const SYSTEM_FIELDS = Object.freeze({ dnd5e: Object.freeze(['max_hp', 'current_hp']) });
const UNIVERSE_FIELDS = Object.freeze({
    amber: Object.freeze(['shadow_origin_id', 'blood_purity', 'order_chaos_value', 'pattern_imprint',
        'logrus_imprint', 'pattern_mastery_level', 'logrus_mastery_level', 'trump_artist',
        'trump_mastery_level', 'pattern_type', 'amber_flaws', 'amber_traits', 'broken_imprint'])
});

async function loadWizardModules(campaign, importer = path => import(path)) {
    try {
        const systemModule = await importer(`/js/systems/${campaign.system_id}/wizard-steps.js`);
        const universeModule = campaign.universe_id
            ? await importer(`/js/universes/${campaign.universe_id}/wizard-steps.js`)
            : null;
        return { systemSteps: systemModule.steps, universeSteps: universeModule?.steps || [] };
    } catch (error) {
        throw new Error(`Unable to load character wizard for this campaign: ${error.message}`, { cause: error });
    }
}

function filterWizardPayload(wizardState, campaign, systemContent = {}) {
    const allowed = new Set([...UNIVERSAL_FIELDS, ...(SYSTEM_FIELDS[campaign.system_id] || []),
        ...(campaign.universe_id ? (UNIVERSE_FIELDS[campaign.universe_id] || []) : [])]);
    const payload = Object.fromEntries(Object.entries(wizardState).filter(([field]) => allowed.has(field)));
    if (campaign.system_id === 'dnd5e' && payload.class_type) {
        const hitDie = systemContent.CLASSES_5E?.find(entry => entry.id === payload.class_type)?.hitDie || 8;
        const maxHp = Math.max(1, hitDie + Math.floor(((Number(payload.constitution) || 10) - 10) / 2));
        payload.max_hp = maxHp;
        payload.current_hp = maxHp;
    }
    return payload;
}

export { filterWizardPayload, loadWizardModules };
