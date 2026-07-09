// player-edit-form.js — split from player-dashboard.js (behavior unchanged)
// Open edit character view
async function openEditCharacter(characterId) {
    const token = localStorage.getItem('token');

    try {
        const [charRes, shadowsRes] = await Promise.all([
            fetch(`/api/characters/${characterId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/shadows')
        ]);

        if (!charRes.ok) throw new Error('Failed to load character');

        const character = await charRes.json();
        playerAllShadows = shadowsRes.ok ? await shadowsRes.json() : [];
        currentCharacter = character;

        displayCharacterEditForm(character);

    } catch (error) {
        console.error('Error loading character for edit:', error);
        showToast('Failed to load character data');
    }
}

// Display character edit form
function displayCharacterEditForm(character) {
    const container = document.getElementById('character-details');
    const listContainer = document.getElementById('characters-list');

    // Hide character list, show edit form
    listContainer.style.display = 'none';
    container.style.display = 'block';

    container.innerHTML = `
        <div class="character-sheet-header">
            <div>
                <h2>Edit: ${escHtmlP(character.name)}</h2>
                <p>Update your character information</p>
            </div>
            <button class="back-button" onclick="viewCharacter(${character.id})">← Cancel & View Character</button>
        </div>

        <div class="character-edit-container">
            <!-- Character Edit Tabs -->
            <div class="character-edit-tabs">
                <button class="char-tab-btn active" data-tab="basic" onclick="switchCharEditTab('basic')">Basic Info</button>
                <button class="char-tab-btn" data-tab="abilities" onclick="switchCharEditTab('abilities')">Abilities & Skills</button>
                <button class="char-tab-btn" data-tab="combat" onclick="switchCharEditTab('combat')">Combat & HP</button>
                <button class="char-tab-btn" data-tab="spells" onclick="switchCharEditTab('spells')">Spells</button>
                <button class="char-tab-btn" data-tab="equipment" onclick="switchCharEditTab('equipment')">Equipment</button>
                <button class="char-tab-btn" data-tab="features" onclick="switchCharEditTab('features')">Features & Traits</button>
                <button class="char-tab-btn" data-tab="details" onclick="switchCharEditTab('details')">Appearance & Story</button>
            </div>

            <form id="edit-character-form">
                ${generateBasicInfoTab(character)}
                ${generateAbilitiesTab(character)}
                ${generateCombatTab(character)}
                ${generateSpellsTab(character)}
                ${generateEquipmentTab(character)}
                ${generateFeaturesTab(character)}
                ${generateDetailsTab(character)}

                <!-- Save Button (shown on all tabs) -->
                <div class="form-actions" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--light);">
                    <button type="button" class="btn-secondary" onclick="viewCharacter(${character.id})">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    // Setup form submission
    const form = document.getElementById('edit-character-form');
    form.onsubmit = handleEditCharacter;
}

// Close edit character view
function closeEditCharacter() {
    // Go back to character list
    document.getElementById('character-details').style.display = 'none';
    document.getElementById('characters-list').style.display = 'grid';
    currentCharacter = null;
}

// Generate Basic Info Tab HTML
function generateBasicInfoTab(char) {
    return `
        <div id="edit-tab-basic" class="char-edit-tab active">
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-name">Character Name *</label>
                    <input type="text" id="edit-char-name" required value="${escHtmlP(char.name)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-species">Species *</label>
                    <input type="text" id="edit-char-species" required value="${escHtmlP(char.species || char.race)}" placeholder="Human, Elf, Dwarf, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-class">Class *</label>
                    <input type="text" id="edit-char-class" required value="${escHtmlP(char.class_type)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-subclass">Subclass</label>
                    <input type="text" id="edit-char-subclass" value="${escHtmlP(char.subclass)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-level">Level</label>
                    <input type="number" id="edit-char-level" min="1" max="20" value="${char.level || 1}">
                </div>
                <div class="form-group">
                    <label for="edit-char-background">Background</label>
                    <input type="text" id="edit-char-background" value="${escHtmlP(char.background)}" placeholder="Soldier, Noble, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-size">Size</label>
                    <select id="edit-char-size">
                        <option value="Tiny" ${char.size === 'Tiny' ? 'selected' : ''}>Tiny</option>
                        <option value="Small" ${char.size === 'Small' ? 'selected' : ''}>Small</option>
                        <option value="Medium" ${char.size === 'Medium' || !char.size ? 'selected' : ''}>Medium</option>
                        <option value="Large" ${char.size === 'Large' ? 'selected' : ''}>Large</option>
                        <option value="Huge" ${char.size === 'Huge' ? 'selected' : ''}>Huge</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-char-speed">Speed (ft)</label>
                    <input type="number" id="edit-char-speed" value="${char.speed || 30}" min="0">
                </div>
                <div class="form-group">
                    <label for="edit-char-xp">Experience Points</label>
                    <input type="number" id="edit-char-xp" value="${char.experience_points || 0}" min="0">
                </div>

                <!-- Amber-Specific Fields -->
                <div class="form-group">
                    <label for="edit-char-order-chaos">Order/Chaos Balance</label>
                    <input type="number" id="edit-char-order-chaos" value="${char.order_chaos_value || 50}" min="0" max="100">
                    <small>0 = Pure Chaos, 50 = Neutral, 100 = Pure Order</small>
                </div>
                <div class="form-group">
                    <label for="edit-char-blood">Blood Purity</label>
                    <select id="edit-char-blood">
                        <option value="">None</option>
                        <option value="Half" ${char.blood_purity === 'Half' ? 'selected' : ''}>Half</option>
                        <option value="Pure" ${char.blood_purity === 'Pure' ? 'selected' : ''}>Pure</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-pattern" ${char.pattern_imprint ? 'checked' : ''}>
                        Has Pattern Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-logrus" ${char.logrus_imprint ? 'checked' : ''}>
                        Has Logrus Imprint
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-trump" ${char.trump_artist ? 'checked' : ''}>
                        Trump Artist
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-char-broken-imprint" ${char.broken_imprint ? 'checked' : ''}>
                        Broken Imprint
                    </label>
                    <small>The imprint took imperfectly — a fracture in the soul.</small>
                </div>
                <div class="form-group">
                    <label for="edit-char-pattern-type">Pattern Type</label>
                    <select id="edit-char-pattern-type">
                        <option value="">— None —</option>
                        <option value="Pattern" ${char.pattern_type === 'Pattern' ? 'selected' : ''}>Pattern (First)</option>
                        <option value="Argent Refrain" ${char.pattern_type === 'Argent Refrain' ? 'selected' : ''}>The Argent Refrain</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-char-pattern-mastery">Pattern Mastery Level</label>
                    <input type="number" id="edit-char-pattern-mastery" min="0" max="5" value="${char.pattern_mastery_level || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-logrus-mastery">Logrus Mastery Level</label>
                    <input type="number" id="edit-char-logrus-mastery" min="0" max="5" value="${char.logrus_mastery_level || 0}">
                    <small>1 = Basic, 2 = Advanced, 3 = Master</small>
                </div>
                <div class="form-group">
                    <label for="edit-char-trump-mastery">Trump Mastery Level</label>
                    <input type="number" id="edit-char-trump-mastery" min="0" max="5" value="${char.trump_mastery_level || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-shadow-origin">Home Shadow</label>
                    <select id="edit-char-shadow-origin">
                        <option value="">— None —</option>
                        ${playerAllShadows.map(s => `<option value="${s.id}"${char.shadow_origin_id == s.id ? ' selected' : ''}>${escHtmlP(s.name)}</option>`).join('')}
                    </select>
                    <small>The shadow where your character's story began.</small>
                </div>
            </div>
        </div>
    `;
}

// Generate Abilities & Skills Tab HTML
function generateAbilitiesTab(char) {
    return `
        <div id="edit-tab-abilities" class="char-edit-tab" style="display: none;">
            <h4>Ability Scores</h4>
            <div class="form-grid abilities">
                <div class="form-group">
                    <label for="edit-char-str">Strength</label>
                    <input type="number" id="edit-char-str" min="1" max="30" value="${char.strength || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-dex">Dexterity</label>
                    <input type="number" id="edit-char-dex" min="1" max="30" value="${char.dexterity || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-con">Constitution</label>
                    <input type="number" id="edit-char-con" min="1" max="30" value="${char.constitution || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-int">Intelligence</label>
                    <input type="number" id="edit-char-int" min="1" max="30" value="${char.intelligence || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-wis">Wisdom</label>
                    <input type="number" id="edit-char-wis" min="1" max="30" value="${char.wisdom || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-cha">Charisma</label>
                    <input type="number" id="edit-char-cha" min="1" max="30" value="${char.charisma || 10}">
                </div>
            </div>

            <h4>Saving Throws</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-str" ${char.save_strength ? 'checked' : ''}> Strength</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-dex" ${char.save_dexterity ? 'checked' : ''}> Dexterity</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-con" ${char.save_constitution ? 'checked' : ''}> Constitution</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-int" ${char.save_intelligence ? 'checked' : ''}> Intelligence</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-wis" ${char.save_wisdom ? 'checked' : ''}> Wisdom</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-save-cha" ${char.save_charisma ? 'checked' : ''}> Charisma</label>
                </div>
            </div>

            <h4>Skills (Proficiency Level: 0=None, 1=Proficient, 2=Expertise)</h4>
            <div class="skills-grid">
                ${generateSkillSelect('acrobatics', 'Acrobatics (DEX)', char.skill_acrobatics || 0)}
                ${generateSkillSelect('animal-handling', 'Animal Handling (WIS)', char.skill_animal_handling || 0)}
                ${generateSkillSelect('arcana', 'Arcana (INT)', char.skill_arcana || 0)}
                ${generateSkillSelect('athletics', 'Athletics (STR)', char.skill_athletics || 0)}
                ${generateSkillSelect('deception', 'Deception (CHA)', char.skill_deception || 0)}
                ${generateSkillSelect('history', 'History (INT)', char.skill_history || 0)}
                ${generateSkillSelect('insight', 'Insight (WIS)', char.skill_insight || 0)}
                ${generateSkillSelect('intimidation', 'Intimidation (CHA)', char.skill_intimidation || 0)}
                ${generateSkillSelect('investigation', 'Investigation (INT)', char.skill_investigation || 0)}
                ${generateSkillSelect('medicine', 'Medicine (WIS)', char.skill_medicine || 0)}
                ${generateSkillSelect('nature', 'Nature (INT)', char.skill_nature || 0)}
                ${generateSkillSelect('perception', 'Perception (WIS)', char.skill_perception || 0)}
                ${generateSkillSelect('performance', 'Performance (CHA)', char.skill_performance || 0)}
                ${generateSkillSelect('persuasion', 'Persuasion (CHA)', char.skill_persuasion || 0)}
                ${generateSkillSelect('religion', 'Religion (INT)', char.skill_religion || 0)}
                ${generateSkillSelect('sleight-of-hand', 'Sleight of Hand (DEX)', char.skill_sleight_of_hand || 0)}
                ${generateSkillSelect('stealth', 'Stealth (DEX)', char.skill_stealth || 0)}
                ${generateSkillSelect('survival', 'Survival (WIS)', char.skill_survival || 0)}
            </div>
        </div>
    `;
}

// Helper function to generate skill select dropdowns
function generateSkillSelect(skillId, label, value) {
    return `
        <div class="form-group">
            <label for="edit-skill-${skillId}">${label}</label>
            <select id="edit-skill-${skillId}">
                <option value="0" ${value === 0 ? 'selected' : ''}>Not Proficient</option>
                <option value="1" ${value === 1 ? 'selected' : ''}>Proficient</option>
                <option value="2" ${value === 2 ? 'selected' : ''}>Expertise</option>
            </select>
        </div>
    `;
}

// Generate Combat & HP Tab HTML
function generateCombatTab(char) {
    return `
        <div id="edit-tab-combat" class="char-edit-tab" style="display: none;">
            <h4>Hit Points & Death Saves</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-max-hp">Max Hit Points</label>
                    <input type="number" id="edit-char-max-hp" min="1" value="${char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-current-hp">Current Hit Points</label>
                    <input type="number" id="edit-char-current-hp" min="0" value="${char.current_hp || char.max_hp || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-temp-hp">Temporary Hit Points</label>
                    <input type="number" id="edit-char-temp-hp" min="0" value="${char.temp_hit_points || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-hit-dice">Hit Dice (e.g., 5d8)</label>
                    <input type="text" id="edit-char-hit-dice" value="${escHtmlP(char.hit_dice_total) || '1d8'}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-successes">Death Save Successes</label>
                    <input type="number" id="edit-char-death-successes" min="0" max="3" value="${char.death_save_successes || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-death-failures">Death Save Failures</label>
                    <input type="number" id="edit-char-death-failures" min="0" max="3" value="${char.death_save_failures || 0}">
                </div>
            </div>

            <h4>Combat Stats</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-ac">Armor Class</label>
                    <input type="number" id="edit-char-ac" min="0" value="${char.armor_class || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-initiative">Initiative Bonus</label>
                    <input type="number" id="edit-char-initiative" value="${char.initiative_bonus || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-char-proficiency">Proficiency Bonus</label>
                    <input type="number" id="edit-char-proficiency" min="2" max="6" value="${char.proficiency_bonus || 2}">
                </div>
                <div class="form-group">
                    <label for="edit-char-passive-perception">Passive Perception</label>
                    <input type="number" id="edit-char-passive-perception" value="${char.passive_perception || 10}">
                </div>
                <div class="form-group">
                    <label for="edit-char-inspiration">Heroic Inspiration</label>
                    <input type="number" id="edit-char-inspiration" min="0" value="${char.heroic_inspiration || 0}">
                </div>
            </div>

            <h4>Armor & Weapon Proficiencies</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-light" ${char.armor_light ? 'checked' : ''}> Light Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-medium" ${char.armor_medium ? 'checked' : ''}> Medium Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-heavy" ${char.armor_heavy ? 'checked' : ''}> Heavy Armor</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-armor-shields" ${char.armor_shields ? 'checked' : ''}> Shields</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-simple" ${char.weapons_simple ? 'checked' : ''}> Simple Weapons</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="edit-weapons-martial" ${char.weapons_martial ? 'checked' : ''}> Martial Weapons</label>
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-tools">Tool Proficiencies</label>
                <textarea id="edit-char-tools" rows="2" placeholder="Comma-separated list, e.g., Thieves' Tools, Smith's Tools">${escHtmlP(char.tools_proficiency)}</textarea>
            </div>
        </div>
    `;
}

// Generate Spells Tab HTML
function generateSpellsTab(char) {
    return `
        <div id="edit-tab-spells" class="char-edit-tab" style="display: none;">
            <h4>Spellcasting</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-spellcasting-ability">Spellcasting Ability</label>
                    <select id="edit-spellcasting-ability">
                        <option value="">None</option>
                        <option value="INT" ${char.spellcasting_ability === 'INT' ? 'selected' : ''}>Intelligence</option>
                        <option value="WIS" ${char.spellcasting_ability === 'WIS' ? 'selected' : ''}>Wisdom</option>
                        <option value="CHA" ${char.spellcasting_ability === 'CHA' ? 'selected' : ''}>Charisma</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-spell-save-dc">Spell Save DC</label>
                    <input type="number" id="edit-spell-save-dc" min="0" value="${char.spell_save_dc || 8}">
                </div>
                <div class="form-group">
                    <label for="edit-spell-attack-bonus">Spell Attack Bonus</label>
                    <input type="number" id="edit-spell-attack-bonus" value="${char.spell_attack_bonus || 0}">
                </div>
            </div>

            <h4>Spell Slots</h4>
            <div class="spell-slots-grid">
                ${generateSpellSlotRow(1, char)}
                ${generateSpellSlotRow(2, char)}
                ${generateSpellSlotRow(3, char)}
                ${generateSpellSlotRow(4, char)}
                ${generateSpellSlotRow(5, char)}
                ${generateSpellSlotRow(6, char)}
                ${generateSpellSlotRow(7, char)}
                ${generateSpellSlotRow(8, char)}
                ${generateSpellSlotRow(9, char)}
            </div>

            <p><em>Note: Detailed spell management (prepared spells, cantrips) will be added in a future update.</em></p>
        </div>
    `;
}

// Helper to generate spell slot row
function generateSpellSlotRow(level, char) {
    const total = char[`spell_slots_${level}_total`] || 0;
    const used = char[`spell_slots_${level}_expended`] || 0;
    return `
        <div class="form-group">
            <label>Level ${level}</label>
            <input type="number" id="edit-slots-${level}-total" min="0" placeholder="Total" value="${total}" style="width: 60px;">
            <input type="number" id="edit-slots-${level}-used" min="0" placeholder="Used" value="${used}" style="width: 60px;">
        </div>
    `;
}

// Generate Equipment Tab HTML
function generateEquipmentTab(char) {
    return `
        <div id="edit-tab-equipment" class="char-edit-tab" style="display: none;">
            <h4>Currency</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-copper">Copper Pieces (CP)</label>
                    <input type="number" id="edit-copper" min="0" value="${char.copper_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-silver">Silver Pieces (SP)</label>
                    <input type="number" id="edit-silver" min="0" value="${char.silver_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-electrum">Electrum Pieces (EP)</label>
                    <input type="number" id="edit-electrum" min="0" value="${char.electrum_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-gold">Gold Pieces (GP)</label>
                    <input type="number" id="edit-gold" min="0" value="${char.gold_pieces || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-platinum">Platinum Pieces (PP)</label>
                    <input type="number" id="edit-platinum" min="0" value="${char.platinum_pieces || 0}">
                </div>
            </div>

            <h4>Magic Item Attunement</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-attunement-used">Slots Used</label>
                    <input type="number" id="edit-attunement-used" min="0" max="3" value="${char.attunement_slots_used || 0}">
                </div>
                <div class="form-group">
                    <label for="edit-attunement-max">Max Slots</label>
                    <input type="number" id="edit-attunement-max" min="0" max="6" value="${char.attunement_slots_max || 3}">
                </div>
            </div>

            <div class="form-group">
                <label for="edit-char-languages">Languages</label>
                <textarea id="edit-char-languages" rows="2" placeholder="Common, Elvish, Draconic, etc.">${escHtmlP(char.languages)}</textarea>
                <small>Comma-separated list</small>
            </div>

            <p><em>Note: Detailed equipment, weapons, and gear are managed in the main Characters tab.</em></p>
        </div>
    `;
}

// Generate Features & Traits Tab HTML
function generateFeaturesTab(char) {
    return `
        <div id="edit-tab-features" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-class-features">Class Features</label>
                <textarea id="edit-char-class-features" rows="6" placeholder="List your class features here...">${escHtmlP(char.class_features)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-species-traits">Species Traits</label>
                <textarea id="edit-char-species-traits" rows="6" placeholder="List your species traits here...">${escHtmlP(char.species_traits)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-feats">Feats</label>
                <textarea id="edit-char-feats" rows="6" placeholder="List your feats here...">${escHtmlP(char.feats)}</textarea>
            </div>
        </div>
    `;
}

// Generate Appearance & Story Tab HTML
function generateDetailsTab(char) {
    return `
        <div id="edit-tab-details" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-appearance">Appearance</label>
                <textarea id="edit-char-appearance" rows="4" placeholder="Describe your character's physical appearance...">${escHtmlP(char.appearance)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-personality">Personality & Traits</label>
                <textarea id="edit-char-personality" rows="4" placeholder="Describe your character's personality...">${escHtmlP(char.personality)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-backstory">Backstory</label>
                <textarea id="edit-char-backstory" rows="6" placeholder="Tell your character's story...">${escHtmlP(char.backstory)}</textarea>
            </div>
        </div>
    `;
}

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
        strength: parseInt(document.getElementById('edit-char-str').value),
        dexterity: parseInt(document.getElementById('edit-char-dex').value),
        constitution: parseInt(document.getElementById('edit-char-con').value),
        intelligence: parseInt(document.getElementById('edit-char-int').value),
        wisdom: parseInt(document.getElementById('edit-char-wis').value),
        charisma: parseInt(document.getElementById('edit-char-cha').value),

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
        const response = await fetch(`/api/characters/${currentCharacter.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(characterData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update character');
        }

        // Close modal
        closeEditCharacter();

        // Reload characters
        await loadCharacters();

        // If viewing character sheet, reload it
        if (document.getElementById('character-details').style.display === 'block') {
            await viewCharacter(currentCharacter.id);
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

// ========== CLAIMS FUNCTIONS ==========

