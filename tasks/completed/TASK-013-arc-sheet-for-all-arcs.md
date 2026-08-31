# TASK-013: Extend the DM arc sheet to every story arc

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-08-28
Approved by: Patrick
Approved date: 2026-08-28
Related contracts: None
Related ADRs: ADR-001 (frontend module migration)
Dependencies: TASK-012 (DM story-arc walkthrough sheet) — completed. This
task extends its output; it does not redo any of it.

## Desired outcome

The DM arc sheet built in TASK-012 (`public/dm-arc-sheet.html`) is
reachable from every story arc, not just "Shadow of Dreams," and its
bestiary is useful even for arcs nobody has curated a creature list for
yet. Specifically:

- Every arc gets a way to open its own sheet — not one hardcoded dashboard
  link.
- An arc with no curated shadow list defaults to showing **every**
  creature in the bestiary, instead of an empty list the DM has to build
  by hand.
- Even on a curated arc, the DM can see the full bestiary in one click when
  the story goes somewhere the curated list didn't anticipate, and get
  back to the curated view in one click too.

## Context

TASK-012 built the sheet generically — it already reads `?arc=<id>` and
will render any arc's real chapters correctly. What's actually missing is
narrower than "does it work for other arcs":

- `public/dm-dashboard.html`'s Story Arcs tab has exactly one static link,
  hardcoded to `?arc=2` (`<a class="btn-primary"
  href="/dm-arc-sheet.html?arc=2">Open Shadow of Dreams Sheet</a>`). No
  other arc has any link into the sheet at all.
- `public/js/dm/dm-arc-sheet.js`'s `DEFAULT_SHADOWS_BY_ARC` lookup only
  has an entry for arc 2 (`{ 2: [3] }`). `renderShadowFilters()` checks
  only the shadows in that lookup by default — for any other arc, that's
  an empty set, so the bestiary starts (and stays, until the DM manually
  ticks boxes) completely empty.
- This was raised with the human right after TASK-012 shipped; the human
  had assumed a per-arc button and full-bestiary fallback were already
  part of it. They weren't — TASK-012's Excluded section explicitly scoped
  this out ("No support for arcs other than what `?arc=<id>` is given —
  this task does not build a picker UI beyond the one dashboard link for
  arc 2"), and that scoping is what this task now reverses.

Where arcs are actually rendered on the dashboard today (confirmed by
reading the code, not assumed):

- `public/js/dm/dm-story-arc-editor.js`'s `renderArcRows()` draws one
  compact `.arc-card` tile per arc, grouped by character. Clicking a tile
  calls `selectArc(id)`.
- `selectArc()` fetches the arc and calls `renderArcDetail(arc)`, which
  renders an `.arc-detail-header` containing the arc title, a status
  `<select>`, and existing `Edit`/`Delete` buttons
  (`public/js/dm/dm-story-arc-editor.js` lines 72–90). This is the
  existing pattern for per-arc actions — an "Open Sheet" button belongs
  here, next to Edit/Delete, not on the small card tile itself.
- `GET /api/shadows` currently returns 21 shadows (confirmed via direct
  query against the running app).

## Scope

### Included

- Add an "Open Sheet" button to `renderArcDetail()`'s header
  (`dm-story-arc-editor.js`), next to the existing `Edit`/`Delete`
  buttons, linking to `/dm-arc-sheet.html?arc=${arc.id}` for whichever
  arc is currently selected.
- Remove the single hardcoded `?arc=2` link from `dm-dashboard.html`'s
  Story Arcs tab header — it's superseded by the per-arc button above.
- In `dm-arc-sheet.js`'s `renderShadowFilters()`: when
  `DEFAULT_SHADOWS_BY_ARC[arc.id]` has no entry, default **every** shadow
  checkbox to checked (full bestiary) instead of none. Arc 2 keeps its
  existing curated default (Soul Realm only) — no regression there.
- Add a small "Show All" control near the shadow-filter checkboxes that
  checks every box and refreshes the bestiary in one click, available on
  every arc (curated or not) so a DM can widen the bestiary mid-session
  without manually ticking 21 boxes.
- Add a "Curated Only" control, shown only when the current arc has an
  entry in `DEFAULT_SHADOWS_BY_ARC`, that resets the checkboxes back to
  that curated set in one click.

### Excluded

- No change to how curated defaults are authored — `DEFAULT_SHADOWS_BY_ARC`
  stays a hand-maintained lookup in the JS module, per TASK-012's original
  decision (see its Risks section). This task does not add curated
  entries for arcs 3/4, and does not build any DM-facing UI to author new
  curated entries — both are separate follow-ups if/when the human wants
  them.
- No change to the chapter walkthrough section — it already works
  generically for any arc.
- No arc-picker/index page. The sheet is still reached per-arc from the
  dashboard's arc detail view, one click at a time, not from a standalone
  list of all sheets.

## Plan

1. Add the "Open Sheet" button to `arc-detail-header` in
   `dm-story-arc-editor.js`, and remove the now-redundant static link from
   `dm-dashboard.html`.
2. Update `renderShadowFilters()` in `dm-arc-sheet.js`: default-check every
   shadow when the current arc has no `DEFAULT_SHADOWS_BY_ARC` entry;
   otherwise keep the existing curated-only default.
3. Add the "Show All" / "Curated Only" controls and wire them to
   check/uncheck the shadow checkboxes and call `renderBestiary()`.
   "Curated Only" only renders when the current arc has a curated entry.
4. Manually verify: arc 2 still defaults to Soul Realm only, "Show All"
   reveals every creature, "Curated Only" returns to Soul Realm only; a
   non-curated arc (e.g. "The Harmony of Shadows") defaults to every
   creature checked; every arc's detail view shows a working "Open Sheet"
   button linking to its own id.

## Acceptance criteria

- [x] Selecting any story arc on the dashboard shows an "Open Sheet"
      button linking to `dm-arc-sheet.html?arc=<that arc's id>`.
- [x] The old hardcoded `?arc=2` dashboard link is removed.
- [x] A sheet opened for an arc with no `DEFAULT_SHADOWS_BY_ARC` entry
      defaults every shadow checkbox to checked, and the bestiary shows
      every creature in the database.
- [x] A sheet opened for arc 2 still defaults to only the Soul Realm
      checked (no regression from TASK-012).
- [x] "Show All" checks every shadow box and updates the bestiary, on both
      curated and non-curated arcs.
- [x] "Curated Only" (visible only on arcs with a curated default) resets
      the checkboxes to that curated set and updates the bestiary.
- [x] `npm test` passes.

## Validation requirements

- `npm test` after implementation.
- Manual browser verification (dev server): confirm arc 2's curated
  behavior and both new toggle controls; confirm a non-curated arc
  defaults to the full bestiary; confirm the per-arc "Open Sheet" button
  appears and links correctly for arcs in different states (with
  chapters, without chapters, unassigned to a character).

## Risks and assumptions

- Placing the "Open Sheet" button in the arc detail header (next to
  Edit/Delete) rather than on the compact card tile is a UI judgment call
  made in this proposal, matching the existing per-arc-action pattern —
  flagging it in case the human would rather it live on the card itself
  for one fewer click.
- Low technical risk — no schema or endpoint changes, and the riskiest
  piece (bestiary default logic) is a small conditional already exercised
  correctly for arc 2 by TASK-012.

## Blocker

None.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-28

### Changes made

- Added an "Open Sheet" action to every selected arc's detail header, using
  that arc's id in `/dm-arc-sheet.html?arc=<id>`, next to the existing Edit
  and Delete actions.
- Removed the Story Arcs tab's static Shadow of Dreams sheet link.
- Changed the sheet's shadow-filter initialization so arcs without an entry in
  `DEFAULT_SHADOWS_BY_ARC` start with every available shadow checked. Arc 2
  retains its curated shadow 3 default.
- Added "Show All" on every sheet and "Curated Only" on sheets with a curated
  default. Each control updates all shadow checkboxes and immediately
  re-renders the bestiary.

### Validation performed

- Ran `npm test`; all 44 tests passed (44 passed, 0 failed).
- Ran `git diff --check`; it reported no whitespace errors.
- Started the real dev server on spare port 43139 and confirmed HTTP 200 for
  the sheet, dashboard, sheet module, and story-arc editor module. Confirmed
  the served dashboard no longer contains the hardcoded arc 2 link and the
  served editor contains the per-arc `${arc.id}` sheet URL.
- Queried the live arc, shadow, and NPC APIs. Confirmed five arcs representing
  assigned and unassigned arcs and arcs with and without chapters; arc 2 has
  four chapters, shadow 3 is The Soul Realm with four creatures, and the
  database currently contains eight creatures total.
- Inspected the served sheet module to confirm arc 2 initializes only its
  curated shadow, non-curated arcs initialize all 21 shadow checkboxes, "Show
  All" selects every shadow before calling `renderBestiary()`, and "Curated
  Only" is rendered only for lookup-backed arcs and restores their curated set
  before calling `renderBestiary()`.
- Stopped the spare-port server after validation. This repository has no
  browser test harness, so actual visual layout and pointer interaction could
  not be exercised; those aspects were verified through HTTP responses and
  direct code inspection.

### Assumptions and deviations

- Treated the presence of an arc id in `DEFAULT_SHADOWS_BY_ARC` as the
  definition of a curated arc, even if a future curated array is empty. This
  preserves the lookup as the task's stated source of truth.
- No deviations from the approved scope or plan.

### Unresolved risks

- Browser-only visual and interaction behavior remains for independent manual
  review because this repository has no browser test harness.

### Documentation updated

Only this implementation handoff and the satisfied acceptance checkboxes.

## Review

Independent review by Claude, 2026-08-28.

Method: read the full diff for all three changed files
(`dm-dashboard.html`, `dm-story-arc-editor.js`, `dm-arc-sheet.js`)
directly rather than trusting the handoff's self-report. Independently
re-ran `npm test` (44/44 passing). Started the real dev server on a spare
port and independently confirmed: the dashboard's served HTML no longer
contains the old hardcoded `?arc=2` link (grep count 0); the served
`dm-story-arc-editor.js` contains the per-arc `${arc.id}` sheet URL;
`GET /api/arcs` returns five real arcs (2, 3, 4, 5, 6) so the per-arc
button has more than one arc to prove itself against; `GET /api/shadows`
returns 21 shadows and `GET /api/npcs` returns 8 creatures total, so a
"show all" default is a real, verifiable change in what's visible, not a
no-op; and the served `dm-arc-sheet.js` module contains exactly the
default-logic, "Show All", and "Curated Only" code the handoff describes.
Independently confirmed in Node that `Object.hasOwn(DEFAULT_SHADOWS_BY_ARC,
2)` — the mechanism `renderShadowFilters()` now uses to decide whether an
arc is curated — correctly returns `true` for the numeric arc id against
the object's `{2: [...]}` shape (JS coerces the numeric key to a string
property name; `Object.hasOwn` respects that), so arc 2 keeps its curated
default and the "Curated Only" button correctly shows for it while
staying hidden for every other arc. Traced the render/filter logic by
hand for both the curated case (arc 2 → only shadow 3 checked → only its
4 creatures shown) and the uncurated case (any other arc → all 21 shadows
checked → all 8 creatures shown), which is exactly what the task asked
for ("if they are not part of a curated shadow give them all the beasts").
No writes were made during this review (pure GET requests plus one Node
snippet with no repo side effects), so there was nothing to revert
afterward; the spare-port server was stopped when done.

One cosmetic observation, not a defect: removing the old static link left
the Story Arcs tab as the only tab-header on the dashboard with no button
at all (every other tab — Characters, Shadows, Creatures, Sessions,
Progress, Claims, Journal, Primal Patterns — has one). Arc creation still
has its own "+ Arc" button per character group elsewhere on the tab, so
nothing is actually missing — the header just looks slightly asymmetric
next to the other tabs. Not raised as a finding since it isn't a defect
against any acceptance criterion, just noted for awareness.

All acceptance criteria are genuinely satisfied: every arc's detail view
gets a working "Open Sheet" button carrying its own id (verified for arc
2 and confirmed the same code path applies uniformly to all five arcs in
the live list); the old hardcoded link is gone; a non-curated arc's
bestiary defaults to every creature; arc 2's curated default is unchanged
from TASK-012; "Show All" and "Curated Only" are wired correctly and
"Curated Only" is conditionally rendered exactly where it should be;
`npm test` passes. As with TASK-012, actual pointer-click/visual behavior
couldn't be exercised directly since this repo has no browser test
harness — verified instead through served code inspection and traced
logic, consistent with the implementer's own validation approach.

No blocking findings.

## Human acceptance

Pending.
