# TASK-030: dnd5e system wizard steps

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-001 (implements the "System module" actor's
`steps` contribution).
Related ADRs: ADR-005.
Dependencies: TASK-029 (composable wizard host must exist to plug these
steps into and test them against).

## Desired outcome

`src/systems/dnd5e/index.js` exports a `steps` array (CONTRACT-001's shape)
covering identity, ability-score assignment, and class selection — the
minimum needed for a `dnd5e` campaign with **no universe** to produce a
complete, valid character on its own, per CONTRACT-001's no-universe
requirement and its own required validation test.

## Context

Today's fixed wizard mixes system- and universe-owned data in the same
numbered steps (`public/js/player/player-wizard-core.js`,
`player-wizard-steps.js`). Reading the actual code (not just the contract's
summary) surfaces real cross-axis data dependencies CONTRACT-001's Required
Behavior section only partly addresses:

- **Identity (today's step 1)** collects `name`, `race`, `shadowId`,
  `backstory`. `name`/`race`/`backstory` are universal fields (not in
  `DND5E_CHARACTER_COLUMNS` or `AMBER_CHARACTER_COLUMNS`); `shadowId`
  (`shadow_origin_id`) is Amber-owned. Since a no-universe campaign has zero
  universe steps, **identity must be system-owned** (it's the only way a
  homebrew character gets a name at all) — the system's identity step
  collects `name`/`race`/`backstory` only; shadow-origin selection is a
  separate universe step (TASK-031), not part of this one.
- **Ability scores (today's step 3, `wiz.assign`)** are system-owned, but the
  value actually sent to the server (`finals.STR` etc., set via
  `strength: finals.STR` in `player-wizard-steps.js` line 468) is
  `assign[stat] + calcAmberMods()[stat]` — raw system assignment plus
  universe-derived modifiers (Order/Chaos, imprint, blood purity), computed
  today in `player-wizard-core.js`'s `calcAmberMods`/`getFinalStats`
  (lines 31–77). This is a genuine value computation across both axes, not
  just advisory display text, and CONTRACT-001 doesn't name a mechanism for
  it. **Resolution for this task and TASK-031 to share**: the ability-score
  step's `collect()` reads an optional, well-known `wizardState.abilityScoreModifiers`
  object (`{STR, DEX, CON, INT, WIS, CHA}`, all zero/absent when no universe
  or a universe that doesn't set it) and adds it to the raw assignment to
  produce the submitted `strength`/`dexterity`/etc. values. The system module
  itself contains no Amber-specific knowledge — it only knows this one
  shared, host-documented key. TASK-031 is responsible for the universe step
  that populates it.
- **Class selection (today's step 5)** is system-owned, but its existing
  soft-gate check (`classGateStatus(cls, finals)`, line 117) also gates
  against the amber-modified `finals`, not raw `assign` — contradicting
  CONTRACT-001's claim that gating "already only depends on the
  system-owned ability scores." That claim becomes true again once this
  step's own ability-score step already produced the combined/effective
  score (per the point above): gating reads the system step's own already-
  computed effective scores, not raw `assign`, and needs no knowledge of why
  those scores are what they are.
- Today's class-recommendation highlighting (`getRecommendedClasses`) and
  the "Trump Artist" eligibility checkbox (`trumpArtist`, submitted as an
  Amber-owned field — `trump_artist` is in `AMBER_CHARACTER_COLUMNS`) belong
  to Amber, not this task — see TASK-031's advisory step. This task's class
  step exposes selection and level only, with no imprint-aware UI.
- `STAT_KEYS`, `STAT_FULL`, and `CLASSES_5E` are currently served from
  Amber's universe content (`src/universes/amber/content/player-wizard-data.js`,
  via `/api/universe/content/wizard`) even though they're dnd5e concepts,
  not Amber ones — a pre-existing misplacement from TASK-025 (there was only
  one system/universe pair at the time, so it didn't matter). This task
  should move them to system-owned content and expose them the equivalent
  way a system needs (e.g. a `content` key on the system module analogous to
  the universe's, served via a new `/api/system/content/...` route
  mirroring `universeContentRoutes` in `server.js`) — implementer's call on
  the exact shape, document it.

## Scope

### Included

- `system.steps` on `src/systems/dnd5e/index.js`: an identity step
  (name/race/backstory), an ability-score assignment step (today's point-buy
  or equivalent assignment UI), and a class-selection step (class + level),
  each per CONTRACT-001's step shape.
- The ability-score step's `collect()` incorporates the optional
  `wizardState.abilityScoreModifiers` key as described in Context.
- The class step's gating logic reads the ability-score step's own effective
  scores from shared wizard state — no direct read of Amber's imprint/order-
  chaos/blood-purity values.
- Move `STAT_KEYS`, `STAT_FULL`, `CLASSES_5E` out of Amber's universe content
  into dnd5e system content, with an equivalent serving mechanism.
- Each step usable standalone (no universe) and tested that way, per
  CONTRACT-001's required no-universe validation test.

### Excluded

- Shadow-origin selection, Order/Chaos/imprint/blood-purity collection,
  flaws/traits, class-recommendation advisory content, and Trump Artist
  eligibility — all TASK-031 (Amber-owned).
- Wiring these steps into the real player-facing wizard or retiring the old
  wizard files — TASK-032.
- No change to `POST /api/characters`/`PUT /api/characters/:id`.
- `IMPRINT_LORE`, `WIZARD_STEP_INFO` (Amber-specific), `FIELD_INFO`,
  `FLAW_TRAIT_PAIRS` stay in Amber's content — only the dnd5e-owned pieces
  (`STAT_KEYS`, `STAT_FULL`, `CLASSES_5E`) move.

## Plan

1. Confirm exactly which existing fields/columns each step owns by checking
   `DND5E_CHARACTER_COLUMNS` and `UNIVERSAL_CHARACTER_UPDATE_FIELDS` directly
   rather than assuming this task file's Context list is complete.
2. Move `STAT_KEYS`/`STAT_FULL`/`CLASSES_5E` to system-owned content; add the
   serving mechanism; update any other current consumer of
   `/api/universe/content/wizard` for these three keys.
3. Build the identity step, ability-score step (with the shared-modifiers
   key), and class-selection step (with effective-score-based gating) using
   TASK-029's host and step shape.
4. Write tests: each step working standalone against TASK-029's host with no
   universe steps present, producing a complete, valid, Amber-field-free
   character — this is CONTRACT-001's own required validation test.
5. Run the full test suite.

## Acceptance criteria

- [ ] `system.steps` exports identity, ability-score, and class-selection
      steps per CONTRACT-001's shape.
- [ ] The ability-score step's submitted values equal raw assignment plus
      `wizardState.abilityScoreModifiers` (defaulting to zero when absent),
      with no Amber-specific code in the system module.
- [ ] Class-step gating reads the ability-score step's own effective scores
      from shared wizard state, not any universe-owned field directly.
- [ ] `STAT_KEYS`/`STAT_FULL`/`CLASSES_5E` are served from dnd5e system
      content, not Amber universe content.
- [ ] An automated test proves a `dnd5e`-only (no universe) wizard run, using
      TASK-029's host, produces a valid character with none of Amber's
      fields present.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including the no-universe dnd5e-only test required by
  CONTRACT-001.
- Manual/automated check that moving `STAT_KEYS`/`CLASSES_5E` doesn't break
  the still-live old wizard (`player-wizard-data.js`) before TASK-032's
  cutover — either keep both content sources briefly or confirm nothing
  else reads the old location; document whichever approach is taken.

## Risks and assumptions

- The `abilityScoreModifiers` shared-key mechanism is this task's and
  TASK-031's own resolution to a real gap in CONTRACT-001, not something the
  contract states explicitly. If review disagrees with this resolution,
  both tasks need to change together — flag this prominently rather than
  landing one side of it silently.
- Moving `STAT_KEYS`/`CLASSES_5E` touches a currently-live endpoint the old
  wizard still depends on until TASK-032 cuts over — sequence carefully so
  the old wizard doesn't break mid-transition (e.g. keep both locations
  populated until TASK-032 removes the old one), and document the approach.

## Blocker

None.

## Implementation handoff

### Changes made

- Added `system.steps` to the dnd5e manifest with standalone identity,
  standard-array ability-score, and class-selection steps matching TASK-029's
  `{ id, title, order, relativeTo?, render, validate, collect }` contract.
- Kept transient form drafts outside the submitted fields object. Identity
  collects `name`, `species`, and `backstory`; abilities collect the six
  universal score fields; class selection collects `class_type` and `level`.
- Ability collection adds the optional shared
  `wizardState.abilityScoreModifiers` values, defaulting each modifier to
  zero. Class soft gates read the resulting effective universal score fields
  already collected into shared wizard state.
- Added canonical dnd5e-owned `STAT_KEYS`, `STAT_FULL`, and `CLASSES_5E`
  content plus authenticated `/api/system/content/wizard` delivery selected
  from the active campaign's system.
- Updated the still-live legacy wizard data loader to read those three values
  from the system endpoint. Amber class notes remain universe-owned and are
  merged onto the system class definitions for compatibility.
- Added API, frontend compatibility, manifest-shape, modifier/gating, and
  complete no-universe host tests.

### Validation performed

- `node --test tests/dnd5e-wizard-steps.test.js tests/player-wizard-host.test.js tests/frontend-modules.test.js tests/api.test.js`: 36 passed, 0 failed.
- `node --test tests/dnd5e-wizard-steps.test.js tests/frontend-modules.test.js`: 14 passed, 0 failed after the compatibility merge was added.
- `npm test`: 103 passed, 0 failed.
- The automated legacy compatibility check confirms the old wizard receives
  system-owned stat/class data and retains Amber's Wizard class lore.

### Assumptions and deviations

- No plan or scope deviations.
- Per the task's sequencing risk, Amber's wizard response temporarily keeps
  compatibility exports for `STAT_KEYS`, `STAT_FULL`, and `CLASSES_5E` until
  TASK-032 removes the old wizard. Their canonical definitions and the live
  legacy consumer's source are now the dnd5e system content endpoint.
- Confirmed directly that all fields collected by these three steps are in
  `UNIVERSAL_CHARACTER_UPDATE_FIELDS`; none is in
  `DND5E_CHARACTER_COLUMNS` or the Amber extension fields.

### Unresolved risks

- `abilityScoreModifiers` is the approved task-level resolution to the
  contract gap and must remain coordinated with TASK-031, as called out in
  this task's existing Risks section.
- The temporary Amber compatibility exports should be removed during
  TASK-032's old-wizard cutover; leaving them afterward would preserve an
  unnecessary duplicate delivery path.

### Documentation updated

- Updated this task's implementation handoff. No durable contract or
  architecture documentation changed because behavior follows the approved
  task and CONTRACT-001.

## Review

Reviewer: Claude
Date: 2026-09-19

Verified independently rather than trusting the handoff's self-report:

- Read `src/systems/dnd5e/wizard-steps.js` in full. Identity, ability-score,
  and class-selection steps match TASK-029's host step shape exactly. Each
  step keeps its own in-progress UI draft in a `WeakMap` keyed by the shared
  `wizardState` object rather than writing partial/raw UI state into
  `wizardState` directly — a good design choice that keeps the host's
  generic review step's field dump clean (only final collected values
  appear there, not per-keystroke drafts).
- **Confirmed the `abilityScoreModifiers` shared-key resolution is
  implemented exactly as this task and TASK-031 need to agree on it**:
  `effectiveScores()` reads `state.abilityScoreModifiers` (defaulting each
  stat to 0 via `Number(modifiers[stat]) || 0` when absent), adds it to the
  raw standard-array assignment, and the result is what `collect()` submits
  as `strength`/`dexterity`/etc. `classSelectionStep` then gates and renders
  against `state.strength`/etc. directly — i.e. the *already-effective*
  scores — with no direct read of any Amber-owned field. This correctly
  reconciles the task's own flagged contradiction (today's `classGateStatus`
  actually gates on amber-modified `finals`, not raw stats): once the
  ability-score step publishes effective scores as the canonical values,
  gating against them is honestly "system-owned ability scores" again.
- Ran the real integration test myself
  (`tests/dnd5e-wizard-steps.test.js`, 3 tests): the no-universe test builds
  a complete character through the real host + real dnd5e steps (not
  fixtures) and asserts none of `AMBER_CHARACTER_COLUMNS` appear in the
  resulting `wizardState` — this is CONTRACT-001's own required proof, and
  it's genuine (real host, real steps), not a mock. The modifier test proves
  `{STR:-3, DEX:-3, INT:5}` modifiers correctly shift 15/14/.../10/8 to
  12/11/.../17, and that the Fighter card gets `soft-warn` while Wizard
  doesn't — exercising the exact gate the old wizard's `classGateStatus`
  used to compute inline.
- **STAT_KEYS/CLASSES_5E relocation**: confirmed
  `src/systems/dnd5e/content/player-wizard-data.js` now holds the canonical,
  Amber-agnostic class list (no `amberNote` field on the system's own
  copy). The implementer caught something my task file's Context section
  didn't: the old `CLASSES_5E` entries in Amber's content carried a
  per-class `amberNote` narrative annotation, a genuinely Amber-owned
  addition layered on top of system-mechanical data. Both
  `src/universes/amber/content/player-wizard-data.js` and
  `public/js/player/player-wizard-data.js` now re-merge that note onto the
  system's canonical class list for the still-live legacy wizard only, with
  an explicit comment marking it temporary and removed at TASK-032's cutover
  — a correct, well-scoped compatibility shim rather than silently dropping
  Amber content or permanently duplicating ownership.
- `src/routes/system-content.js` mirrors `universe-content.js`'s
  authentication/campaign-membership gate exactly (`authenticate`,
  `requireCampaignMembership`), returns 404 when a system has no wizard
  content rather than an empty 200. Confirmed via `tests/api.test.js`'s
  extended assertions that a no-universe campaign still gets `200` from
  `/api/system/content/wizard` (proving the homebrew path TASK-032 needs)
  while a universe-bearing campaign gets both endpoints correctly populated.
- Independently reran `npm test`: 103/103 passing, matching the handoff.
- `git status` confirms no stray edits outside this task's described
  surface; `player-wizard-core.js`/`-steps.js` remain untouched, correctly
  reserved for TASK-032.

No blocking findings. This is careful, correct work that also strengthens
TASK-031's job by proving the shared-modifiers contract actually works
end-to-end rather than just in isolation. Ready for human acceptance.
TASK-031 can proceed against this system module.

## Human acceptance

Pending.
