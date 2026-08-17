// dm-modals.js — split from app.js (behavior unchanged)
// Modal functions
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

// Deep lore viewer (reads Background Information/DM Info/{shadow name}.md)
function renderLoreMarkdown(md) {
    const lines = escHtml(md).split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        const listItem = line.match(/^\d+\.\s+\*\*(.*?)\*\*\s*—\s*(.*)|^\d+\.\s+(.*)/);
        if (heading) {
            if (inList) { html += '</ul>'; inList = false; }
            const level = heading[1].length + 2; // h3..h5
            html += `<h${level}>${heading[2]}</h${level}>`;
        } else if (listItem) {
            if (!inList) { html += '<ul>'; inList = true; }
            const text = listItem[1] ? `<strong>${listItem[1]}</strong> — ${listItem[2]}` : listItem[3];
            html += `<li>${text}</li>`;
        } else if (line.trim() === '') {
            if (inList) { html += '</ul>'; inList = false; }
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            const withBold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            html += `<p>${withBold}</p>`;
        }
    }
    if (inList) html += '</ul>';
    return html;
}

async function viewShadowLore(id, name) {
    try {
        const response = await fetch(`${API_BASE}/shadows/${id}/lore`);
        if (!response.ok) {
            showToast('No detailed lore written for this shadow yet.');
            return;
        }
        const data = await response.json();
        showModal(name, `<div class="lore-content">${renderLoreMarkdown(data.content)}</div>`);
    } catch (err) {
        showToast(`Failed to load lore: ${err.message}`);
    }
}

// Create Character Modal
function showCreateCharacterModal() {
    const shadowOptions = shadows.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');

    showModal('Create Character', `
        <form onsubmit="createCharacter(event)">
            <div class="form-group">
                <label>Character Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Player Name</label>
                <input type="text" name="player_name">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Species/Race *</label>
                    <input type="text" name="species" required>
                </div>
                <div class="form-group">
                    <label>Class *</label>
                    <input type="text" name="class_type" required>
                </div>
            </div>
            <div class="form-group">
                <label>Shadow Origin</label>
                <select name="shadow_origin_id">
                    <option value="">Select Shadow</option>
                    ${shadowOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Blood Purity</label>
                    <select name="blood_purity">
                        <option value="None">None</option>
                        <option value="Pure">Pure Blood</option>
                        <option value="Half">Half Blood</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Level</label>
                    <input type="number" name="level" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="pattern_imprint">
                    Has Pattern Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="logrus_imprint">
                    Has Logrus Imprint
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="trump_artist">
                    Has Trump Artistry
                </label>
            </div>
            <div class="form-group">
                <label>Character Notes</label>
                <textarea name="character_notes"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Character</button>
        </form>
    `);
}

async function createCharacter(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    // Convert checkboxes
    data.pattern_imprint = formData.has('pattern_imprint') ? 1 : 0;
    data.logrus_imprint = formData.has('logrus_imprint') ? 1 : 0;
    data.trump_artist = formData.has('trump_artist') ? 1 : 0;

    try {
        const response = await fetch(`${API_BASE}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadCharacters();
        } else {
            showToast('Error creating character');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating character');
    }
}

// Create Shadow Modal
function showCreateShadowModal() {
    showModal('Create Shadow', `
        <form onsubmit="createShadow(event)">
            <div class="form-group">
                <label>Shadow Name *</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Order Level (0-100)</label>
                    <input type="number" name="order_level" value="50" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Chaos Level (0-100)</label>
                    <input type="number" name="chaos_level" value="50" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Dream Level (0-100)</label>
                    <input type="number" name="dream_level" value="0" min="0" max="100">
                </div>
            </div>
            <div class="form-group">
                <label>Influence</label>
                <select name="pattern_influence">
                    <option value="None">None</option>
                    <option value="Pattern">Pattern</option>
                    <option value="Argent Refrain">The Argent Refrain</option>
                    <option value="Logrus">Logrus</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Nexus">Nexus</option>
                </select>
            </div>
            <div class="form-group">
                <label>Corruption Status</label>
                <textarea name="corruption_status"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Shadow</button>
        </form>
    `);
}

async function createShadow(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${API_BASE}/shadows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadShadows();
        } else {
            showToast('Error creating shadow');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating shadow');
    }
}

// Creature/NPC form fields shared by create + edit
const CREATURE_ROLES = ['Predator', 'Ally', 'Pet', 'Fae', 'Monster', 'Other'];
const CREATURE_INFLUENCES = ['None', 'Pattern', 'Argent Refrain', 'Logrus', 'Mixed', 'Nexus'];

function creatureFormFields(n = {}) {
    const s = n.stats || {};
    const a = s.abilities || {};
    const shadowOptions = shadows.map(sh => `<option value="${sh.id}"${n.shadow_id === sh.id ? ' selected' : ''}>${escHtml(sh.name)}</option>`).join('');
    const roleOptions = CREATURE_ROLES.map(r => `<option value="${r}"${n.role === r ? ' selected' : ''}>${r}</option>`).join('');
    const influenceOptions = CREATURE_INFLUENCES.map(v => `<option value="${v}"${(n.influence || 'None') === v ? ' selected' : ''}>${v === 'Argent Refrain' ? 'The Argent Refrain' : v}</option>`).join('');
    const joinLines = arr => (arr || []).join('\n');

    return `
        <div class="form-row">
            <div class="form-group"><label>Name *</label><input type="text" name="name" value="${escHtml(n.name || '')}" required></div>
            <div class="form-group"><label>Creature Type / Species</label><input type="text" name="creature_type" value="${escHtml(n.creature_type || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Shadow</label><select name="shadow_id"><option value="">— None —</option>${shadowOptions}</select></div>
            <div class="form-group"><label>Role</label><select name="role">${roleOptions}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Size / Type</label><input type="text" name="stat_size_type" placeholder="e.g. Large beast" value="${escHtml(s.size_type || '')}"></div>
            <div class="form-group"><label>Alignment</label><input type="text" name="alignment" placeholder="e.g. Chaotic Neutral" value="${escHtml(n.alignment || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Armor Class</label><input type="number" name="armor_class" value="${n.armor_class ?? ''}"></div>
            <div class="form-group"><label>Hit Points</label><input type="number" name="hit_points" value="${n.hit_points ?? ''}"></div>
            <div class="form-group"><label>Speed</label><input type="text" name="stat_speed" placeholder="e.g. 30 ft., fly 60 ft." value="${escHtml(s.speed || '')}"></div>
        </div>
        <div class="form-row">
            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<div class="form-group"><label>${k.toUpperCase()}</label><input type="number" name="ability_${k}" value="${a[k] ?? ''}"></div>`).join('')}
        </div>
        <div class="form-row">
            <div class="form-group"><label>Order/Chaos Rating (0-100)</label><input type="number" name="order_chaos_value" min="0" max="100" value="${n.order_chaos_value ?? 50}"></div>
            <div class="form-group"><label>Influence</label><select name="influence">${influenceOptions}</select></div>
            <div class="form-group"><label>Challenge Rating</label><input type="text" name="stat_challenge_rating" placeholder="e.g. 3 (700 XP)" value="${escHtml(s.challenge_rating || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Saving Throws</label><input type="text" name="stat_saving_throws" value="${escHtml(s.saving_throws || '')}"></div>
            <div class="form-group"><label>Skills</label><input type="text" name="stat_skills" value="${escHtml(s.skills || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Damage Immunities</label><input type="text" name="stat_damage_immunities" value="${escHtml(s.damage_immunities || '')}"></div>
            <div class="form-group"><label>Condition Immunities</label><input type="text" name="stat_condition_immunities" value="${escHtml(s.condition_immunities || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Senses</label><input type="text" name="stat_senses" value="${escHtml(s.senses || '')}"></div>
            <div class="form-group"><label>Languages</label><input type="text" name="stat_languages" value="${escHtml(s.languages || '')}"></div>
        </div>
        <div class="form-group"><label>Traits (one per line)</label><textarea name="stat_traits" rows="3">${escHtml(joinLines(s.traits))}</textarea></div>
        <div class="form-group"><label>Actions (one per line)</label><textarea name="stat_actions" rows="3">${escHtml(joinLines(s.actions))}</textarea></div>
        <div class="form-group"><label>Reactions (one per line)</label><textarea name="stat_reactions" rows="2">${escHtml(joinLines(s.reactions))}</textarea></div>
        <div class="form-group"><label>Lore (one per line)</label><textarea name="stat_lore" rows="4">${escHtml(joinLines(s.lore))}</textarea></div>
        <div class="form-group"><label>Description (short summary)</label><textarea name="description" rows="2">${escHtml(n.description || '')}</textarea></div>
        <div class="form-group"><label>DM Notes (never shown to players)</label><textarea name="dm_notes" rows="2">${escHtml(n.dm_notes || '')}</textarea></div>
        <div class="form-group">
            <label class="checkbox-group"><input type="checkbox" name="is_important"${n.is_important ? ' checked' : ''}> Important NPC</label>
        </div>
        <div class="form-group">
            <label class="checkbox-group"><input type="checkbox" name="is_spoiler"${n.is_spoiler ? ' checked' : ''}> Spoiler (hidden from players until revealed)</label>
        </div>
    `;
}

function creaturePayloadFromForm(event) {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.shadow_id = data.shadow_id ? parseInt(data.shadow_id, 10) : null;
    data.armor_class = data.armor_class ? parseInt(data.armor_class, 10) : null;
    data.hit_points = data.hit_points ? parseInt(data.hit_points, 10) : null;
    data.order_chaos_value = data.order_chaos_value ? parseInt(data.order_chaos_value, 10) : 50;
    data.is_important = formData.has('is_important') ? 1 : 0;
    data.is_spoiler = formData.has('is_spoiler') ? 1 : 0;

    const splitLines = v => (v || '').split('\n').map(l => l.trim()).filter(Boolean);
    const abilities = {};
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        if (data[`ability_${k}`] !== '') abilities[k] = parseInt(data[`ability_${k}`], 10);
        delete data[`ability_${k}`];
    }

    data.stats = {
        size_type: data.stat_size_type || '',
        speed: data.stat_speed || '',
        abilities,
        saving_throws: data.stat_saving_throws || '',
        skills: data.stat_skills || '',
        damage_immunities: data.stat_damage_immunities || '',
        condition_immunities: data.stat_condition_immunities || '',
        senses: data.stat_senses || '',
        languages: data.stat_languages || '',
        challenge_rating: data.stat_challenge_rating || '',
        traits: splitLines(data.stat_traits),
        actions: splitLines(data.stat_actions),
        reactions: splitLines(data.stat_reactions),
        lore: splitLines(data.stat_lore)
    };
    for (const key of Object.keys(data)) {
        if (key.startsWith('stat_')) delete data[key];
    }

    return data;
}

function showCreateCreatureModal() {
    showModal('Create Creature / NPC', `
        <form onsubmit="createCreature(event)">
            ${creatureFormFields()}
            <button type="submit" class="btn-primary">Create</button>
        </form>
    `);
}

// Familiar form fields shared by bond + edit. Growth table is a raw JSON
// textarea — it's a DM-authored, per-familiar homebrew structure, and a
// full dynamic row editor isn't worth building for a first version.
const FAMILIAR_GROWTH_PLACEHOLDER = JSON.stringify([
    { level: 3, hp_bonus: 5, ac_bonus: 0, abilities_gained: ['Keen Senses'], notes: 'Grows to Small size' },
    { level: 5, hp_bonus: 10, ac_bonus: 1, abilities_gained: ['Share Senses'], notes: 'The bond deepens' }
], null, 2);

function familiarFormFields(f = {}) {
    const s = f.base_stats || {};
    const a = s.abilities || {};
    const templateOptions = npcs.map(n => `<option value="${n.id}"${f.template_npc_id === n.id ? ' selected' : ''}>${escHtml(n.name)}</option>`).join('');
    const growthJson = f.growth_table && f.growth_table.length ? JSON.stringify(f.growth_table, null, 2) : '';

    return `
        <div class="form-row">
            <div class="form-group"><label>Name *</label><input type="text" name="name" value="${escHtml(f.name || '')}" required></div>
            <div class="form-group"><label>Creature Type / Species</label><input type="text" name="creature_type" placeholder="e.g. Dog" value="${escHtml(f.creature_type || '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Bond Type</label><input type="text" name="bond_type" value="${escHtml(f.bond_type || 'Psychic')}"></div>
            <div class="form-group"><label>Prefill from Bestiary</label><select name="template_npc_id"><option value="">— None —</option>${templateOptions}</select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Base Armor Class</label><input type="number" name="armor_class" value="${f.armor_class ?? ''}"></div>
            <div class="form-group"><label>Base Hit Points</label><input type="number" name="base_hit_points" value="${f.base_hit_points ?? ''}"></div>
        </div>
        <div class="form-row">
            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<div class="form-group"><label>${k.toUpperCase()}</label><input type="number" name="ability_${k}" value="${a[k] ?? ''}"></div>`).join('')}
        </div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2">${escHtml(f.description || '')}</textarea></div>
        <div class="form-group"><label>Bond Notes (how the psychic bond manifests)</label><textarea name="bond_notes" rows="2">${escHtml(f.bond_notes || '')}</textarea></div>
        <div class="form-group">
            <label>Growth Table (JSON — bonuses/abilities unlocked as the bonded character levels up)</label>
            <textarea name="growth_table" rows="6" placeholder="${escHtml(FAMILIAR_GROWTH_PLACEHOLDER)}">${escHtml(growthJson)}</textarea>
        </div>
        <div class="form-group"><label>DM Notes (never shown to players)</label><textarea name="dm_notes" rows="2">${escHtml(f.dm_notes || '')}</textarea></div>
    `;
}

function familiarPayloadFromForm(event) {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.template_npc_id = data.template_npc_id ? parseInt(data.template_npc_id, 10) : null;
    data.armor_class = data.armor_class ? parseInt(data.armor_class, 10) : null;
    data.base_hit_points = data.base_hit_points ? parseInt(data.base_hit_points, 10) : null;

    const abilities = {};
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        if (data[`ability_${k}`] !== '') abilities[k] = parseInt(data[`ability_${k}`], 10);
        delete data[`ability_${k}`];
    }
    if (Object.keys(abilities).length) data.base_stats = { abilities };

    if (data.growth_table && data.growth_table.trim()) {
        try {
            data.growth_table = JSON.parse(data.growth_table);
        } catch (err) {
            throw new Error('Growth Table must be valid JSON');
        }
    } else {
        data.growth_table = [];
    }

    return data;
}

async function createCreature(event) {
    event.preventDefault();
    const data = creaturePayloadFromForm(event);

    try {
        const response = await fetch(`${API_BASE}/npcs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadNpcs();
        } else {
            showToast('Error creating creature');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error creating creature');
    }
}

// Create Session Modal
function showCreateSessionModal() {
    const nextNum = sessions.length > 0 ? Math.max(...sessions.map(s => s.session_number)) + 1 : 1;
    const today   = new Date().toISOString().split('T')[0];

    const charChecks = characters.map(c =>
        `<label style="display:block;margin-bottom:4px;cursor:pointer">
            <input type="checkbox" class="char-check" value="${c.id}">
            ${escHtml(c.name)}${c.player_name ? ` <span style="color:#999;font-size:0.85em">(${escHtml(c.player_name)})</span>` : ''}
         </label>`
    ).join('');

    showModal('Create Session', `
        <form onsubmit="createSession(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Session # *</label>
                    <input type="number" name="session_number" value="${nextNum}" required>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" name="session_date" value="${today}" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="session_status">
                        <option value="planned" selected>Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" name="session_title" placeholder="Session title…">
            </div>
            <details style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Expected Characters</summary>
                <div style="max-height:130px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:8px 12px;background:#fdf9f2">
                    ${charChecks || '<em style="color:#999">No characters yet</em>'}
                </div>
            </details>
            <details open style="margin-bottom:14px">
                <summary style="cursor:pointer;font-weight:600;margin-bottom:8px">Active Chapters This Session</summary>
                <div style="max-height:220px;overflow-y:auto;border:1px solid #e0d5be;border-radius:6px;padding:10px 14px;background:#fdf9f2">
                    ${buildChapterPicker()}
                </div>
            </details>
            <div class="form-group">
                <label>Opening Notes <span style="color:#999;font-size:0.85em">(pre-session setup, hooks…)</span></label>
                <textarea name="opening_notes" rows="3"></textarea>
            </div>
            <button type="submit" class="btn-primary">Create Session</button>
        </form>
    `);
}

async function createSession(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    data.character_ids = [...form.querySelectorAll('.char-check:checked')].map(el => +el.value);
    data.chapter_ids   = [...form.querySelectorAll('.chapter-check:checked')].map(el => +el.value);

    try {
        const res = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Error creating session');
        closeModal();
        await loadSessions();
    } catch (err) {
        showToast(`Failed to create session: ${err.message}`);
    }
}

// Add Progress Modal
function showAddProgressModal() {
    const charOptions = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const sessionOptions = sessions.map(s => `<option value="${s.id}">Session ${s.session_number}: ${s.session_title || 'Untitled'}</option>`).join('');
    const shadowOptions = shadows.map(s => `<option value="${s.id}">${escHtml(s.name)}</option>`).join('');

    showModal('Add Progress Entry', `
        <form onsubmit="addProgress(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Character *</label>
                    <select name="character_id" required>
                        <option value="">Select Character</option>
                        ${charOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Session *</label>
                    <select name="session_id" required>
                        <option value="">Select Session</option>
                        ${sessionOptions}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Shadow Location</label>
                <select name="shadow_id">
                    <option value="">Select Shadow</option>
                    ${shadowOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Session Summary *</label>
                <textarea name="summary" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Feats Earned</label>
                    <input type="number" name="feats_earned" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>Experience Gained</label>
                    <input type="number" name="experience_gained" value="0" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Key Story Beats</label>
                <textarea name="story_beats"></textarea>
            </div>
            <div class="form-group">
                <label>NPCs Met</label>
                <input type="text" name="npcs_met">
            </div>
            <div class="form-group">
                <label class="checkbox-group">
                    <input type="checkbox" name="is_solo_session">
                    Solo Session
                </label>
            </div>
            <div class="form-group">
                <label>DM Private Notes</label>
                <textarea name="dm_private_notes"></textarea>
            </div>
            <button type="submit" class="btn-primary">Add Progress</button>
        </form>
    `);
}

async function addProgress(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    data.is_solo_session = formData.has('is_solo_session');

    try {
        const response = await fetch(`${API_BASE}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadProgress();
            await loadCharacters(); // Reload to update feat counts
        } else {
            showToast('Error adding progress');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error adding progress');
    }
}

// Delete functions
async function deleteCharacter(id) {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
        const response = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadCharacters();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteShadow(id) {
    if (!confirm('Are you sure you want to delete this shadow?')) return;

    try {
        const response = await fetch(`${API_BASE}/shadows/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadShadows();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteCreature(id) {
    if (!confirm('Are you sure you want to delete this creature/NPC?')) return;

    try {
        const response = await fetch(`${API_BASE}/npcs/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadNpcs();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteSession(id) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
        const response = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadSessions();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteProgress(id) {
    if (!confirm('Are you sure you want to delete this progress entry?')) return;

    try {
        const response = await fetch(`${API_BASE}/progress/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadProgress();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

