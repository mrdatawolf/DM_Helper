(function exposeDndFullSheet(root, factory) {
    root.DndFullSheet = factory(root.DndComputedCharacter);
    if (typeof module === 'object' && module.exports) {
        module.exports = root.DndFullSheet;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDndFullSheet(dndComputedCharacter) {
    const { ABILITIES, SKILLS, computedCharacter } = dndComputedCharacter;

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function signed(value) {
        return Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
    }

    function field(label, value) {
        return `<div class="field"><div class="field-label">${escapeHtml(label)}</div><div class="field-value">${escapeHtml(value) || '—'}</div></div>`;
    }

    function textBlock(label, value) {
        return `<div class="text-block"><h4>${escapeHtml(label)}</h4><p>${value ? escapeHtml(value).replace(/\n/g, '<br>') : '<em>—</em>'}</p></div>`;
    }

    // Full, read-only, section-complete D&D 5e view for the "View As..."
    // picker (data-complete parity with the fillable sample PDF, styled
    // consistently with the rest of this app rather than a pixel replica of
    // the paper form). Deliberately a separate, plain-string template from
    // renderDndCharacterSheet() (public/js/player/player-character-sheet.js):
    // that template relies on bindDndCharacterSheet() hydrating empty
    // slot() placeholders in a live DOM and wiring click-to-edit/add/remove/
    // PDF-download behavior, none of which a read-only, string-returning
    // registry entry can do. Every value here is computed via the same
    // shared computedCharacter() the editable sheet uses, so the numbers
    // can't drift from it.
    function renderDndFullSheet(character) {
        const computed = computedCharacter(character);

        const abilitiesHtml = ABILITIES.map(([key, short]) => `
            <div class="ability-block">
                <div class="ability-label">${short}</div>
                <div class="ability-score">${computed.ability[key].score}</div>
                <div class="ability-modifier">${signed(computed.ability[key].modifier)}</div>
                <div class="ability-save">${signed(computed.ability[key].save)} save</div>
            </div>`).join('');

        const skillsHtml = SKILLS.map(([key, label, abilityKey]) => `
            <div class="skill-row">
                <span class="skill-bonus">${signed(computed.skills[key])}</span>
                <span class="skill-name">${escapeHtml(label)}</span>
                <span class="skill-ability">${ABILITIES.find(entry => entry[0] === abilityKey)[1]}</span>
            </div>`).join('');

        const weaponsHtml = (character.weapons || []).length
            ? (character.weapons || []).map(weapon => `
                <div class="list-row">
                    <strong>${escapeHtml(weapon.name)}</strong>
                    <span>${signed(weapon.attack_bonus)} · ${escapeHtml(weapon.damage_type) || '—'}</span>
                </div>`).join('')
            : '<p class="empty-note">No attacks recorded.</p>';

        const spellsByLevel = (character.spells || []).reduce((groups, spell) => {
            const level = Number(spell.spell_level) || 0;
            (groups[level] ||= []).push(spell);
            return groups;
        }, {});
        const spellsHtml = Object.keys(spellsByLevel).length
            ? Object.entries(spellsByLevel).sort(([a], [b]) => a - b).map(([level, spells]) => `
                <div class="spell-level-group">
                    <h5>${level === '0' ? 'Cantrips' : `Level ${level}`}</h5>
                    ${spells.map(spell => `
                        <div class="list-row">
                            <strong>${escapeHtml(spell.spell_name)}</strong>
                            <span>${spell.is_prepared ? 'Prepared' : 'Known'}${spell.concentration ? ' · Concentration' : ''}${spell.ritual ? ' · Ritual' : ''}</span>
                        </div>`).join('')}
                </div>`).join('')
            : '<p class="empty-note">No spells recorded.</p>';

        const slotsHtml = Array.from({ length: 9 }, (_, index) => index + 1)
            .map(level => [level, Number(character[`spell_slots_${level}_total`]) || 0])
            .filter(([, total]) => total > 0)
            .map(([level, total]) => `<span class="spell-slot">Lvl ${level}: ${Number(character[`spell_slots_${level}_expended`]) || 0}/${total}</span>`)
            .join(' ');

        const gearHtml = (character.gear || []).length
            ? (character.gear || []).map(item => `<div class="list-row"><strong>${escapeHtml(item.item_name)}</strong><span>${item.quantity > 1 ? `×${item.quantity}` : ''} ${item.is_equipped ? '(equipped)' : ''}</span></div>`).join('')
            : '<p class="empty-note">No equipment recorded.</p>';

        return `
            <style>
                /* Embedded, not in an external stylesheet: this view renders
                   inside a modal on both the player and DM dashboards, which
                   load different, page-specific stylesheets — embedding here
                   guarantees it looks right regardless of which page it's
                   opened from. */
                .dnd-full-sheet { color: #1c2b3a; }
                .dnd-full-sheet .sheet-header { background: #2c5a8f; color: #fff; padding: 14px 18px; border-radius: 10px 10px 0 0; margin: -1px -1px 14px; }
                .dnd-full-sheet .sheet-header h2 { margin: 0 0 4px; }
                .dnd-full-sheet .sheet-subtitle { font-size: .85rem; opacity: .9; }
                .dnd-full-sheet .sheet-section { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #dfe6ee; }
                .dnd-full-sheet .sheet-section:last-child { border-bottom: none; }
                .dnd-full-sheet h3 { margin: 0 0 10px; color: #2c5a8f; }
                .dnd-full-sheet h4 { margin: 12px 0 6px; }
                .dnd-full-sheet .ability-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; }
                .dnd-full-sheet .ability-block { background: #eaf2fb; border: 1px solid #4a7fc9; border-radius: 8px; padding: 8px; text-align: center; }
                .dnd-full-sheet .ability-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #1c3f66; }
                .dnd-full-sheet .ability-score { font-size: 1.1rem; font-weight: 700; }
                .dnd-full-sheet .ability-modifier { font-size: .85rem; color: #2c5a8f; }
                .dnd-full-sheet .ability-save { font-size: .72rem; color: #5a7a9f; }
                .dnd-full-sheet .sheet-columns { display: grid; grid-template-columns: minmax(200px, 1fr) minmax(240px, 1.4fr); gap: 18px; }
                .dnd-full-sheet .skill-list { display: grid; gap: 3px; }
                .dnd-full-sheet .skill-row { display: grid; grid-template-columns: 3em 1fr auto; gap: 8px; font-size: .88rem; padding: 2px 0; }
                .dnd-full-sheet .skill-bonus { font-weight: 700; }
                .dnd-full-sheet .skill-ability { color: #7a8ca0; font-size: .78rem; }
                .dnd-full-sheet .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
                .dnd-full-sheet .field-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #7a8ca0; }
                .dnd-full-sheet .field-value { font-size: .95rem; }
                .dnd-full-sheet .list-row { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px dashed #e0e6ee; font-size: .9rem; }
                .dnd-full-sheet .empty-note { color: #9aa7b5; font-style: italic; font-size: .88rem; }
                .dnd-full-sheet .spell-slots { margin: 8px 0; font-size: .85rem; color: #4a5a6f; }
                .dnd-full-sheet .spell-slot { display: inline-block; margin-right: 10px; }
                .dnd-full-sheet .spell-level-group h5 { margin: 8px 0 2px; color: #4a5a6f; }
                .dnd-full-sheet .text-block { margin-top: 10px; }
                .dnd-full-sheet .text-block h4 { margin: 0 0 4px; color: #2c5a8f; font-size: .85rem; text-transform: uppercase; }
                .dnd-full-sheet .text-block p { margin: 0; font-size: .92rem; line-height: 1.5; }
                @media (max-width: 760px) { .dnd-full-sheet .sheet-columns { grid-template-columns: 1fr; } }
            </style>
            <section class="dnd-full-sheet">
                <header class="sheet-header">
                    <h2>${escapeHtml(character.name || 'Character')}</h2>
                    <div class="sheet-subtitle">${escapeHtml(character.class_type)}${character.subclass ? ` (${escapeHtml(character.subclass)})` : ''} · Level ${character.level || 1} · ${escapeHtml(character.species)} · ${escapeHtml(character.background)}</div>
                    <div class="sheet-subtitle">${escapeHtml(character.alignment)} · Player: ${escapeHtml(character.player_name)} · XP: ${character.experience_points ?? 0}</div>
                </header>

                <section class="sheet-section">
                    <h3>Abilities &amp; Saves</h3>
                    <div class="ability-grid">${abilitiesHtml}</div>
                </section>

                <div class="sheet-columns">
                    <section class="sheet-section">
                        <h3>Skills</h3>
                        <div class="skill-list">${skillsHtml}</div>
                    </section>

                    <section class="sheet-section">
                        <h3>Combat</h3>
                        <div class="field-grid">
                            ${field('Armor Class', character.armor_class)}
                            ${field('Initiative', signed(computed.initiative))}
                            ${field('Speed', character.speed)}
                            ${field('Hit Points', `${character.current_hp ?? '—'} / ${character.max_hp ?? '—'}`)}
                            ${field('Temp HP', character.temp_hit_points)}
                            ${field('Hit Dice', `${character.hit_dice_current || '—'} / ${character.hit_dice_total || '—'}`)}
                            ${field('Death Saves', `${character.death_save_successes || 0} succ / ${character.death_save_failures || 0} fail`)}
                            ${field('Proficiency Bonus', signed(computed.proficiency))}
                            ${field('Passive Perception', computed.passivePerception)}
                            ${field('Inspiration', character.heroic_inspiration ? 'Yes' : 'No')}
                        </div>

                        <h4>Attacks</h4>
                        ${weaponsHtml}
                    </section>
                </div>

                <section class="sheet-section">
                    <h3>Spellcasting</h3>
                    <div class="field-grid">
                        ${field('Ability', character.spellcasting_ability)}
                        ${field('Save DC', computed.spellSaveDc)}
                        ${field('Attack Bonus', signed(computed.spellAttackBonus))}
                    </div>
                    ${slotsHtml ? `<div class="spell-slots">${slotsHtml}</div>` : ''}
                    ${spellsHtml}
                </section>

                <section class="sheet-section">
                    <h3>Equipment &amp; Training</h3>
                    <div class="field-grid">
                        ${field('Currency', `${character.copper_pieces || 0}cp ${character.silver_pieces || 0}sp ${character.electrum_pieces || 0}ep ${character.gold_pieces || 0}gp ${character.platinum_pieces || 0}pp`)}
                        ${field('Attunement', `${character.attunement_slots_used || 0} / ${character.attunement_slots_max || 3}`)}
                        ${field('Armor Training', [character.armor_light && 'Light', character.armor_medium && 'Medium', character.armor_heavy && 'Heavy', character.armor_shields && 'Shields'].filter(Boolean).join(', '))}
                        ${field('Weapon Training', [character.weapons_simple && 'Simple', character.weapons_martial && 'Martial'].filter(Boolean).join(', '))}
                        ${field('Tools', character.tools_proficiency)}
                        ${field('Languages', character.languages)}
                    </div>
                    <h4>Gear</h4>
                    ${gearHtml}
                </section>

                <section class="sheet-section">
                    <h3>Personality &amp; Appearance</h3>
                    <div class="field-grid">
                        ${field('Age', character.age)}
                        ${field('Height', character.height)}
                        ${field('Weight', character.weight)}
                        ${field('Eyes', character.eyes)}
                        ${field('Skin', character.skin)}
                        ${field('Hair', character.hair)}
                    </div>
                    ${textBlock('Appearance', character.appearance)}
                    ${textBlock('Personality', character.personality)}
                    ${textBlock('Desires', character.desires)}
                    ${textBlock('Fears', character.fears)}
                    ${textBlock('Allies & Organizations', character.allies_organizations)}
                    ${textBlock('Treasure', character.treasure)}
                    ${textBlock('Backstory', character.backstory)}
                </section>

                <section class="sheet-section">
                    <h3>Features &amp; Traits</h3>
                    ${textBlock('Class Features', character.class_features)}
                    ${textBlock('Species Traits', character.species_traits)}
                    ${textBlock('Feats', character.feats)}
                </section>
            </section>`;
    }

    return { renderDndFullSheet };
}));
