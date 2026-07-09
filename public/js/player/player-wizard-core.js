// player-wizard-core.js — split from player-dashboard.js (behavior unchanged)
// Wizard state
let wiz = {};

function wizardReset() {
    wiz = {
        step: 1,
        // Step 1
        name: '', race: '', shadowId: null, backstory: '',
        // Step 2
        orderChaos: 50, bloodPurity: 'None', imprint: 'None',
        brokenImprint: false,
        noneBonus: null,
        penaltyShift: '', penaltyJust: '',
        // Step 3
        assign: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
        selectedChipVal: null,
        // Step 4
        flawsChosen: [],          // array of pair IDs, max 2
        noImprintFlavor: null,    // 'pattern' | 'logrus'
        // Step 5
        classType: '', level: 1, trumpArtist: false
    };
}

// ── Modifier calculation ─────────────────────────────────────

function calcAmberMods() {
    const m = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };

    // Order/Chaos
    if (wiz.orderChaos >= 75)      { m.INT += 1; m.WIS += 1; }
    else if (wiz.orderChaos <= 25) { m.STR += 1; m.DEX += 1; }

    // Imprint
    switch (wiz.imprint) {
        case 'None':
            if (wiz.noneBonus) m[wiz.noneBonus] += 1;
            break;
        case 'FirstPattern':
            m.WIS += 2; m.CON += 1;
            break;
        case 'CorwinPattern':
            m.INT += 2; m.CHA += 1;
            break;
        case 'LogrusBasic':
            m.CON += 1;
            break;
        case 'LogrusAdvanced':
            m.CON += 1; m.STR += 1;
            m.INT -= 1; m.WIS -= 1;
            if (wiz.penaltyShift) { m.INT += 1; m[wiz.penaltyShift] -= 1; }
            break;
        case 'LogrusMaster':
            m.CON += 1; m.STR += 1; m.CHA += 1;
            m.INT -= 2; m.WIS -= 1;
            if (wiz.penaltyShift) { m.INT += 1; m[wiz.penaltyShift] -= 1; }
            break;
    }

    // Blood purity
    if (wiz.bloodPurity === 'None') m.STR += 1;
    else if (wiz.bloodPurity === 'Half') m.CHA += 1;
    else if (wiz.bloodPurity === 'Pure') { m.WIS += 1; }

    return m;
}

function getFinalStats() {
    const mods = calcAmberMods();
    const out = {};
    for (const s of STAT_KEYS) out[s] = (wiz.assign[s] || 0) + (mods[s] || 0);
    return out;
}

function isTrumpEligible(finals) {
    return (finals.DEX + finals.WIS >= 30) || (finals.INT + finals.WIS >= 30);
}

// ── Class suggestions ────────────────────────────────────────

// Returns set of class IDs the system recommends based on finals + imprint
function getRecommendedClasses(finals) {
    const { STR, DEX, INT, WIS, CHA } = finals;
    const imp = wiz.imprint;
    const rec = new Set();

    if (imp === 'FirstPattern') {
        if (WIS >= 13) { rec.add('Cleric'); rec.add('Druid'); }
        if (INT >= 13) rec.add('Wizard');
    }
    if (imp === 'CorwinPattern') {
        if (CHA >= 13) { rec.add('Bard'); rec.add('Sorcerer'); }
        if (INT >= 13) rec.add('Wizard');
    }
    if (imp.startsWith('Logrus')) {
        if (STR >= 13) rec.add('Barbarian');
        rec.add('Fighter');
        if (imp === 'LogrusMaster' && CHA >= 13) rec.add('Warlock');
    }

    // Stat-driven
    if (DEX >= 14) { rec.add('Rogue'); rec.add('Ranger'); }
    if (STR >= 14 && DEX < 14) rec.add('Fighter');
    if (WIS >= 14 && !imp.startsWith('Logrus')) rec.add('Druid');
    if (DEX >= 13 && WIS >= 13) rec.add('Monk');
    if (CHA >= 14) rec.add('Sorcerer');
    if (STR >= 13 && CHA >= 13) rec.add('Paladin');

    return rec;
}

// Check whether finals meet a class's soft gate
function classGateStatus(cls, finals) {
    const min = cls.minStats;
    if (!min) return { pass: true, warnings: [] };

    // Special case: Fighter allows STR OR DEX
    if (cls.id === 'Fighter') {
        if (finals.STR >= 13 || finals.DEX >= 13) return { pass: true, warnings: [] };
        return { pass: false, warnings: [`STR ${finals.STR} or DEX ${finals.DEX} (need 13 in one)`] };
    }

    const warnings = [];
    for (const [stat, threshold] of Object.entries(min)) {
        if (stat === '_or_') continue;
        if (finals[stat] < threshold) {
            warnings.push(`${stat} ${finals[stat]} (need ${threshold})`);
        }
    }
    return { pass: warnings.length === 0, warnings };
}

// ── Wizard open / close ──────────────────────────────────────

function applyGuideGate() {
    const btn = document.getElementById('create-character-btn');
    if (!btn) return;
    if (localStorage.getItem('amber_guide_acknowledged')) {
        btn.disabled = false;
        btn.classList.remove('btn-create-locked');
        const reminderBtn = document.getElementById('guide-reminder-btn');
        if (reminderBtn) reminderBtn.style.display = 'none';
    }
}

function showGuideReminder() {
    document.getElementById('guide-reminder-modal').classList.add('show');
}

function acknowledgeGuide(goToGuide) {
    localStorage.setItem('amber_guide_acknowledged', '1');
    document.getElementById('guide-reminder-modal').classList.remove('show');
    applyGuideGate();
    // If going to the guide, the <a> tag handles navigation naturally
}

async function openCreateCharacter() {
    if (!localStorage.getItem('amber_guide_acknowledged')) return;
    wizardReset();
    const modal = document.getElementById('create-character-modal');
    modal.classList.add('show');
    await wizardPopulateShadows();

    // Imprint radio cards: hover shows lore temporarily; selection pins it
    document.querySelectorAll('input[name="w-imprint"]').forEach(radio => {
        const card = radio.closest('.radio-card');
        card.addEventListener('mouseenter', () => {
            const key = (radio.value === 'LogrusAdvanced' || radio.value === 'LogrusMaster')
                ? 'LogrusBasic' : radio.value;
            const lore = IMPRINT_LORE[key];
            const hasSections = lore && (lore.flavor || lore.mechanics || lore.consider || lore.example);
            if (hasSections) {
                wizardShowInfoPanel(lore.title, lore);
            } else {
                wizardRevertInfoPanel();
            }
        });
        card.addEventListener('mouseleave', () => wizardRevertInfoPanel());
    });

    // Info icons: hover shows tooltip text in the right panel
    document.querySelectorAll('.modal-wizard .info-icon').forEach(icon => {
        const tooltip = icon.querySelector('.info-tooltip');
        if (!tooltip) return;
        const text = tooltip.textContent.trim();
        icon.addEventListener('mouseenter', () => {
            wizardShowInfoPanel(null, { flavor: text });
        });
        icon.addEventListener('mouseleave', () => wizardRevertInfoPanel());
    });

    wizardRenderStep();
}

function closeCreateCharacter() {
    document.getElementById('create-character-modal').classList.remove('show');
    wizardReset();
}

async function wizardPopulateShadows() {
    const sel = document.getElementById('w-shadow');
    if (sel.options.length > 1) return; // already loaded
    try {
        const res = await fetch('/api/shadows');
        const shadows = await res.json();
        shadows.forEach(s => {
            const o = document.createElement('option');
            o.value = s.id;
            o.textContent = s.name;
            sel.appendChild(o);
        });
    } catch {}
}

// ── Navigation ───────────────────────────────────────────────

function wizardNext() {
    const err = wizardValidateStep(wiz.step);
    if (err) { showToast(err); return; }
    wizardCollectStep(wiz.step);
    wiz.step++;
    wizardRenderStep();
}

function wizardBack() {
    wiz.step--;
    wizardRenderStep();
}

function wizardRenderStep() {
    // Panels
    document.querySelectorAll('.wizard-panel').forEach((p, i) => {
        p.classList.toggle('active', i + 1 === wiz.step);
    });
    // Step indicators
    document.querySelectorAll('.wstep').forEach(el => {
        const n = parseInt(el.dataset.step);
        el.classList.toggle('active', n === wiz.step);
        el.classList.toggle('done',   n < wiz.step);
    });
    // Buttons
    document.getElementById('wizard-back-btn').style.display = wiz.step === 1 ? 'none' : '';
    const isLast = wiz.step === 6;
    document.getElementById('wizard-next-btn').style.display      = isLast ? 'none' : '';
    document.getElementById('wizard-submit-btn').style.display    = isLast ? '' : 'none';
    document.getElementById('wizard-submit-edit-btn').style.display = isLast ? '' : 'none';
    document.getElementById('wizard-step-counter').textContent = `Step ${wiz.step} of 6`;

    // Step-specific rendering
    if (wiz.step === 2) wizardRenderAmberMods();
    if (wiz.step === 3) wizardRenderStats();
    if (wiz.step === 4) wizardRenderFlaws();
    if (wiz.step === 5) wizardRenderClass();
    if (wiz.step === 6) wizardRenderReview();

    wizardResetInfoPanel();
}

// ── Validation ───────────────────────────────────────────────

function wizardValidateStep(step) {
    if (step === 1) {
        if (!document.getElementById('w-name').value.trim()) return 'Character name is required.';
        if (!document.getElementById('w-race').value.trim()) return 'Race / Species is required.';
    }
    if (step === 2) {
        if (wiz.imprint === 'None' && !wiz.noneBonus) return 'Choose which stat receives your +1 bonus.';
        if ((wiz.imprint === 'LogrusAdvanced' || wiz.imprint === 'LogrusMaster') && wiz.penaltyShift && !document.getElementById('w-penalty-just').value.trim()) {
            return 'Please provide a justification for your penalty shift.';
        }
    }
    if (step === 3) {
        const unset = STAT_KEYS.filter(s => wiz.assign[s] === null);
        if (unset.length > 0) return `Assign a value to all six stats. Missing: ${unset.join(', ')}.`;
    }
    if (step === 5) {
        if (!wiz.classType) return 'Please select a class.';
    }
    return null;
}

// ── Collect from DOM into wiz state ─────────────────────────

function wizardCollectStep(step) {
    if (step === 1) {
        wiz.name     = document.getElementById('w-name').value.trim();
        wiz.race     = document.getElementById('w-race').value.trim();
        wiz.shadowId = document.getElementById('w-shadow').value || null;
        wiz.backstory= document.getElementById('w-backstory').value.trim();
    }
    if (step === 2) {
        wiz.orderChaos  = parseInt(document.getElementById('w-order-chaos').value);
        wiz.bloodPurity   = document.querySelector('input[name="w-blood"]:checked').value;
        wiz.imprint       = document.querySelector('input[name="w-imprint"]:checked').value;
        wiz.brokenImprint = document.getElementById('w-broken-imprint')?.checked || false;
        const nb = document.querySelector('input[name="w-none-bonus"]:checked');
        wiz.noneBonus   = nb ? nb.value : null;
        const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
        wiz.penaltyShift = ps ? ps.value : '';
        wiz.penaltyJust  = (document.getElementById('w-penalty-just') || {}).value || '';
    }
    if (step === 5) {
        // wiz.classType is set live by selectClass()
        wiz.level      = parseInt(document.getElementById('w-level').value) || 1;
        wiz.trumpArtist = document.getElementById('w-trump-check')?.checked || false;
    }
}

// ── Step 2: live amber display ───────────────────────────────

function wizardOCUpdate() {
    const val = parseInt(document.getElementById('w-order-chaos').value);
    wiz.orderChaos = val;
    let label = 'Balanced';
    let hint  = '';
    if (val >= 75)      { label = 'High Order';  hint = '+1 INT, +1 WIS'; }
    else if (val <= 25) { label = 'High Chaos';  hint = '+1 STR, +1 DEX'; }
    document.getElementById('oc-display').innerHTML =
        `${val} — ${label} <span class="oc-mod-hint">${hint ? `(${hint})` : ''}</span>`;
}

function wizardImprintChange() {
    const imprint = document.querySelector('input[name="w-imprint"]:checked')?.value || 'None';
    wiz.imprint = imprint;

    document.getElementById('none-imprint-bonus').style.display =
        imprint === 'None' ? '' : 'none';

    const showPenalty = imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster';
    document.getElementById('logrus-penalty-section').style.display = showPenalty ? '' : 'none';

    if (showPenalty) {
        const note = imprint === 'LogrusAdvanced'
            ? 'Fixed penalties: −1 INT, −1 WIS. You may shift one −1 to a different stat.'
            : 'Fixed penalties: −2 INT, −1 WIS. You may shift one −1 to a different stat.';
        document.getElementById('logrus-penalty-note').textContent = note;
    }

    // Broken imprint: available for Pattern and Basic Logrus only
    const brokenEligible = ['FirstPattern', 'CorwinPattern', 'LogrusBasic'].includes(imprint);
    const brokenCb = document.getElementById('w-broken-imprint');
    const brokenTxt = document.getElementById('broken-imprint-text');
    brokenCb.disabled = !brokenEligible;
    if (!brokenEligible) brokenCb.checked = false;
    brokenTxt.className = brokenEligible ? 'broken-enabled' : 'broken-disabled';
    wiz.brokenImprint = brokenCb.checked;

    wizardAmberUpdate();
    wizardShowImprintLore(imprint);
}

// ── Wizard right-panel helpers ───────────────────────────────
let _wizardInfoPinned  = null; // { title, sections } — set by imprint selection
let _wizardInfoFocused = null; // { title, sections } — set by field focus

function _renderLoreSection(id, content) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!content) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.querySelector('.lore-sec-body').innerHTML =
        content.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

function wizardShowInfoPanel(title, sections) {
    const panel = document.getElementById('wizard-info-panel');
    if (!panel) return;
    panel.classList.remove('is-default');
    const titleEl = document.getElementById('wizard-info-title');
    titleEl.textContent = title || '';
    titleEl.style.display = title ? '' : 'none';
    _renderLoreSection('lore-sec-flavor',    sections.flavor    || null);
    _renderLoreSection('lore-sec-mechanics', sections.mechanics || null);
    _renderLoreSection('lore-sec-consider',  sections.consider  || null);
    _renderLoreSection('lore-sec-example',   sections.example   || null);
}

function wizardPinInfoPanel(title, sections) {
    _wizardInfoPinned = sections ? { title, sections } : null;
    if (_wizardInfoPinned) {
        wizardShowInfoPanel(title, sections);
    } else {
        wizardResetInfoPanel();
    }
}

function wizardRevertInfoPanel() {
    if (_wizardInfoFocused) {
        wizardShowInfoPanel(_wizardInfoFocused.title, _wizardInfoFocused.sections);
    } else if (_wizardInfoPinned) {
        wizardShowInfoPanel(_wizardInfoPinned.title, _wizardInfoPinned.sections);
    } else {
        wizardResetInfoPanel();
    }
}

function wizardResetInfoPanel() {
    _wizardInfoPinned  = null;
    _wizardInfoFocused = null;
    const panel = document.getElementById('wizard-info-panel');
    if (!panel) return;
    panel.classList.add('is-default');
    const info = WIZARD_STEP_INFO[wiz.step];
    const titleEl = document.getElementById('wizard-info-title');
    titleEl.textContent = info ? info.title : '';
    titleEl.style.display = '';
    if (info) {
        _renderLoreSection('lore-sec-flavor',    info.flavor    || null);
        _renderLoreSection('lore-sec-mechanics', info.mechanics || null);
        _renderLoreSection('lore-sec-consider',  info.consider  || null);
        _renderLoreSection('lore-sec-example',   info.example   || null);
    }
}

function wizardShowImprintLore(imprint) {
    const key = (imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster')
        ? 'LogrusBasic'
        : imprint;
    const lore = IMPRINT_LORE[key];
    const hasSections = lore && (lore.flavor || lore.mechanics || lore.consider || lore.example);
    if (!hasSections) {
        wizardPinInfoPanel(null, null);
        return;
    }
    wizardPinInfoPanel(lore.title, lore);
}

function wizardFocusField(info) {
    _wizardInfoFocused = { title: info.title, sections: info };
    wizardShowInfoPanel(info.title, info);
}

function wizardBlurField() {
    _wizardInfoFocused = null;
    wizardRevertInfoPanel();
}

function _fieldInfoForElement(el) {
    if (!el) return null;
    return FIELD_INFO[el.id] || FIELD_INFO[el.closest?.('[data-lore]')?.dataset.lore] || null;
}

function _classLore(cls) {
    if (!cls) return null;
    const primary = cls.primary.join(', ');
    const secondary = cls.secondary.length ? cls.secondary.join(', ') : '—';
    return {
        title: cls.name,
        flavor: cls.desc || null,
        mechanics: `Hit Die: d${cls.hitDie}\nPrimary: ${primary}\nSecondary: ${secondary}\nSaving Throws: ${cls.saves.join(', ')}`,
        consider: cls.amberNote || null,
        example: null
    };
}

function hoverClass(id) {
    const cls = CLASSES_5E.find(c => c.id === id);
    if (cls) wizardShowInfoPanel(cls.name, _classLore(cls));
}

function wizardAmberUpdate() {
    // Collect current values without navigating away
    const nb = document.querySelector('input[name="w-none-bonus"]:checked');
    wiz.noneBonus = nb ? nb.value : null;
    const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
    wiz.penaltyShift = ps ? ps.value : '';

    // Show/hide justification box
    const justWrap = document.getElementById('penalty-justification-wrap');
    if (justWrap) justWrap.style.display = wiz.penaltyShift ? '' : 'none';

    wizardRenderAmberMods();
}

function wizardRenderAmberMods() {
    // Sync imprint-dependent sub-panels on step 2 initial render
    if (wiz.step === 2) {
        const imprint = document.querySelector('input[name="w-imprint"]:checked')?.value || 'None';
        wiz.imprint = imprint;
        document.getElementById('none-imprint-bonus').style.display = imprint === 'None' ? '' : 'none';
        const showPenalty = imprint === 'LogrusAdvanced' || imprint === 'LogrusMaster';
        document.getElementById('logrus-penalty-section').style.display = showPenalty ? '' : 'none';
        if (showPenalty) {
            document.getElementById('logrus-penalty-note').textContent = imprint === 'LogrusAdvanced'
                ? 'Fixed penalties: −1 INT, −1 WIS. You may shift one −1 to a different stat.'
                : 'Fixed penalties: −2 INT, −1 WIS. You may shift one −1 to a different stat.';
        }
        // Sync penalty-justification wrap
        const ps = document.querySelector('input[name="w-penalty-shift"]:checked');
        wiz.penaltyShift = ps ? ps.value : '';
        const justWrap = document.getElementById('penalty-justification-wrap');
        if (justWrap) justWrap.style.display = wiz.penaltyShift ? '' : 'none';
    }
    // If we're already on step 3, refresh stat display too
    if (wiz.step === 3) wizardRenderStats();
}

