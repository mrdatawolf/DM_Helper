// dom-utils.js — shared DOM/escaping helpers, loaded once, used by both the
// DM and player dashboards. Plain global script for now (no module system
// yet on this frontend); see docs/ARCHITECTURE.md.

// Escapes a value for safe insertion into HTML text/attribute content.
// Only `null`/`undefined` become an empty string — a literal `0`, `false`,
// or `''` are preserved as their own (escaped) text rather than being
// treated as "nothing to show".
function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
