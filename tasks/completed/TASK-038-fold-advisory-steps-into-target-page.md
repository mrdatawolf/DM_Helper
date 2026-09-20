# TASK-038: Fold advisory steps into their target's page instead of a separate step

Owner role: Implementer
Assigned agent: Codex
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002. **Amended 2026-09-19** (Patrick, approved)
— see its Amendments section and the revised "Advisory hooks" paragraph in
Required Behavior. Implement against the amended contract as written.
Related ADRs: ADR-005.
Dependencies: TASK-029 (host — `assembleWizardSteps`/`createWizardHost`, the
logic this task changes), TASK-031 (`classAdvisoryStep`, the concrete
motivating case), TASK-036 (the `shouldSkip`/`footnote` mechanism this task
must remain compatible with).

## Desired outcome

The class-recommendation advisory content (currently its own step, "Amber
Class Guidance," step 6 of 9) appears at the top of the class-selection
step's own page instead — the player never sees or clicks through a
separate, purely-informational page. `classSelectionStep`
(`public/js/systems/dnd5e/wizard-steps.js`) and `classAdvisoryStep`
(`public/js/universes/amber/wizard-steps.js`) remain fully independent of
each other in their own code; only the host's handling of `relativeTo`
changes.

## Context

Patrick's framing, from manually testing this batch's changes: "step six
should just be what is at the start of the step 7 section, its literally
just telling you what the imprint would point you toward. so if it was at
the top of step 7 we wouldn't need a read only step 6."

CONTRACT-001 and CONTRACT-002 both originally modeled an advisory step as
its own entry in the wizard's navigable step sequence — `assembleWizardSteps`
(`public/js/player/player-wizard-host.js`) inserts a `relativeTo`-declaring
step immediately before or after its target *within the flat array* the
host navigates through, so the player must click "Next" through it like any
other step, even though it has no controls (by design — CONTRACT-002
requires advisory content stay read-only). This was a reasonable design
originally, but real usage shows a read-only page with nothing to interact
with is worse than showing the same guidance at the top of the page where
the actual decision happens.

This can't be fixed inside either step's own code — `classSelectionStep`
must stay ignorant of any specific universe (that's the whole point of
CONTRACT-002's system/universe independence), and `classAdvisoryStep` must
stay ignorant of `classSelectionStep`'s internal rendering. Only the host,
which already owns the `relativeTo` mechanism, can fold one step's rendered
output into another's page while keeping both step authors unaware it's
happening.

## Scope

### Included

- `assembleWizardSteps`: change its return shape so advisory steps
  (`relativeTo`-declaring) are **not** part of the flat navigable sequence.
  Steps are frozen by their authoring module (`Object.freeze()`) and must
  not be mutated — expose the advisory-to-target attachment via a separate
  returned structure (e.g. `{ steps, advisoriesByStep }`, with
  `advisoriesByStep` keyed by target step id to `{ before: [...], after: [...] }`
  — implementer's call on exact shape), not by writing properties onto the
  frozen step objects. An advisory whose target isn't in the navigable
  sequence is still silently omitted, per existing behavior.
- `createWizardHost`: when rendering a page, render attached `before`
  advisories' `render()` output first, then the target step's own
  `render()`, then attached `after` advisories — all into the same
  container, in one page. When advancing past that page (`next()`), run
  `validate()` for every attached advisory (in the same before/target/after
  order) plus the target itself, stopping at the first non-null error
  exactly as today's single-step case does; on success, `collect()` every
  attached advisory and the target, merging all their fields into
  `wizardState` together.
- Honor an attached advisory's own `shouldSkip(wizardState)` (from TASK-036):
  when true, omit that advisory's `render()`/`validate()`/`collect()` for
  that page-render entirely — the target still renders/validates/collects
  normally, as if that advisory weren't attached for this instance.
- Update the step counter/chrome to reflect the navigable count only (an
  advisory no longer adds to "Step X of Y").
- `classAdvisoryStep` and `classSelectionStep` themselves do not change —
  each continues to assume it is the only content on its page, per the
  amended contract's explicit statement that neither step is aware this
  folding happens.
- Update `tests/player-wizard-host.test.js`'s existing `assembleWizardSteps`
  unit tests (ordering/advisory-placement/omission) for the new return
  shape, and add coverage proving: an attached advisory's content appears on
  the same page as its target (one render, not two), `next()` from that page
  runs both `validate()`s and merges both `collect()`s, and an advisory's own
  `shouldSkip` is honored independently of its target's.
- Update `tests/amber-wizard-steps.test.js`'s existing class-advisory
  isolation test if its assumptions about being tested via the host's flat
  sequence no longer hold (it may need no change if it already tests
  `classAdvisoryStep` directly rather than through `assembleWizardSteps`;
  confirm rather than assume).
- Update `tests/player-wizard-integration.test.js`'s real end-to-end flow:
  it currently calls `host.next()` an extra time to get past the standalone
  advisory page — reduce this to match the new, shorter navigable sequence,
  and update any step-count/step-id assertions affected.

### Excluded

- No change to `classSelectionStep`'s or `classAdvisoryStep`'s own
  `render`/`validate`/`collect` logic.
- No change to the `abilityScoreModifiers` mechanism or any other
  already-accepted host behavior (`filterForReview`, `info` panel,
  `shouldSkip`/`footnote` for non-advisory steps) beyond what's needed to
  keep them working correctly with folded advisories.
- No new advisory step beyond the existing `classAdvisoryStep` — this task
  changes how the mechanism works, not where it's used.

## Plan

1. Redesign `assembleWizardSteps`'s return shape to separate navigable steps
   from advisory attachments, without mutating frozen step objects.
2. Update `createWizardHost`'s `render()`/`next()`/`back()` to render and
   fold attached advisories into their target's page, honoring per-advisory
   `shouldSkip`.
3. Update chrome/step-count logic for the shorter navigable sequence.
4. Update the three affected test files per Scope.
5. `npm test`; manual browser check that the class-selection page now shows
   the advisory guidance at its top with no separate step to click through,
   and that the step counter reflects one fewer total step.

## Acceptance criteria

- [ ] `assembleWizardSteps` returns advisory steps as attachments to their
      target, not as entries in the navigable sequence; frozen step objects
      are never mutated.
- [ ] An advisory's `render()` output appears on the same page as its
      target's own `render()` output, in the declared `before`/`after`
      position, with no separate "Next" click required to see or pass it.
- [ ] `next()` from a page with an attached advisory validates and collects
      both the advisory and the target together, blocking on either's
      validation error.
- [ ] An advisory's own `shouldSkip` omits its content for that render
      without affecting its target.
- [ ] The step counter/chrome reflects the shorter navigable sequence.
- [ ] `classAdvisoryStep`'s and `classSelectionStep`'s own code is unchanged.
- [ ] The three affected test files are updated and pass; new coverage
      proves the single-page folding and combined validate/collect
      behavior directly (not inferred from the parity test alone).
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new coverage for advisory folding, combined
  validation/collection, and per-advisory `shouldSkip`.
- Manual browser verification of the `dnd5e`+`amber` class-selection page:
  confirm the advisory guidance renders at the top, no separate step exists
  for it, and the step counter is accurate.

## Risks and assumptions

- This changes `assembleWizardSteps`'s return shape, which
  `tests/player-wizard-host.test.js` already tests directly and
  `player-wizard.js` (the real wizard bootstrap) may consume — grep for all
  call sites before changing the shape, not just the ones named in this
  task file.
- The player-visible step count decreases for any campaign using an
  advisory step — this is an intended, visible behavior change, not a
  regression to avoid.

## Blocker

None.

## Implementation handoff

### Changes made

- Changed `assembleWizardSteps()` to return separate `steps` and
  `advisoriesByStep` structures. Advisory steps are no longer navigable, missing
  targets remain silently omitted, stable before/after order is preserved, and
  authored/frozen step objects are not mutated.
- Updated `createWizardHost()` to render active before/target/after page content
  together and to validate and collect that same rendered sequence in order.
  Advisory `shouldSkip()` is evaluated independently without changing the
  target's navigation or behavior.
- Kept review footnotes aware of all contributed steps while using only the
  shorter navigable sequence for host chrome and progress markers.
- Reworked host assembly tests for the new return shape and added direct
  coverage for frozen targets, inline render ordering, combined validation and
  collection, validation blocking, advisory skipping, and the shorter counter.
- Updated Amber assembly expectations and the real D&D 5e + Amber integration
  flow to reach the class-selection page without a standalone advisory step.

### Validation performed

- `node --test tests/player-wizard-host.test.js tests/amber-wizard-steps.test.js tests/player-wizard-integration.test.js`
  — passed, 25 tests and 0 failures.
- `npm test` — passed, 122 tests and 0 failures.
- Confirmed `player-wizard.js` uses `assembleWizardSteps()` only indirectly via
  `createWizardHost()`.
- Confirmed no changes were made to
  `public/js/systems/dnd5e/wizard-steps.js` or
  `public/js/universes/amber/wizard-steps.js`.
- No real browser was available, so the requested manual browser verification
  was not performed. The jsdom integration test verifies that advisory text is
  present on the class-selection page and the standalone navigation advance is
  gone.

### Assumptions and deviations

- Used a `Map` keyed by target step id for `advisoriesByStep`, with `{ before,
  after }` arrays, as permitted by the task's implementer-choice return shape.
- The active advisory sequence is captured when its target page renders, so the
  subsequent `next()` validates and collects exactly the advisory content shown
  for that render.
- No deviations from the approved Scope or Plan.

### Unresolved risks

- Manual browser presentation and visual step-counter verification remain for
  review because no real browser was available in this environment.

### Documentation updated

- Updated this task's implementation handoff only. No additional durable
  documentation changes were needed because CONTRACT-002 was already amended
  with the implemented behavior.

## Review

Reviewer: Claude
Date: 2026-09-19

Reviewed at the same depth as TASK-032/033/036 — this changes an
already-accepted core mechanism (`assembleWizardSteps`) and how every
future advisory step behaves, not just the concrete Trump Artist/class
case.

- Read `assembleWizardSteps`/`createWizardHost` in full.
  `advisoriesByStep` is a `Map` built from a separate loop, never written
  onto the step objects themselves — confirmed by the new test that asserts
  `Object.keys(target)` is unchanged after assembly (`['id', 'title',
  'order', 'render', 'validate', 'collect']`), a real structural proof of
  the no-mutation requirement, not just an absence of an obvious bug.
- **Validate-then-collect ordering across the whole page, not per-step**:
  `next()` runs a first loop validating every page step (before advisories,
  target, after advisories) and only starts the second collect loop if none
  errored — confirmed by the new test where an advisory's `validate()`
  fails and asserts `calls === ['validate:advisory']` only, proving the
  target's `validate`/`collect` never ran and nothing was collected. This
  matches the task's explicit "stop at the first error, don't partially
  collect" requirement.
- **Advisory `shouldSkip` is independent of its target**, verified directly:
  a test sets an advisory's `shouldSkip` true and confirms only
  `render:target`/`validate:target`/`collect:target` fire — the advisory's
  own functions are never called, while its target behaves completely
  normally.
- **A subtle correctness choice worth flagging as good, not just accepting
  on faith**: `next()` reuses the exact `renderedPageSteps` captured at the
  most recent `render()` (via a `renderedIndex` cache) rather than
  recomputing `pageSteps()` fresh — this guarantees validate/collect operate
  on exactly what the player was shown, immune to any theoretical
  `shouldSkip` re-evaluation drift between render and next. Falls back to a
  fresh computation if `next()` is somehow called without a prior render,
  so it's not fragile.
- Confirmed via direct grep that `player-wizard.js` never calls
  `assembleWizardSteps` directly (only through `createWizardHost`), so the
  return-shape change has no other call site to break — the task's own
  flagged risk was checked, not assumed away.
- Confirmed `public/js/systems/dnd5e/wizard-steps.js` and
  `public/js/universes/amber/wizard-steps.js` are byte-identical to before
  this task — `classSelectionStep` and `classAdvisoryStep` genuinely don't
  know this folding exists, exactly as the amended contract requires.
  `tests/amber-wizard-steps.test.js`'s existing advisory-isolation test
  (calls `classAdvisoryStep` directly, not through the host) needed no
  changes and still passes, confirming it.
- The real end-to-end integration test now asserts
  `host.currentStep.id === 'system:dnd5e:class-selection'` immediately after
  the flaws-traits step's `next()` — one fewer navigation step than before,
  with the advisory text (`Characters with your imprint and abilities often
  lean toward`) present on that same page — a direct, non-vacuous proof of
  the actual player-visible outcome this task exists to produce.
- Independently reran `npm test`: 122/122 passing, matching the handoff.

No blocking findings. This is careful, well-verified work on a genuinely
tricky change (revising an already-accepted core host mechanism without
breaking any of the four other features already layered on top of it this
session — info panel, footnotes, shouldSkip, filterForReview all continue
to pass). Ready for human acceptance — manual browser confirmation of the
folded page and the now-shorter step counter is the one open item.

## Human acceptance

Pending.
