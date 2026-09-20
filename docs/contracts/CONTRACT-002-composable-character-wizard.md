# CONTRACT-002: Composable character-creation wizard

Status: Accepted
Approved by: Patrick
Approved date: 2026-09-19
Supersedes: CONTRACT-001 (retired 2026-09-19 — its Interfaces section placed
browser-executed step functions in server-side CommonJS manifests with no
delivery path to the browser; TASK-032 discovered this while trying to wire
a real browser wizard to it). Everything below carries CONTRACT-001 forward
except the Interfaces section (corrected) and the additions noted inline as
"discovered during TASK-030/031."
Related tasks: TASK-026 (CONTRACT-001's deliverable, this contract's origin);
TASK-029/030/031 (implemented against CONTRACT-001, still valid under this
contract — see Migration note); TASK-032 (discovered the gap this contract
fixes; its own task file must be revised to reference this contract before
work resumes).
Related ADRs: ADR-001 (native ES modules, no build pipeline — the reason
CONTRACT-001's original Interfaces section didn't work), ADR-005.

## Amendments

**2026-09-19 (Patrick, approved)**: added optional `shouldSkip` and
`footnote` fields to the step shape (see Required Behavior's "Conditionally
skippable steps" and Interfaces), motivated by TASK-036/`trumpArtistStep` —
a step with nothing to do given already-collected state shouldn't consume a
full step of its own. Additive and backward-compatible: existing steps that
don't declare either field are unaffected.

**2026-09-19 (Patrick, approved)**: advisory steps are folded inline into
their `relativeTo` target's own page instead of occupying their own
navigable position (see Required Behavior's revised "Advisory hooks").
Motivated by the class-recommendation advisory step
(`universe:amber:class-advisory`) being a read-only page with nothing to
click through — Patrick's framing: "if it was at the top of step 7 we
wouldn't need a read only step 6." Changes the player-visible step count and
navigation for any campaign using an advisory step; does not change any
step's own `render`/`validate`/`collect` code, which continues to assume it
is the only content on its page.

**2026-09-19 (Patrick, approved)**: added an optional static `info` field to
the step shape (see Required Behavior's "Contextual info panel" and
Interfaces), motivated by TASK-034 — the pre-cutover wizard's docked lore
panel (`Flavor`/`Mechanics`/`Consider`/`In Play`) had no equivalent in the
composed step model and was silently lost at TASK-032's cutover. Scoped to
per-step static content only (no per-field focus-triggered switching, which
the pre-cutover wizard had — deliberately not carried forward, as a
simpler mechanism judged sufficient). Additive and backward-compatible: a
step without `info` shows no panel content, not an error.

## Purpose

Character creation is currently one fixed, hand-written 6-step wizard
(`public/js/player/player-wizard-core.js`, `player-wizard-steps.js`,
`player-wizard-data.js`) built entirely around the `dnd5e` system and `amber`
universe, with no seam for a different system, a different universe, or no
universe at all. This contract specifies how the wizard is composed from
independent **System-contributed steps** and **Universe-contributed steps**
for whatever system/universe a campaign has selected, so that adding a new
system or universe (per ADR-005's code-defined-plugin model) does not require
rewriting the wizard.

This is a design contract, not an implementation. Per this repository's
process, an implementation task is created and separately approved once this
contract itself is accepted.

## Migration note (from CONTRACT-001)

TASK-029 (wizard host), TASK-030 (dnd5e steps), and TASK-031 (Amber steps)
were implemented and reviewed against CONTRACT-001 before this contract
existed. Their actual step logic is correct and does not need to change —
what CONTRACT-001 got wrong was only *where the browser loads that logic
from*. Under this contract:

- TASK-030's `src/systems/dnd5e/wizard-steps.js` and TASK-031's
  `src/universes/amber/wizard-steps.js` are relocated to the browser-loadable
  paths this contract's Interfaces section defines below, with their module
  syntax converted from CommonJS (`require`/`module.exports`) to native ES
  modules (`import`/`export`) — this conversion is mechanical only: their
  render/validate/collect logic, step shape, and every DOM call (which
  already assumes a browser `container`) are unchanged. CommonJS syntax
  itself cannot run in a browser regardless of which APIs it happens to
  call, so this step is required, not optional.
- The `abilityScoreModifiers` shared-state mechanism and the host-owned
  `host:review` step that TASK-029/030/031 designed to fill gaps CONTRACT-001
  left open are carried forward and formalized below, so a future third
  system/universe has a documented interface to build against instead of
  re-discovering them.
- TASK-032 must be revised to implement against this contract instead of
  CONTRACT-001 before work resumes.

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
  currently influencing D&D class *recommendations*) belongs under this
  model.
- **How the browser-facing wizard actually loads each system's/universe's
  real step implementations**, given no build pipeline exists (ADR-001) and
  step definitions contain functions, not serializable data. CONTRACT-001
  omitted this; it is the reason this contract exists.

### Excluded

- Writing the actual composed-wizard implementation (a follow-up task).
- Relocating universe/system *content* (lore text, class tables, field
  labels) — that already lives behind `/api/universe/content/wizard` and
  `/api/system/content/wizard` (TASK-025, TASK-030) and is unaffected by this
  contract; only step *behavior* (render/validate/collect functions) is in
  scope here.
- A second real system or universe wizard (no FASERIP or homebrew wizard is
  built here) — the worked example is `dnd5e`+`amber`; the one edge case
  considered is `dnd5e` with no universe.
- Any change to `src/systems/dnd5e/` or `src/universes/amber/`'s existing
  server-side manifest keys (`sheet`, `dice`, `character`, `shadows`, `seed`,
  `content`, etc.) beyond removing the unworkable `steps` key CONTRACT-001
  added to them.

## Actors

- **Player**, creating a character within a specific campaign (which fixes
  the system and universe for the whole wizard session).
- **System step module** (a native ES module at a fixed, convention-based
  browser path — see Interfaces), contributing steps that collect
  system-owned character data (e.g. ability-score assignment, class
  selection, D&D-specific fields).
- **Universe step module** (same shape, its own fixed path), contributing
  steps that collect universe-owned character data (e.g. Amber's
  Order/Chaos, blood purity, imprint) and advisory hooks (see Required
  behavior).
- **Wizard host** (`public/js/player/player-wizard-host.js`, already built
  under TASK-029), which has no built-in knowledge of any specific system or
  universe — it only knows how to sequence and render whatever steps it's
  given, and which two module paths to dynamically `import()` for the active
  campaign.

## Inputs and outputs

- **Input**: the active campaign's `system_id`/`universe_id` (already
  resolvable client-side via the existing campaigns endpoint used for
  branding, and server-side via `getSystemForCampaign`/
  `getUniverseForCampaign`), and each contributed step's own
  render/validate/collect functions, loaded from their browser module path.
- **Output**: one `POST /api/characters` (and, for edits, `PUT /api/characters/:id`)
  request body containing exactly the fields each step collected, filtered
  to the fields the server actually recognizes (`UNIVERSAL_CHARACTER_UPDATE_FIELDS`,
  the active system's `sheet.fields`, the active universe's `character.fields`)
  — no change to those endpoints' existing three-way field-ownership split,
  and no host/step-internal bookkeeping fields (e.g.
  `abilityScoreModifiers`) sent to the server.

## Preconditions

- The player's active campaign has a resolvable system; a universe is
  optional (a homebrew campaign has none, per TASK-025).
- The active campaign's `system_id` (and `universe_id`, if any) are known to
  the browser before the wizard opens, so it can compute the module paths to
  dynamically import.

## Required behavior

**Step contribution.** A system contributes its steps via a native ES module
at `public/js/systems/<system_id>/wizard-steps.js`, exporting a `steps` array;
a universe does the same at `public/js/universes/<universe_id>/wizard-steps.js`.
Each step definition is `{ id, title, order, relativeTo?, shouldSkip(wizardState)?, footnote(wizardState)?, info?, render(container, wizardState), validate(wizardState), collect(wizardState) -> fieldsObject }` —
`shouldSkip`/`footnote`/`info` are optional additions per the 2026-09-19 amendments (see Required Behavior) —
deliberately the same shape for both axes, so the wizard host treats a system
step and a universe step identically; only which module contributed it
differs. (This is TASK-029's actual implemented shape, one field richer than
CONTRACT-001's original description: `order` and optional `relativeTo` were
always required for step ordering and advisory placement, just left implicit
in that contract's prose instead of stated in the shape itself.)

**Step ordering.** The wizard host builds its **navigable** step sequence by
concatenating the system module's and universe module's non-advisory `steps`
(universe steps omitted entirely when no universe is selected), ordered by
each step's own numeric `order` field, first-come-first-served (system steps
before universe steps) on ties — this lets a system or universe interleave
its steps around the other axis's steps where that produces a better flow,
without the wizard host needing to know why. A system must contribute at
least one step; zero steps is a configuration error surfaced clearly, not a
silent empty wizard. Advisory steps (see below) are not part of this
navigable sequence — they attach to a step within it rather than occupying
their own position.

**Data routing.** Each step's `collect()` returns a plain object of field →
value pairs; the wizard host does not interpret these fields itself beyond
merging them into shared `wizardState`. On submission, the caller (the
integration task wiring the host to the real `POST`/`PUT` endpoints) filters
the merged `wizardState` down to fields the active system/universe/universal
field lists actually recognize before sending it — the existing server-side
split (`characters/index.js`) does the actual per-field routing, exactly as
it does for regular edits today.

**No universe selected.** When no universe is active, the host loads only
the system's step module — the wizard functionally degrades to whatever
that system alone defines (e.g. "assign ability scores, pick a class" for
`dnd5e`), with no lore-flavor steps and no advisory panel. This must not
error; the system's own steps must be able to stand alone.

**Advisory hooks (revised 2026-09-19 — see Amendments).** A universe may
contribute an **advisory step** attached to a named step (declared via
`relativeTo: { step: 'system:dnd5e:class-selection', position: 'before' }`)
that reads the wizard's already-collected shared state to render *read-only
guidance*, rather than altering that step's own options or highlighting
logic. A system must never modify its own behavior based on which universe
(if any) is active — that would recreate the cross-plugin coupling ADR-005
eliminates. An advisory step whose `relativeTo` target isn't present in the
active system's steps is silently omitted, not an error.

An advisory step is **not its own page the player navigates through** — the
host renders its `render()` output inline within its target step's page
(before or after the target's own `render()` output, per `position`), and
folds its `validate()`/`collect()` into the same `next()` call as its
target, invisibly to both. Neither the target step nor the advisory step is
aware this folding happens; each is written exactly as if it were the only
content on the page. This was originally a separate navigable step (see
CONTRACT-002's initial text and CONTRACT-001 before it) — changed because a
purely informational page with nothing to click past is worse UX than the
same information shown where the actual decision happens. An advisory step
may itself declare `shouldSkip`; when true, its content is simply omitted
from the target's page for that render (the target still renders normally).

**Shared ability-score modifiers (discovered during TASK-030/031).**
CONTRACT-001 didn't name a mechanism for a universe's attribute choices
(e.g. Amber's Order/Chaos, imprint, blood purity) affecting the *submitted
value* of a system-owned ability score, as opposed to merely recommending a
class. This is the one narrow, explicit exception to steps not reading each
other's data: a universe step's `collect()` may set an optional, well-known
`wizardState.abilityScoreModifiers` field — a plain object keyed by the
system's own stat keys (e.g. `{STR, DEX, CON, INT, WIS, CHA}` for `dnd5e`) —
which a system's own ability-score step reads (defaulting every key to zero
when absent or no universe is active) and adds to its raw assignment to
produce the submitted, "effective" score. Once published this way, those
effective scores are the system's own canonical values for the rest of the
wizard (including that system's own class-gating logic) — a system step
never reads Amber-specific or any other universe-specific field directly.

**Review step (discovered during TASK-029).** CONTRACT-001 didn't assign
ownership of a final review/summary step to either axis, since it belongs to
neither. The wizard host owns a fixed, built-in final step (`host:review`)
appended after every contributed step, rendering a generic summary of
collected `wizardState` and contributing no fields of its own. Neither a
system nor a universe module needs to (or should) contribute its own review
step.

**Conditionally skippable steps (added 2026-09-19).** A step may declare an
optional `shouldSkip(wizardState) -> boolean`, evaluated by the host
immediately before that step would be shown (in either navigation
direction) — if it returns true, the host advances past it without
requiring a player action, exactly as if the step didn't exist for this
session. This exists for steps whose relevance depends on state collected
earlier in the same wizard run (unlike a universe simply not being present,
which is known up front) — e.g. a Trump Artist step that has nothing to
offer a character who doesn't meet the eligibility threshold computed from
already-collected ability scores. A step may also declare an optional
`footnote(wizardState) -> string|null`, evaluated for every step regardless
of whether it was shown or skipped; the host collects all non-null
footnotes and makes them available to `host:review` to render as a distinct
"notes" section, separate from the plain field summary. Both fields are
optional and additive — a step declaring neither behaves exactly as before
this amendment.

**Contextual info panel (added 2026-09-19).** A step may declare a static
`info: { title, flavor?, mechanics?, consider?, inPlay? }` object. While that
step is active, the host's docked info panel shows these sections (mirroring
the pre-cutover wizard's four labeled sections), falling back to a neutral
default when a step declares no `info`. This is deliberately per-step only —
there is no per-field focus-triggered switching within a step, unlike the
retired pre-cutover mechanism; a step needing to highlight something about a
specific field should say so in its own `render()`-produced UI, not through
this panel.

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
  mechanism or the shared `abilityScoreModifiers` field.
- The existing `dnd5e`+`amber` wizard's player-visible flow (same fields
  collected, same validation messages) is unchanged after this model is
  implemented — this contract is a re-composition of existing behavior, not
  a redesign of it.

## Failure behavior

- A step whose `validate()` returns a message blocks advancing.
- A system module declaring zero steps surfaces as a clear error rather than
  a silent empty wizard.
- An advisory step whose `relativeTo` target doesn't exist in the active
  system is silently omitted rather than erroring.
- If a system or universe's browser step module fails to load (network
  failure, missing file), the wizard must surface a clear error rather than
  silently rendering nothing — this case did not exist under CONTRACT-001's
  original same-process CommonJS model and is new to this contract's
  network-loaded module approach.

## Interfaces

- **System step module**: a native ES module at
  `public/js/systems/<system_id>/wizard-steps.js`, exporting `steps` (array,
  shape above). The wizard host loads it via
  `import(`/js/systems/${systemId}/wizard-steps.js`)`, using the active
  campaign's `system_id`. This file is a native ES module (`import`/`export`,
  not `require`/`module.exports`) containing ordinary browser DOM code with
  no Node-only API calls — the same file is importable from a Node test via
  dynamic `import()` (already proven by this project's own
  `player-wizard-host.test.js`), so no separate server-side copy is needed
  or should be created.
- **Universe step module**: the same shape at
  `public/js/universes/<universe_id>/wizard-steps.js`, loaded via
  `import(`/js/universes/${universeId}/wizard-steps.js`)` only when a
  universe is active.
- `src/systems/<id>/index.js` / `src/universes/<id>/index.js` (the
  server-side CommonJS manifests) do **not** hold a `steps` key under this
  contract — CONTRACT-001's addition of that key is removed. The browser
  resolves step modules purely from the campaign's already-known
  `system_id`/`universe_id` and the fixed path convention above; nothing
  server-side needs to enumerate step functions.
- No change to `POST /api/characters` / `PUT /api/characters/:id` request or
  response shape.

## UX expectations

- Consistent with ADR-001 (no build pipeline, static HTML + ES modules): step
  definitions are plain JS objects with functions in ordinary static files,
  not a templating DSL and not a bundled artifact.
- The step counter, back/next controls, and modal chrome are host concerns
  (already built in TASK-029), unaffected by how many steps a given
  system/universe pairing contributes.
- Advisory panels render additively — never replace or disable a system
  step's own controls.

## Validation requirements

- An implementation task must prove the `dnd5e`+`amber` worked example
  produces a byte-identical, server-filtered `POST /api/characters` request
  body to today's wizard for the same user inputs, through the real browser
  module-loading path described in Interfaces (not just the host and step
  logic exercised directly in Node).
- Must include an automated test simulating a `dnd5e`-with-no-universe
  campaign producing a valid character with none of Amber's fields present,
  also through the real dynamic-import path.
- Must prove a missing/failed step-module load surfaces a clear error (see
  Failure behavior), since this failure mode is new under this contract.

## Open questions

None outstanding. CONTRACT-001's three open questions (advisory-panel UX,
step-order tie-breaking, minimum system step count) were resolved by Patrick
on 2026-09-19 and are stated as settled fact in Required Behavior above
rather than carried forward as questions.
