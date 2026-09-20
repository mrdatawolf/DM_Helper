# TASK-031: Amber universe wizard steps and class-recommendation advisory

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-001 (implements the "Universe module" actor's
`steps` contribution, and the advisory-hook mechanism resolving the
cross-cutting class-recommendation problem).
Related ADRs: ADR-005.
Dependencies: TASK-029 (host), TASK-030 (needs the dnd5e class-selection
step's id to exist as the advisory step's `relativeTo` target, and needs the
`wizardState.abilityScoreModifiers` shared key TASK-030 defined).

## Desired outcome

`src/universes/amber/index.js` exports a `steps` array covering shadow-origin
selection, Order/Chaos + imprint + blood purity, and flaws/traits (today's
steps 1's shadow part, 2, and 4), plus an **advisory step** attached to
TASK-030's class-selection step that renders read-only class-recommendation
guidance instead of today's inline-highlighted options, per CONTRACT-001's
open-question-1 resolution (read-only advisory panel, accepted 2026-09-19).
Also extracts "Trump Artist" eligibility, an Amber-owned field currently
baked into the class step's own UI, into its own universe-owned step.

## Context

Continuing TASK-030's decomposition of the current fixed wizard
(`public/js/player/player-wizard-core.js`, `player-wizard-steps.js`):

- **Shadow origin**: part of today's step 1 (`shadowId` /
  `shadow_origin_id`), Amber-owned (`AMBER_CHARACTER_COLUMNS`). Becomes its
  own universe step here, separate from TASK-030's system-owned identity
  step (name/race/backstory) — a homebrew, no-universe campaign has no
  shadows to select from, so this cannot live in the system's identity step.
- **Order/Chaos, imprint, blood purity** (today's step 2): fully
  Amber-owned. This step's `collect()` must, in addition to storing its own
  fields, compute and publish `wizardState.abilityScoreModifiers`
  (reproducing today's `calcAmberMods()` in `player-wizard-core.js` lines
  31–70) — the shared key TASK-030's ability-score step reads. This is the
  one explicit, host-documented exception to "steps don't read each other's
  internals": it's a defined shared field on `wizardState`, not this module
  reaching into dnd5e's step.
- **Flaws/traits** (today's step 4, `amber_flaws`/`amber_traits`): Amber-
  owned, straightforward extraction.
- **Class-recommendation advisory** (the cross-cutting problem CONTRACT-001
  names explicitly): today, `getRecommendedClasses`/`classGateStatus` mix
  Amber's imprint into the D&D class step's own option rendering
  (`player-wizard-core.js` lines 86–139). Per CONTRACT-001's Required
  Behavior and the resolved open question, this becomes a **read-only
  advisory step** declared with `relativeTo: { step: <TASK-030's
  class-selection step id>, position: 'before' }` (or `'after'` — implementer's
  choice, document it), reading the already-collected imprint choice and the
  class step's own already-published effective ability scores from shared
  `wizardState` to render guidance text (e.g. "characters with your imprint
  often lean toward: Cleric, Druid, Wizard") — it must not alter the class
  step's own options, highlighting, or gating.
- **Trump Artist eligibility** (`trumpArtist`, submitted as Amber's
  `trump_artist` column): today baked into the class step's own DOM
  (`w-trump-check` checkbox, gated by `isTrumpEligible(finals)`,
  `player-wizard-core.js` lines 79–81). Since this is an Amber-owned field,
  it does not belong in TASK-030's system-owned class step at all — extract
  it into its own small universe step, ordered after class selection, whose
  `render()` reads the class step's already-published effective scores from
  shared `wizardState` to determine eligibility and collects the checkbox
  value.

## Scope

### Included

- `universe.steps` on `src/universes/amber/index.js`: a shadow-origin step,
  an Order/Chaos + imprint + blood-purity step (publishing
  `wizardState.abilityScoreModifiers`), a flaws/traits step, a Trump Artist
  eligibility step (ordered after class selection), and the class-
  recommendation advisory step (`relativeTo` TASK-030's class-selection
  step id).
- The advisory step renders guidance only — verified by a test asserting it
  never mutates the class step's own state/options.
- `IMPRINT_LORE`, `WIZARD_STEP_INFO` (the Amber-specific parts), `FIELD_INFO`,
  `FLAW_TRAIT_PAIRS` stay served from Amber's universe content, now consumed
  by these steps directly instead of the old wizard files.

### Excluded

- Identity (name/race/backstory), ability-score assignment, and class
  selection itself — TASK-030.
- Wiring these steps into the real player-facing wizard or retiring the old
  wizard files — TASK-032.
- No change to `POST /api/characters`/`PUT /api/characters/:id`.
- No second universe or homebrew-universe example — this task only ports
  Amber's existing behavior into the new model.

## Plan

1. Confirm current Amber field ownership (`AMBER_CHARACTER_COLUMNS`) covers
   every field these steps collect, directly rather than assuming this task
   file's Context list is exhaustive.
2. Build the shadow-origin, Order/Chaos/imprint/blood-purity (with the
   `abilityScoreModifiers` publish), and flaws/traits steps.
3. Build the Trump Artist step, ordered after TASK-030's class-selection
   step, reading its published effective scores.
4. Build the class-recommendation advisory step attached via `relativeTo` to
   TASK-030's class-selection step id; verify it only renders guidance and
   never mutates the class step's own state.
5. Write tests proving: `abilityScoreModifiers` is correctly published and
   matches today's `calcAmberMods()` output for representative
   imprint/order-chaos/blood-purity combinations; the advisory step's
   recommendations match today's `getRecommendedClasses()` output for the
   same inputs; Trump Artist eligibility matches today's
   `isTrumpEligible()`.
6. Run the full test suite.

## Acceptance criteria

- [ ] `universe.steps` exports shadow-origin, Order/Chaos+imprint+blood-
      purity, flaws/traits, Trump Artist, and the class-recommendation
      advisory step.
- [ ] The Order/Chaos+imprint+blood-purity step's `collect()` publishes
      `wizardState.abilityScoreModifiers` matching today's `calcAmberMods()`
      output field-for-field, for representative inputs.
- [ ] The advisory step attaches via `relativeTo` to TASK-030's class-
      selection step id and renders read-only guidance matching today's
      `getRecommendedClasses()` output, without altering the class step's
      own options, highlighting, or gating.
- [ ] Trump Artist eligibility/collection matches today's
      `isTrumpEligible()`/submitted `trump_artist` behavior, now as its own
      universe step rather than baked into the class step's DOM.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including parity tests comparing this task's
  `abilityScoreModifiers`/advisory-recommendation/Trump-Artist output
  against today's `calcAmberMods`/`getRecommendedClasses`/`isTrumpEligible`
  for the same representative inputs.

## Risks and assumptions

- Depends on TASK-030 having actually implemented the
  `wizardState.abilityScoreModifiers` shared-key contract as TASK-030
  describes it — if TASK-030 lands differently, this task's Order/Chaos step
  must be adjusted to match, not the other way around, since TASK-030's
  ability-score step is the consumer.
- The advisory step's exact wording/rendering doesn't need to be pixel-
  identical to today's inline highlighting (that's the accepted UX change
  from CONTRACT-001's resolved open question) — only the underlying
  recommendation *logic* (which classes get suggested) needs to match.

## Blocker

None.

## Implementation handoff

### Changes made

- Added `src/universes/amber/wizard-steps.js` and exposed its five steps from
  the Amber manifest: shadow origin; Order/Chaos, imprint, and blood purity;
  flaws and traits; read-only class guidance; and Trump Artist eligibility.
- The Amber attributes step publishes the exact six-key
  `wizardState.abilityScoreModifiers` object consumed by TASK-030 and returns
  the existing Amber extension payload shapes for Pattern, Logrus, blood
  purity, Order/Chaos, and broken-imprint fields.
- Attached the advisory immediately **before**
  `system:dnd5e:class-selection`. It derives recommendations from already
  collected shared-state scores and imprint fields, renders text only, and
  returns no fields.
- Kept Trump Artist selection in its own post-class step, with eligibility
  computed from the effective scores already published by the D&D ability
  step. Flaw/trait collection retains the legacy object and trait-array
  shapes.
- Consumed Amber's existing `IMPRINT_LORE`, Amber portions of
  `WIZARD_STEP_INFO`, `FIELD_INFO`, and `FLAW_TRAIT_PAIRS` directly from
  universe content. No legacy wizard files or D&D step logic were changed.
- Added focused parity and composition tests in
  `tests/amber-wizard-steps.test.js`.

### Validation performed

- `node --test tests/amber-wizard-steps.test.js tests/dnd5e-wizard-steps.test.js tests/player-wizard-host.test.js`: 15 passed, 0 failed.
- Final `npm test`: 109 passed, 0 failed.
- Tests cover representative legacy modifier combinations, Pattern/Refrain/
  Logrus class recommendations, both Trump eligibility formulas, the exact
  advisory attachment target/order, read-only advisory behavior, and Amber
  field ownership.

### Assumptions and deviations

- No scope or plan deviations.
- Shadow choices are read from `wizardState.shadows`, matching the data the
  integration task will supply; an absent list renders the optional empty
  selection without error.
- Advisory placement uses the task-permitted `before` position so guidance is
  presented immediately before class selection.
- Confirmed directly that every collected field is present in
  `AMBER_CHARACTER_COLUMNS`. UI-only choices such as the no-imprint bonus and
  Logrus penalty shift remain private draft data and affect only the published
  modifiers, as in the legacy wizard.

### Unresolved risks

- TASK-032 still owns loading these server-side step definitions into the
  player-facing browser wizard and supplying campaign shadows. Until that
  cutover, these contributed steps are exercised through the host tests but
  are not the live creation UI.

### Documentation updated

- Updated this task's implementation handoff only. No contract, ADR, or other
  durable documentation changed because the implementation follows the
  approved task and CONTRACT-001.

## Review

Reviewer: Claude
Date: 2026-09-19

Verified independently rather than trusting the handoff's self-report:

- Read `src/universes/amber/wizard-steps.js` in full and diffed its
  `calculateAbilityScoreModifiers`/`recommendedClasses`/`isTrumpEligible`
  against today's `calcAmberMods`/`getRecommendedClasses`/`isTrumpEligible`
  in `player-wizard-core.js` line by line: every branch (Order/Chaos
  threshold, all six imprint cases including the Logrus penalty-shift
  adjustment, all three blood-purity cases, every class-recommendation
  condition, both Trump-eligibility sums) matches exactly. This is a
  faithful port, not a reimplementation with drift.
- **`abilityScoreModifiers` interop confirmed against the real TASK-030
  code, not just in isolation**: `amberAttributesStep.collect()` sets
  `state.abilityScoreModifiers` directly on the shared state object (a
  mutation inside `collect()`, rather than including it in the returned
  fields object `next()` merges). This is a minor deviation from
  CONTRACT-001's literal description of `collect()` as a pure function
  returning data — worth noting, not blocking, since `state` passed to
  `collect()` is the actual `wizardState` reference, so it works correctly
  either way and `tests/dnd5e-wizard-steps.test.js`'s modifier test already
  proves TASK-030's `effectiveScores()` picks it up. One consequence worth
  flagging for TASK-032: since it lands as an ordinary key on `wizardState`,
  it will appear in the host's generic review-step dump and in the
  full `wizardState` object if TASK-032 naively serializes that whole object
  as the request body — the server-side field allow-lists
  (`UNIVERSAL_CHARACTER_UPDATE_FIELDS`/`system.sheet.fields`/
  `universe.character.fields`) would silently drop it either way, so this
  isn't a correctness risk, just a minor cosmetic leak worth a one-line
  cleanup in TASK-032 (e.g. review step could skip host-internal keys).
- **Advisory read-only guarantee**: read
  `tests/amber-wizard-steps.test.js`'s "class advisory is read-only" test —
  it snapshots `state` before calling the advisory step's `render()`,
  asserts deep equality after, asserts `collect()` returns `{}`, and asserts
  zero interactive elements exist in the rendered container. This is a real,
  structural proof of the contract's "must not alter the class step's own
  options, highlighting, or gating" requirement, not just a claim.
- **Sequencing**: order values (`shadow-origin:15`,
  `attributes:20`, [dnd5e `ability-scores:30`], `flaws-traits:40`,
  `class-advisory:49` + `relativeTo before system:dnd5e:class-selection`,
  [dnd5e `class-selection:50`], `trump-artist:60`) reproduce today's step
  sequence exactly and guarantee `amberAttributesStep` (which publishes
  `abilityScoreModifiers`) always collects before the dnd5e ability-score
  step reads it — verified by reading the actual numbers, not assumed.
- Trump Artist correctly moved out of the class step into its own step
  after class selection, reading TASK-030's already-published effective
  scores (`effectiveScores(state)` reads `state.strength` etc. directly) —
  matches the task's required extraction.
- `git status` confirms no changes to `src/systems/dnd5e/*` beyond what
  TASK-030 already introduced, and no changes to the still-live
  `player-wizard-core.js`/`-steps.js` — correctly out of scope.
- Independently reran `npm test`: 109/109 passing, matching the handoff.

No blocking findings. The one noted deviation (mutation vs. returned field
for the shared modifier key) is cosmetic and already proven to interoperate
correctly with TASK-030's real consumer — flagging it for TASK-032's
awareness rather than sending this back. Ready for human acceptance.
TASK-032 can proceed against both real system and universe step modules.

## Human acceptance

Pending.
