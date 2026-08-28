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
                    <input type="text" id="edit-char-hit-dice" value="${escHtml(char.hit_dice_total) || '1d8'}">
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
                <textarea id="edit-char-tools" rows="2" placeholder="Comma-separated list, e.g., Thieves' Tools, Smith's Tools">${escHtml(char.tools_proficiency)}</textarea>
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
                <textarea id="edit-char-languages" rows="2" placeholder="Common, Elvish, Draconic, etc.">${escHtml(char.languages)}</textarea>
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
                <textarea id="edit-char-class-features" rows="6" placeholder="List your class features here...">${escHtml(char.class_features)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-species-traits">Species Traits</label>
                <textarea id="edit-char-species-traits" rows="6" placeholder="List your species traits here...">${escHtml(char.species_traits)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-feats">Feats</label>
                <textarea id="edit-char-feats" rows="6" placeholder="List your feats here...">${escHtml(char.feats)}</textarea>
            </div>
        </div>
    `;
}

// Generate Appearance & Story Tab HTML
export { generateCombatTab, generateEquipmentTab, generateFeaturesTab, generateSpellsTab };