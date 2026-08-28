# TASK-009: Split oversized, multi-concern frontend files

Owner role: Pending
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None strictly required, but doing this after TASK-008 (ES
module migration) is recommended — splitting these files while they're still
global load-order-coupled scripts means the split pieces inherit the same
load-order fragility; splitting after TASK-008 lands means each new file can
be a real module from the start. The ADR produced in TASK-008 should state
which ordering it recommends; this task's Plan defaults to "after TASK-008"
but can be reordered by the human.

## Desired outcome

The largest, multi-concern frontend files are split along resource
boundaries, with data-shaping logic separated from HTML-string templating and
inline event-wiring where practical — matching how `dm-lists.js` and
`dm-journal.js` are already reasonably decomposed — so that individual pieces
are smaller, single-concern, and (where the shaping logic is separated out)
independently testable.

## Context

Five frontend files mix data-shaping, HTML-string templating, and inline
`onclick=` event wiring in one function each, and are all over 500 lines:

| File | Lines | Notes |
|---|---|---|
| `public/js/dm/dm-story-arcs.js` | 816 | |
| `public/js/dm/dm-editors.js` | 778 | |
| `public/js/player/player-edit-form.js` | 737 | |
| `public/js/dm/dm-modals.js` | 685 | Modals for characters/shadows/creatures/sessions/progress all in one file |
| `public/js/dm/dm-primal-patterns.js` | 522 | |

By comparison, the already-reasonably-decomposed files this task should
emulate are much smaller: `dm-lists.js` (384 lines) and `dm-journal.js` (315
lines).

`dm-modals.js` in particular should probably split one-to-one with the
resources it covers, the same way TASK-005 splits `characters.js` by
sub-resource on the backend.

## Scope

### Included

- Splitting each of the five files along resource/concern boundaries. As a
  starting point (to be refined during implementation, not treated as a rigid
  spec):
  - `dm-modals.js` → one file per resource it currently covers (characters,
    shadows, creatures, sessions, progress), mirroring the backend split in
    TASK-005.
  - `dm-story-arcs.js`, `dm-editors.js`, `player-edit-form.js`,
    `dm-primal-patterns.js` → split by natural sub-section/concern within
    each file; exact boundaries are an implementation judgment call, guided
    by what `dm-lists.js`/`dm-journal.js` already demonstrate.
- Where practical, separating "data-shaping" functions (pure-ish
  transformations of fetched data into a view-ready shape) from "template
  string building" functions (turning shaped data into HTML), so the shaping
  logic can eventually be unit-tested independent of the DOM.
- Updating the `<script>` (or module import, if TASK-008 has landed by the
  time this is implemented) references in `public/dm-dashboard.html` and
  `public/player-dashboard.html` to match the new file layout.

### Excluded

- Any visual or behavioral change to the dashboards — this is a structural
  reorganization only.
- Converting to ES modules if TASK-008 has not yet landed — if implemented
  before TASK-008, these remain plain global scripts split into more files,
  same load-order caveats as today (just smaller files to reason about).
- Full unit test coverage of every extracted shaping function — demonstrating
  the separation is real and testable is enough; comprehensive coverage can
  follow incrementally.

## Plan

1. Confirm whether TASK-008 has landed; if so, split as real ES modules
   directly. If not, split as plain scripts and note the load-order caveat
   in the implementation handoff.
2. For each of the five files, inventory its distinct concerns/resources
   before making any change.
3. Split `dm-modals.js` first, one-to-one by resource, as the clearest case.
4. Split the remaining four files along their natural internal boundaries,
   separating data-shaping from templating where practical.
5. Update HTML script/import references and verify both dashboards still
   load and function.

## Acceptance criteria

- [x] None of the five listed files remain as single files over ~500 lines;
      each is split into smaller, single-concern files.
- [x] `dm-modals.js`'s replacement is split one-to-one by the resources it
      previously covered (characters, shadows, creatures, sessions, progress).
- [x] Where data-shaping was separated from templating, at least the shaping
      functions are demonstrated callable/testable without the DOM.
- [x] Both dashboard HTML files reference the new file layout correctly.
- [x] Both dashboards are manually verified to behave identically to before
      the split (no visual or functional regression). (Verified during
      review, not by the implementer — see Review section; this checkbox
      covers behavioral regression specifically, which genuinely was not
      found, but does not supersede the Review section's recommendation to
      fix the two import-discipline findings before acceptance.)

## Validation requirements

- Full manual walkthrough of every dashboard section touched by the five
  split files (modals for each resource, story arcs, editors, primal
  patterns, and the player character edit form).
- `npm test` passes (existing suites are backend-only; this is a sanity
  check).
- If any shaping functions were separated and given tests, those new tests
  pass.

## Risks and assumptions

- No existing frontend test coverage means validation here is largely
  manual — budget time for a careful walkthrough of every affected UI
  section, not just a spot check.
- `dm-modals.js` covering five different resources in one file raises some
  chance of hidden cross-resource coupling (e.g., shared modal-open/close
  scaffolding) that isn't obvious until the split is attempted — if found,
  factor it into a small shared modal-utility rather than duplicating it five
  times.
- Splitting boundaries for the other four files are a judgment call; use
  `dm-lists.js`/`dm-journal.js` as the reference shape, and note any
  significant deviation in the implementation handoff.

## Blocker

None.

## Implementation handoff

Implementer: openai-coder (Codex CLI)
Date: 2026-08-27

### Changes made

- Split `dm-modals.js` into the shared modal shell `dm-modal-utils.js` (13
  lines) and one module per resource: `dm-character-modals.js` (113),
  `dm-shadow-modals.js` (127), `dm-creature-modals.js` (218),
  `dm-session-modals.js` (94), and `dm-progress-modals.js` (106). Creature
  and familiar form/payload helpers live with the creature resource because
  both describe NPC-shaped records and are shared by the character editor.
- Split `dm-story-arcs.js` into its loader/coordinator (30 lines),
  `dm-story-narrative.js` (75), `dm-story-arc-editor.js` (469), and
  `dm-story-beats.js` (240). The arc editor owns arc and chapter operations;
  the coordinator preserves the existing reload sequence.
- Split `dm-editors.js` by edited resource into `dm-character-editor.js`
  (411 lines), `dm-shadow-editor.js` (88), `dm-creature-editor.js` (37),
  `dm-session-editor.js` (260), and `dm-progress-editor.js` (5).
- Split `player-edit-form.js` into its shell/coordinator (93 lines),
  `player-edit-basic-tabs.js` (217), `player-edit-gameplay-tabs.js` (217),
  `player-edit-details-tab.js` (22), and `player-edit-actions.js` (196).
- Split `dm-primal-patterns.js` into display/section rendering (243 lines)
  and `dm-primal-pattern-actions.js` (271) for grants and pattern/section
  modal mutations.
- Updated both dashboard module lists and the journal modal-shell import.
  Removed the superseded `dm-modals.js` and `dm-editors.js` monoliths.

### Validation performed

- Parsed all 44 DM/player frontend modules as ES-module source successfully.
- Imported every new entry module under Node with browser globals stubbed;
  all imports and circular module bindings initialized without a
  `ReferenceError`. This caught and corrected two initially missing
  split-local imports (`closeModal` and player `state`).
- Searched inline event attributes across all of `public/js/dm/` and
  `public/js/player/`, intersected them with functions moved by this task,
  and loaded the module graph to verify all 82 affected handler names resolve
  to functions on `window`.
- Called the exported `creaturePayloadFromForm` and
  `familiarPayloadFromForm` shapers under Node with representative form data;
  verified numeric conversion, line-list shaping, and ability shaping without
  a DOM.
- Started the real application on port 43129 and confirmed both dashboards
  and all 22 affected module URLs returned HTTP 200 (24 URLs total).
- Ran `npm test`: 44 tests passed, 0 failed (17.2 seconds command runtime;
  Node test runner reported 14.24 seconds).

### Assumptions and deviations

- TASK-008 had landed, so every split was implemented as a native ES module
  with explicit imports/exports and audited `window` bridges per ADR-001.
- Internal boundaries follow resources first. Closely coupled helpers remain
  with their resource rather than introducing additional abstraction layers;
  the small coordinator modules retain stable imports used elsewhere.
- No authenticated browser session or interactive browser-control facility
  was available in this implementation environment. Consequently, the task's
  full click-by-click dashboard walkthrough was not performed and its manual
  acceptance checkbox remains unchecked. The live-server, standalone-import,
  shaping-call, and exhaustive 82-handler bridge checks are the documented
  substitute requested by the task context, but visual/interactive regression
  confirmation remains for review.

### Unresolved risks

- A reviewer or human should perform the required authenticated walkthrough
  of character/shadow/creature/session/progress modals, story arcs and beats,
  primal patterns, DM editors, and every player edit tab before acceptance.
- The repository's pre-existing unrelated working-tree changes were preserved
  and were not included in this implementation.

### Documentation updated

- This implementation handoff and the genuinely satisfied acceptance criteria.

### Review fixes

- Exported `selectPattern` from `dm-primal-patterns.js` and imported it in
  `dm-primal-pattern-actions.js`, preserving the existing `window` bridge for
  the inline `onclick=` call site.
- Imported the already-exported `closeEditCharacter` from
  `player-edit-form.js` in `player-edit-actions.js`.
- Re-searched the full `public/js/dm/` and `public/js/player/` directories for
  both names and confirmed the executable cross-file calls now use explicit
  imports. Syntax-checked all three touched modules as ES modules and re-ran
  `npm test`: 44 tests passed, 0 failed.

## Review

Independent review by Claude, 2026-08-27/28 (Codex CLI implemented; reviewed
by Claude per the coder/reviewer split — see `docs/AI_DEVELOPMENT_SYSTEM.md`).
This is by far the largest change reviewed under the new split so far
(3,547 lines across 5 files restructured into ~20 new modules), so the
review was proportionally more thorough than TASK-011's, and specifically
targeted the one piece the implementer flagged it could not do itself: a
live, authenticated dashboard walkthrough.

**Structural verification** (independent of the handoff's self-report):
- Confirmed all five target files no longer exist over ~500 lines; largest
  new file is `dm-story-arc-editor.js` at 468 lines.
- Confirmed `dm-modals.js`'s replacement is genuinely one-to-one by resource:
  `dm-modal-utils.js` (shared shell) + `dm-character-modals.js`,
  `dm-shadow-modals.js`, `dm-creature-modals.js`, `dm-session-modals.js`,
  `dm-progress-modals.js`.
- Re-ran the AST-based cross-file reference analyzer (from TASK-008) against
  the full `public/js/dm/` and `public/js/player/` directories, and a
  regex-based inline-HTML-handler-to-`window`-bridge checker, rather than
  trusting the handoff's reported "82 handlers verified" / "all imports
  resolved" claims. Also independently ran `npm test` (44/44) and confirmed
  the ESM syntax check passes on every new/changed file, and that both
  dashboard HTML files' `<script type="module">` lists exactly match the
  files on disk (23 DM files, 20 player files, 1:1).
- Read `creaturePayloadFromForm`/`familiarPayloadFromForm` in
  `dm-creature-modals.js` directly to confirm the claimed data-shaping/
  templating separation is real (both are genuine form→payload shapers,
  exported, callable with just a form element — no full-app DOM needed).

**Live walkthrough** (the piece the implementer explicitly could not do —
"no authenticated browser session or interactive browser-control facility
was available"): ran the existing TASK-008 Playwright suite as a baseline
(all 9 DM tabs, character create/view/delete — clean, only the pre-existing
favicon 404), then wrote and ran a second script specifically targeting
every file this task split: opened and submitted the Shadow, Creature,
Session, and Progress create modals; created a character; created a story
arc via the per-character "+ Arc" button (`dm-story-arc-editor.js`); and
created a primal pattern via `openCreatePatternModal()` →
`dm-primal-pattern-actions.js`'s submit handler. All clean, zero new
console/page errors, all throwaway data (2 users, 1 character, 1 shadow,
1 creature, 1 session, 1 story arc, 1 primal pattern) confirmed deleted
afterward.

**Findings:**

1. **[Confirmed, fixed, re-verified]** Two
   real cross-file JS-code references are missing their `import` statement
   and instead resolve only through the `window` bridge + `<script>` tag
   order — exactly the fragility ADR-001/TASK-008 existed to eliminate,
   reintroduced by this split:
   - `dm-primal-pattern-actions.js:248` calls `selectPattern(created.id)`
     bare; `selectPattern` is defined and only `window`-bridged (not
     `export`ed) in `dm-primal-patterns.js`. Works today only because
     `dm-primal-patterns.js`'s `<script>` tag precedes
     `dm-primal-pattern-actions.js`'s in `dm-dashboard.html` — confirmed via
     live testing (the exact pattern-creation flow that hits this line
     works with zero errors), but it's an implicit ordering dependency, not
     a module import.
   - `player-edit-actions.js:174` calls `closeEditCharacter()` bare;
     `closeEditCharacter` is already `export`ed by `player-edit-form.js`
     (line 93) — the fix is a one-line `import { closeEditCharacter } from
     './player-edit-form.js';`, since the export already exists.
   - Neither causes a runtime bug today (both verified working via the
     window-bridge fallthrough), and both are trivial one-line fixes. The
     implementer's own verification methodology (checking that all
     `onclick=`-referenced names resolve to `window`) has a blind spot for
     real *executable-code* cross-file references that happen to also be
     window-bridged for an unrelated reason (inline-HTML compatibility) —
     worth naming in case the same blind spot recurs on a future split/
     migration task.
2. **[Not a finding, confirmed correct]** The implementer's own flagged
   unresolved risk (no authenticated browser walkthrough performed) has
   been addressed by this review's live testing above.
3. **[Pre-existing, unrelated]** `player-claims.js`'s `allCharacters`
   ReferenceError (documented in TASK-008's review) is untouched by this
   task, as expected.

**Follow-up (2026-08-28)**: sent back to the implementer for the two fixes.
Applied exactly as specified — `selectPattern` added to
`dm-primal-patterns.js`'s existing `export` statement (its `window` bridge
correctly left in place, since it's still needed for the inline `onclick=`
card-click handler) and imported into `dm-primal-pattern-actions.js`;
`closeEditCharacter` imported into `player-edit-actions.js` from its
existing `player-edit-form.js` export. No other file touched.

Independently re-verified rather than trusting the fix report: re-ran the
cross-file reference analyzer against both full directories (0 missing
imports, down from 2 — only the pre-existing, unrelated `allCharacters` bug
remains), re-ran the `window`-bridge completeness check (0 missing, bridges
intact), re-ran the ESM syntax check on all three touched files, ran
`npm test` myself (44/44), and re-ran the exact live pattern-creation flow
that exercises the fixed `selectPattern` call site end-to-end — clean, zero
new errors, confirming it now works via a real import rather than by
accident of script-tag order. Throwaway test data cleaned up afterward.

**Recommendation**: accept. Both findings resolved and independently
re-verified; no other issues remain.

## Human acceptance

Pending.
