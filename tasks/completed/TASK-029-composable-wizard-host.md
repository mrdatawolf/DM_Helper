# TASK-029: Composable wizard host

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-001 (this task implements the "Wizard host" actor
and its required behavior; no other part of the contract).
Related ADRs: ADR-005.
Dependencies: None on other proposed tasks. Depends on already-completed
TASK-024 (system registry) and TASK-025 (universe registry) only for the
concept of "a campaign's system/universe," not for any real step content.

## Desired outcome

A wizard host mechanism that sequences an arbitrary list of step definitions
contributed by two input arrays (`systemSteps`, `universeSteps`) per
CONTRACT-001's shape — with zero built-in knowledge of `dnd5e` or `amber` —
replacing the hardcoded `wiz.step === 1..6` orchestration in
`public/js/player/player-wizard-core.js`. Verified entirely against
synthetic fixture step definitions; no real system or universe content is
touched by this task.

## Context

Today's host logic in `player-wizard-core.js` hardcodes six steps by number:
`wizardRenderStep` (line 233), `wizardValidateStep` (line 264), and
`wizardCollectStep` (line 287) each switch on `wiz.step === 1` through `5`
(step 6 is review, handled separately by `wizardRenderReview`), and the step
counter is a literal template string `` `Step ${wiz.step} of 6` `` (line 250).
None of this generalizes to a variable-length, module-contributed step list.

CONTRACT-001 (`docs/contracts/CONTRACT-001-composable-character-wizard.md`)
specifies the host's required behavior: concatenate `system.steps` and
`universe.steps` (universe steps omitted when no universe is selected), order
by each step's own numeric `order` field with first-come-first-served
tie-breaking (open question 2, resolved 2026-09-19), support advisory steps
placed via `relativeTo: { step, position }` that are silently omitted (not
errored) when their target step id isn't present, and degrade cleanly to a
system-only sequence with no error and no advisory panels when there's no
universe.

## Scope

### Included

- A step-list assembly function: given `systemSteps` (required, at least one
  step per open question 3's resolution) and `universeSteps` (optional array,
  may be omitted/empty), produce one ordered sequence — concatenate, sort by
  `order`, first-come-first-served on ties, then resolve `relativeTo`
  insertion for any step declaring it, omitting a `relativeTo` step whose
  target id isn't in the assembled non-advisory sequence.
- Rebuilt render/validate/collect/back/next dispatch that operates on the
  assembled list by step id/index, not a hardcoded numeric switch.
- Step-count chrome (counter text, back-button visibility, "is this the last
  step" detection) driven by the assembled list's actual length, for any
  length including a system-only (no-universe) list.
- A documented, host-owned mechanism for the final "review" step: today's
  step 6 (`wizardRenderReview`) isn't cleanly system- or universe-owned, it
  summarizes whatever was collected. This task must decide and document how
  the host presents a review of an arbitrary assembled step list (e.g. a
  fixed host-built-in final step that iterates the shared wizard state
  generically, or another mechanism) — flag this decision explicitly in the
  handoff since CONTRACT-001 doesn't specify it and it doesn't fit either
  the `system.steps` or `universe.steps` axis.
- Fixture-based automated tests (synthetic step objects, not real dnd5e/amber
  content) proving: correct ordering including tie-break behavior; advisory
  step inserted immediately before/after its target when present; advisory
  step silently omitted when its target is absent; a system-only list (no
  `universeSteps`) completes without error; a step's `validate()` message
  blocks advancement past that step.

### Excluded

- No change to `src/systems/dnd5e/index.js` or `src/universes/amber/index.js`
  — neither exports a `steps` key yet (TASK-030, TASK-031).
- No change to `POST /api/characters` / `PUT /api/characters/:id`.
- No wiring of the real player-facing wizard to this host yet, and no
  deletion of `player-wizard-core.js`/`player-wizard-steps.js`/
  `player-wizard-data.js` — that cutover is TASK-032's job, once real step
  content exists to wire in.

## Plan

1. Define the step definition shape in code exactly as CONTRACT-001 states:
   `{ id, title, order, relativeTo?, render(container, wizardState),
   validate(wizardState), collect(wizardState) -> fieldsObject }`.
2. Implement step-list assembly (concatenate, sort, advisory resolution)
   as a pure function testable without any DOM.
3. Rebuild the render/validate/collect/back/next dispatch to index into the
   assembled list.
4. Update step-count chrome to read the assembled list's length.
5. Decide and implement the review-step mechanism; document the decision.
6. Write fixture-based tests for every behavior in Scope, using synthetic
   step objects with no relation to real dnd5e/amber content.
7. Run the full test suite.

## Acceptance criteria

- [x] Step-list assembly concatenates `systemSteps`/`universeSteps`, orders
      by `order`, and is first-come-first-served on ties.
- [x] Advisory steps insert correctly relative to a present target and are
      silently omitted (no error) when the target is absent.
- [x] Render/validate/collect/back/next dispatch operates on the assembled
      list's ids, with no hardcoded step-number switch remaining.
- [x] Step-count chrome reflects the assembled list's actual length for any
      input, including a system-only list.
- [x] A step's `validate()` return value blocks advancement, matching
      today's `wizardValidateStep` blocking behavior.
- [x] The review-step mechanism is implemented and its design choice is
      documented in the handoff.
- [x] Fixture-based tests (synthetic steps only) cover every item above.
- [x] `npm test` passes.

## Validation requirements

- `npm test`, including the new fixture-based host tests.
- Reviewer check: confirm the tests genuinely use synthetic fixture steps,
  not real dnd5e/amber content pulled in early to "prove" the mechanism —
  this task's own value is a host verified independently of any real
  system/universe.

## Risks and assumptions

- The review-step gap (noted in Scope) is a real hole in CONTRACT-001 — the
  contract describes two step-contributing axes but the existing wizard's
  review step belongs to neither. Whatever this task decides here becomes
  the pattern TASK-030/031/032 build on; document it clearly.
- Assumes CONTRACT-001's step shape is implemented literally; flag any
  deviation in the handoff rather than silently adjusting it.

## Blocker

None.

## Implementation handoff

### Changes made

- Added `public/js/player/player-wizard-host.js`, defining the CONTRACT-001
  step shape and exporting pure step assembly plus host creation functions.
- Step assembly concatenates system then optional universe fixtures, performs
  stable numeric ordering, and resolves advisory steps immediately before or
  after non-advisory targets. Missing advisory targets are silently omitted.
- Added index-based render, validate, collect, next, and back dispatch. The
  host merges each successful step's collected fields into shared wizard
  state and derives counter/button chrome from the assembled sequence length.
- Implemented review as a fixed, host-owned `host:review` step appended after
  contributed steps. It renders all fields in shared wizard state generically
  and contributes no fields of its own. The review step is included in the
  displayed step count and last-step button behavior. This keeps review out of
  both plugin axes while allowing it to summarize arbitrary contributions.
- Added `tests/player-wizard-host.test.js` using synthetic steps only. No real
  D&D 5e or Amber step content is imported or changed.

### Validation performed

- `node --test tests/player-wizard-host.test.js`: 6 passed, 0 failed.
- `npm test`: 99 passed, 0 failed.
- Coverage includes stable order ties, before/after advisory placement,
  missing-target omission, system-only navigation through review, generic
  collected-state rendering, actual-length chrome, back/next dispatch,
  validation blocking, and the clear zero-system-step failure.

### Assumptions and deviations

- Multiple advisory steps around the same target retain their already-sorted,
  first-come order on both sides of that target.
- An advisory target must be a non-advisory assembled step; an advisory that
  names another advisory is omitted because that id is not in the assembled
  non-advisory sequence described by the approved task.
- No deviations from the approved plan. The existing hardcoded live wizard
  remains unchanged and unwired, as explicitly reserved for TASK-032.

### Unresolved risks

- Real player-dashboard integration and visual browser verification remain
  intentionally deferred to TASK-032. This task validates the host DOM shell
  with jsdom and synthetic definitions only.

### Documentation updated

- Added JSDoc in `player-wizard-host.js` for the literal step contract, host
  inputs, assembly behavior, and the host-owned review mechanism.
- Recorded the review-step design decision and integration boundary in this
  implementation handoff. No broader architecture documentation changed.

## Review

Reviewer: Claude
Date: 2026-09-19

Verified independently rather than trusting the handoff's self-report:

- Read `public/js/player/player-wizard-host.js` in full. `assembleWizardSteps`
  sorts `[...systemSteps, ...universeSteps]` with an explicit `(order, index)`
  tuple comparator — first-come-first-served on ties is enforced by the
  original concatenation index, not incidental JS engine sort stability.
  Advisory resolution correctly builds `before`/`after` maps keyed by
  `relativeTo.step`, only for targets present in the non-advisory
  (`ordinary`) set, and splices them in via `ordinary.flatMap` — an advisory
  naming a missing or advisory-only target is silently excluded, matching
  the Failure behavior spec exactly.
- Zero-system-step input throws `A wizard system must contribute at least
  one step.` — matches CONTRACT-001's required clear-error behavior.
- `next()` calls `validate()` first and returns `{advanced: false, error}`
  without calling `collect()` or mutating `wizardState` on a validation
  failure — confirmed by the "blocks advancement" test's `collected: false`
  assertion, not just the handoff's claim.
- Read `tests/player-wizard-host.test.js` in full: seven tests, all against
  synthetic `system:`/`universe:` fixture ids with no import of
  `src/systems/dnd5e` or `src/universes/amber` — genuinely independent of
  real content, as the task required. Covers order-tie-break, multi-advisory
  before/after stable placement, missing-target omission, full system-only
  navigation through the host-owned review step, validation blocking, and
  the zero-step error — every acceptance criterion has a corresponding test,
  not just a subset.
- The review-step gap flagged in this task's own Risks section is resolved
  reasonably: a fixed `host:review` step appended after assembly (not run
  through `assembleWizardSteps`'s ordering, since it's always last by
  construction — the `order: Number.MAX_SAFE_INTEGER` on it is vestigial but
  harmless), generically rendering every `wizardState` entry via
  `Object.entries`. This keeps the host genuinely ignorant of dnd5e/Amber
  while still producing a working review — reasonable for TASK-030/031 to
  build on, though its plain field-name/JSON-stringify rendering will need
  friendlier labels once real content exists (not this task's job).
- `git status` confirms the only new file is `player-wizard-host.js` (plus
  its test) — no changes to `src/systems/`, `src/universes/`, or the still-
  live `player-wizard-core.js`/`-steps.js`/`-data.js`, exactly as scoped.
- Independently reran `npm test`: 99/99 passing, matching the handoff.

No blocking findings. This task is implemented within scope, its tests are
real and non-vacuous, and the review-step design decision is documented and
reasonable. Ready for human acceptance. TASK-030 can proceed against this
host.

## Human acceptance

Pending.
