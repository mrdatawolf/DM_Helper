import { state } from './player-state.js';

// Generate Basic Info Tab HTML
function generateBasicInfoTab(char) {
    return `
        <div id="edit-tab-basic" class="char-edit-tab active">
            <div class="form-grid">
                <div class="form-group">
                    <label for="edit-char-name">Character Name *</label>
                    <input type="text" id="edit-char-name" required value="${escHtml(char.name)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-species">Species *</label>
                    <input type="text" id="edit-char-species" required value="${escHtml(char.species || char.race)}" placeholder="Human, Elf, Dwarf, etc.">
                </div>
                <div class="form-group">
                    <label for="edit-char-class">Class *</label>
                    <input type="text" id="edit-char-class" required value="${escHtml(char.class_type)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-subclass">Subclass</label>
                    <input type="text" id="edit-char-subclass" value="${escHtml(char.subclass)}">
                </div>
                <div class="form-group">
                    <label for="edit-char-level">Level</label>
                    <input type="number" id="edit-char-level" min="1" max="20" value="${char.level || 1}">
                </div>
                <div class="form-group">
                    <label for="edit-char-background">Background</label>
                    <input type="text" id="edit-char-background" value="${escHtml(char.background)}" placeholder="Soldier, Noble, etc.">
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
                        ${state.playerAllShadows.map(s => `<option value="${s.id}"${char.shadow_origin_id == s.id ? ' selected' : ''}>${escHtml(s.name)}</option>`).join('')}
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

export { generateAbilitiesTab, generateBasicInfoTab };
