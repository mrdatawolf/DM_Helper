# TASK-036: Conditionally-skippable steps with review footnotes

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002. **Amended 2026-09-19** (Patrick, approved)
to add optional `shouldSkip`/`footnote` fields to the step shape — see
CONTRACT-002's "Amendments" section and its Required Behavior's
"Conditionally skippable steps" paragraph. Implement against the amended
contract as written; no further contract change needed for this task.
Related ADRs: ADR-005.
Dependencies: TASK-029 (host — the step-assembly/navigation logic this
changes), TASK-031 (`trumpArtistStep`, the concrete motivating case).
Related tasks: TASK-034 (review-step/info-panel chrome work — footnote
rendering plausibly lands in the same area of the host).

## Desired outcome

A step that has nothing for the player to actually do, given what's already
been collected earlier in the wizard, doesn't consume a full step of its
own — it's skipped, and (if there's something worth telling the player)
surfaces as a short footnote on the final review step instead.

## Context

Discovered during manual browser testing of TASK-032's cut-over wizard
(2026-09-19, Patrick): the Trump Artist step (`universe:amber:trump-artist`,
`src/universes/amber/wizard-steps.js`... now relocated to
`public/js/universes/amber/wizard-steps.js` per TASK-032) always occupies
its own step, whether or not the player is eligible. When ineligible, the
step's `render()` shows only a static "Trump Artist not eligible" message
with zero interactive elements — a step the player must click through with
literally nothing to decide. Patrick's framing: "it should only be a step to
go thru when it could actually be done" — when it can't, the outcome belongs
as a footnote on the review step, not a step of its own.

This can't be fixed inside `trumpArtistStep` alone. TASK-029's host
(`public/js/player/player-wizard-host.js`) assembles its full ordered step
list once, at wizard creation, via `assembleWizardSteps(systemSteps, universeSteps)`
— before the player has entered any data. Trump Artist eligibility depends
on `effectiveScores()`, which isn't known until the ability-score step
(order 30, earlier in sequence) has actually been collected. So "should this
step exist at all" can only be answered *during* the wizard session, not at
assembly time — the host's current model has no concept of a step that
decides, when reached, whether it has anything to show.

## Scope

### Included

- In `public/js/player/player-wizard-host.js`: honor an optional
  `shouldSkip(wizardState) -> boolean` on a step definition. Check it
  immediately before a step would be shown, in both `next()` and `back()`
  — if true, continue advancing/retreating past it without requiring a
  player action, so a skipped step is never landed on in either direction
  (re-evaluate at the moment of navigation, not cached, since eligibility
  can depend on state that changes if the player backs up and changes an
  earlier answer).
- Honor an optional `footnote(wizardState) -> string|null` on every step
  (skipped or not), collected by the host and made available to
  `host:review`. `host:review` renders any non-null footnotes as a distinct
  "Notes" section, separate from its plain field summary — this task
  implements that distinct section; it does not need to wait for TASK-034's
  broader info-panel redesign, which is a different part of the UI (a
  side panel during data entry, not the final summary).
- Update `trumpArtistStep`
  (`public/js/universes/amber/wizard-steps.js`) to declare `shouldSkip`
  (true when `!isTrumpEligible(...)`) and `footnote` (a message like "Not
  eligible for Trump Artist (DEX+WIS 28, INT+WIS 27; threshold 30)" when
  skipped, `null` otherwise). Its interactive behavior when eligible is
  unchanged.
- Update `tests/player-wizard-host.test.js` (fixture-based `shouldSkip`/
  `footnote` coverage in both navigation directions),
  `tests/amber-wizard-steps.test.js` (both eligible and ineligible
  `trumpArtistStep` paths), and `tests/player-wizard-integration.test.js`
  (the real end-to-end skipped-and-footnoted path).

### Excluded

- No change to `isTrumpEligible()`'s threshold logic itself.
- Retrofitting this mechanism onto other steps preemptively — apply it to
  `trumpArtistStep` as the concrete case; a future step can adopt the same
  mechanism once it exists.
- TASK-034's info-panel redesign — unrelated part of the UI, not a
  dependency in either direction.

## Plan

1. Add `shouldSkip` handling to the host's `next()`/`back()` navigation,
   re-evaluated at each navigation call, not cached at assembly time.
2. Add `footnote` collection to the host and a distinct "Notes" rendering
   section on `host:review`.
3. Update `trumpArtistStep` to declare both.
4. Update the three test files listed in Scope.
5. `npm test`; manual browser check that an ineligible Trump Artist
   character skips straight from class-selection to review with the
   footnote visible, and an eligible one still sees the interactive step.

## Acceptance criteria

- [ ] A step declaring `shouldSkip(wizardState) => true` is never shown to
      the player in either navigation direction; re-evaluated live, not
      cached.
- [ ] A step's `footnote(wizardState)` (skipped or not) appears in a
      distinct "Notes" section on the review step when non-null.
- [ ] `trumpArtistStep` skips with a footnote when ineligible, and behaves
      exactly as before (interactive, no footnote) when eligible.
- [ ] `tests/player-wizard-host.test.js`, `tests/amber-wizard-steps.test.js`,
      and `tests/player-wizard-integration.test.js` cover both paths and
      pass.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new skip/footnote coverage in both directions.
- Manual browser verification of both the eligible and ineligible Trump
  Artist paths.

## Risks and assumptions

- `shouldSkip` must be re-evaluated on every navigation call (not decided
  once at assembly time) since eligibility depends on ability scores that
  could change if a player backs up past the ability-score step and
  re-assigns them — get this right, since a stale cached skip decision
  would be a subtle, hard-to-notice bug.

## Blocker

None.

## Implementation handoff

### Changes made

- Extended the wizard host step shape and validation for optional `shouldSkip`
  and `footnote` functions.
- Added live skip evaluation while rendering and on every forward/backward
  navigation, including the first-step boundary, so skipped steps are never
  landed on.
- Added review-time footnote collection across all contributed steps and a
  distinct `Notes` heading/list after the existing `filterForReview` field
  summary.
- Added `trumpArtistStep.shouldSkip` and `trumpArtistStep.footnote` using the
  existing effective-score eligibility calculation; its eligible render,
  interaction, validation, and collection behavior remain unchanged.
- Added host fixture coverage, Amber eligible/ineligible coverage, and the real
  dynamic-import integration path for an ineligible skipped Trump Artist step
  with its review note.

### Validation performed

- `npm test`: passed, 116 tests, 0 failures.
- The three task-specific suites are included in that run and cover live
  forward/backward skip re-evaluation, an initially skipped step, distinct
  review notes, both Trump Artist eligibility paths, and the integrated
  skipped-and-footnoted flow.
- No real browser was available, so the requested manual browser verification
  was not performed.

### Assumptions and deviations

- A skipped step is not validated or collected, matching the contract's
  statement that it behaves as if it did not exist for the session. Therefore
  the ineligible integrated payload omits `trump_artist`; the existing server
  default preserves the same stored false/zero outcome.
- No implementation deviation from the approved scope or plan.

### Unresolved risks

- Eligible and ineligible DOM behavior is covered through JSDOM, but visual
  presentation and interaction in a real browser remain manually unverified.

### Documentation updated

- Updated the host's `WizardStep` JSDoc for the two amended optional fields.
- Recorded this implementation handoff in TASK-036. No contract or other
  durable documentation changes were required because CONTRACT-002 was already
  amended for this behavior.

## Review

Reviewer: Claude
Date: 2026-09-19

- Read `player-wizard-host.js`'s `next()`/`back()`/`render()` in full: skip
  evaluation happens via a `while` loop checked at the *current* index each
  time, re-reading `wizardState` live — not decided once at assembly or
  cached anywhere. `next()` re-checks *after* merging the just-collected
  step's fields, so a step's own answer can affect whether the very next
  step is skipped. `back()` walks backward past skipped steps the same way,
  with a safe (non-crashing) fallback if every prior step happens to be
  skippable.
- **The critical live-re-evaluation requirement is proven, not just
  asserted**: `tests/player-wizard-host.test.js`'s new test sets
  `wizardState.skipConditional = true`, confirms the conditional step is
  skipped, then *mutates `wizardState` mid-session* (simulating a player
  backing up and changing an earlier answer) and confirms `next()` now lands
  on that same step since `shouldSkip` re-evaluates live — this is exactly
  the scenario the task's own Risk section warned was easy to get wrong via
  a stale cached decision, and it's genuinely tested, not assumed.
- Footnotes: `contributedSteps.map(step => step.footnote?.(wizardState))`
  runs for every step regardless of skip state, filtered for non-null, and
  rendered in a separate `<h3>Notes</h3>`/`<ul>` block after the
  `.wizard-review-fields` list — confirmed via the same test that a skipped
  step's footnote and an always-present step's footnote both appear
  together, and neither appears inside `.wizard-review-fields` itself.
- `trumpArtistStep`: `shouldSkip`/`footnote` added exactly as scoped;
  `render`/`validate`/`collect` for the eligible path are byte-for-byte
  unchanged. Correctly reasoned in the handoff (and independently verified
  by me against `ATTRIBUTE_DEFAULTS`) that an ineligible/skipped run omits
  `trump_artist` from the submitted payload entirely rather than sending an
  explicit `0` — functionally identical, since the server's document
  defaults already fill `trump_artist: 0` for an omitted field.
- Independently reran `npm test`: 116/116 passing, matching the handoff.

No blocking findings. This is careful, well-verified work on the trickiest
part of this batch (live state re-evaluation across bidirectional
navigation). Ready for human acceptance.

## Human acceptance

Pending.
