import '../ability-conversion.js';
import { state } from './player-state.js';
const { percentileFromScore } = AbilityConversion;
import { loadCharacters, viewCharacter } from './player-characters.js';
import { closeEditCharacter } from './player-edit-form.js';
// Switch tabs within character edit view
function switchCharEditTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.char-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.char-edit-tab').forEach(content => {
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(`edit-tab-${tabName}`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
}

// Handle character edit submission
async function handleEditCharacter(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    // Gather all form data
    const characterData = {
        // Basic Info
        name: document.getElementById('edit-char-name').value,
        species: document.getElementById('edit-char-species').value,
        class_type: document.getElementById('edit-char-class').value,
        subclass: document.getElementById('edit-char-subclass').value || null,
        level: parseInt(document.getElementById('edit-char-level').value),
        background: document.getElementById('edit-char-background').value || null,
        size: document.getElementById('edit-char-size').value,
        speed: parseInt(document.getElementById('edit-char-speed').value),
        experience_points: parseInt(document.getElementById('edit-char-xp').value),

        // Amber-specific
        order_chaos_value: parseInt(document.getElementById('edit-char-order-chaos').value),
        blood_purity: document.getElementById('edit-char-blood').value || null,
        pattern_imprint: document.getElementById('edit-char-pattern').checked ? 1 : 0,
        logrus_imprint: document.getElementById('edit-char-logrus').checked ? 1 : 0,
        trump_artist: document.getElementById('edit-char-trump').checked ? 1 : 0,
        broken_imprint: document.getElementById('edit-char-broken-imprint').checked ? 1 : 0,
        pattern_type: document.getElementById('edit-char-pattern-type').value || null,
        pattern_mastery_level: parseInt(document.getElementById('edit-char-pattern-mastery').value) || 0,
        logrus_mastery_level: parseInt(document.getElementById('edit-char-logrus-mastery').value) || 0,
        trump_mastery_level: parseInt(document.getElementById('edit-char-trump-mastery').value) || 0,
        shadow_origin_id: document.getElementById('edit-char-shadow-origin').value || null,

        // Ability Scores
        strength: percentileFromScore(parseInt(document.getElementById('edit-char-str').value)),
        dexterity: percentileFromScore(parseInt(document.getElementById('edit-char-dex').value)),
        constitution: percentileFromScore(parseInt(document.getElementById('edit-char-con').value)),
        intelligence: percentileFromScore(parseInt(document.getElementById('edit-char-int').value)),
        wisdom: percentileFromScore(parseInt(document.getElementById('edit-char-wis').value)),
        charisma: percentileFromScore(parseInt(document.getElementById('edit-char-cha').value)),

        // Saving Throws
        save_strength: document.getElementById('edit-save-str').checked ? 1 : 0,
        save_dexterity: document.getElementById('edit-save-dex').checked ? 1 : 0,
        save_constitution: document.getElementById('edit-save-con').checked ? 1 : 0,
        save_intelligence: document.getElementById('edit-save-int').checked ? 1 : 0,
        save_wisdom: document.getElementById('edit-save-wis').checked ? 1 : 0,
        save_charisma: document.getElementById('edit-save-cha').checked ? 1 : 0,

        // Skills
        skill_acrobatics: parseInt(document.getElementById('edit-skill-acrobatics').value),
        skill_animal_handling: parseInt(document.getElementById('edit-skill-animal-handling').value),
        skill_arcana: parseInt(document.getElementById('edit-skill-arcana').value),
        skill_athletics: parseInt(document.getElementById('edit-skill-athletics').value),
        skill_deception: parseInt(document.getElementById('edit-skill-deception').value),
        skill_history: parseInt(document.getElementById('edit-skill-history').value),
        skill_insight: parseInt(document.getElementById('edit-skill-insight').value),
        skill_intimidation: parseInt(document.getElementById('edit-skill-intimidation').value),
        skill_investigation: parseInt(document.getElementById('edit-skill-investigation').value),
        skill_medicine: parseInt(document.getElementById('edit-skill-medicine').value),
        skill_nature: parseInt(document.getElementById('edit-skill-nature').value),
        skill_perception: parseInt(document.getElementById('edit-skill-perception').value),
        skill_performance: parseInt(document.getElementById('edit-skill-performance').value),
        skill_persuasion: parseInt(document.getElementById('edit-skill-persuasion').value),
        skill_religion: parseInt(document.getElementById('edit-skill-religion').value),
        skill_sleight_of_hand: parseInt(document.getElementById('edit-skill-sleight-of-hand').value),
        skill_stealth: parseInt(document.getElementById('edit-skill-stealth').value),
        skill_survival: parseInt(document.getElementById('edit-skill-survival').value),

        // Combat & HP
        max_hp: parseInt(document.getElementById('edit-char-max-hp').value),
        current_hp: parseInt(document.getElementById('edit-char-current-hp').value),
        temp_hit_points: parseInt(document.getElementById('edit-char-temp-hp').value),
        hit_dice_total: document.getElementById('edit-char-hit-dice').value,
        death_save_successes: parseInt(document.getElementById('edit-char-death-successes').value),
        death_save_failures: parseInt(document.getElementById('edit-char-death-failures').value),
        armor_class: parseInt(document.getElementById('edit-char-ac').value),
        initiative_bonus: parseInt(document.getElementById('edit-char-initiative').value),
        proficiency_bonus: parseInt(document.getElementById('edit-char-proficiency').value),
        passive_perception: parseInt(document.getElementById('edit-char-passive-perception').value),
        heroic_inspiration: parseInt(document.getElementById('edit-char-inspiration').value),

        // Armor & Weapon Proficiencies
        armor_light: document.getElementById('edit-armor-light').checked ? 1 : 0,
        armor_medium: document.getElementById('edit-armor-medium').checked ? 1 : 0,
        armor_heavy: document.getElementById('edit-armor-heavy').checked ? 1 : 0,
        armor_shields: document.getElementById('edit-armor-shields').checked ? 1 : 0,
        weapons_simple: document.getElementById('edit-weapons-simple').checked ? 1 : 0,
        weapons_martial: document.getElementById('edit-weapons-martial').checked ? 1 : 0,
        tools_proficiency: document.getElementById('edit-char-tools').value || null,

        // Equipment & Currency
        copper_pieces: parseInt(document.getElementById('edit-copper').value),
        silver_pieces: parseInt(document.getElementById('edit-silver').value),
        electrum_pieces: parseInt(document.getElementById('edit-electrum').value),
        gold_pieces: parseInt(document.getElementById('edit-gold').value),
        platinum_pieces: parseInt(document.getElementById('edit-platinum').value),
        attunement_slots_used: parseInt(document.getElementById('edit-attunement-used').value),
        attunement_slots_max: parseInt(document.getElementById('edit-attunement-max').value),
        languages: document.getElementById('edit-char-languages').value || null,

        // Features & Traits
        class_features: document.getElementById('edit-char-class-features').value || null,
        species_traits: document.getElementById('edit-char-species-traits').value || null,
        feats: document.getElementById('edit-char-feats').value || null,

        // Appearance & Story
        appearance: document.getElementById('edit-char-appearance').value || null,
        personality: document.getElementById('edit-char-personality').value || null,
        backstory: document.getElementById('edit-char-backstory').value || null,

        // Spells
        spellcasting_ability: document.getElementById('edit-spellcasting-ability').value || null,
        spell_save_dc: parseInt(document.getElementById('edit-spell-save-dc').value),
        spell_attack_bonus: parseInt(document.getElementById('edit-spell-attack-bonus').value),

        // Spell Slots (1-9)
        spell_slots_1_total: parseInt(document.getElementById('edit-slots-1-total').value),
        spell_slots_1_expended: parseInt(document.getElementById('edit-slots-1-used').value),
        spell_slots_2_total: parseInt(document.getElementById('edit-slots-2-total').value),
        spell_slots_2_expended: parseInt(document.getElementById('edit-slots-2-used').value),
        spell_slots_3_total: parseInt(document.getElementById('edit-slots-3-total').value),
        spell_slots_3_expended: parseInt(document.getElementById('edit-slots-3-used').value),
        spell_slots_4_total: parseInt(document.getElementById('edit-slots-4-total').value),
        spell_slots_4_expended: parseInt(document.getElementById('edit-slots-4-used').value),
        spell_slots_5_total: parseInt(document.getElementById('edit-slots-5-total').value),
        spell_slots_5_expended: parseInt(document.getElementById('edit-slots-5-used').value),
        spell_slots_6_total: parseInt(document.getElementById('edit-slots-6-total').value),
        spell_slots_6_expended: parseInt(document.getElementById('edit-slots-6-used').value),
        spell_slots_7_total: parseInt(document.getElementById('edit-slots-7-total').value),
        spell_slots_7_expended: parseInt(document.getElementById('edit-slots-7-used').value),
        spell_slots_8_total: parseInt(document.getElementById('edit-slots-8-total').value),
        spell_slots_8_expended: parseInt(document.getElementById('edit-slots-8-used').value),
        spell_slots_9_total: parseInt(document.getElementById('edit-slots-9-total').value),
        spell_slots_9_expended: parseInt(document.getElementById('edit-slots-9-used').value)
    };

    try {
        await apiFetch(`/api/characters/${state.currentCharacter.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(characterData)
        });

        // Close modal
        closeEditCharacter();

        // Reload characters
        await loadCharacters();

        // If viewing character sheet, reload it
        if (document.getElementById('character-details').style.display === 'block') {
            await viewCharacter(state.currentCharacter.id);
        }

        // Show success message
        showToast('Character updated successfully!');

    } catch (error) {
        console.error('Error updating character:', error);
        showToast(`Failed to update character: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
    }
}

export { handleEditCharacter, switchCharEditTab };
