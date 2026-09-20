# CONTRACT-001: Composable character-creation wizard

Status: Retired — superseded by CONTRACT-002
Approved by: Patrick
Approved date: 2026-09-19
Retired date: 2026-09-19
Related tasks: TASK-026 (this contract is TASK-026's deliverable).

**Retired**: this contract's Interfaces section placed each system's/universe's
`steps` array directly inside the server-side CommonJS manifest
(`src/systems/<id>/index.js` / `src/universes/<id>/index.js`) with no path for
the browser-side wizard — which runs as native ES modules with no build
pipeline, per ADR-001 — to ever load those functions. TASK-030 and TASK-031
implemented against this contract successfully (their step logic is correct
and reusable), but TASK-032 could not wire a real browser wizard to it and
correctly stopped rather than guessing at an unapproved architecture change.
See CONTRACT-002 for the corrected Interfaces section; everything else in
this contract carries forward unchanged. Left in place as a historical record
per this repository's contract-retirement convention
(`docs/contracts/README.md`) — do not implement against this file.

## Purpose

Character creation is currently one fixed, hand-written 6-step wizard
(`public/js/player/player-wizard-core.js`, `player-wizard-steps.js`,
`player-wizard-data.js`) built entirely around the `dnd5e` system and `amber`
universe, with no seam for a different system, a different universe, or no
universe at all. This contract specifies how the wizard is composed from
independent **System-contributed steps** and **Universe-contributed steps**
for whatever system/universe a campaign has selected (per
`src/systems/registry.js` / `src/universes/registry.js`), so that adding a
new system or universe (per ADR-005's code-defined-plugin model) does not
require rewriting the wizard.

This is a design contract, not an implementation. Per this repository's
process, an implementation task is created and separately approved once this
contract itself is accepted.

## Scope

### Included

- How a campaign's selected system and universe each contribute one or more
  named steps to one composed wizard flow.
- How step ordering is determined for a given system/universe pairing.
- How each step's collected data is routed to its correct destination
  (universal `characters` columns, the system's extension document, or the
  universe's extension document — the same three-way split
  `src/routes/characters/index.js` already performs on `POST`/`PUT`).
- How the wizard behaves when a campaign has a system but **no** universe
  (homebrew).
- The specific worked decomposition of the *existing* `dnd5e` + `amber`
  wizard into this model, since it must keep working unchanged.
- Where today's cross-cutting logic (Amber's imprint/order-chaos values
  currently influencing D&D class *recommendations* — `getRecommendedClasses`,
  `classGateStatus`, `calcAmberMods` in `player-wizard-core.js`) belongs under
  this model.

### Excluded

- Writing the actual composed-wizard implementation (a follow-up task).
- Relocating `player-wizard-data.js`'s content storage — TASK-025 already
  moved Amber's flavor content to `src/universes/amber/content/`, served via
  `/api/universe/content/wizard`; this contract only concerns how steps built
  from that content (and the equivalent future system-owned content) compose
  into one flow, not where content bytes live.
- A second real system or universe wizard (no FASERIP or homebrew wizard is
  built here) — the worked example is `dnd5e`+`amber`; the one edge case
  considered is `dnd5e` with no universe.
- Any change to `src/systems/dnd5e/` or `src/universes/amber/`'s existing
  server-side manifests beyond what a step contribution requires them to
  expose.

## Actors

- **Player**, creating a character within a specific campaign (which fixes
  the system and universe for the whole wizard session).
- **System module** (`src/systems/<id>/`), contributing steps that collect
  system-owned character data (e.g. ability-score assignment, class
  selection, D&D-specific fields).
- **Universe module** (`src/universes/<id>/`), contributing steps that
  collect universe-owned character data (e.g. Amber's Order/Chaos, blood
  purity, imprint) and this task's proposed **advisory** hooks (see Required
  behavior).
- **Wizard host** (the browser-side orchestrator, successor to
  `player-wizard-core.js`), which has no built-in knowledge of any specific
  system or universe — it only knows how to sequence and render whatever
  steps the active campaign's system and universe modules contribute.

## Inputs and outputs

- **Input**: the active campaign's `system_id`/`universe_id` (already
  resolvable via `getSystemForCampaign`/`getUniverseForCampaign`), and each
  contributed step's own render/validate/collect functions.
- **Output**: one `POST /api/characters` (and, for edits, `PUT /api/characters/:id`)
  request body containing exactly the fields each step collected — no
  change to those endpoints' existing three-way field-ownership split
  (`UNIVERSAL_CHARACTER_UPDATE_FIELDS`, `system.sheet.fields`,
  `universe.character.fields`).

## Preconditions

- The player's active campaign (`req.campaign` server-side; the client's
  loaded campaign context) has a resolvable system, per
  `src/systems/registry.js`. A universe is optional (`getUniverseForCampaign`
  already returns `undefined` for a homebrew campaign, per TASK-025).
- The system's and universe's contributed step definitions are loaded before
  the wizard opens (client-side; today's `player-wizard-data.js` pattern of
  fetching universe content up front, per TASK-025, generalizes directly).

## Required behavior

**Step contribution.** A system module exports an ordered list of step
definitions under a new `steps` key (parallel to its existing `sheet`/`dice`/
`pdfExport` keys), and a universe module exports the same shape under its own
`steps` key. Each step definition is `{ id, title, render(container, wizardState), validate(wizardState), collect(wizardState) -> fieldsObject }` — deliberately the same shape for both axes, so the wizard host treats a system step and a universe step identically; only which module contributed it differs.

**Step ordering.** The wizard host builds its step sequence by concatenating
`system.steps` and `universe.steps` (universe steps omitted entirely when no
universe is selected), ordered by an explicit numeric `order` field each step
declares (not by declaration order or module axis) — this lets a system or
universe interleave its steps around the other axis's steps where that
produces a better flow (e.g. Amber's identity/backstory step ordering before
D&D's ability-score step, matching the *current* wizard's step 1→2→3
sequence), without the wizard host needing to know why.

**Data routing.** Each step's `collect()` returns a plain object of field →
value pairs; the wizard host does not interpret these fields itself. On
submission, the host merges every step's collected object and sends it as
one request body — the existing server-side split (universal vs.
`system.sheet.fields` vs. `universe.character.fields`, already implemented in
`characters/index.js`) does the actual routing, exactly as it does for
regular edits today. The wizard does not need its own copy of that
three-way split logic.

**No universe selected.** When `getUniverseForCampaign` returns nothing, the
host renders only `system.steps` — the wizard functionally degrades to
"assign ability scores, pick a class," with no lore-flavor steps and no
advisory panel (see below). This must not error or render an empty step;
the system's own steps must be able to stand alone (this is already true of
today's D&D ability-score/class steps considered in isolation).

**Advisory hooks (resolving the cross-cutting logic problem).** Today's
`getRecommendedClasses`/`classGateStatus`/`calcAmberMods` mix Amber's
imprint/order-chaos values directly into the D&D class step's own rendering
(highlighting recommended classes, computing final stat modifiers before the
class step runs). This contract's recommendation: **do not let a universe
modify a system step's internals.** That would recreate exactly the
cross-plugin coupling ADR-005 is trying to eliminate — a system would need
bespoke extension points for arbitrary universes to reach into, and a
universe would need to know a specific system's internal render logic.
Instead, a universe may contribute an **advisory step** that runs
immediately before or after a named system step (declared via a
`relativeTo: { step: 'system:dnd5e:class-selection', position: 'before' }`
field) and reads the wizard's already-collected state (e.g. the universe's
own imprint/order-chaos choices from its earlier steps) to render *read-only
guidance* ("characters with your imprint often lean toward: Cleric, Druid,
Wizard") alongside the system's own class step, rather than altering that
step's own options or highlighting logic. The system step's own gating logic
(minimum-stat soft gates) is unaffected by universe input under this model —
it already only depends on the system-owned ability scores.

This is flagged as an **open question** below since it's a real, visible UX
change from today's inline-highlighted recommendation — worth the human's
explicit sign-off rather than deciding silently.

## Postconditions and invariants

- A completed wizard submission produces exactly the same server-side result
  as today's manual character-creation/edit path: universal fields written to
  `characters`, system fields written to the system's extension document,
  universe fields (if any) written to the universe's extension document.
- Removing a universe from a campaign (hypothetically) must not require any
  system step to change; removing/replacing a system must not require any
  universe step to change. Steps from one axis never read the other axis's
  internal state directly — only the shared `wizardState` object built from
  already-collected step outputs, and only through the declared advisory
  mechanism.
- The existing `dnd5e`+`amber` wizard's player-visible flow (six steps,
  same fields collected, same validation messages) is unchanged after this
  model is implemented — this contract is a re-composition of existing
  behavior, not a redesign of it.

## Failure behavior

- A step whose `validate()` returns a message blocks advancing, exactly as
  `wizardValidateStep` does today — no change to per-step validation UX.
- If a system module declares zero steps (misconfigured), the wizard cannot
  proceed past character identity — this should surface as a clear error
  rather than a silent empty step, since every real system must own at least
  the ability-score/class-equivalent steps.
- If an advisory step's `relativeTo` target step doesn't exist in the active
  system (e.g. a universe written expecting `dnd5e` is paired with a
  different system that has no equivalent step), the advisory step is simply
  omitted rather than erroring — advisory content is optional guidance, not
  load-bearing.

## Interfaces

- System module addition: `system.steps` (array, shape above) alongside the
  existing `sheet`/`dice`/`derivedStats`/`pdfExport`/`conversionRenderer` keys
  in `src/systems/<id>/index.js`.
- Universe module addition: `universe.steps` (same shape) alongside the
  existing `character`/`shadows`/`seed`/`content` keys in
  `src/universes/<id>/index.js`.
- No change to `POST /api/characters` / `PUT /api/characters/:id` request or
  response shape — the wizard is purely a client-side composition of what
  already gets sent to those endpoints today.

## UX expectations

- Consistent with ADR-001 (no build pipeline, static HTML + ES modules): step
  definitions are plain JS objects with functions, not a templating DSL.
- The step counter, back/next controls, and modal chrome
  (`player-wizard-core.js`'s existing `wizardRenderStep`/`wizardNext`/
  `wizardBack`) are host concerns, unaffected by how many steps a given
  system/universe pairing contributes — the host must handle a variable
  step count, not the hardcoded "Step X of 6" it has today.
- Advisory panels (if the open question below is resolved in favor of them)
  render additively — never replace or disable a system step's own controls.

## Validation requirements

- A follow-up implementation task must prove the `dnd5e`+`amber` worked
  example produces byte-identical `POST /api/characters` request bodies
  (field-for-field) to today's wizard for the same user inputs, and must
  include an automated test simulating a `dnd5e`-with-no-universe campaign
  producing a valid character with none of Amber's fields present.

## Open questions

Resolved by Patrick, 2026-09-19:

1. **Advisory-hook UX change**: **resolved — read-only advisory panel is
   acceptable.** The contract's recommendation stands as written; no inline
   highlighting mechanism is needed.
2. **Step `order` authority**: **resolved — first-come-first-served on
   ties, for now.** Per-module numeric declaration is sufficient; no
   pairing-level override mechanism is being added at this time. Revisit if
   a real system+universe pairing surfaces a conflict neither module alone
   can resolve.
3. **Minimum system contract**: **resolved — "at least one step" is
   sufficient.** No enforced minimum step composition (e.g. no required
   identity/core-stat step split); quality of a system's step contribution
   is left to whoever builds it.
