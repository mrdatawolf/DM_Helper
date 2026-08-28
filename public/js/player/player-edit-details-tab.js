function generateDetailsTab(char) {
    return `
        <div id="edit-tab-details" class="char-edit-tab" style="display: none;">
            <div class="form-group">
                <label for="edit-char-appearance">Appearance</label>
                <textarea id="edit-char-appearance" rows="4" placeholder="Describe your character's physical appearance...">${escHtml(char.appearance)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-personality">Personality & Traits</label>
                <textarea id="edit-char-personality" rows="4" placeholder="Describe your character's personality...">${escHtml(char.personality)}</textarea>
            </div>

            <div class="form-group">
                <label for="edit-char-backstory">Backstory</label>
                <textarea id="edit-char-backstory" rows="6" placeholder="Tell your character's story...">${escHtml(char.backstory)}</textarea>
            </div>
        </div>
    `;
}

export { generateDetailsTab };