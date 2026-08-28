# TASK-012: DM story-arc walkthrough sheet with linked bestiary

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-08-28
Approved by: Patrick
Approved date: 2026-08-28
Related contracts: None
Related ADRs: ADR-001 (frontend module migration) — the new page's JS should
follow its established ES module pattern rather than inline `<script>` code.
Dependencies: None

## Desired outcome

A single full-page, DM-facing sheet for running a story arc at the table:
the DM can see the arc's theme and walk through its chapters in order
(what's already happened, what's next, DM-only notes for each beat) without
digging through the arc editor modal, and see a bestiary of the creatures
likely to come up in that arc, with full stat blocks, on the same page.

Built and verified against **"Shadow of Dreams"** (`story_arcs.id = 2`),
selected in planning because it already has real chapter content, unlike the
other candidate arcs (see Context).

## Context

The human asked for a DM sheet for a story arc called "Cage of Order."
That arc does not exist — not in this repo, the database, or Claude's
general knowledge (confirmed by grepping the full repo and the
`story_arcs` table). In the planning conversation the human chose to build
against an arc that already exists instead: **Shadow of Dreams**.

Existing data confirmed by direct query against `dm_helper.db`:

- `story_arcs` id 2, "Shadow of Dreams" (character_id 1, Aelindra
  Moonshadow), theme: *"In a world built on Order and Chaos, a young wizard
  discovers she was born of Dream — and the Dreaming is dying."*
- Four `chapters` rows (arc_id 2, ordered by `order_index` 0–3): "The Quiet
  Cracks," "The First Tear," "The Hidden War," "ACT IV — The Awakening."
  Each has a `description` and a `dm_notes` field containing a
  newline-separated bullet list of beats (e.g. chapter 2's `dm_notes`
  includes "Moonstalker sightings" and "Shadow Eater rumors").
- The `beats` and `beat_chapters` tables are both empty — none of this
  content has been broken out into individual beat rows. The chapter-level
  `dm_notes` bullet lists are the only beat-level content that exists today.
- `npcs` already has full stat blocks (JSON `stats` column: abilities, AC,
  HP, traits, actions, reactions, lore) for four creatures in `shadow_id = 3`
  ("The Soul Realm"): **Shadow Eater**, **Eggari**, **Glimmerwing**,
  **Moonstalker** — the first and last of which are named directly in
  chapter 2's and chapter 3's `dm_notes`. This is the arc's bestiary.
- No schema field links an `npcs` row, a `chapters` row, or a `story_arcs`
  row to each other beyond `npcs.shadow_id`. There is no existing
  arc-to-creature relationship to query.

Reusable code already in the repo:

- `GET /api/arcs/:id` (`src/routes/arcs.js`) returns the arc plus its
  chapters (ordered by `order_index`) plus each chapter's beats (currently
  always `[]`). No backend changes are needed to read this data.
- `GET /api/npcs` (`src/routes/npcs.js`) returns all creatures with `stats`
  already `JSON.parse`d.
- `renderCreatures()` in `public/js/dm/dm-lists.js` (lines 187–255) is a
  complete, working stat-block card renderer (AC/HP/CR line, ability score
  row, collapsible full stat block with traits/actions/reactions/lore) used
  today by the DM dashboard's Bestiary tab. It uses shared helpers
  (`shadowInfluenceCardStyle`, `patternInfluenceLabel`, `escHtml`) from the
  TASK-007 shared-utilities module.

## Scope

### Included

- A new standalone full page, `public/dm-arc-sheet.html`, matching the
  existing DM page chrome/dark theme (`public/css/dark-theme.css`,
  `public/css/style.css`), plus a new ES module
  `public/js/dm/dm-arc-sheet.js` (per ADR-001's module pattern).
- Reads the arc to display from a `?arc=<id>` query parameter.
- **Story walkthrough section**: fetches `GET /api/arcs/:id`, renders the
  arc header (title, theme, status), then each chapter as an ordered card
  showing its `description`, its `dm_notes` rendered as a bullet list
  (split on newline — matches how the content is actually stored today),
  and its current `status`. Each chapter card gets a control to advance
  `status` (`planned` → `in-progress` → `completed`), wired to the existing
  `PUT /api/arcs/:id/chapters/:cid` endpoint.
- Chapters with `status = 'completed'` render collapsed by default — a
  one-line title + "Completed" badge — rather than full detail, since a
  live-play sheet should foreground what's current/upcoming, not history.
  Collapsed chapters are still clickable to expand back to full detail
  (description, notes, status control) if the DM needs to glance back;
  they are never removed from the page.
- **Bestiary section**: a shadow filter (checkboxes, one per shadow) driving
  a list of full stat-block cards, reusing the existing card markup/logic
  from `renderCreatures()` in `dm-lists.js` — extract it into a shared
  function both the dashboard's Bestiary tab and this new page call, rather
  than duplicating the markup.
- For Shadow of Dreams specifically, the filter defaults to **The Soul
  Realm** (`shadow_id = 3`) pre-checked, since that's where this arc's named
  creatures (Shadow Eater, Moonstalker, plus Eggari/Glimmerwing) live. This
  default is a small per-arc lookup maintained in the new JS module, not a
  new schema relationship (see Risks — there's no general arc↔shadow link
  today, and this task does not add one).
- A link from `dm-dashboard.html`'s Story Arcs section into this sheet
  (`dm-arc-sheet.html?arc=<id>`) for at least arc 2.
- Read-only bestiary on this page — creating/editing/deleting creatures
  stays exclusively in the dashboard's existing Bestiary tab.

### Excluded

- No new database table or column linking arcs/chapters to specific `npcs`
  rows. Relevance is expressed as a shadow filter the DM can adjust, not a
  modeled per-beat encounter list.
- No backfill of `beats` / `beat_chapters` rows from the chapter-level
  `dm_notes` bullet text. The walkthrough reads chapter-level text as-is;
  turning that into real per-beat rows (with completion tracking per beat
  rather than per chapter) is a separate, larger content-modeling task if
  the human wants it later.
- No editing of arc/chapter `title`/`theme`/`description`/`dm_notes` content
  from this page — that authoring already exists in the arc editor modal
  (`dm-story-arc-editor.js`). This page only adds a chapter status toggle.
- No print/PDF export.
- No support for arcs other than what `?arc=<id>` is given — this task does
  not build a picker UI beyond the one dashboard link for arc 2.

## Plan

1. Extract `renderCreatures()`'s stat-block card markup out of
   `dm-lists.js` into a shared, reusable function (e.g. accepting an npc
   object and a shadow-name lookup) so both the dashboard's Bestiary tab and
   the new page use one implementation. Confirm the dashboard's existing
   Bestiary tab still renders identically after the extraction.
2. Build `public/dm-arc-sheet.html` + `public/js/dm/dm-arc-sheet.js`:
   parse `?arc=`, fetch `GET /api/arcs/:id`, `GET /api/npcs`, and
   `GET /api/shadows`; render the arc header and ordered chapter walkthrough
   cards with the status-advance control, collapsing any chapter whose
   `status` is `completed` to a one-line expandable summary; render the
   shadow-filter checkbox list and bestiary cards using the function from
   step 1.
3. Wire the chapter status control to `PUT /api/arcs/:id/chapters/:cid`
   (already supports partial `status` updates) and refresh the card in
   place on success.
4. Add the per-arc default shadow filter lookup (arc 2 → shadow_id 3) and
   the link from `dm-dashboard.html` into `dm-arc-sheet.html?arc=2`.
5. Manually verify end-to-end against arc 2: all four chapters render in
   `order_index` order with their notes as bullet lists; advancing a
   chapter's status persists across a page reload; the bestiary defaults to
   showing Shadow Eater, Eggari, Glimmerwing, and Moonstalker; toggling
   other shadow checkboxes adds/removes their creatures correctly.

## Acceptance criteria

- [x] `dm-arc-sheet.html?arc=2` loads standalone and shows the arc's title,
      theme, and status.
- [x] All four chapters render in `order_index` order, each with its
      `description` and `dm_notes` (as a bullet list) and current `status`.
- [x] A chapter marked `completed` renders collapsed (title + badge only)
      by default, and can be expanded back to full detail on click without
      being removed from the page.
- [x] A chapter's status can be advanced from the sheet and the change
      persists (confirmed via reload or direct DB check).
- [x] The bestiary panel renders full stat blocks (AC, HP, CR, ability
      scores, traits, actions, reactions, lore) for the default shadow
      filter, and updates correctly when the filter selection changes.
- [x] `dm-dashboard.html` has a working link into this sheet for arc 2.
- [x] The dashboard's existing Bestiary tab renders unchanged after the
      shared-renderer extraction.
- [x] `npm test` passes.

## Validation requirements

- `npm test` after implementation.
- Manual browser verification (dev server): load the sheet for arc 2,
  confirm the walkthrough and bestiary render correctly, advance a
  chapter's status and confirm it persists, toggle the shadow filter and
  confirm the bestiary updates. Also re-check the dashboard's Bestiary tab
  by hand to confirm no visual/behavioral regression from the extraction.

## Risks and assumptions

- The per-arc default shadow filter (arc 2 → Soul Realm) is a manual lookup
  in frontend code, not modeled data. It's a reasonable shortcut for one
  arc but is not a general mechanism — extending this page to other arcs
  later will need either more manual lookups or a real schema decision,
  and should not be silently generalized under this task.
- The walkthrough is chapter-granularity, not beat-granularity, because
  `beats`/`beat_chapters` are empty today. If the human wants true
  beat-by-beat checklists (finer than four chapters), that requires
  content-modeling work this task doesn't attempt.
- Low technical risk otherwise — no new endpoints, no schema changes, and
  the riskiest piece (stat-block rendering) is an extraction of already
  -working code rather than a rewrite.

## Blocker

None.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-28

### Changes made

- Added the standalone DM story-arc sheet and its ES module. The page reads
  `?arc=`, loads the existing arc/NPC/shadow APIs, renders the arc header and
  ordered chapter walkthrough, splits chapter notes into list items, and
  collapses completed chapters by default while allowing them to be expanded.
- Added the chapter status-advance control using the existing chapter PUT
  endpoint, updating only the affected chapter in frontend state and
  re-rendering the walkthrough after a successful response.
- Added shadow checkbox filtering with arc 2 defaulting to shadow 3 (The Soul
  Realm), and kept the sheet's bestiary read-only.
- Extracted the dashboard's existing creature stat-block markup and influence
  card styling into `dm-creature-card.js`. The dashboard calls the shared
  renderer with its default controls unchanged; the sheet calls it with the
  edit/delete/spoiler controls hidden.
- Added a Story Arcs tab link from the dashboard to the Shadow of Dreams sheet.

### Validation performed

- Ran `npm test` after implementation and again after the live-validation
  status fix; the final run passed all 44 tests (44 passed, 0 failed).
- Ran `git diff --check`; it reported no whitespace errors. Parsed both new ES
  module bodies with Node as an additional syntax check.
- Started the real dev server on spare port 43127. Confirmed HTTP 200 for the
  sheet, its JS modules, the dashboard, and the existing APIs. Confirmed arc 2
  returned the expected title/theme/status and all four chapters in order,
  with every chapter having description and notes content.
- Confirmed shadow 3 is The Soul Realm and its API data contains exactly
  Eggari, Glimmerwing, Moonstalker, and Shadow Eater. Inspected the served
  shared-renderer module for all required stat-block sections and the served
  sheet module for the default selection, checkbox filtering, read-only card
  call, note splitting, and completed-card expand/collapse handlers.
- Authenticated through the live server, advanced an arc 2 chapter from
  `planned` to the persisted middle state `active`, and confirmed that value
  with a fresh `GET /api/arcs/2`. Restored the chapter to `planned`, confirmed
  the restoration with another GET, and stopped the server.
- No browser harness is available, so visual layout, actual pointer/keyboard
  interaction, filter clicks, and the dashboard's rendered visual equivalence
  could not be exercised in a browser. Those criteria were checked through
  HTTP responses and direct code inspection; the dashboard retains the exact
  extracted markup with its original default controls.

### Assumptions and deviations

- The approved task calls the middle chapter state `in-progress`, but the
  current database CHECK constraint accepts `planned`, `active`, and
  `completed`; a live PUT using `in-progress` failed that constraint. The sheet
  therefore persists the existing value `active` while displaying it as
  "In Progress", preserving the requested user-facing sequence without the
  excluded schema change.
- No other deviations from the approved scope or plan.

### Unresolved risks

- Browser-only visual and interaction behavior remains for independent manual
  review because this repository has no browser test harness.

### Documentation updated

Only this implementation handoff and the satisfied acceptance checkboxes.

## Review

Independent review by Claude, 2026-08-28.

Method: read the full diff for all changed/new files
(`dm-dashboard.html`, `dm-lists.js`, `dm-creature-card.js`,
`dm-arc-sheet.js`, `dm-arc-sheet.html`) directly rather than trusting the
handoff's self-report. Independently re-ran `npm test` (44/44 passing).
Grepped every other module for imports of the function moved out of
`dm-lists.js` to confirm the extraction broke nothing (none found;
`dm-lists.js`'s public export list is unchanged, and its own internal use
of `shadowInfluenceCardStyle` still works via the new import). Started the
real dev server on a spare port and independently confirmed
`dm-arc-sheet.html`, its JS module, and `dm-creature-card.js` all serve
200, and that `GET /api/arcs/2` and `GET /api/npcs` return the exact data
the sheet depends on (arc 2's four chapters in order; shadow 3 containing
exactly Eggari, Glimmerwing, Moonstalker, Shadow Eater).

Independently live-verified the riskiest piece — the chapter status write
path — end-to-end against a **throwaway copy** of the database (not
production data): copied `dm_helper.db`, created a disposable DM user in
the copy, pointed a second spare-port server instance at it via `DB_PATH`,
logged in for a real JWT, and drove `PUT /api/arcs/2/chapters/2` through
the exact `planned → active → completed → planned` sequence the sheet's
`STATUS_SEQUENCE`/`advanceChapter` use, confirming each transition
persisted via a fresh `GET /api/arcs/2` after each step. Confirmed the real
`dm_helper.db` was untouched throughout (queried chapter 2's status
directly from the real file after the test: still `planned`). Both spare
servers were stopped and the throwaway copy deleted afterward.

Findings:

1. **[Minor, non-blocking]** The sheet's "← Story Arcs" back-link
   (`dm-arc-sheet.js` `renderHeader()`) points to
   `/dm-dashboard.html#story-arcs`, but the dashboard's tab switching
   (`dm-core.js` `switchTab`) is driven entirely by click handlers on
   `.tab-btn` elements — there's no `id="story-arcs"` element and no
   hash-routing code anywhere in the dashboard. The link works (200, no
   dead link) but silently lands on the default Characters tab instead of
   Story Arcs, which is what a DM clicking "back" would expect. Not part of
   any acceptance criterion, but worth a one-line fix (either add
   `id="story-arcs"` to the tab button/content plus a small hash-read in
   `switchTab`'s init, or drop the fragment and accept landing on the
   default tab) if anyone touches this again.
2. **[Minor, non-blocking]** `story_arcs.status` (arc-level, distinct from
   `chapters.status`) has a CHECK constraint allowing `'dormant'` as a
   fourth value, in addition to `planned`/`active`/`completed`. The sheet's
   arc-header status badge (`renderHeader()`) applies
   `status-${arc.status}` as a CSS class, but `dm-arc-sheet.html` only
   defines `.status-planned`/`.status-active`/`.status-completed` — a
   `dormant` arc would render the badge as unstyled text (still readable
   via `statusLabel()`'s generic capitalization, just without the pill
   background/color other statuses get). Not currently reachable — arc 2's
   status is `planned` — and not in scope of any acceptance criterion, but
   worth noting since it's a real gap in the CHECK constraint's value set
   versus the CSS.

Both findings are cosmetic/UX papercuts on paths outside this task's
acceptance criteria, not correctness bugs, data-safety issues, or
regressions. Every acceptance criterion in this file is genuinely
satisfied by direct verification (not just Codex's self-report): the page
loads standalone at `?arc=2` with correct header data; all four chapters
render in order with description/notes/status; a completed chapter
collapses to a title+badge and expands back on click without being
removed (confirmed by code inspection of `renderChapter`'s collapsed/
expanded branches and the click/keydown handlers, since no browser
harness exists in this repo to click through visually); chapter status
advances and persists (independently live-verified above); the bestiary
renders full stat blocks and defaults to the Soul Realm creatures named in
the arc's own chapter notes; the dashboard has a working link in; the
dashboard's Bestiary tab is byte-identical in output since it calls the
same extracted `renderCreatureCard` with its original controls; `npm test`
passes.

No blocking findings.

## Human acceptance

Accepted by Patrick, 2026-08-28.
