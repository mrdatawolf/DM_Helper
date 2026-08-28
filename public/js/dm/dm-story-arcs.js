import { state } from './dm-state.js';
import { renderGrandNarrative } from './dm-story-narrative.js';
import { renderArcRows, selectArc } from './dm-story-arc-editor.js';
import { renderBeatsPool } from './dm-story-beats.js';
async function loadStoryArcs() {
    try {
        [state.storyArcs, state.beats, state.grandNarrative] = await Promise.all([
            apiFetch('/api/arcs'),
            apiFetch('/api/beats'),
            apiFetch('/api/arcs/grand-narrative'),
        ]);

        renderGrandNarrative();
        renderArcRows();
        renderBeatsPool();

        if (state.activeArcId) {
            const still = state.storyArcs.find(a => a.id === state.activeArcId);
            if (still) selectArc(state.activeArcId);
            else {
                state.activeArcId = null;
                const dv = document.getElementById('arc-detail-view');
                if (dv) dv.innerHTML = '';
            }
        }
    } catch (err) {
        console.error('Failed to load story arcs:', err);
    }
}
export { loadStoryArcs };