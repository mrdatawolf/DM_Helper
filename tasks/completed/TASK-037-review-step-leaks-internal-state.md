# TASK-037: Review step leaks internal bookkeeping state to the player

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002. No amendment needed — resolved as a host
construction-time option, not a step-shape change (see Open questions).
Related ADRs: ADR-005.
Dependencies: TASK-029 (`createReviewStep()` in
`public/js/player/player-wizard-host.js`), TASK-032
(`filterWizardPayload` in `public/js/player/player-wizard-integration.js`,
the logic this task needs to reuse).

**Recommend prioritizing this above TASK-033–036** — those are UX
improvements with open design questions; this is closer to a plain
data-exposure bug with an obvious minimal fix.

## Desired outcome

The final review step shows the player a readable summary of the character
they're about to create — not a raw dump of every field in shared wizard
state, including host-internal bookkeeping that was never meant to be
player-facing.

## Context

Discovered during manual browser testing of TASK-032's cut-over wizard
(2026-09-19, Patrick): the review step (step 9) rendered a raw JSON dump
including a `shadows` field containing the **entire fetched shadow list for
the campaign** — every shadow's id, full description, order/chaos/dream
levels, `is_spoiler` flag, timestamps, everything — verbatim as a giant JSON
string, plus `abilityScoreModifiers` (e.g. `{"STR":0,"DEX":0,"CON":1,...}`)
shown as another raw field. Neither of these will actually be submitted to
`POST /api/characters` — `player-wizard-integration.js`'s
`filterWizardPayload()` already correctly excludes them via its field
allow-lists — but `createReviewStep()` in
`public/js/player/player-wizard-host.js` renders `Object.entries(wizardState)`
directly, with no awareness that `wizardState` also carries host-only
scratch data (`shadows`, used only to populate the shadow-origin dropdown)
and step-internal bookkeeping (`abilityScoreModifiers`, the shared-state key
CONTRACT-002 formalized for cross-step ability-score computation) alongside
the actual character fields.

This was flagged as a real possibility during TASK-032's own review ("this
key will appear in the host's generic review-step dump... worth a one-line
cleanup") but under-scoped there — it was assessed as one small stray key,
not a full-database-sized dump. It took a human actually looking at the
rendered page to see how bad it is in practice.

## Scope

### Included (exact plan to be refined at approval time, but the shape is
clear enough to sketch now, unlike TASK-033–036)

- The review step must only display fields that will actually be part of
  the submission — i.e. the same set `filterWizardPayload()` already
  computes. This likely means either: (a) the review step calls the same
  filtering function (requires making it available to
  `player-wizard-host.js`, or passing a pre-filtered view into the host
  instead of raw `wizardState`), or (b) steps that write host/bookkeeping
  keys onto `wizardState` (`shadows`, `abilityScoreModifiers`) do so under a
  namespaced/reserved key the generic review step knows to skip (e.g. a
  leading underscore or a documented reserved-keys list) rather than the
  review step needing to know the full server-side field allow-lists
  itself. Implementer's/reviewer's call which is cleaner; document the
  choice.
- Human-readable field labels (e.g. "Blood Purity" not `blood_purity`) and
  value formatting (e.g. join `amber_traits` as a comma list, not a raw JSON
  array string) instead of `JSON.stringify`/raw key names.
- Keep the review step's core contract unchanged: still host-owned, still
  generic (doesn't need per-field knowledge of *meaning*, just needs to stop
  showing fields nothing will ever submit).

### Excluded

- No change to what fields actually get submitted — this is a display-only
  fix. `filterWizardPayload()`'s own field lists are correct today.
- Rich formatting/theming of the review page beyond readable labels and
  clean value rendering — this is a correctness fix, not a visual redesign.

## Open questions

Resolved 2026-09-19 (Claude, technical call — no real design ambiguity):
reuse `filterWizardPayload` rather than inventing a parallel reserved-key
convention. It already exists, is already tested, and is the single source
of truth for "what actually gets submitted" — a separate convention would
just be a second place this logic could drift from the first. This does not
need a CONTRACT-002 change: it's an optional construction-time input to
`createWizardHost()` (a host implementation detail), not a change to the
step shape every system/universe author needs to know about.

Concretely: `createWizardHost()` accepts an optional
`filterForReview(wizardState) -> fieldsObject` function. When absent (e.g.
TASK-029's own fixture-based tests), the review step falls back to today's
plain field dump, so existing host tests don't need to inject a filter to
keep passing. `player-wizard.js` passes
`state => filterWizardPayload(state, activeCampaign, activeSystemContent)`
when constructing the real host.

## Plan

1. Add the optional `filterForReview` input to `createWizardHost()`; have
   `createReviewStep()` use it when present, falling back to the current
   full dump when absent.
2. Wire `player-wizard.js` to pass `filterWizardPayload` bound to the active
   campaign/system content.
3. Add human-readable label/value formatting to the review rendering (title
   the field name, join arrays as comma lists, etc.) — this applies
   regardless of whether the fixture fallback or the real filter is active.
4. Update `tests/player-wizard-host.test.js`'s fixture-based review test
   (add a case exercising `filterForReview`) and
   `tests/player-wizard-integration.test.js`'s real-data review assertions.
5. `npm test`; manual browser check that the review step no longer shows
   `shadows`/`abilityScoreModifiers` or any other non-submitted field.

## Acceptance criteria

- [ ] `createWizardHost()` accepts an optional `filterForReview` function;
      the real wizard passes `filterWizardPayload` bound to the active
      campaign/system content.
- [ ] The review step never displays `shadows`, `abilityScoreModifiers`, or
      any other field that isn't part of the actual `POST /api/characters`
      submission, when a filter is supplied.
- [ ] Existing fixture-based host tests (no filter supplied) still pass
      unchanged against the fallback full-dump behavior.
- [ ] Field labels and values are human-readable, not raw keys/JSON.
- [ ] `npm test` passes, including updated review-step coverage.

## Validation requirements

- `npm test`.
- Manual browser verification of the review step for a `dnd5e`+`amber`
  character, confirming no internal state is visible.

## Risks and assumptions

- This bug exists in the code as already reviewed and accepted (TASK-029,
  TASK-032) — worth a quick note in each of those tasks' records once this
  is fixed, since it's a real defect in work already marked accepted, not
  new scope creep.

## Blocker

None — awaiting a quick design call (see Open questions) and approval, not
implementation-blocked.

## Implementation handoff

### Changes made

- Added the optional `filterForReview(wizardState)` construction input to
  `createWizardHost()` and passed it to the host-owned review step. When it is
  absent, the review still iterates the complete `wizardState` object.
- Wired the real player wizard to filter the review with
  `filterWizardPayload(wizardState, activeCampaign, activeSystemContent)`, so
  the displayed fields now match the eventual submission payload without
  changing submission behavior.
- Made generic review labels and values readable: snake/camel-case field names
  become title-cased labels, arrays become comma-separated lists, booleans
  become Yes/No, and null/undefined values become an em dash instead of raw
  JSON output.
- Added host fixture coverage for filtered review rendering and integrated
  D&D 5e + Amber assertions proving `shadows` and
  `abilityScoreModifiers` are absent from the rendered review.

### Validation performed

- `node --test tests/player-wizard-host.test.js tests/player-wizard-integration.test.js`
  — passed, 10/10.
- `npm test` — passed, 114/114.
- `git diff --check` — passed; only pre-existing line-ending conversion
  warnings were reported for unrelated files.
- No real browser was available in this implementation environment, so the
  required manual D&D 5e + Amber review-step verification was not performed
  and is not claimed as tested.

### Assumptions and deviations

- The approved `filterForReview` plan was implemented without deviation. The
  filter remains optional so synthetic/fixture hosts retain the full-state
  fallback, while readable formatting applies to both filtered and unfiltered
  review output as required.
- No submission allowlists or payload construction behavior were changed.

### Unresolved risks

- A reviewer or human should perform the required real-browser D&D 5e + Amber
  character-creation walkthrough and confirm the final review contains no
  internal state. Automated jsdom coverage verifies the same filtering and
  rendering path but is not a substitute for that manual check.

### Documentation updated

- Updated this task's implementation handoff. No contract, ADR, or other
  durable documentation changes were needed because the implementation follows
  the approved task plan and CONTRACT-002 without changing the step contract.

## Review

Reviewer: Claude
Date: 2026-09-19

- Read `createReviewStep`/`createWizardHost` in full: `filterForReview` is an
  optional constructor input, defaulting to `undefined`, in which case
  `render()` falls back to iterating raw `wizardState` — confirmed the
  fixture-based tests in `tests/player-wizard-host.test.js` that don't pass
  it still exercise (and pass) that exact fallback path, satisfying the
  task's explicit backward-compatibility requirement.
- `reviewLabel`/`reviewValue` are genuinely good, went beyond the minimum:
  camelCase/snake_case → Title Case, arrays joined as comma lists (including
  recursively formatting array-of-objects like `amber_flaws`), booleans as
  Yes/No, `null`/`undefined` as an em dash rather than blank. This is a real
  readability improvement, not just "stop showing raw JSON."
- Confirmed `player-wizard.js` passes
  `filterForReview: wizardState => filterWizardPayload(wizardState, activeCampaign, activeSystemContent)`
  — the real wizard now reviews exactly what it will submit.
- Read the new integration test: it renders the real review step through the
  real filter and asserts both that real fields appear (`Blood PurityPure`,
  `Amber Flaws`) and that the two leaking keys from the bug report are gone
  (`assert.doesNotMatch(review, /abilityScoreModifiers|Ability Score Modifiers|shadows|Shadows/)`)
  — a direct, non-vacuous regression test for the exact bug Patrick found.
- Independently reran `npm test`: 114/114 passing, matching the handoff.

No blocking findings. This closes the data-leak cleanly with real regression
coverage. Ready for human acceptance — manual browser confirmation is still
the one open item, same as the rest of this batch.

## Human acceptance

Pending.
