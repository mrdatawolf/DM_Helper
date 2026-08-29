// DM-only read view: all primal pattern lore, split by category tab

const CATEGORIES = ['Pattern', 'Logrus', 'Liminal'];

let allPatterns = [];
let activeCategory = 'Pattern';

async function loadPrimalPatternLore() {
    try {
        allPatterns = await apiFetch('/api/primal-patterns/lore');
        renderLoreTab();
    } catch (err) {
        const el = document.getElementById('pattern-lore-body');
        if (el) el.innerHTML = `<div class="empty-state">Failed to load lore: ${escHtml(err.message)}</div>`;
    }
}

function selectLoreCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.plore-cat-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderLoreBody();
}

function renderLoreTab() {
    const tab = document.getElementById('pattern-lore-tab-inner');
    if (!tab) return;

    tab.innerHTML = `
        <div class="plore-cat-bar">
            ${CATEGORIES.map(c => `
                <button class="plore-cat-btn ${c === activeCategory ? 'active' : ''} plore-cat-${c.toLowerCase()}"
                        data-cat="${c}" onclick="selectLoreCategory('${c}')">${c}</button>
            `).join('')}
        </div>
        <div id="pattern-lore-body" class="pattern-lore-body"></div>
    `;

    renderLoreBody();
}

function renderLoreBody() {
    const el = document.getElementById('pattern-lore-body');
    if (!el) return;

    const patterns = allPatterns.filter(p => (p.category || 'Pattern') === activeCategory);

    if (patterns.length === 0) {
        el.innerHTML = `
            <div class="empty-state">
                <h3>No ${escHtml(activeCategory)} patterns yet</h3>
                <p>Create patterns in the <em>Primal Patterns</em> tab and assign them to this category.</p>
            </div>`;
        return;
    }

    el.innerHTML = patterns.map(p => renderPatternLore(p)).join('');
}

function renderPatternLore(p) {
    const catClass = `plore-pattern-${(p.category || 'Pattern').toLowerCase()}`;

    const metaParts = [
        p.also_known_as ? `<span class="plore-meta-pill">Also: ${escHtml(p.also_known_as)}</span>` : '',
        p.origin_figure ? `<span class="plore-meta-pill">Origin: ${escHtml(p.origin_figure)}</span>` : '',
        p.spirit_animal ? `<span class="plore-meta-pill plore-animal">&#9670; ${escHtml(p.spirit_animal)}${p.spirit_animal_role && p.spirit_animal_role !== 'unknown' ? ` <em>(${escHtml(p.spirit_animal_role)})</em>` : ''}</span>` : ''
    ].filter(Boolean).join('');

    const sectionsHtml = (!p.sections || p.sections.length === 0)
        ? '<p style="color:#999; font-style:italic; padding:8px 0;">No sections added yet.</p>'
        : p.sections.map(s => renderSectionLore(s)).join('');

    return `
        <div class="plore-pattern-block ${catClass}">
            <div class="plore-pattern-header">
                <h2 class="plore-pattern-name">${escHtml(p.name)}</h2>
                ${metaParts ? `<div class="plore-meta-row">${metaParts}</div>` : ''}
            </div>
            <div class="plore-sections">
                ${sectionsHtml}
            </div>
        </div>
    `;
}

function renderSectionLore(s) {
    const isSecret = s.section_key === 'secrets';
    const content = s.content ? renderLoreMarkdown(s.content) : '<em style="color:#bbb;">No content written yet.</em>';

    return `
        <div class="plore-section ${isSecret ? 'plore-section-secret' : ''}">
            <div class="plore-section-header">
                <span class="plore-section-title">${escHtml(s.title)}</span>
                <span class="plore-section-key">${escHtml(s.section_key)}</span>
                ${isSecret ? '<span class="plore-dm-badge">DM ONLY</span>' : ''}
            </div>
            <div class="plore-section-content">${content}</div>
        </div>
    `;
}

function renderLoreMarkdown(md) {
    if (!md) return '';
    return md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h5>$1</h5>')
        .replace(/^## (.+)$/gm, '<h4>$1</h4>')
        .replace(/^# (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/^(?!<[hHuUlLoO])(.+)$/gm, (line) => line.startsWith('<') ? line : `<p>${line}</p>`)
        .replace(/<p><\/p>/g, '');
}

Object.assign(window, { loadPrimalPatternLore, selectLoreCategory });
export { loadPrimalPatternLore };
