// player-wizard-steps.js — split from player-dashboard.js (behavior unchanged)
// ── Step 3: stat assignment ──────────────────────────────────

function wizardRenderStats() {
    const mods = calcAmberMods();

    // Refresh chip states (used vs available)
    const usedVals = Object.values(wiz.assign).filter(v => v !== null);
    document.querySelectorAll('.chip').forEach(chip => {
        const v = parseInt(chip.dataset.val);
        const isUsed = usedVals.includes(v);
        chip.classList.toggle('used', isUsed);
        chip.classList.toggle('selected', wiz.selectedChipVal === v && !isUsed);
        chip.disabled = isUsed;
    });

    // Refresh stat slot cards
    for (const stat of STAT_KEYS) {
        const base = wiz.assign[stat];
        const mod  = mods[stat] || 0;
        const card = document.querySelector(`.stat-slot-card[data-stat="${stat}"]`);

        document.getElementById(`ssc-${stat}`).textContent = base !== null ? base : '—';

        const modEl   = document.getElementById(`amod-${stat}`);
        const finalEl = document.getElementById(`sfinal-${stat}`);

        if (mod !== 0) {
            modEl.textContent = mod > 0 ? `+${mod}` : `${mod}`;
            modEl.className   = `ssc-amber-mod${mod < 0 ? ' neg' : ''}`;
        } else {
            modEl.textContent = '';
        }

        if (base !== null) {
            finalEl.textContent = base + mod;
        } else {
            finalEl.textContent = '';
        }

        card.classList.toggle('has-value', base !== null);
        card.classList.toggle('targeted', wiz.selectedChipVal !== null && base === null);
    }
}

function selectChip(el) {
    const val = parseInt(el.dataset.val);
    if (el.classList.contains('used')) return;
    wiz.selectedChipVal = wiz.selectedChipVal === val ? null : val;
    wizardRenderStats();
}

function assignStat(stat) {
    const info = FIELD_INFO['stat-' + stat];
    if (info) {
        _wizardInfoFocused = { title: info.title, sections: info };
        wizardShowInfoPanel(info.title, info);
    }
    if (wiz.selectedChipVal === null) {
        // Clicking an occupied slot without a chip selected: return value to pool
        if (wiz.assign[stat] !== null) {
            wiz.assign[stat] = null;
            wizardRenderStats();
        }
        return;
    }
    // Assign the selected chip
    // If slot already has a value, swap it back to pool first (find and free old chip)
    wiz.assign[stat] = wiz.selectedChipVal;
    wiz.selectedChipVal = null;
    wizardRenderStats();
}

// ── Step 4: flaws & traits ───────────────────────────────────

function wizardRenderFlaws() {
    const intro = document.getElementById('flaws-intro');
    const content = document.getElementById('flaws-content');
    const imprint = wiz.imprint;
    const isLogrus = imprint.startsWith('Logrus');
    const isNone = imprint === 'None';

    if (isNone) {
        const activeFlavor = wiz.noImprintFlavor || 'pattern';
        intro.textContent = 'You have no imprint — the lack of alignment is your flaw. You receive one free Trait. Choose its flavor:';
        content.innerHTML = `
            <div style="display:flex;gap:12px;margin-bottom:16px;">
                <label class="radio-card" style="flex:1"
                    onmouseenter="wizardHoverNoImprint('pattern')" onmouseleave="wizardRevertInfoPanel()">
                    <input type="radio" name="w-noflavor" value="pattern"
                        ${activeFlavor === 'pattern' ? 'checked' : ''}
                        onchange="wizardFlavorChange()">
                    <div class="rc-body">
                        <strong>Pattern Flavor</strong>
                        <small>${FLAW_TRAIT_PAIRS.noImprint.pattern.name}</small>
                    </div>
                </label>
                <label class="radio-card" style="flex:1"
                    onmouseenter="wizardHoverNoImprint('logrus')" onmouseleave="wizardRevertInfoPanel()">
                    <input type="radio" name="w-noflavor" value="logrus"
                        ${activeFlavor === 'logrus' ? 'checked' : ''}
                        onchange="wizardFlavorChange()">
                    <div class="rc-body">
                        <strong>Logrus Flavor</strong>
                        <small>${FLAW_TRAIT_PAIRS.noImprint.logrus.name}</small>
                    </div>
                </label>
            </div>
            <p class="panel-note">You may also take up to 2 flaw/trait pairs below for additional benefits.</p>
            <div id="flaws-pairs-container">${renderFlawPairs(activeFlavor)}</div>
        `;
    } else {
        const path = isLogrus ? 'logrus' : 'pattern';
        intro.textContent = `You may take up to 2 flaw/trait pairs. Each flaw you accept grants its paired trait.`;
        content.innerHTML = renderFlawPairs(path);
    }
}

function renderFlawPairs(path) {
    return FLAW_TRAIT_PAIRS[path].map(pair => `
        <div class="flaw-trait-pair${wiz.flawsChosen.includes(pair.id) ? ' selected' : ''}" id="ftp-${pair.id}"
            onmouseenter="wizardHoverFlawPair('${pair.id}', '${path}')" onmouseleave="wizardRevertInfoPanel()">
            <label>
                <input type="checkbox" value="${pair.id}"
                    ${wiz.flawsChosen.includes(pair.id) ? 'checked' : ''}
                    onchange="wizardFlawToggle('${pair.id}', this.checked, this)"
                    style="margin-top:4px;flex-shrink:0">
                <div class="ftp-content">
                    <div class="ftp-flaw">
                        <span class="flaw-label">Flaw</span>
                        <strong>${pair.flaw.name}</strong>
                    </div>
                    <div class="ftp-divider">⟶ grants ⟶</div>
                    <div class="ftp-trait">
                        <span class="trait-label">Trait</span>
                        <strong>${pair.trait.name}</strong>
                    </div>
                </div>
            </label>
        </div>
    `).join('');
}

function wizardHoverFlawPair(id, path) {
    const pair = (FLAW_TRAIT_PAIRS[path] || []).find(p => p.id === id);
    if (!pair) return;
    wizardShowInfoPanel(`${pair.flaw.name} → ${pair.trait.name}`, {
        flavor:    `<strong>Flaw:</strong> ${pair.flaw.desc}`,
        mechanics: `<strong>Trait:</strong> ${pair.trait.desc}`
    });
}

function wizardHoverNoImprint(flavor) {
    const t = FLAW_TRAIT_PAIRS.noImprint[flavor];
    if (!t) return;
    wizardShowInfoPanel(`Free Trait: ${t.name}`, { flavor: t.desc });
}

function wizardFlawToggle(id, checked, el) {
    if (checked) {
        if (wiz.flawsChosen.length >= 2) {
            showToast('You may only take up to 2 flaw/trait pairs.');
            if (el) el.checked = false;
            return;
        }
        wiz.flawsChosen.push(id);
    } else {
        wiz.flawsChosen = wiz.flawsChosen.filter(f => f !== id);
    }
    document.querySelectorAll('.flaw-trait-pair').forEach(el => {
        const id2 = el.id.replace('ftp-', '');
        el.classList.toggle('selected', wiz.flawsChosen.includes(id2));
    });
}

function wizardFlavorChange() {
    const checked = document.querySelector('input[name="w-noflavor"]:checked');
    wiz.noImprintFlavor = checked ? checked.value : null;
    const container = document.getElementById('flaws-pairs-container');
    if (container && wiz.noImprintFlavor) {
        wiz.flawsChosen = [];
        container.innerHTML = renderFlawPairs(wiz.noImprintFlavor);
    }
}

// ── Step 5: class & trump ────────────────────────────────────

function selectClass(id) {
    wiz.classType = wiz.classType === id ? '' : id;
    document.querySelectorAll('.class-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.cls === wiz.classType);
    });
    const cls = CLASSES_5E.find(c => c.id === wiz.classType);
    wizardPinInfoPanel(cls ? cls.name : null, cls ? _classLore(cls) : null);
}

function wizardRenderClass() {
    const finals = getFinalStats();
    const eligible = isTrumpEligible(finals);
    // Preserve trump checkbox state across re-renders
    const prevTrump = wiz.trumpArtist;
    wiz.trumpArtist = false;

    // Trump eligibility section
    const trumpEl = document.getElementById('trump-eligibility');
    if (eligible) {
        trumpEl.className = 'trump-check eligible';
        trumpEl.innerHTML = `
            ✓ Trump Artist Eligible
            <label style="margin-left:16px;font-weight:normal;font-size:0.88rem;">
                <input type="checkbox" id="w-trump-check" ${prevTrump ? 'checked' : ''} onchange="wiz.trumpArtist=this.checked">
                Yes, this character is a Trump Artist
            </label>
            <div style="font-size:0.8rem;font-weight:400;margin-top:4px;">
                (DEX+WIS = ${finals.DEX + finals.WIS} or INT+WIS = ${finals.INT + finals.WIS} — threshold: 30)
            </div>`;
        wiz.trumpArtist = prevTrump;
    } else {
        trumpEl.className = 'trump-check ineligible';
        trumpEl.innerHTML = `✗ Trump Artist not yet eligible
            <div style="font-size:0.8rem;font-weight:400;margin-top:4px;">
                Requires DEX+WIS ≥ 30 or INT+WIS ≥ 30.
                Current: DEX+WIS = ${finals.DEX + finals.WIS}, INT+WIS = ${finals.INT + finals.WIS}.
            </div>`;
    }

    // Class card grid
    const recommended = getRecommendedClasses(finals);
    const gridEl = document.getElementById('class-card-grid');
    gridEl.innerHTML = CLASSES_5E.map(cls => {
        const gate = classGateStatus(cls, finals);
        const isRec = recommended.has(cls.id);
        const isSelected = wiz.classType === cls.id;
        const statTags = cls.primary.map(s =>
            `<span class="cls-stat-tag primary">${s} ${finals[s]}</span>`
        ).concat(cls.secondary.map(s =>
            `<span class="cls-stat-tag secondary">${s} ${finals[s]}</span>`
        )).join('');

        return `
        <div class="class-card${isSelected ? ' selected' : ''}${isRec ? ' recommended' : ''}${!gate.pass ? ' soft-warn' : ''}"
             data-cls="${cls.id}" onclick="selectClass('${cls.id}')"
             onmouseenter="hoverClass('${cls.id}')" onmouseleave="wizardRevertInfoPanel()">
            ${isRec ? '<span class="cls-badge rec-badge">★ Suggested</span>' : ''}
            ${!gate.pass ? `<span class="cls-badge warn-badge">⚠ Low stats</span>` : ''}
            <div class="cls-header">
                <span class="cls-name">${cls.name}</span>
                <span class="cls-hd" title="Hit Die">d${cls.hitDie}</span>
            </div>
            <div class="cls-stats">${statTags}</div>
            ${!gate.pass ? `<div class="cls-warn-msg">Suggested: ${gate.warnings.join(', ')}</div>` : ''}
        </div>`;
    }).join('');
}

// ── Step 6: review ───────────────────────────────────────────

function buildCharacterDescription() {
    const finals  = getFinalStats();
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const className = clsData?.name || 'adventurer';

    const levelDesc = wiz.level <= 1 ? 'fledgling' :
                      wiz.level <= 3 ? 'seasoned'   :
                      wiz.level <= 6 ? 'veteran'    : 'formidable';

    const topStat = STAT_KEYS.reduce((a, b) => finals[a] >= finals[b] ? a : b);
    const statPhrases = {
        STR: 'powerful of body',
        DEX: 'quick and sure-handed',
        CON: 'hard to break',
        INT: 'keen of mind',
        WIS: 'sharp of perception',
        CHA: 'compelling in presence'
    };

    const lines = [];

    // Opening
    lines.push(`${escHtmlP(wiz.name)} of the ${escHtmlP(wiz.race)} is a ${levelDesc} ${className} — ${statPhrases[topStat]}, and shaped by choices that leave a mark on the soul.`);

    // Blood & alignment
    const purityOpener = wiz.bloodPurity === 'PureBlood' ? 'Of pure Amber lineage' :
                         wiz.bloodPurity === 'HalfBlood' ? 'Of partial Amber descent' :
                                                            'Without Amber blood';
    const oc = wiz.orderChaos;
    const align = oc <= 20 ? 'pulled hard toward the raw storm of Chaos' :
                  oc <= 40 ? 'drawn toward Chaos'                        :
                  oc <= 48 ? 'leaning slightly toward Chaos'             :
                  oc <= 52 ? 'poised at the still point between Order and Chaos' :
                  oc <= 60 ? 'leaning slightly toward Order'             :
                  oc <= 80 ? 'drawn toward Order'                        :
                             'aligned deeply with Order';
    lines.push(`${purityOpener}, they are ${align}.`);

    // Imprint
    const imprintText = {
        None:           `They walk without an imprint — unbound by Pattern or Logrus, carrying a freedom that is also a kind of wound.`,
        FirstPattern:   `They have walked the Pattern and carry its crystalline Order within, a mark no shadow can fully conceal.`,
        CorwinPattern:  `They have walked the Argent Refrain — Corwin's own Pattern, carved in silver fire — carrying a power born from both defiance and grief.`,
        LogrusBasic:    `They have walked the Logrus and bear Chaos within, learning to let probability bend at their touch.`,
        LogrusAdvanced: `They have walked deep into the Logrus and grown proficient in commanding its writhing tendrils.`,
        LogrusMaster:   `They are a master of the Logrus, wielding Chaos as an extension of will where others see only madness.`
    }[wiz.imprint] || '';
    let imprint = imprintText;
    if (wiz.brokenImprint && wiz.imprint !== 'None') {
        imprint += ` Yet the imprint took imperfectly — a hairline fracture in the soul, where something alien slipped in.`;
    }
    if (imprint) lines.push(imprint);

    // Free trait (noImprint only)
    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        if (ft) lines.push(`In place of an imprint, they carry the free gift of ${ft.name}.`);
    }

    // Flaw/trait pairs
    const path = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const flawParts = wiz.flawsChosen.map(id => {
        const p = (FLAW_TRAIT_PAIRS[path] || []).find(x => x.id === id);
        return p ? `${p.flaw.name} in exchange for ${p.trait.name}` : null;
    }).filter(Boolean);
    if (flawParts.length === 1) {
        lines.push(`They have accepted ${flawParts[0]}.`);
    } else if (flawParts.length === 2) {
        lines.push(`They have accepted ${flawParts[0]}, and ${flawParts[1]}.`);
    }

    // Trump
    if (wiz.trumpArtist) {
        lines.push(`Their hand shapes Trumps — painted gates between moments, bridging distance with will alone.`);
    }

    return lines.join(' ');
}

function wizardRenderReview() {
    wizardCollectStep(5); // pick up level/trump from DOM (classType already in wiz state)
    const finals  = getFinalStats();
    const mods    = calcAmberMods();
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const imprintLabels = {
        None: 'None', FirstPattern: 'Pattern', CorwinPattern: 'The Argent Refrain',
        LogrusBasic: 'Logrus — Basic', LogrusAdvanced: 'Logrus — Advanced', LogrusMaster: 'Logrus — Master'
    };
    const modStr = s => {
        const m = mods[s];
        if (!m) return '';
        return m > 0 ? ` <span style="color:#27ae60">(+${m})</span>` : ` <span style="color:#e74c3c">(${m})</span>`;
    };

    // Build flaw/trait display
    const path = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const pairs = FLAW_TRAIT_PAIRS[path];
    const flawLines = wiz.flawsChosen.map(id => {
        const p = pairs.find(x => x.id === id);
        return p ? `<div class="review-row"><span>⚠ ${p.flaw.name}</span><span style="color:#27ae60">⟶ ${p.trait.name}</span></div>` : '';
    }).join('');

    let freeTraitLine = '';
    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        freeTraitLine = `<div class="review-row"><span>Free Trait</span><span style="color:#27ae60">${ft.name}</span></div>`;
    }

    document.getElementById('review-content').innerHTML = `
        <div class="review-description">
            <p>${buildCharacterDescription()}</p>
        </div>
        <div class="review-section">
            <h4>Identity</h4>
            <div class="review-row"><span>Name</span><span>${escHtmlP(wiz.name)}</span></div>
            <div class="review-row"><span>Race</span><span>${escHtmlP(wiz.race)}</span></div>
            <div class="review-row"><span>Class</span><span>${wiz.classType}${clsData ? ` (d${clsData.hitDie})` : ''} — Level ${wiz.level}</span></div>
            <div class="review-row"><span>Trump Artist</span><span>${wiz.trumpArtist ? 'Yes' : 'No'}</span></div>
            <div class="review-row"><span>Starting HP</span><span>${Math.max(1, (clsData?.hitDie || 8) + Math.floor((finals.CON - 10) / 2))} (d${clsData?.hitDie || 8} + CON mod)</span></div>
        </div>
        <div class="review-section">
            <h4>Amber Attributes</h4>
            <div class="review-row"><span>Order/Chaos Balance</span><span>${wiz.orderChaos}</span></div>
            <div class="review-row"><span>Blood Purity</span><span>${wiz.bloodPurity}</span></div>
            <div class="review-row"><span>Imprint</span><span>${imprintLabels[wiz.imprint]}${wiz.brokenImprint ? ' (Broken)' : ''}</span></div>
            ${wiz.imprint === 'None' && wiz.noneBonus ? `<div class="review-row"><span>Free +1</span><span>${STAT_FULL[wiz.noneBonus]}</span></div>` : ''}
            ${wiz.penaltyShift ? `<div class="review-row"><span>Penalty Shifted To</span><span>${STAT_FULL[wiz.penaltyShift]}</span></div>` : ''}
        </div>
        <div class="review-section">
            <h4>Final Stats</h4>
            <div class="review-stats">
                ${STAT_KEYS.map(s => `
                    <div class="review-stat">
                        <div class="rs-name">${s}</div>
                        <div class="rs-val">${finals[s]}${modStr(s)}</div>
                    </div>`).join('')}
            </div>
        </div>
        ${flawLines || freeTraitLine ? `
        <div class="review-section">
            <h4>Flaws &amp; Traits</h4>
            ${flawLines}${freeTraitLine}
        </div>` : ''}
        ${wiz.backstory ? `
        <div class="review-section">
            <h4>Backstory</h4>
            <div style="font-size:0.88rem;color:#555;line-height:1.5;">${wiz.backstory}</div>
        </div>` : ''}
        <div class="review-dnd-note">
            <strong>What happens next</strong>
            <p>This wizard has established your Amber foundation — stats, imprint, flaws, and traits. The rest of character creation follows standard D&amp;D 5e rules: skills, saving throw proficiencies, equipment, spells, and background features are all filled in on the character sheet.</p>
            <p>Choose <em>Save &amp; Continue Editing</em> to jump straight to the character sheet now, or <em>Save for Later</em> and return to it whenever you're ready.</p>
        </div>
    `;
}

// ── Submit ───────────────────────────────────────────────────

async function wizardSubmit(continueToEdit = false) {
    const btnSave = document.getElementById('wizard-submit-btn');
    const btnEdit = document.getElementById('wizard-submit-edit-btn');
    btnSave.disabled = true;
    btnEdit.disabled = true;
    const btn = continueToEdit ? btnEdit : btnSave;
    btn.textContent = 'Creating…';

    const token   = localStorage.getItem('token');
    const finals  = getFinalStats();
    const path    = wiz.imprint.startsWith('Logrus') ? 'logrus' : 'pattern';
    const pairs   = FLAW_TRAIT_PAIRS[path];

    // Build flaws/traits arrays
    const flawsArr = wiz.flawsChosen.map(id => {
        const p = pairs.find(x => x.id === id);
        return p ? { id, flaw: p.flaw.name, trait: p.trait.name } : null;
    }).filter(Boolean);

    if (wiz.imprint === 'None' && wiz.noImprintFlavor) {
        const ft = FLAW_TRAIT_PAIRS.noImprint[wiz.noImprintFlavor];
        flawsArr.push({ id: 'free', flaw: null, trait: ft.name, flavor: wiz.noImprintFlavor });
    }

    const logrusImprint = { LogrusBasic: 'Basic', LogrusAdvanced: 'Advanced', LogrusMaster: 'Master' }[wiz.imprint] || null;
    const isPattern = wiz.imprint === 'FirstPattern' || wiz.imprint === 'CorwinPattern';
    const patternType = isPattern ? (wiz.imprint === 'FirstPattern' ? 'Pattern' : 'Argent Refrain') : null;

    // HP: (class hit die avg) + CON mod — use d8 as safe default
    const conMod  = Math.floor((finals.CON - 10) / 2);
    const clsData = CLASSES_5E.find(c => c.id === wiz.classType);
    const hitDie  = clsData ? clsData.hitDie : 8;
    const maxHp   = Math.max(1, hitDie + conMod);

    const payload = {
        name:           wiz.name,
        species:        wiz.race,
        class_type:     wiz.classType,
        level:          wiz.level,
        strength:       finals.STR,
        dexterity:      finals.DEX,
        constitution:   finals.CON,
        intelligence:   finals.INT,
        wisdom:         finals.WIS,
        charisma:       finals.CHA,
        max_hp:         maxHp,
        current_hp:     maxHp,
        order_chaos_value: wiz.orderChaos,
        blood_purity:   wiz.bloodPurity,
        pattern_imprint: isPattern ? 1 : 0,
        pattern_type:   patternType,
        logrus_imprint: logrusImprint,
        broken_imprint: wiz.brokenImprint ? 1 : 0,
        trump_artist:   wiz.trumpArtist ? 1 : 0,
        backstory:      wiz.backstory || null,
        shadow_origin_id: wiz.shadowId || null,
        amber_flaws:    flawsArr,
        amber_traits:   flawsArr.map(f => f.trait),
        user_id:        currentUser.id
    };

    try {
        const res = await fetch('/api/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create character');
        }
        const newChar = await res.json();
        closeCreateCharacter();
        await loadCharacters();
        if (continueToEdit) {
            openEditCharacter(newChar.id);
        }
    } catch (err) {
        console.error(err);
        showToast(`Error: ${err.message}`);
    } finally {
        btnSave.disabled = false;
        btnEdit.disabled = false;
        btnSave.textContent = 'Save for Later';
        btnEdit.textContent = 'Save & Continue Editing →';
    }
}

