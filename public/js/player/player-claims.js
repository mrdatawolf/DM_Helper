// player-claims.js — split from player-dashboard.js (behavior unchanged)
const commonAttributes = [
    'Strength', 'Speed', 'Combat', 'Stealth', 'Intelligence',
    'Persuasion', 'Endurance', 'Archery', 'Swordsmanship', 'Magic',
    'Perception', 'Charisma', 'Wisdom', 'Leadership', 'Tactics'
];

let claimPool = null;
let currentClaims = {};
let claimSelectedCharacter = null;

// Load claims for selected character
async function loadCharacterClaims(characterId) {
    const token = localStorage.getItem('token');
    claimSelectedCharacter = characterId;

    try {
        // Load claim pool. Kept on raw fetch rather than apiFetch: a
        // non-ok response here means "no pool exists yet" and falls back to
        // a default, a distinct, expected case rather than an error —
        // apiFetch would throw and skip the rest of this function.
        const poolResponse = await fetch(`/api/claims/pool/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (poolResponse.ok) {
            claimPool = await poolResponse.json();
        } else {
            // No pool exists yet
            claimPool = { total_points: 10, spent_points: 0 };
        }

        // Load existing claims
        const claims = await apiFetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        currentClaims = {};
        claims.forEach(claim => {
            currentClaims[claim.attribute_name] = claim;
        });

        displayClaimsInterface();

    } catch (error) {
        console.error('Error loading claims:', error);
        const container = document.getElementById('claims-content');
        container.innerHTML = `
            <div class="error-message">
                <p>Failed to load claims: ${error.message}</p>
            </div>
        `;
    }
}

// Display claims interface
function displayClaimsInterface() {
    const container = document.getElementById('claims-content');

    const character = allCharacters.find(c => c.id === claimSelectedCharacter);
    if (!character) return;

    const availablePoints = claimPool.total_points - claimPool.spent_points;

    container.innerHTML = `
        <div class="info-box" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid var(--primary);">
            <h4 style="margin-top: 0;">How Attribute Claims Work:</h4>
            <ul>
                <li>Spend claim points to assert you're the best at specific attributes</li>
                <li>You get <strong>+1 bonus</strong> on rolls for claimed attributes</li>
                <li>The character who invests the most points in an attribute is secretly the best</li>
                <li>Provide justification for your claims based on your backstory and abilities</li>
            </ul>
        </div>

        <div class="point-pool" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 10px 0; font-size: 24px;">Available Claim Points</h2>
            <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">${availablePoints}</div>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 15px; font-size: 14px;">
                <div><strong>Total:</strong> ${claimPool.total_points}</div>
                <div><strong>Spent:</strong> ${claimPool.spent_points}</div>
            </div>
        </div>

        <h3>Your Claims for ${escHtml(character.name)}</h3>
        <div class="claims-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
            ${commonAttributes.map(attr => {
                const claim = currentClaims[attr];
                return `
                    <div class="claim-card" style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); ${claim ? 'border-left: 4px solid var(--success);' : ''}">
                        <h3 style="margin: 0 0 15px 0; display: flex; justify-content: space-between; align-items: center;">
                            <span>${attr}</span>
                            ${claim ?
                                `<span style="background: var(--success); color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">${claim.points_spent} pts</span>` :
                                '<span style="color: #999; font-style: italic; font-size: 14px;">No claim</span>'}
                        </h3>
                        ${claim ? `
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px; margin: 10px 0; font-style: italic;">
                                "${escHtml(claim.justification)}"
                            </div>
                        ` : ''}
                        ${availablePoints > 0 ? `
                            <button class="btn-primary" style="width: 100%; padding: 10px; margin-top: 10px;" onclick="openClaimModal('${attr}')">
                                ${claim ? 'Add More Points' : 'Make Claim'}
                            </button>
                        ` : (!claim ? `
                            <p style="text-align: center; color: #999; font-size: 14px; margin-top: 10px;">
                                No points available
                            </p>
                        ` : '')}
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Claim Modal -->
        <div id="claim-modal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
            <div class="modal-content" style="background: white; margin: 5% auto; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h2 id="claim-modal-title" style="margin-top: 0; color: var(--primary);">Add Points to Claim</h2>

                <form id="claim-form">
                    <input type="hidden" id="modal-attribute">

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="points-to-add">Points to Add:</label>
                        <input type="number" id="points-to-add" min="1" max="${availablePoints}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                        <small>Available: <span id="modal-available-points">${availablePoints}</span> points</small>
                    </div>

                    <div class="form-group" style="margin: 20px 0;">
                        <label for="claim-justification">Justification: *</label>
                        <textarea id="claim-justification" required placeholder="Explain why your character is the best at this attribute. Reference your backstory, training, or natural abilities..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; min-height: 100px; resize: vertical; font-family: inherit;"></textarea>
                    </div>

                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn-secondary" onclick="closeClaimModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Points</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Setup claim form submission
    const form = document.getElementById('claim-form');
    form.onsubmit = handleClaimSubmit;
}

// Open claim modal
function openClaimModal(attribute) {
    const claim = currentClaims[attribute];
    const availablePoints = claimPool.total_points - claimPool.spent_points;

    document.getElementById('claim-modal-title').textContent = claim ?
        `Add Points to ${attribute}` :
        `Claim to be Best at ${attribute}`;

    document.getElementById('modal-attribute').value = attribute;
    document.getElementById('modal-available-points').textContent = availablePoints;
    document.getElementById('points-to-add').max = availablePoints;
    document.getElementById('points-to-add').value = Math.min(1, availablePoints);

    if (claim) {
        document.getElementById('claim-justification').value = claim.justification;
    } else {
        document.getElementById('claim-justification').value = '';
    }

    document.getElementById('claim-modal').style.display = 'flex';
    document.getElementById('claim-modal').style.justifyContent = 'center';
    document.getElementById('claim-modal').style.alignItems = 'center';
}

// Close claim modal
function closeClaimModal() {
    document.getElementById('claim-modal').style.display = 'none';
    document.getElementById('claim-form').reset();
}

// Handle claim form submission
async function handleClaimSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');

    const attribute = document.getElementById('modal-attribute').value;
    const pointsToAdd = parseInt(document.getElementById('points-to-add').value);
    const justification = document.getElementById('claim-justification').value;

    try {
        await apiFetch('/api/claims/allocate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                character_id: claimSelectedCharacter,
                attribute_name: attribute,
                points_to_add: pointsToAdd,
                justification: justification
            })
        });

        // Reload claims
        await loadCharacterClaims(claimSelectedCharacter);
        closeClaimModal();

        showToast('Claim points allocated successfully!');

    } catch (error) {
        console.error('Error allocating points:', error);
        showToast('Failed to allocate points: ' + error.message);
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target.id === 'claim-modal') {
        closeClaimModal();
    }
});

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, { closeClaimModal, openClaimModal });

// Used by player-characters.js / player-dice.js.
export { commonAttributes, loadCharacterClaims };

