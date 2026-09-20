import { createWizardHost } from './player-wizard-host.js';
import { state } from './player-state.js';
import { loadCharacters } from './player-characters.js';
import { openEditCharacter } from './player-edit-form.js';
import { filterWizardPayload, loadWizardModules } from './player-wizard-integration.js';

let activeHost = null;
let activeCampaign = null;
let activeSystemContent = null;

async function currentCampaign() {
    const token = localStorage.getItem('token');
    const data = await apiFetch('/api/auth/campaigns', { headers: { Authorization: `Bearer ${token}` } });
    const campaign = data.campaigns.find(item => item.id === data.current_campaign_id);
    if (!campaign) throw new Error('Select a campaign before creating a character.');
    return campaign;
}

function applyGuideGate() {
    const button = document.getElementById('create-character-btn');
    if (!button || !localStorage.getItem('amber_guide_acknowledged')) return;
    button.disabled = false;
    button.classList.remove('btn-create-locked');
    const reminder = document.getElementById('guide-reminder-btn');
    if (reminder) reminder.style.display = 'none';
}

function showGuideReminder() { document.getElementById('guide-reminder-modal').classList.add('show'); }
function acknowledgeGuide() {
    localStorage.setItem('amber_guide_acknowledged', '1');
    document.getElementById('guide-reminder-modal').classList.remove('show');
    applyGuideGate();
}

function renderLoadError(message) {
    const body = document.querySelector('#create-character-modal .wizard-body');
    body.replaceChildren();
    const error = document.createElement('p');
    error.className = 'error-message';
    error.textContent = message;
    body.appendChild(error);
}

async function openCreateCharacter() {
    if (!localStorage.getItem('amber_guide_acknowledged')) return;
    document.getElementById('create-character-modal').classList.add('show');
    try {
        activeCampaign = await currentCampaign();
        const [{ systemSteps, universeSteps }, shadows, systemContent] = await Promise.all([
            loadWizardModules(activeCampaign),
            activeCampaign.universe_id ? apiFetch('/api/shadows?startingOnly=true') : Promise.resolve([]),
            apiFetch('/api/system/content/wizard')
        ]);
        activeSystemContent = systemContent;
        const progress = document.getElementById('wizard-steps');
        const body = document.querySelector('#create-character-modal .wizard-body');
        progress.replaceChildren();
        activeHost = createWizardHost({
            systemSteps, universeSteps, container: body,
            counter: document.getElementById('wizard-step-counter'),
            backButton: document.getElementById('wizard-back-btn'),
            nextButton: document.getElementById('wizard-next-btn'),
            submitButtons: [document.getElementById('wizard-submit-btn'), document.getElementById('wizard-submit-edit-btn')],
            infoPanel: document.getElementById('wizard-info-panel'),
            wizardState: { shadows },
            filterForReview: wizardState => filterWizardPayload(wizardState, activeCampaign, activeSystemContent),
            onValidationError: message => showToast(message)
        });
        for (const [index, step] of activeHost.steps.entries()) {
            const marker = document.createElement('div');
            marker.className = 'wstep';
            marker.textContent = `${index + 1}. ${step.title}`;
            progress.appendChild(marker);
        }
        activeHost.render();
    } catch (error) {
        activeHost = null;
        renderLoadError(error.message);
        showToast(error.message);
    }
}

function closeCreateCharacter() {
    document.getElementById('create-character-modal').classList.remove('show');
    activeHost = null;
}
function wizardNext() { if (activeHost) activeHost.next(); }
function wizardBack() { if (activeHost) activeHost.back(); }

async function wizardSubmit(continueToEdit = false) {
    if (!activeHost || activeHost.currentStep.id !== 'host:review') return;
    const buttons = [document.getElementById('wizard-submit-btn'), document.getElementById('wizard-submit-edit-btn')];
    buttons.forEach(button => { button.disabled = true; });
    try {
        const payload = filterWizardPayload(activeHost.wizardState, activeCampaign, activeSystemContent);
        const character = await apiFetch('/api/characters', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(payload)
        });
        closeCreateCharacter();
        await loadCharacters();
        if (continueToEdit) openEditCharacter(character.id);
    } catch (error) {
        showToast(`Error: ${error.message}`);
    } finally {
        buttons.forEach(button => { button.disabled = false; });
    }
}

Object.assign(window, { acknowledgeGuide, closeCreateCharacter, openCreateCharacter, showGuideReminder, wizardBack, wizardNext, wizardSubmit });

export { applyGuideGate, closeCreateCharacter, filterWizardPayload, loadWizardModules };
