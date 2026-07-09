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

