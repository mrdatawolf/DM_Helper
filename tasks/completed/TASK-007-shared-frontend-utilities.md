# TASK-007: Shared frontend utilities (fetch wrapper + DOM/escaping helpers)

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None. This task is explicitly a prerequisite step for TASK-008
(frontend ES module migration) — extracting these two shared utilities first
gives that later migration a real, self-contained module to start from.

## Desired outcome

Two small, shared frontend utility scripts exist and are used everywhere they
apply, eliminating two independent categories of copy-paste across
`public/js/`:

1. A shared `fetch()` wrapper that handles JSON parsing and error logging.
2. A shared `escHtml` (HTML-escaping) helper.

## Context

Two unrelated-but-similar duplication findings from the prior review, grouped
here because they're the same *kind* of fix (extract one small, dependency-free
shared script, loaded once, used everywhere) and are explicitly called out as
natural first steps toward the larger ES-module migration in TASK-008:

- **No shared fetch wrapper**: every file in `public/js/dm/` and
  `public/js/player/` hand-rolls `fetch()` + JSON parsing + `console.error`
  boilerplate repeatedly, dozens of times, with no shared `api.js`.
- **`escHtml` reimplemented independently** in three separate files:
  `public/js/admin.js`, `public/js/dm/dm-primal-patterns.js`, and
  `public/js/player/player-shadows.js`.

The frontend currently has no module system (plain global `<script>` tags,
load-order-dependent — see `docs/ARCHITECTURE.md`), so both new utilities must
work as global scripts for now, consistent with everything else on the page,
even though TASK-008 will later convert the whole frontend to real modules.

## Scope

### Included

- A shared fetch-wrapper script (e.g., `public/js/api.js`) that centralizes
  the `fetch()` + JSON-parse + error-logging pattern currently duplicated
  across `public/js/dm/*.js` and `public/js/player/*.js`.
- A shared DOM-utils script (e.g., `public/js/dom-utils.js`) exporting one
  `escHtml` implementation.
- Updating `public/dm-dashboard.html` and `public/player-dashboard.html` to
  load both new scripts, early enough in the `<script>` sequence that every
  file depending on them loads after.
- Replacing every duplicated inline fetch pattern and every duplicated
  `escHtml` definition (`public/js/admin.js`,
  `public/js/dm/dm-primal-patterns.js`, `public/js/player/player-shadows.js`,
  plus any other files found to hand-roll either pattern during a full sweep)
  with calls to the shared versions.

### Excluded

- Converting the frontend to ES modules (`type="module"`, explicit
  imports/exports) — that is TASK-008. These new files remain plain global
  scripts for now, matching the current pattern, even though it means they
  still participate in load-order coupling.
- Any behavior change to what gets fetched, how errors are surfaced to the
  user, or how HTML is escaped — this is extraction only, matching existing
  behavior exactly, aside from unifying any minor drift found between the
  three existing `escHtml` copies (report drift found, don't silently pick
  one).

## Plan

1. Grep `public/js/` for `fetch(` and for `escHtml` definitions to build a
   complete before-list of call sites and duplicate definitions (the ones
   named above are the known ones; there may be more).
2. Write `public/js/api.js` and `public/js/dom-utils.js`.
3. Add both to the `<script>` sequence in both dashboard HTML files, before
   anything that will use them.
4. Replace call sites file by file, checking the app still works after each
   file (this is UI-facing code with no existing frontend test coverage, so
   manual verification matters more here than for the backend tasks).

## Acceptance criteria

- [ ] `public/js/api.js` (or equivalent) exists, is loaded once from both
      dashboard HTML files, and is used by every file that previously
      hand-rolled the fetch+JSON+error-log pattern.
- [ ] `public/js/dom-utils.js` (or equivalent) exists with one `escHtml`
      implementation, loaded once, and used by `admin.js`,
      `dm-primal-patterns.js`, `player-shadows.js`, and any other file found
      to have its own copy.
- [ ] No file under `public/js/` defines its own `escHtml` after this change.
- [ ] Any behavioral drift discovered between the original three `escHtml`
      copies is reported to the human rather than silently resolved.
- [ ] The DM dashboard and player dashboard both load and function correctly
      after the change (manual verification, since there is no frontend test
      suite yet).

## Validation requirements

- Manual verification: load both dashboards, exercise a representative action
  from each (e.g., a DM edit that hits `fetch`, a player view rendering
  user-supplied text through `escHtml`) and confirm no console errors and no
  visual regression.
- `npm test` should still pass (existing suites are backend-only, so this is
  a sanity check rather than direct coverage of this change).

## Risks and assumptions

- No automated frontend test coverage exists yet for this code path, so
  validation here is necessarily more manual than the backend tasks. This is
  itself part of the motivation for TASK-008/TASK-009.
- Load order still matters until TASK-008 lands — placing the new shared
  scripts too late in the `<script>` sequence would break every caller
  simultaneously. Double check placement carefully.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26.

This turned out considerably larger than the other findings in this batch —
138 initial `fetch(` call sites across 25 files (vs. TASK-001's ~110
backend sites), with real per-site variation in error handling rather than
one uniform shape, and zero automated frontend test coverage as a safety
net. Handled with more manual care accordingly, including live
browser-driven verification (see Validation below).

### What was built

- `public/js/dom-utils.js`: one `escHtml(str)` —
  `String(str ?? '').replace(...)` (4 replacements: `&`, `<`, `>`, `"`).
- `public/js/api.js`: one `apiFetch(url, options)` — does the fetch, parses
  the JSON body (tolerating an empty/non-JSON body), and either returns the
  parsed data or throws an `Error` carrying the server's `error` message
  (falling back to `Request failed (<status>)` if absent). The thrown
  error also carries `.status` (the HTTP status code) — added mid-task
  when a real caller (`player-characters.js`, see below) needed to
  special-case a 401 without re-checking the raw response.
- Both scripts added to `public/dm-dashboard.html`, `public/player-dashboard.html`,
  and `public/admin.html` (not originally named in scope, but `admin.js` is
  one of the three files this task explicitly targets for `escHtml`, and it
  also had 6 fetch call sites) — placed right after `toast.js`/before any
  `dm-*`/`player-*`/`admin.js` script, per the task's load-order requirement.

### escHtml consolidation — bigger than the three named files

Confirmed real drift between the three original copies (`admin.js` used
`String(str ?? '')`; `dm-primal-patterns.js` and `player-shadows.js`'s
`escHtmlP` used `if (!str) return ''`, which would also blank out a literal
`0`/`false`/`''`). Checked every call site of the falsy-check versions:
none ever pass a number or boolean, and the one case that overlaps (an
explicit empty string) produces identical output either way. So this drift
is real in the code but never observable in practice — unified on the safer
`?? ''` version rather than treating it as a live decision, and documented
why here per the task's "report drift" instruction.

**Bigger finding**: `player-shadows.js`'s `escHtmlP` was not actually
private to that file — it's a de facto global, called from 10 other player
files (`player-characters.js`, `player-claims.js`, `player-core.js`,
`player-creatures.js`, `player-edit-form.js`, `player-familiars.js`,
`player-gear-powers.js`, `player-journal.js`, `player-session-tracker.js`,
`player-wizard-steps.js`) that only worked because `player-shadows.js`
happens to load before any of them are *invoked* (not before they're
*parsed* — this is exactly the load-order fragility TASK-008 exists to
fix). Renamed every one of those ~65 call sites from `escHtmlP` to
`escHtml` (one bare function reference, `f.unlocked_abilities.map(escHtmlP)`
in `player-familiars.js`, needed a manual fix since it wasn't a `escHtmlP(`
call). `dm-primal-patterns.js`'s `escHtml` had the same undocumented-global
role for the other 8 DM files (`dm-claims.js`, `dm-core.js`, `dm-editors.js`,
`dm-journal.js`, `dm-lists.js`, `dm-modals.js`, `dm-scenes-combats.js`,
`dm-story-arcs.js`) — no rename needed there since the name was already
`escHtml`, just the definition moved.

### Fetch migration

**141 `apiFetch(` call sites now exist across 23 files** (up from 0), and
**16 raw `fetch(` calls remain** (including `api.js`'s own internal one) —
every one of the other 15 is a deliberate, documented exception where using
`apiFetch` would have collapsed a real behavioral distinction:

| File | What the raw fetch preserves |
|---|---|
| `dm/dm-auth-guard.js` | `verifyDmSession`: network-error vs. confirmed-invalid-session are handled differently (only the latter clears the session) — see its own inline comment. This file also monkey-patches `window.fetch` globally to attach the DM's Bearer token and handle 401 session-expiry for every `/api/` call; it's the reason DM-side `apiFetch` calls never need to pass an `Authorization` header themselves. |
| `dm/dm-modals.js` (`viewShadowLore`) | A 404 means "no lore file" (its own message); a real exception gets a different message. |
| `dm/dm-scenes-combats.js` (`loadDMScenes`) | A non-ok response silently clears the panel (no error shown); a real exception is logged only. |
| `navigation.js` (`checkAuthStatus`) | Same three-way distinction as `dm-auth-guard.js` — invalid token clears storage, network error does not (existing inline comment already explained this; left untouched, migrated only the unrelated logout call in the same file). |
| `player/player-claims.js` (claim pool) | A non-ok response means "no pool yet," falls back to a default rather than erroring. |
| `player/player-edit-form.js` (`openEditCharacter`'s shadows fetch) | Non-ok degrades to an empty shadow list rather than failing the whole form (the character fetch in the same `Promise.all` *was* migrated). |
| `player/player-session-tracker.js` (`loadStoryTimeline`, `openStoryEntry`) | Same graceful-degrade-to-empty-list pattern, two places. |
| `player/player-shadows.js` (`showAddKnownShadowPanel`) | Same pattern — panel still renders with no options rather than failing entirely. |
| `load-navigation.js` | Fetches static HTML (`.text()`), not JSON — not the pattern this task targets at all. |

**Policy applied consistently rather than decided per-site** (flagging once
here instead of at every occurrence, given the volume): several call sites
threw a fixed generic message on a non-ok response (e.g. `'Create failed'`,
`'Delete failed'`) instead of surfacing the server's actual `error` text.
`apiFetch` always surfaces the real server message when present. Since the
centralized error handler from TASK-001 means every error response already
carries a real `error` field, this is a strict improvement (more specific
text shown to the user) in every case checked, never a loss of information
— applied uniformly rather than preserving each generic fallback string
individually.

**Unguarded call sites**: 7 functions in `dm-editors.js`
(`addSessionChar`/`removeSessionChar`/`updateSessionCharAttendance`/
`addSessionBeat`/`removeSessionBeat`/`addSessionNpc`/`removeSessionNpc`) and
one (`saveSessionChapters`) had *no* error handling at all — a failed
request was silently ignored and the UI still refreshed as if it had
succeeded. Since `apiFetch` throws on non-ok where bare `fetch()` did not,
each was wrapped in a try/catch that logs the error via `console.error` but
still runs the original refresh step afterward, preserving the "always
refreshes" behavior while making failures at least visible instead of
fully silent.

### Validation performed

- `npm test`: 39/39 passing throughout (unaffected — backend-only suite, run
  as a sanity check per the task).
- `node -c` on every one of the ~27 touched files: all syntactically valid.
- Live browser verification (Playwright, headless Chromium) against a
  spare-port server instance, since this UI-facing change has no automated
  frontend test coverage:
  - **DM dashboard**: registered a throwaway DM user, logged in, loaded
    `/dm-dashboard.html`, created a character through the modal (exercises
    `apiFetch` POST + `escHtml`-rendered response), then navigated the
    Story Arcs, Primal Patterns, and Sessions tabs (exercising
    `dm-story-arcs.js`, `dm-primal-patterns.js`, `dm-scenes-combats.js`).
    Zero console or page errors other than the browser's own `/favicon.ico`
    404, confirmed via direct `curl` to be a pre-existing, unrelated
    condition (this app has no favicon at all) — not something this task
    introduced.
  - **Player dashboard**: registered a throwaway player user, logged in,
    loaded `/player-dashboard.html`. Zero console or page errors.
  - **`admin.html`**: logged in as the seeded `admin` account, confirmed the
    user table rendered (7 rows, via the migrated `apiFetch('/api/admin/users')`
    call). Zero errors beyond the same favicon 404. (Hit one test-harness-only
    issue along the way: `admin.js` checks `localStorage.user.is_admin`
    directly rather than calling the API, and my first attempt only seeded
    `localStorage.token` — not a bug in the app, just an incomplete test
    setup, fixed by also seeding `localStorage.user`.)
  - Cleaned up all throwaway users/characters from the dev database and
    stopped every spare server instance afterward.

### Fix applied after independent review

Codex's review (below) caught a real bug: `navigation.js`'s logout call was
migrated to `apiFetch`, but `navigation.js` is also loaded on
`public/index.html` and `public/guide.html` — two pages that were never
given `<script src="/js/api.js">` (only `dm-dashboard.html`,
`player-dashboard.html`, and `admin.html` were, per this task's named
scope). Clicking logout on either of those two pages would have thrown
`ReferenceError: apiFetch is not defined`, silently skipping the
server-side logout call while local storage still got cleared — the user
would appear logged out client-side while their session cookie stayed
valid server-side.

Fixed by reverting just that one call site back to raw `fetch` (documented
inline) rather than adding `api.js`/`dom-utils.js` to two more pages
outside this task's scope for the sake of one low-value fire-and-forget
logout call. Then re-verified every HTML page against every file this task
touched: `dm-dashboard.html` and `player-dashboard.html` correctly pair
every `dm-*`/`player-*` file with `api.js`+`dom-utils.js`; `admin.html`
correctly pairs `admin.js` the same way; `index.html`/`guide.html` only
load `navigation.js` (now safe) and `load-navigation.js` (never used
`apiFetch`); the remaining four HTML pages
(`dm-claims-view.html`, `player-claims.html`, `player-login.html`,
`test-claims.html`) have no external script references at all — inline
`<script>` only, untouched by this task.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method: unlike the four backend tasks reviewed earlier, this diff is
frontend-only and doesn't overlap with the backend tasks' files, so the
backend changes and the DbC scaffolding were stashed out cleanly, leaving
exactly this task's diff visible.

Findings — two raised, one real and fixed, one a review-scoping artifact:

1. **[Real, fixed]** The `navigation.js`/`index.html`/`guide.html` cross-page
   `apiFetch`-without-`api.js` bug described above. Codex traced the actual
   `<script>` tags across every HTML page rather than trusting the task's
   own framing, which is exactly how this was caught.
2. **[False positive — stash artifact, not a defect]** Codex also flagged
   `tests/build-update-query.test.js` as requiring a nonexistent
   `../src/utils/buildUpdateQuery` module. This is because the review
   stashed out everything under `src/` (all already separately reviewed in
   TASK-003), but `tests/build-update-query.test.js` lives outside `src/`
   and stayed visible — so the review saw a test file with its dependency
   hidden. Confirmed this is not a real problem: `npm test` was re-run
   immediately after restoring the stash and passed 39/39, including that
   file's 7 tests. No code change needed for this one.

## Human acceptance

Pending.
