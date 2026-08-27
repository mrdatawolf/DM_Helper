// api.js — shared fetch wrapper, loaded once, used by both the DM and
// player dashboards. Plain global script for now (no module system yet on
// this frontend); see docs/ARCHITECTURE.md.
//
// Centralizes the fetch + JSON-parse + non-ok-check pattern that was
// previously hand-rolled per call site. Not every existing call site fits
// this shape exactly (a few branch on the response before deciding whether
// something is really an error) — those are documented exceptions in
// TASK-007's implementation handoff rather than forced through this helper.

// Performs a fetch, parses the JSON body, and throws a descriptive Error if
// the response was not ok. Returns the parsed body on success. Matches the
// codebase's existing `throw new Error((await res.json()).error || '...')`
// idiom, just written once instead of per call site.
async function apiFetch(url, options) {
    const response = await fetch(url, options);

    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        data = null; // empty or non-JSON body
    }

    if (!response.ok) {
        const message = (data && data.error) || `Request failed (${response.status})`;
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }

    return data;
}
