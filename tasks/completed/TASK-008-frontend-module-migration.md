# TASK-008: Migrate frontend to ES modules, remove global mutable state

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: ADR-001 (docs/decisions/ADR-001-frontend-module-migration.md) — Accepted 2026-08-27.
Dependencies: TASK-007 recommended first (extracting `api.js` and
`dom-utils.js` as shared scripts gives this migration real, self-contained
modules to convert early, rather than starting from nothing).

## Desired outcome

The DM and player dashboard frontends have an explicit, testable dependency
graph — real ES modules with `import`/`export` — instead of implicit
`<script>`-tag load-order coupling and shared global mutable state. Frontend
render/logic functions become exercisable in isolation (e.g., via Node +
jsdom) without loading a full page.

## Context

`public/js/dm/dm-core.js` declares shared mutable state at top level:
`let characters`, `shadows`, `storyArcs`, `sessions`, `progress`, and more.
Every other `dm-*.js` file reads and mutates these globals directly, and
correctness depends entirely on `<script>` tag order in
`public/dm-dashboard.html` matching each file's implicit assumptions about
what has already run and what state already exists.

This is flagged in the prior review as **the main blocker to any frontend
unit testing** — nothing can currently be exercised in isolation from the DOM
plus the global-state web it's embedded in — and as **the largest, highest-
risk frontend item** in this batch of findings, likely warranting its own ADR
before implementation, comparable in weight to TASK-002 on the backend side.

## Scope

### Included

- An ADR (`docs/decisions/ADR-00N-frontend-module-migration.md`) laying out
  the migration approach before implementation begins: how `<script
  type="module">` will be introduced, how the current global state in
  `dm-core.js` (and any player-side equivalent) will become explicit
  imports/exports or an explicit shared-state module, whether the migration
  happens file-by-file with an interim compatibility shim or as one larger
  cutover, and how much of `public/js/player/` is affected in addition to
  `public/js/dm/`.
- Once the ADR is approved: converting `public/js/dm/*.js` and
  `public/js/player/*.js` to real ES modules with explicit imports/exports,
  replacing `dm-core.js`'s top-level mutable globals with an explicit,
  importable state module (or equivalent pattern chosen in the ADR).
- Updating `public/dm-dashboard.html` and `public/player-dashboard.html` to
  load the entry module(s) via `<script type="module">`.
- At least a small number of representative render/logic functions
  demonstrated as unit-testable in isolation post-migration (proving the
  desired outcome, not necessarily full test coverage of the whole frontend —
  that's a natural follow-up once the pattern is established).

### Excluded

- Any visual or behavioral change to the dashboards from the user's
  perspective — this is an internal restructuring, not a redesign.
- Splitting the oversized files identified in TASK-009 — that can happen
  before, during, or after this migration; the ADR should note which order is
  recommended, but TASK-009's file-splitting work is scoped separately.
- Introducing a bundler or build step — confirm in the ADR whether native
  browser ES modules (no build step) are sufficient, consistent with this
  project's current no-bundler constraint (`docs/PROJECT.md`), or whether that
  constraint needs to be revisited as part of this decision.

## Plan

1. Draft the ADR covering migration approach, ordering relative to TASK-007
   and TASK-009, and how `dm-core.js`'s global state becomes explicit.
   Present it to the human for approval before any code changes.
2. Once approved, migrate `dm-core.js` (or its replacement) first, since
   everything else depends on it.
3. Migrate remaining `dm-*.js` files to import what they need explicitly
   instead of reading globals.
4. Repeat for `public/js/player/*.js`.
5. Update both dashboard HTML files to load via `<script type="module">`.
6. Demonstrate isolated unit-testability for a small representative sample of
   render/logic functions, as evidence for the acceptance criteria.

## Acceptance criteria

- [x] An ADR documenting the migration approach exists and has been approved
      by the human before implementation begins.
- [x] `public/js/dm/*.js` and `public/js/player/*.js` are real ES modules
      with explicit `import`/`export` statements; no file relies on an
      implicit global declared by another file's load order.
- [x] `dm-core.js`'s previous top-level `let` globals no longer exist as
      implicit shared mutable state; equivalent state is accessed through
      explicit imports.
- [x] Both dashboard HTML files load their frontend via
      `<script type="module">`.
- [x] At least a few representative render/logic functions are demonstrated
      testable in isolation (e.g., via Node + jsdom), with example tests
      added under `tests/`.
- [x] Both dashboards are manually verified to behave identically to before
      the migration (no visual or functional regression).

## Validation requirements

- Full manual walkthrough of both the DM and player dashboards after
  migration, covering every major tab/section, since there is no existing
  frontend test suite to catch regressions automatically.
- The new isolated unit tests added as part of this task must pass.
- `npm test` (full suite) passes.

## Risks and assumptions

- This is explicitly flagged as needing an ADR before implementation, per
  `docs/workflow/change-classification.md`'s decision-required criteria —
  it's a durable architectural direction with real alternatives (module
  pattern choice, migration sequencing, whether to introduce a build step).
- Highest-risk frontend item in this batch: touches every file under
  `public/js/dm/` and `public/js/player/` and changes a foundational
  assumption (global state + load order) that everything else currently
  relies on. Recommend sequencing after TASK-007 and considering whether
  TASK-009's file-splitting should happen before, during, or after this
  migration (the ADR should make that call explicitly).
- Browser compatibility for native ES modules is not expected to be a
  concern for this project's user base, but confirm during the ADR rather
  than assuming.

## Blocker

None. ADR-001 accepted by Patrick, 2026-08-27 — implementation proceeding
per the ADR's recommendation (native ES modules, per-dashboard state
module, window-bridging for inline-HTML event handlers, atomic per-
dashboard cutover, DM first).

## Implementation handoff

ADR drafted by Claude (this session), 2026-08-27:
`docs/decisions/ADR-001-frontend-module-migration.md`. Summary of its
recommendation, pending your review of the full document:

- Native ES modules (`<script type="module">`), no bundler.
- One explicit shared-state module per dashboard (`dm-state.js`,
  `player-state.js`), each exporting a single mutable `state` object —
  replaces `dm-core.js`'s 18 top-level globals and `player-core.js`'s 4,
  mechanically (`characters` → `state.characters`), not a per-domain
  redesign.
- **Key risk surfaced while researching this**: 128 distinct function
  names are called from inline `onclick=`/`onchange=`/etc. HTML attributes
  across `dm-*.js`/`player-*.js`. Inline event handlers always run in the
  global scope regardless of module boundaries, so every one of those
  functions needs an explicit `window.fnName = fnName` bridge at its
  module's definition site — missing one silently breaks a button with no
  test coverage to catch it. The ADR recommends keeping the existing inline
  `onclick=` pattern (bridging to `window`) rather than rewriting all 128
  call sites to `addEventListener`, since the latter is a much larger diff
  than this task's "internal restructuring, not a redesign" scope allows.
- Atomic per-dashboard cutover (DM first, then player), no interim
  compatibility shim — the codebase is small enough that this is safer
  than a shim that itself needs later removal.
- Recommends TASK-008 (this migration) land before TASK-009 (file-
  splitting) — splitting an already-real ES module is lower-risk than
  splitting a classic global script, and this matches what TASK-009's own
  plan already defaults to.
- `jsdom` added as a dev dependency for the required testability
  demonstration; 2-3 pure data-shaping functions (not templating
  functions) as the representative examples.

Full reasoning, alternatives considered, and consequences are in the ADR
itself. Implementation summary below.

### Implementation summary

**DM dashboard** (`public/js/dm/*.js`, 9 files + `dm-auth-guard.js`):

- `dm-state.js` (new) exports `API_BASE` and a single `state` object holding
  all 18 former `dm-core.js` globals (`characters`, `shadows`, `sessions`,
  `progress`, `storyArcs`, etc.).
- Every `dm-*.js` file converted to a real ES module: explicit `import` for
  every cross-file name it uses, explicit `export` for every name another
  file imports, and `Object.assign(window, {...})` at the bottom for every
  name referenced from generated `onclick=`/etc. HTML (111 distinct names).
- One verified-safe circular import
  (`dm-modals.js` → `dm-lists.js` → `dm-primal-patterns.js` → `dm-modals.js`)
  — every function in the cycle is a hoisted `function` declaration, so ES
  module hoisting makes it safe; confirmed both by static check and live
  browser testing.
- `public/dm-dashboard.html`: all 9 `dm-*.js` tags now `type="module"`;
  `toast.js`/`api.js`/`dom-utils.js` stay classic scripts.

**Player dashboard** (`public/js/player/*.js`, 15 files):

- `player-state.js` (new) exports a `state` object holding `player-core.js`'s
  4 former globals (`currentUser`, `currentCharacter`, `userCharacters`,
  `playerAllShadows`).
- Same conversion pattern as the DM side: explicit imports/exports, and
  `Object.assign(window, {...})` for the 61 distinct names referenced from
  inline HTML (including `onmouseenter=`/`onmouseleave=` in the character
  wizard's hover-lore panel — a pattern the DM side didn't have, caught by
  broadening the onclick-name scan's attribute regex before finishing).
- Two verified-safe circular imports:
  `player-core.js` ↔ `player-characters.js` (state now lives in
  `player-state.js`, but `switchTab`/`imprintLabel` vs.
  `loadCharacters`/`loadClaims`/`loadProgress` still form a real cycle — all
  hoisted `function` declarations, safe) and
  `player-wizard-core.js` ↔ `player-wizard-steps.js` (same — all hoisted
  functions, plus the mutable `wiz` object, which is only ever
  *property*-mutated across files, never reassigned).
- One real ES-module violation found and fixed: `player-wizard-steps.js`
  directly reassigned wizard-core's internal `_wizardInfoFocused` variable
  (`_wizardInfoFocused = {...}`), which is illegal for an imported binding
  under real ES modules (imports are read-only in the importing file). Fixed
  by replacing that inline reassignment with a call to the existing
  `wizardFocusField(info)` helper already in `player-wizard-core.js`, which
  does the exact same two operations — a behavior-preserving one-line
  substitution, not a design change.
- One pre-existing bug found (not introduced by this migration, not fixed —
  out of scope, "behavior unchanged"): `player-claims.js`'s
  `displayClaimsInterface()` references a bare `allCharacters`, which is not
  declared anywhere in the codebase (likely meant `state.userCharacters`).
  This throws `ReferenceError` today in production exactly as it did before
  this migration — confirmed via live browser testing (Claims tab has been
  broken since before TASK-008). Flagged here for a future bug-fix task.
- `public/player-dashboard.html`: all 15 `player-*.js` tags now
  `type="module"`; `toast.js`/`api.js`/`dom-utils.js` stay classic scripts.

**Testability demonstration** (acceptance criterion):

- `jsdom` added as a dev dependency.
- `public/js/player/package.json` (new, `{"type": "module"}`) — scopes that
  directory to ES modules for Node's module loader, so test files (which are
  CommonJS, per this project's `"type": "commonjs"`) can `import()` them
  directly.
- `tests/frontend-modules.test.js` (new): 3 tests exercising 3 pure
  data-shaping functions in isolation — `visitedInfluenceLabel` and
  `visitedShadowCardStyle` (`player-shadows.js`) and `calcAmberMods`
  (`player-wizard-core.js`) — via `import()` under a minimal jsdom
  `document`/`window`, without loading a full page or triggering any
  network/DOM-writing sibling function in the same file.

**Verification methodology** (both dashboards, repeated per dashboard):

- Custom AST-based tooling (acorn, borrowed from an unrelated globally-
  installed package — no JS parser is a project dependency) to precisely
  inventory (a) every function name referenced from inline HTML event
  attributes and its owning file, and (b) the full cross-file plain-JS
  reference graph — converged to 0 missing imports and 0 missing
  `window`-bridges on both dashboards, confirmed by automated re-scans after
  each file's conversion.
- `node -c`-equivalent ES-module syntax validation (acorn with
  `sourceType: 'module'`) on every converted file.
- Live Playwright (headless Chromium) browser testing on both dashboards:
  register + promote a test user, log in, click through every tab, and
  specifically exercise the riskiest paths (both dashboards' circular-import
  chains, and player-side wizard character creation end to end). DM run: 1
  pre-existing issue (favicon 404). Player run: 2 pre-existing issues
  (favicon 404, the `allCharacters` bug above) — zero regressions on either
  dashboard.
- `npm test`: 44/44 passing (41 pre-existing backend tests + 3 new frontend
  jsdom tests).

## Review

Independent review via `codex exec review --uncommitted
--dangerously-bypass-approvals-and-sandbox`, 2026-08-27.

Isolation: stashed away everything unrelated to this task (backend `src/`,
`admin.html`/`admin.js`, `navigation.js`, `CLAUDE.md`/`AGENTS.md`, other
tasks/docs, other tests) before running the review, per the lesson from
earlier tasks' reviews — but deliberately *kept* `public/js/api.js` and
`public/js/dom-utils.js` unstashed even though they're untracked (TASK-007's
output), since they're a real runtime dependency of every converted
`dm-*.js`/`player-*.js` file; stashing them away would have produced a false
"referenced module doesn't exist" finding, the exact failure mode seen
before. `npm test` re-run inside the isolated state (35/35 of the tests
relevant to what remained) confirmed the isolation itself introduced no
breakage before invoking the review.

Outcome: no actionable findings. Codex's summary: "The ES-module migration
appears behavior-preserving, dependencies and inline-handler bridges are
explicitly managed, and the full test suite passes. No actionable
regressions were identified in the changed files."

Stash restored immediately after the review; full suite re-confirmed at
44/44 passing in the unstashed state.

One pre-existing bug was discovered during implementation (not a
regression, not fixed — see Implementation summary above): `player-claims.js`
references an undefined `allCharacters`, breaking the Claims tab. Worth a
follow-up bug-fix task.

## Human acceptance

Pending.
