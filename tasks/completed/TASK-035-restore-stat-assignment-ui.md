# TASK-035: Restore non-duplicating stat-assignment UI with live modifier preview

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002 (this is entirely within `abilityScoresStep`'s
existing `render`/`collect` responsibility — no interface change expected).
Related ADRs: ADR-005.
Dependencies: TASK-030 (the `abilityScoresStep` this task rewrites the
`render()` of, in `public/js/systems/dnd5e/wizard-steps.js`).

## Desired outcome

Assigning the six standard-array values to ability scores is at least as
usable as the pre-cutover wizard: a value already assigned to one stat isn't
also selectable for another, and the player sees each stat's live
Amber-modifier-adjusted final score as they assign, not only after
submitting.

## Context

Discovered during manual browser testing of TASK-032's cut-over wizard
(2026-09-19, Patrick): "the new drop downs are confusing and don't even
account for previously selected values."

`abilityScoresStep` in `public/js/systems/dnd5e/wizard-steps.js` renders six
independent `<select>` elements, each listing every value in
`STANDARD_ARRAY` with no awareness of what the other five selects currently
hold. `validate()` only catches a duplicate assignment when the player tries
to advance (`Use each standard-array value exactly once.`) — nothing in
`render()` prevents or visually discourages picking the same value twice
while assigning. There is also no live preview of `effectiveScores()` (the
assignment plus any `wizardState.abilityScoreModifiers` from an active
universe) during this step — a player only sees their final, modifier-
adjusted stats once they reach the class-selection step, where
`classSelectionStep.render()` happens to compute and display them for
gating purposes.

The pre-cutover wizard (`player-wizard-steps.js`'s `wizardRenderStats`/
`assignStat`/`selectChip`, deleted by TASK-032, recoverable via
`git show HEAD~N:public/js/player/player-wizard-steps.js` from before this
session's changes) used a tap-to-assign "chip" interaction: six value chips
representing the standard array, and six stat slot cards. Clicking a chip
then clicking a stat slot assigned it; an assigned chip became visually
`.used` and `disabled`, making a duplicate assignment structurally
impossible rather than merely validated against afterward. Each stat slot
showed its base value, its Amber modifier (if any, with sign and a `.neg`
class for negative), and the resulting final value live, all recomputed on
every assignment change.

## Scope

### Included

- Rebuild `abilityScoresStep`'s `render()`/internal draft handling as a
  chip-and-slot (or equivalent non-duplicating) interaction: once a value is
  assigned to a stat, it must not remain selectable for another stat without
  first being unassigned.
- Live display of each stat's modifier-adjusted final score during this
  step, reading `wizardState.abilityScoreModifiers` the same way `collect()`
  already does, so the player isn't surprised by the class step's gating
  later.
- Preserve `abilityScoresStep`'s existing `id`, `order`, `validate()`
  contract (still block advancing until all six are assigned — though a
  structurally non-duplicating UI may make the "used each value once" branch
  of `validate()` unreachable in practice, keep it as a safety net), and
  `collect()`'s output shape exactly as TASK-030/TASK-032 already built and
  tested it — this task changes the interaction, not the data contract.

### Excluded

- No change to `effectiveScores()`/`abilityScoreModifiers` semantics — this
  task only surfaces what's already computed, earlier and more clearly.
- No change to how `classSelectionStep` reads or gates on the resulting
  scores.
- Reusing the exact old CSS/markup structure isn't required — the
  interaction pattern (assign-by-selection, used values disabled, live
  final-score preview) is what matters, not pixel parity with the deleted
  implementation.

## Plan

1. Read the deleted `wizardRenderStats`/`assignStat`/`selectChip` logic (via
   git history) as a reference for the interaction pattern, not a literal
   port target — it depended on global `wiz.assign` state that doesn't exist
   in the new per-step draft (`WeakMap`-based) model and needs adapting.
2. Rebuild the render/interaction as chip-and-slot (or an equivalently
   non-duplicating pattern — implementer's call if a different UI achieves
   the same guarantee more simply within the existing step shape) inside
   `abilityScoresStep.render()`, keeping its draft in the existing
   `draftFor(state).assignment` structure.
3. Add live modifier/final-score display per stat, reading
   `state.abilityScoreModifiers`.
4. Update/extend `tests/dnd5e-wizard-steps.test.js` (and the integration
   parity test in `tests/player-wizard-integration.test.js`, since it
   interacts with this step's DOM directly) for the new interaction pattern
   — the parity test's exact `change()` calls on `document.querySelectorAll('select')`
   will need updating if the markup is no longer six plain selects.
5. `npm test`.

## Acceptance criteria

- [ ] Once a standard-array value is assigned to one stat, it cannot also be
      assigned to another without first being freed from the first.
- [ ] Each stat shows its live, modifier-adjusted final score as soon as a
      base value is assigned and modifiers are known, not only after
      submission.
- [ ] `abilityScoresStep`'s `id`, `order`, `validate()` behavior, and
      `collect()` output shape are unchanged.
- [ ] `tests/dnd5e-wizard-steps.test.js` and
      `tests/player-wizard-integration.test.js` are updated for the new
      interaction and pass.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including updated coverage for the new non-duplicating
  interaction and live preview.
- Manual browser verification that assigning all six values is at least as
  fast and clear as the old chip UI, and that a used value is visibly
  unavailable elsewhere.

## Risks and assumptions

- The parity test in `tests/player-wizard-integration.test.js` hard-codes
  interaction against `document.querySelectorAll('select')` for this step —
  changing the markup shape will break that test's *interaction* code even
  though the underlying `collect()` contract doesn't change; budget time to
  update it, not just the step's own unit tests.

## Blocker

None — awaiting design/approval, not implementation-blocked.

## Implementation handoff

### Changes made

- Replaced `abilityScoresStep.render()`'s six independent selects with the
  established standard-array chip and stat-slot interaction, adapted to the
  existing per-wizard `draftFor(state).assignment` draft.
- Used values are visibly marked and disabled; the click handler also rejects
  synthetic activation of disabled chips. Clicking an occupied stat without a
  selected chip frees its value for reassignment.
- Added live per-stat base, signed modifier, and final-score rendering from
  `wizardState.abilityScoreModifiers`, using the same numeric/default-zero
  semantics as `collect()`/`effectiveScores()`.
- Updated the D&D step and end-to-end integration tests to drive the chip/slot
  UI. Added focused coverage for structural duplicate prevention, freeing and
  reassigning a value, signed modifier display, negative modifier styling, and
  live final-score preview.

### Validation performed

- `node --test tests/dnd5e-wizard-steps.test.js tests/player-wizard-integration.test.js`
  — passed: 7 tests, 0 failures.
- `npm test` — passed: 119 tests, 0 failures.
- No real browser was available for the required manual verification; visual
  clarity and interaction speed therefore remain unverified outside JSDOM.

### Assumptions and deviations

- Reused the retained `.chip`, `.stat-slot-card`, and related responsive/dark
  theme styles from the pre-cutover interaction rather than adding new CSS.
- The selected-but-not-yet-assigned chip is transient render-local UI state;
  completed assignments remain in the existing WeakMap-backed draft as
  required.
- No deviations from the approved implementation scope or plan.

### Unresolved risks

- Real-browser visual and usability verification is still needed during
  review because it was not available in this implementation environment.

### Documentation updated

- This implementation handoff only. No durable behavior or architecture
  documentation required changes.

## Review

Reviewer: Claude
Date: 2026-09-19

- Read `abilityScoresStep`'s new `render()` in full and confirmed `id`,
  `order`, `validate()`, and `collect()` are byte-for-byte unchanged from
  the version already reviewed under TASK-030 — only the interaction
  changed, exactly as scoped.
- **Structural duplicate prevention verified by tracing the logic, not just
  trusting the test**: `refresh()` recomputes `usedScores` from
  `Object.values(assignment)` on every change and disables any chip whose
  value is already assigned anywhere — so overwriting a filled stat with a
  newly selected chip correctly frees its old value back to the pool for
  free (via recomputation), with no manual swap-back bookkeeping needed, a
  cleaner approach than the pre-cutover original. A disabled chip's click
  handler also explicitly no-ops, covering the case where a test (or some
  future assistive-tech interaction) dispatches a click on a disabled
  element directly.
- Read the "prevent duplicate assignment and are freed by clearing" test
  closely: it clicks the *disabled* chip first and asserts nothing happens
  (`DEX` stays `'—'`), then frees `STR`, confirms the chip re-enables, and
  successfully reassigns — a genuine end-to-end proof of the free/reassign
  cycle, not just a single assignment check.
- Read the modifier-preview test: asserts the live `.ssc-final` text reads
  `'Final: 12'` for a `15` base with a `-3` modifier *during* assignment,
  before `collect()` ever runs — directly satisfies the live-preview
  requirement, not inferred from `collect()`'s own already-tested math.
- CSS: confirmed `.chip`/`.stat-slot-card`/`.has-value`/`.targeted` reuse
  the exact class names TASK-030's original chip-adjacent styling already
  established (visible in `public/css/player-dashboard.css`), rather than
  inventing a new visual vocabulary — good continuity.
- Independently reran `npm test`: 119/119 passing, matching the handoff.

No blocking findings. Ready for human acceptance — manual browser
verification (assignment speed/clarity, dark theme) remains the one open
item, same as the rest of this batch.

## Human acceptance

Pending.
