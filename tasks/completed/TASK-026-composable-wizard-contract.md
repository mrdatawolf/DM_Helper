# TASK-026: Design contract for a composable character-creation wizard

Owner role: Contract Designer
Assigned agent: Claude
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: This task's deliverable is a new contract
(CONTRACT-NNN, next available number), not an implementation of one.
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins) — explicitly flags this as needing its own contract before
implementation: "Composing the character-creation wizard from independent
system and universe step contributions is the least-precedented design in
this decision... will likely need a design spike or contract of its own
before implementation, rather than following an existing pattern."
Dependencies: TASK-024 (system plugin mechanism must exist to know what a
system step contributes); TASK-025 (universe plugin mechanism must exist to
know what a universe step contributes).

## Desired outcome

A written, reviewed contract (`docs/contracts/CONTRACT-NNN-...md`) that
specifies how the character-creation wizard is composed from independent
System-contributed steps and Universe-contributed steps for an arbitrary
system×universe pairing — inputs/outputs, step ordering, what happens when a
system and universe both want to influence the same underlying field (e.g.
both contribute flavor text for "race"), and failure/edge-case behavior (a
universe with no matching content for a step the system requires, a campaign
with no universe at all). This task does **not** implement the wizard —
implementation is a follow-up task created after this contract is approved,
per this project's contract → implementation split
(`docs/roles/contract-designer.md`, `docs/AI_DEVELOPMENT_SYSTEM.md`).

## Context

Today's wizard (`public/js/player/player-wizard-core.js`,
`player-wizard-steps.js`, `player-wizard-data.js`) is a single fixed script:
one linear sequence of steps, entirely Amber-specific content
(`player-wizard-data.js`'s 368 lines of hardcoded Amber narrative — race
flavor, Pattern/Corwin/Logrus imprint choices, Order/Chaos flavor — see
lines 26-268 for representative examples). There is no notion of "a step
contributed by the system" versus "a step contributed by the universe" — it's
one undifferentiated flow.

Under ADR-005, System and Universe are fully independent axes. A wizard for a
`dnd5e` + `amber` campaign needs mechanical steps from the system (ability
scores, class/role selection appropriate to that system) interleaved with
lore steps from the universe (Amber's imprint choices, race flavor,
Order/Chaos). A different system×universe pairing (say, a future
`faserip` + no-universe campaign) needs a wizard built from a completely
different set of contributed steps, with no Amber content at all. Nothing in
the current codebase composes a UI flow from two independent plugin sources
like this — it is explicitly the least-precedented piece of the whole ADR-005
initiative, which is why ADR-005 calls for a contract rather than proceeding
straight to implementation the way the more mechanical schema/extraction
tasks can.

TASK-024 and TASK-025 will have established what a system plugin and a
universe plugin each look like structurally (`src/systems/dnd5e/`,
`src/universes/amber/`) — this task's contract should build on their actual
shape, not a hypothetical one, which is why it depends on both.

## Scope

### Included

- A written contract, per `docs/contracts/TEMPLATE.md`, covering:
  - **Purpose/Actors**: who initiates wizard composition (a player starting
    character creation within a specific campaign) and what determines which
    steps appear (the campaign's `system_id`/`universe_id`).
  - **Inputs and outputs**: what a system plugin and a universe plugin each
    contribute as a "step" (data shape — content, validation, the field(s) it
    writes to), and what the composed wizard produces (a character record
    split correctly across universal fields, `system:*` extension data, and
    `universe:*` extension data).
  - **Required behavior**: step ordering rules (e.g. system steps first, then
    universe steps, or interleaved by a declared priority — this is the
    contract's central design decision), and how a step from one axis
    referencing/depending on a choice made in a step from the other axis is
    handled, if at all.
  - **Postconditions and invariants**: the resulting character is valid
    per both the chosen system's and universe's expectations.
  - **Failure behavior**: a universe with no content for a step the system
    expects (e.g. no race/species flavor defined), a campaign with a system
    but no universe (homebrew), and what a "minimal viable wizard" looks like
    in that case.
  - **UX expectations**: consistent with this app's existing static-HTML +
    vanilla-JS, no-framework, no-bundler approach (ADR-001) — the contract
    should not presume a rewrite of the frontend stack.
- Explicitly out of scope for the contract itself: writing the actual
  implementation. The contract's own "Related tasks" field, once approved,
  should note the follow-up implementation task to be created.

### Excluded

- No code changes of any kind — this task produces a markdown contract only.
- No change to `player-wizard-data.js`'s actual Amber content (that's
  TASK-025's job to relocate; this task only specifies how such content gets
  *composed* into a flow, not where it physically lives).
- Does not commit to a specific UI framework or rewrite of the existing
  wizard's rendering approach beyond what's needed to support composition.

## Plan

1. Read TASK-024's and TASK-025's actual implementation output (once
   completed) to ground the contract in the real shape of `src/systems/
   dnd5e/` and `src/universes/amber/`, rather than designing against ADR-005's
   description alone.
2. Draft the contract covering the sections in Scope → Included.
3. Identify at least one concrete worked example (the existing `dnd5e` +
   `amber` pairing) and one edge case (a hypothetical system with no universe)
   to sanity-check the design handles both without contradiction.
4. Surface open questions the contract can't resolve on its own (e.g. exact
   step-ordering policy, whether steps can be conditionally skipped) in the
   contract's "Open questions" section for human decision, rather than
   guessing.

## Acceptance criteria

- [x] A new `docs/contracts/CONTRACT-NNN-...md` exists, following
      `docs/contracts/TEMPLATE.md`'s structure.
- [x] The contract specifies step contribution, ordering, and composition
      rules concretely enough that an implementer could build the wizard from
      it without re-deriving the design.
- [x] The contract addresses at least the `dnd5e`+`amber` worked example and
      one no-universe edge case.
- [x] Genuine open questions are explicitly listed rather than silently
      resolved by assumption.
- [x] No code is changed as part of this task.

## Validation requirements

- Human/architect review of the contract for internal consistency and
  alignment with ADR-005 before it moves toward acceptance — this is a
  design-review validation, not a test-suite validation, since no code is
  produced.

## Risks and assumptions

- This task assumes TASK-024 and TASK-025 are complete (or far enough along)
  to ground the contract in real plugin shapes rather than speculation — if
  approved and started before those land, treat their ADR-005 descriptions as
  the best available stand-in and flag anywhere the eventual real shape might
  force a contract revision.
- The step-ordering/composition design is a genuine open design problem, not
  a known pattern — expect this contract to need at least one round of
  human feedback before it's ready to implement against.

## Blocker

Resolved 2026-09-13: both TASK-024 and TASK-025 landed (reviewed and
accepted) before this contract was finalized, so it's grounded in the real
`src/systems/dnd5e/` and `src/universes/amber/` shapes, not speculation.

## Implementation handoff

Implemented by: Claude
Date: 2026-09-13

### Changes made

- Added `docs/contracts/CONTRACT-001-composable-character-wizard.md`,
  grounded in the actual current code: read `src/systems/dnd5e/index.js`,
  `src/universes/amber/index.js`, both registries, and the full existing
  wizard (`player-wizard-core.js`/`player-wizard-steps.js`/
  `player-wizard-data.js`) rather than designing from ADR-005's description
  alone.
- The contract's central finding: today's wizard has genuine cross-cutting
  logic (`getRecommendedClasses`/`classGateStatus`/`calcAmberMods` let
  Amber's imprint/order-chaos directly influence the D&D class step's own
  rendering) that a naive "independent step list" model can't represent
  without recreating system/universe coupling. The contract proposes
  resolving this with an **advisory-hook** mechanism (a universe step can
  render read-only guidance adjacent to a named system step via a
  `relativeTo` declaration, without altering that step's own options or
  logic) rather than letting either axis reach into the other's internals.
- Worked the `dnd5e`+`amber` pairing and a `dnd5e`-with-no-universe edge case
  through the proposed model per the task's own requirement.
- Recorded three genuine open questions rather than deciding them
  unilaterally: whether the advisory-hook UX change (recommendations move
  from inline highlighting to a separate panel) is acceptable, whether step
  ordering ever needs pairing-level overrides beyond per-module declaration,
  and whether a minimum step contract should be enforced on every system
  module.

### Validation performed

- Per this task's own Validation requirements, this is a design-review
  validation, not a test-suite one: the contract was checked for internal
  consistency (every Required behavior traces to a concrete file/function in
  the current codebase) and for not silently resolving the three open
  questions it explicitly surfaces instead.
- No code was changed; `npm test` is unaffected by this task.

### Assumptions and design calls

- Recommended (not silently decided) that universe steps must not reach into
  system step internals, since that's the coupling ADR-005's whole
  system/universe split exists to avoid — flagged as open question 1 given
  it changes today's visible recommendation UX.

### Unresolved risks

- None beyond the three explicitly recorded open questions, which need your
  read before a follow-up implementation task is created.

### Documentation updated

- Added `docs/contracts/CONTRACT-001-composable-character-wizard.md`. No
  other document changed.

## Review

Not applicable in the usual code-review sense — this task's own Validation
requirements route directly to your review of the contract itself (and
particularly its three open questions) rather than a separate independent
code-review pass, since no code was produced.

## Human acceptance

Pending.
