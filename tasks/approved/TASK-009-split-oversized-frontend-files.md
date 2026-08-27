# TASK-009: Split oversized, multi-concern frontend files

Owner role: Pending
Assigned agent: Pending
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

- [ ] None of the five listed files remain as single files over ~500 lines;
      each is split into smaller, single-concern files.
- [ ] `dm-modals.js`'s replacement is split one-to-one by the resources it
      previously covered (characters, shadows, creatures, sessions, progress).
- [ ] Where data-shaping was separated from templating, at least the shaping
      functions are demonstrated callable/testable without the DOM.
- [ ] Both dashboard HTML files reference the new file layout correctly.
- [ ] Both dashboards are manually verified to behave identically to before
      the split (no visual or functional regression).

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

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
