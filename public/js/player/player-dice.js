// player-dice.js — split from player-dashboard.js (behavior unchanged)
// ============================================
// DICE ROLLER FUNCTIONALITY
// ============================================
import { commonAttributes } from './player-claims.js';

// Dice Roller State
let diceSelectedCharacter = null;
let diceSelectedSystem = 'd20'; // Default to d20
let diceSelectedAttribute = null;
let diceCharacterClaims = {};
let rollHistory = [];

// commonAttributes is already declared above in CLAIMS FUNCTIONS section

// Initialize dice roller when tab is loaded
function initDiceRoller() {
    loadDiceCharacters();

    // Set up character selection listener
    document.getElementById('dice-character-select').addEventListener('change', (e) => {
        const characterId = e.target.value;
        if (characterId) {
            diceSelectedCharacter = parseInt(characterId);
            loadDiceCharacterData(characterId);
        } else {
            diceSelectedCharacter = null;
            hideDiceSections();
        }
    });
}

// Load characters for dice roller
async function loadDiceCharacters() {
    const token = localStorage.getItem('token');

    try {
        const characters = await apiFetch('/api/characters', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const select = document.getElementById('dice-character-select');

        select.innerHTML = '<option value="">Choose a character...</option>';
        characters.forEach(char => {
            const option = document.createElement('option');
            option.value = char.id;
            option.textContent = char.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

// Load character data and claims for dice rolling
async function loadDiceCharacterData(characterId) {
    const token = localStorage.getItem('token');

    try {
        // Load character's claims
        const claims = await apiFetch(`/api/claims/character/${characterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        diceCharacterClaims = {};
        claims.forEach(claim => {
            diceCharacterClaims[claim.attribute_name] = claim;
        });

        // Show dice system selection
        document.getElementById('dice-system-section').style.display = 'block';
        selectDiceSystem(diceSelectedSystem);

    } catch (error) {
        console.error('Error loading character data:', error);
        showToast('Failed to load character data: ' + error.message);
    }
}

// Select dice system (d20, d10, d6)
function selectDiceSystem(system) {
    diceSelectedSystem = system;

    // Update button states
    document.querySelectorAll('.dice-system-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.system === system) {
            btn.classList.add('active');
        }
    });

    // Show appropriate sections based on system
    if (system === 'd20') {
        // Show attribute selection for d20 (with claims integration)
        document.getElementById('attribute-section').style.display = 'block';
        document.getElementById('generic-roll-section').style.display = 'none';
        displayAttributeButtons();
    } else {
        // Show generic roll configuration for d10 and d6
        document.getElementById('attribute-section').style.display = 'none';
        document.getElementById('generic-roll-section').style.display = 'block';
        document.getElementById('roll-button-section').style.display = 'block';
    }

    // Reset selected attribute
    diceSelectedAttribute = null;
}

// Display attribute buttons for d20 system
function displayAttributeButtons() {
    const container = document.getElementById('attribute-buttons');
    container.innerHTML = '';

    commonAttributes.forEach(attr => {
        const btn = document.createElement('button');
        btn.className = 'attribute-btn';
        btn.textContent = attr;
        btn.onclick = () => selectAttribute(attr);

        // Mark if character has a claim on this attribute
        if (diceCharacterClaims[attr] && diceCharacterClaims[attr].points_spent > 0) {
            btn.classList.add('has-claim');
        }

        container.appendChild(btn);
    });
}

// Select attribute for d20 roll
function selectAttribute(attribute) {
    diceSelectedAttribute = attribute;

    // Update button states
    document.querySelectorAll('.attribute-btn').forEach(btn => {
        btn.style.background = '';
        if (btn.textContent === attribute) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        }
    });

    // Show roll button
    document.getElementById('roll-button-section').style.display = 'block';
}

// Roll dice
async function rollDice() {
    const token = localStorage.getItem('token');

    if (!diceSelectedCharacter) {
        showToast('Please select a character first');
        return;
    }

    let rollResult;

    try {
        // Show rolling animation
        showDiceAnimation();

        if (diceSelectedSystem === 'd20') {
            // D20 system with claims
            if (!diceSelectedAttribute) {
                showToast('Please select an attribute');
                hideDiceAnimation();
                return;
            }

            rollResult = await rollD20WithClaims();

        } else if (diceSelectedSystem === 'd10') {
            // World of Darkness d10 system
            rollResult = rollWorldOfDarkness();

        } else if (diceSelectedSystem === 'd6') {
            // Car Wars 2d6 system
            rollResult = rollCarWars();
        }

        // Wait for animation to complete (600ms)
        await new Promise(resolve => setTimeout(resolve, 600));

        // Hide animation and display result
        hideDiceAnimation();
        displayRollResult(rollResult);

        // Add to history
        addToRollHistory(rollResult);

    } catch (error) {
        console.error('Error rolling dice:', error);
        hideDiceAnimation();
        showToast('Failed to roll dice: ' + error.message);
    }
}

// Show dice rolling animation
function showDiceAnimation() {
    const container = document.getElementById('current-roll-result');
    container.innerHTML = '<div class="dice-animation"><div class="dice-icon">🎲</div></div>';
    document.getElementById('roll-result-section').style.display = 'block';
}

// Hide dice animation
function hideDiceAnimation() {
    // Animation will be replaced by actual result
}

// Roll d20 with claims integration
async function rollD20WithClaims() {
    const token = localStorage.getItem('token');
    const baseRoll = Math.floor(Math.random() * 20) + 1;

    // Call API to resolve bonuses
    const result = await apiFetch('/api/claims/resolve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            character_id: diceSelectedCharacter,
            attribute_name: diceSelectedAttribute,
            roll_result: baseRoll
        })
    });

    return {
        system: 'd20',
        attribute: diceSelectedAttribute,
        baseRoll: baseRoll,
        bonus: result.total_bonus,
        total: result.final_result,
        message: result.message,
        isCriticalSuccess: baseRoll === 20,
        isCriticalFailure: baseRoll === 1,
        timestamp: new Date()
    };
}

// Roll World of Darkness (d10 pool system)
function rollWorldOfDarkness() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let successes = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        rolls.push(roll);

        if (roll >= 8) {
            successes++;
        }

        if (roll === 10) {
            successes++; // Double success on 10
        }
    }

    return {
        system: 'd10',
        purpose: purpose,
        rolls: rolls,
        successes: successes,
        total: successes,
        isCriticalSuccess: rolls.some(r => r === 10),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Roll Car Wars (2d6 system)
function rollCarWars() {
    const diceCount = parseInt(document.getElementById('dice-count').value) || 1;
    const modifier = parseInt(document.getElementById('dice-modifier').value) || 0;
    const purpose = document.getElementById('dice-purpose').value || 'General roll';

    const rolls = [];
    let sum = 0;

    for (let i = 0; i < diceCount; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        rolls.push(roll);
        sum += roll;
    }

    const total = sum + modifier;

    return {
        system: 'd6',
        purpose: purpose,
        rolls: rolls,
        baseTotal: sum,
        modifier: modifier,
        total: total,
        isCriticalSuccess: rolls.every(r => r === 6),
        isCriticalFailure: rolls.every(r => r === 1),
        timestamp: new Date()
    };
}

// Display roll result
function displayRollResult(result) {
    const container = document.getElementById('current-roll-result');
    let html = '';

    let resultClass = '';
    if (result.isCriticalSuccess) {
        resultClass = 'critical-success';
    } else if (result.isCriticalFailure) {
        resultClass = 'critical-failure';
    }

    if (result.system === 'd20') {
        html = `
            <div class="result-label">D20 Roll for ${result.attribute}</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Base Roll:</strong> ${result.baseRoll}</div>
                <div><strong>Bonus:</strong> +${result.bonus}</div>
            </div>
            <div class="result-details">${result.message}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 CRITICAL SUCCESS!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 CRITICAL FAILURE!</div>' : ''}
        `;
    } else if (result.system === 'd10') {
        html = `
            <div class="result-label">World of Darkness Roll</div>
            <div class="result-value">${result.successes} Successes</div>
            <div class="result-breakdown">
                <div><strong>Dice Pool:</strong> ${result.rolls.join(', ')}</div>
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 Exceptional Success!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 Botch!</div>' : ''}
        `;
    } else if (result.system === 'd6') {
        html = `
            <div class="result-label">Car Wars Roll</div>
            <div class="result-value">${result.total}</div>
            <div class="result-breakdown">
                <div><strong>Dice:</strong> ${result.rolls.join(', ')}</div>
                <div><strong>Base Sum:</strong> ${result.baseTotal}</div>
                ${result.modifier !== 0 ? `<div><strong>Modifier:</strong> ${result.modifier > 0 ? '+' : ''}${result.modifier}</div>` : ''}
            </div>
            <div class="result-details">${result.purpose}</div>
            ${result.isCriticalSuccess ? '<div class="result-details">🎉 All Sixes!</div>' : ''}
            ${result.isCriticalFailure ? '<div class="result-details">💀 All Ones!</div>' : ''}
        `;
    }

    container.innerHTML = html;
    container.className = `roll-result ${resultClass}`;
    document.getElementById('roll-result-section').style.display = 'block';
}

// Add roll to history
function addToRollHistory(result) {
    rollHistory.unshift(result);

    // Keep only last 20 rolls
    if (rollHistory.length > 20) {
        rollHistory = rollHistory.slice(0, 20);
    }

    displayRollHistory();
}

// Display roll history
function displayRollHistory() {
    const container = document.getElementById('roll-history');

    if (rollHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No rolls yet</p>';
        return;
    }

    let html = '';

    rollHistory.forEach(roll => {
        let historyClass = '';
        if (roll.isCriticalSuccess) {
            historyClass = 'critical-success';
        } else if (roll.isCriticalFailure) {
            historyClass = 'critical-failure';
        }

        let displayValue, breakdown;

        if (roll.system === 'd20') {
            displayValue = roll.total;
            breakdown = `d20: ${roll.baseRoll} + ${roll.bonus} (${roll.attribute})`;
        } else if (roll.system === 'd10') {
            displayValue = `${roll.successes} succ`;
            breakdown = `${roll.rolls.length}d10: ${roll.rolls.join(', ')} (${roll.purpose})`;
        } else if (roll.system === 'd6') {
            displayValue = roll.total;
            breakdown = `${roll.rolls.length}d6: ${roll.rolls.join(', ')}${roll.modifier !== 0 ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : ''} (${roll.purpose})`;
        }

        const timeStr = roll.timestamp.toLocaleTimeString();

        html += `
            <div class="history-item ${historyClass}">
                <div class="history-roll">${displayValue}</div>
                <div class="history-details">
                    <div class="history-breakdown">${breakdown}</div>
                    <div class="history-timestamp">${timeStr}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    document.getElementById('roll-history-section').style.display = 'block';
}

// Hide all dice sections
function hideDiceSections() {
    document.getElementById('dice-system-section').style.display = 'none';
    document.getElementById('attribute-section').style.display = 'none';
    document.getElementById('generic-roll-section').style.display = 'none';
    document.getElementById('roll-button-section').style.display = 'none';
    document.getElementById('roll-result-section').style.display = 'none';
    document.getElementById('roll-history-section').style.display = 'none';
}

// Initialize dice roller when dice tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const diceTab = document.querySelector('[data-tab="dice"]');
    if (diceTab) {
        diceTab.addEventListener('click', () => {
            initDiceRoller();
        });
    }
});

// Referenced from generated onclick="..." HTML (see ADR-001).
Object.assign(window, { rollDice, selectDiceSystem });

