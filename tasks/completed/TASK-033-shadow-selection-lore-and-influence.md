# TASK-033: Shadow-selection lore and influence-based filtering

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002 (this task extends the universe-contributed
shadow-origin step TASK-031 built; no contract change expected, but flag if
the eventual design needs one).
Related ADRs: ADR-005.
Dependencies: TASK-031 (the `shadow-origin` universe step this task extends),
TASK-032 (the real, cut-over wizard this task's changes land in).

## Desired outcome

A player choosing their starting shadow during character creation sees real
information about each shadow — not just a bare name in a dropdown — and,
if the design settles on it, can narrow the list by which of Order, Chaos,
or Dream most defines a shadow. Discovered during manual browser testing of
TASK-032's cut-over wizard (2026-09-19): the shadow-origin step currently
renders `<option>{shadow.name}</option>` for every shadow with no other
information shown.

## Context

Before TASK-032's cutover, the wizard had a right-hand info panel
(`Flavor`/`Mechanics`/`Consider`/`In Play`, `wizard-info-panel` markup still
present but now unused in `public/player-dashboard.html` lines 760-778) shown
on focus of the shadow-select field, populated from
`FIELD_INFO['w-shadow']` in `src/universes/amber/content/player-wizard-data.js`
(and `src/systems/dnd5e/content/`'s equivalent for system-owned fields — see
Scope). TASK-031's `shadowOriginStep` only inlines `FIELD_INFO['w-shadow'].consider`
as a single static paragraph; `flavor`, `mechanics`, and `example` (labeled
"In Play") are dropped. This loss wasn't unique to the shadow step or
flagged as a deviation in any of TASK-029/030/031/032's handoffs — the whole
focus-triggered panel mechanism doesn't have an equivalent in the new
step-based model and needs a fresh design decision, not just a content port.

Separately, the `shadows` table (`src/database/schema.sql`) already carries
per-shadow `description`, `order_level`, `chaos_level`, `dream_level`,
`pattern_influence`, `is_starting_shadow`, and `is_spoiler` columns.
`GET /api/shadows` (`src/routes/shadows.js`) already returns all of these,
unfiltered, and the wizard already fetches this full list
(`player-wizard.js`'s `openCreateCharacter`) before the shadow-origin step
renders — the data needed for both richer display and influence-based
filtering is already present, this is primarily frontend work.

Resolved by Patrick, 2026-09-19:

- **Spoiler filtering**: yes, exclude `is_spoiler` shadows from the
  character-creation picker. `GET /api/shadows` is also used for DM-facing
  purposes (campaign shadow management, the "visited shadows" player view)
  where seeing spoiler shadows is correct or already access-controlled
  differently — this task must not change that endpoint's default behavior
  globally. Add an opt-in query filter (e.g. `?startingOnly=true` or
  similar — implementer's naming call) that the character-creation flow
  passes, rather than changing what unfiltered `GET /api/shadows` returns.
  While addressing this, also apply `is_starting_shadow = 1` to the same
  filtered call — the schema already distinguishes shadows meant as
  character origins from lore/plot shadows that aren't (`is_starting_shadow`
  on `shadows`), and the wizard currently ignores this distinction entirely,
  offering every shadow in the campaign as a valid starting point. Filtering
  to `is_starting_shadow = 1 AND is_spoiler = 0` is the correct picker
  scope, not just the spoiler half of it — flagging this as an assumption
  made while finalizing this task's scope, not something explicitly asked
  about, so revisit if it's wrong.
- **Dream data**: yes, author real `dream_level` values for the existing
  seeded shadows as part of this task, so influence-selection is meaningful
  immediately rather than misleading (every shadow currently defaults to
  `dream_level: 0`). Base values on each shadow's existing `description` —
  e.g. `Tir-na Nog'th` (a prophetic ghost-city reached only by moonlight)
  and `The Neon Spire`/`The Depths` (already explicitly "dream-logic"
  described in their `description` text) are obvious high-Dream candidates;
  keep `order_level + chaos_level + dream_level` roughly summing to a
  consistent scale across shadows (the existing data implicitly sums
  `order_level + chaos_level` to ~100 for most rows) so "dominant influence"
  comparisons stay meaningful.
- **Picker UI**: a card-based picker (grid/list of shadow cards showing name
  + short description), matching the visual pattern
  `classSelectionStep` (TASK-030) already established for class selection —
  not a dropdown-plus-panel or a revival of the old docked info panel
  (that mechanism is TASK-034's separate concern; this step does not block
  on TASK-034 landing first).

## Scope

### Included

- `src/routes/shadows.js`: add an opt-in query filter to `GET /api/shadows`
  restricting results to `is_starting_shadow = 1 AND is_spoiler = 0` when
  requested, without changing the endpoint's default (unfiltered) behavior
  for its existing DM-facing callers.
- `public/js/player/player-wizard.js`: call the filtered variant when
  fetching shadows for character creation.
- `src/universes/amber/seed.js`: author real `dream_level` values for the
  existing seeded shadows (see Context for the approach).
- Rebuild `shadowOriginStep`'s `render()` (`public/js/universes/amber/wizard-steps.js`)
  as a card-based picker: one card per shadow showing name, a short
  description excerpt, and its order/chaos/dream levels (or a simple visual
  indicator of dominant influence), following `classSelectionStep`'s
  existing card pattern (`public/js/systems/dnd5e/wizard-steps.js`) for
  visual/interaction consistency.
- A way to filter or sort the card list by dominant influence (highest of
  `order_level`/`chaos_level`/`dream_level`) — implementer's call on exact
  UI (filter chips, a sort toggle, grouped sections), but ties/balanced
  shadows (several seed rows are intentionally ~33/33/33 or ~50/50) must
  have a sensible, non-broken presentation, not be silently dropped from
  every filter.
- `collect()`/`validate()` for this step keep their existing contract
  (`shadow_origin_id` field, same shape) — this task changes `render()` and
  its data source, not the step's data contract.

### Excluded

- Any change to the `shadows` table schema — the needed columns already
  exist.
- `FIELD_INFO['w-shadow']`'s `flavor`/`mechanics`/`example` content — this
  task supersedes it with real per-shadow `description` content shown on
  each card instead of generic field-level lore; TASK-034 separately decides
  what happens to the general `FIELD_INFO` panel mechanism for other fields.
- The equivalent audit for *other* wizard fields (name, backstory,
  order-chaos, blood purity, imprint, ability scores, class) — TASK-034's
  concern, not this task's.
- Any change to `GET /api/shadows`'s default (unfiltered) response shape or
  its other existing callers.

## Plan

1. Add the filtered-query support to `GET /api/shadows` and switch
   `player-wizard.js`'s character-creation fetch to use it.
2. Author `dream_level` values for the existing seeded shadows in
   `src/universes/amber/seed.js`.
3. Rebuild `shadowOriginStep.render()` as a card picker, reusing
   `classSelectionStep`'s card/selection pattern.
4. Add dominant-influence filtering/sorting to the card list.
5. Update `tests/amber-wizard-steps.test.js` and
   `tests/player-wizard-integration.test.js` for the new markup/interaction
   (the integration test currently interacts with a `<select name="shadow_origin_id">`
   — this will need updating to whatever the card picker's DOM/selection
   mechanism becomes, while `collect()`'s output field stays
   `shadow_origin_id` unchanged).
6. Add a `src/routes/shadows.js` test (or extend an existing one) proving
   the filtered query excludes non-starting and spoiler shadows while the
   endpoint's default behavior for other callers is unchanged.
7. `npm test`; manual browser verification of the new picker.

## Acceptance criteria

- [ ] `GET /api/shadows` supports an opt-in filter limiting results to
      `is_starting_shadow = 1 AND is_spoiler = 0`, with its default
      (unfiltered) behavior unchanged for existing callers.
- [ ] The character-creation shadow picker uses the filtered query.
- [ ] Every existing seeded shadow has a non-zero, content-appropriate
      `dream_level`.
- [ ] The shadow-origin step renders a card-based picker showing each
      shadow's name, description excerpt, and order/chaos/dream levels,
      visually consistent with the class-selection step's card pattern.
- [ ] The card list can be filtered or sorted by dominant influence, with a
      defined, non-broken presentation for balanced/tied shadows.
- [ ] `shadowOriginStep`'s `collect()`/`validate()` contract
      (`shadow_origin_id` field) is unchanged.
- [ ] `tests/amber-wizard-steps.test.js` and
      `tests/player-wizard-integration.test.js` are updated for the new
      picker and pass.
- [ ] A test proves the new `GET /api/shadows` filter excludes non-starting
      and spoiler shadows.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new/updated coverage for the filtered endpoint and
  the card picker.
- Manual browser verification: confirm the picker shows real per-shadow
  info, that a spoiler or non-starting shadow (if any exist in the test
  data) doesn't appear, and that influence filtering behaves sensibly for
  at least one balanced-influence shadow.

## Risks and assumptions

- The `is_starting_shadow = 1` restriction (in addition to the explicitly
  requested `is_spoiler` exclusion) is this task's own inference from the
  schema's apparent intent, not something explicitly confirmed — flag this
  plainly in the implementation handoff so it's easy to revisit if wrong.
- The parity/integration test in `tests/player-wizard-integration.test.js`
  hard-codes interaction against `[name="shadow_origin_id"]` as a `<select>`
  — changing this step's markup will require updating that test's
  interaction code, similar to the same risk already noted in TASK-035 for
  the ability-score step.
- `dream_level` authorship is a judgment call on lore consistency, not a
  mechanical derivation — reasonable values grounded in each shadow's
  existing `description`, not exact/provable numbers.

## Blocker

None.

## Implementation handoff

### Changes made

- Added the opt-in `GET /api/shadows?startingOnly=true` filter. It restricts
  results to `is_starting_shadow = 1 AND is_spoiler = 0`; requests without
  that exact opt-in retain the existing unfiltered query and response shape.
- Switched character creation to request the filtered shadow list.
- Added non-zero, lore-based Dream values to every Amber seed shadow and kept
  each row's three influence values on a roughly 100-point scale.
- Replaced the shadow-origin dropdown with selectable shadow cards showing
  name, a description excerpt, and Order/Chaos/Dream levels. Added All,
  Order, Chaos, Dream, and Balanced filters; exact ties are categorized as
  Balanced. The step id, order, `validate()`, and `collect()` output remain
  unchanged.
- Added light/dark picker styling that reuses the existing class-card visual
  pattern.
- Updated the Amber step and end-to-end wizard tests for card interaction and
  added coverage for tied-influence filtering, seed values, and filtered vs.
  unfiltered shadow API behavior.

### Validation performed

- `node --test tests/amber-wizard-steps.test.js tests/player-wizard-integration.test.js tests/api.test.js`
  passed: 29 tests, 0 failures.
- `npm test` passed: 113 tests, 0 failures.
- No real browser was available, so the requested manual browser verification
  was not performed or claimed.

### Assumptions and deviations

- Implemented the task's stated picker interpretation that a valid origin is
  both `is_starting_shadow = 1` and `is_spoiler = 0`. This intentionally
  excludes non-starting shadows as well as spoilers and remains easy to
  revisit through the opt-in route branch.
- Exact ties for the highest influence are presented under Balanced; otherwise
  the single highest of Order, Chaos, or Dream determines the filter.
- Dream values are editorial judgments grounded in the existing descriptions,
  as anticipated by the task. Seed behavior itself remains unchanged: these
  values apply when Amber seeds are inserted into a campaign with no shadows.
- The only validation deviation is the unavailable real-browser check noted
  above; automated DOM coverage exercised selection, displayed lore/levels,
  and balanced filtering.

### Unresolved risks

- Visual layout and interaction should still receive the task's requested
  real-browser review, including responsive and dark-theme appearance.

### Documentation updated

- This implementation handoff records the query parameter, tie behavior,
  validation result, and seed-value assumptions. No contract or architecture
  documentation changed because the approved behavior and architecture did
  not change.

## Review

Reviewer: Claude
Date: 2026-09-19

- **`GET /api/shadows?startingOnly=true`**: read the diff — a single
  conditional query, default behavior for every other caller (DM shadow
  management, the visited-shadows view) is byte-for-byte unchanged. Correct,
  minimal.
- **Contract preservation**: confirmed `shadowOriginStep`'s `id`, `order`,
  `validate()` (still returns `null`, no forced selection — unchanged from
  before), and `collect()` (`{shadow_origin_id}`, same field/shape) are
  exactly as before. Only `render()` and its data source changed, per scope.
- **Card picker**: read the full `render()`. Reuses the `class-card`/
  `shadow-card` visual pattern from `classSelectionStep` as directed. Each
  card shows name, a truncated description (`descriptionExcerpt`, 180 chars
  with an ellipsis), and `Order X · Chaos Y · Dream Z`. Selection toggles
  `.selected`/`aria-pressed` across all cards correctly (only one active at
  a time). `dominantInfluence()` picks the single highest of the three
  levels, falling back to `'balanced'` only on an exact tie — matches the
  task's specified tie behavior exactly, verified by reading the function,
  not just trusting the handoff's description.
- **Initially worried the Dream-level seed fix wouldn't reach the actual
  campaign Patrick has been testing against** (since `seed()` only inserts
  when a campaign has zero shadows, and the live campaign has had shadows
  for months) — checked the live `dm_helper.db` directly. Turns out
  moot: the live campaign's shadow rows were already independently
  curated with real, non-zero, varied `order_level`/`chaos_level`/`dream_level`
  values (visible in `updated_at` timestamps months apart from
  `created_at`), unrelated to this session's `seed.js` edits, and several
  shadows in the live campaign (Avalon, Begma, Ghostwheel, ...) aren't even
  in `seed.js`'s array at all — they were added later through the app's own
  shadow-management UI. So the acceptance criterion holds for the live
  campaign by coincidence of prior curation, and `seed.js`'s fix correctly
  covers any *future* new campaign, which is what was actually in scope.
  Noting this because it's exactly the kind of thing worth verifying against
  the real database rather than assuming from source code alone.
- Read `tests/amber-wizard-steps.test.js`'s new tests: the balanced-tie test
  and the "every seed shadow has non-zero Dream" test are both real,
  non-vacuous assertions on actual computed values, not placeholders.
- Grepped for remaining `shadow_origin_id` `<select>` usage: only in
  DM-facing character-editor files (`dm-character-editor.js`,
  `dm-character-modals.js`), correctly untouched and out of scope.
- Independently reran `npm test`: 113/113 passing, matching the handoff.

No blocking findings. The handoff's honesty about the seed-data assumption
("seed behavior itself remains unchanged... applies when Amber seeds are
inserted into a campaign with no shadows") was accurate and, on
verification, not actually a gap for the live campaign. Ready for human
acceptance. The manual browser walkthrough (card layout, filter buttons,
dark theme) is still genuinely unperformed — worth doing before/while
accepting this one, since it's the most visually involved of this batch.

## Human acceptance

Pending.
