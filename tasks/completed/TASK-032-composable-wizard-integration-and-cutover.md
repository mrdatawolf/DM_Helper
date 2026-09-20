# TASK-032: Composable wizard integration, parity verification, and cutover

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002 (this task closes out the contract's
Validation requirements and retires the pre-contract wizard). Originally
written against CONTRACT-001, retired 2026-09-19 after this task's own first
run correctly discovered and stopped on the browser-delivery gap CONTRACT-002
fixes — see Blocker (resolved) and the updated Scope/Plan below.
Related ADRs: ADR-001 (native ES modules, no build pipeline — why the
original approach didn't work), ADR-005.
Dependencies: TASK-029 (host), TASK-030 (dnd5e steps), TASK-031 (Amber
steps and advisory).

## Desired outcome

The real player-facing character-creation wizard runs entirely on TASK-029's
host, loading TASK-030's and TASK-031's real step contributions via dynamic
`import()` from their `public/js/` locations per CONTRACT-002's Interfaces
section, proven byte-identical to today's wizard for the same inputs on the
`dnd5e`+`amber` worked example, per CONTRACT-002's Validation requirements.
The old
`player-wizard-core.js`/`player-wizard-steps.js`/`player-wizard-data.js`
(and their now-superseded content) are retired.

## Context

CONTRACT-002's Validation requirements section states the bar directly: an
implementation task must prove the `dnd5e`+`amber` worked example produces a
byte-identical, server-filtered `POST /api/characters` request body to
today's wizard for the same user inputs *through the real dynamic-import
path* (not just the host and step logic exercised directly in Node), must
include an automated test simulating a `dnd5e`-with-no-universe campaign
producing a valid character with none of Amber's fields present, and must
prove a missing/failed step-module load surfaces a clear error. TASK-030
covers the no-universe test on its own steps in isolation; this task covers
the byte-identical full-flow parity claim and the real browser-loading path,
which can only be verified once real system and universe step modules are
relocated to `public/js/` and wired into the real host together.

This is also where the actual player-facing page
(`public/player-dashboard.html` and whatever loads the wizard) switches from
the old fixed wizard to the new composed one, and where the old files are
deleted — not before, since deleting them earlier would leave the app
without a working wizard while TASK-030/031 are still landing independently.

## Scope

### Included

- Relocate `src/systems/dnd5e/wizard-steps.js` to
  `public/js/systems/dnd5e/wizard-steps.js` and
  `src/universes/amber/wizard-steps.js` to
  `public/js/universes/amber/wizard-steps.js`, per CONTRACT-002's Interfaces
  section, **converting their module syntax from CommonJS
  (`require`/`module.exports`) to native ES modules (`import`/`export`)** —
  CommonJS cannot run in a browser regardless of which APIs it calls, so
  this conversion is required. This is a mechanical syntax change only:
  every `render`/`validate`/`collect` function, the step shape, and all DOM
  calls (which already assume a browser `container`) must be byte-for-byte
  unchanged in behavior — only the module wrapper (top-of-file imports,
  bottom-of-file exports) changes. Update their existing Node test files
  (`tests/dnd5e-wizard-steps.test.js`, `tests/amber-wizard-steps.test.js`) to
  import the relocated paths via dynamic `import()`, exactly as
  `tests/player-wizard-host.test.js` already does for the host.
- Remove the now-nonexistent `steps` key from `src/systems/dnd5e/index.js`'s
  and `src/universes/amber/index.js`'s CommonJS manifest exports, per
  CONTRACT-002's Interfaces section (server manifests no longer enumerate
  step functions).
- Add a `package.json` with `{"type": "module"}` inside `public/js/systems/`
  and inside `public/js/universes/`, mirroring the existing
  `public/js/player/package.json` boundary — without this, Node's dynamic
  `import()` (used by both the tests and, indirectly, the same resolution
  rules browsers don't need but Node does) will misparse the relocated
  `export`/`import` syntax against the repo root's `"type": "commonjs"`.
- Replace each relocated step module's `require('./content/...')` /
  `require('../../systems/dnd5e/content/...')` of its CommonJS content file
  with the same top-level-`await fetch(...)` pattern
  `public/js/player/player-wizard-data.js` already uses successfully
  (`await fetch('/api/system/content/wizard')` /
  `await fetch('/api/universe/content/wizard')`) — a relocated ES module
  cannot `require()` a CommonJS file from `src/` in a browser, and this is
  the existing, already-proven way this codebase gets system/universe
  content into browser code.
- Wire the real player-facing wizard entry point to TASK-029's host, fed by
  dynamically importing `/js/systems/${systemId}/wizard-steps.js` and, when
  a universe is active, `/js/universes/${universeId}/wizard-steps.js`, using
  the active campaign's already-known `system_id`/`universe_id`.
- Build the actual `POST /api/characters` submission path: filter the host's
  merged `wizardState` down to fields the active system/universe/universal
  field lists recognize (per CONTRACT-002's Inputs and outputs section)
  before sending — do not send host/step-internal bookkeeping fields such as
  `abilityScoreModifiers` verbatim.
- A parity test harness: given the same fixed set of user inputs, assert the
  new composed wizard's final, filtered `POST /api/characters` body is
  field-for-field identical to what today's
  `player-wizard-core.js`/`player-wizard-steps.js` produces for the same
  inputs, exercised through the real dynamic-import path described above
  (not just the host and step logic called directly in Node). This is the
  contract's own required proof, not optional coverage.
- The no-universe end-to-end test: a `dnd5e` campaign with no universe, run
  through the real host with only the real dnd5e step module dynamically
  imported, producing a valid character with no Amber fields present.
- A test proving a missing/failed step-module load surfaces a clear error
  (CONTRACT-002's Failure behavior — new under the network-loaded module
  approach, didn't exist under the retired same-process design).
- Retire `player-wizard-core.js`, `player-wizard-steps.js`,
  `player-wizard-data.js`, and the temporary `amberNote` compatibility
  merges TASK-030/031 left in `src/universes/amber/content/player-wizard-data.js`
  and `public/js/player/player-wizard-data.js` — confirm nothing else
  references them first.
- Manual browser verification of the full creation flow for the existing
  migrated Amber campaign, per CONTRACT-002's UX expectations (variable step
  count in the chrome, review step working per TASK-029's chosen mechanism).

### Excluded

- No new system or universe wizard content beyond the `dnd5e`+`amber`
  worked example already built by TASK-030/031.
- No schema or endpoint changes — this task only changes what calls
  `POST /api/characters`/`PUT /api/characters/:id`, not those endpoints
  themselves.

## Plan

1. Relocate the two step-module files to their `public/js/` paths and update
   their existing Node tests to import from there; remove the `steps` key
   from both server-side manifests.
2. Wire the player-dashboard's wizard trigger to dynamically `import()` the
   correct step module(s) for the active campaign and build the host from
   them.
3. Build the real submission path: filter merged `wizardState` to
   server-recognized fields before `POST`/`PUT`.
4. Build the parity test: fix a representative set of inputs, run them
   through both the old wizard's logic (or a frozen reference of its output
   for the same inputs, if the old code is already partially gone by this
   point) and the new composed path via the real dynamic-import route, diff
   the resulting filtered request bodies.
5. Run the no-universe end-to-end test through the real integrated host.
6. Add the missing/failed module-load error test.
7. Once parity, the no-universe path, and the load-failure test are all
   green, delete the retired files and the temporary `amberNote`
   compatibility merges, and grep the codebase to confirm nothing else
   references them.
8. Manual browser verification of the full flow for the existing campaign.
9. Full regression pass (`npm test`).

## Acceptance criteria

- [x] The two step-module files are relocated to `public/js/systems/dnd5e/`
      and `public/js/universes/amber/` as native ES modules (converted from
      CommonJS, logic unchanged), each directory scoped by its own
      `{"type": "module"}` `package.json`, importable by both the browser
      and their existing Node tests via dynamic `import()`; the `steps` key
      is removed from both server-side CommonJS manifests.
- [x] Each relocated step module fetches its content
      (`STAT_KEYS`/`CLASSES_5E`/etc.) from the existing
      `/api/system/content/wizard` / `/api/universe/content/wizard`
      endpoints rather than `require()`-ing a `src/` CommonJS file.
- [x] The real player-facing wizard runs on TASK-029's host, fed by
      dynamically importing the correct step module(s) for the active
      campaign's system/universe.
- [x] A parity test proves byte-identical, server-filtered `POST /api/characters`
      request bodies between the old and new wizard for the same
      representative inputs, exercised through the real dynamic-import path,
      per CONTRACT-002's explicit requirement.
- [x] An end-to-end (not isolated-unit) test proves a `dnd5e`-with-no-
      universe campaign produces a valid, Amber-field-free character through
      the real integrated host and real dynamic-import path.
- [x] A test proves a missing/failed step-module load surfaces a clear error
      rather than a silent blank wizard.
- [x] `player-wizard-core.js`, `player-wizard-steps.js`,
      `player-wizard-data.js`, and the temporary `amberNote` compatibility
      merges are deleted, with a grep-confirmed absence of remaining
      references.
- [ ] Manual browser verification of the full creation flow for the existing
      Amber campaign is performed and documented in the handoff (per this
      repo's established pattern for frontend-only tasks where no browser
      automation harness exists).
- [x] `npm test` passes.

## Validation requirements

- `npm test`, including the parity test and the integrated no-universe test.
- Manual browser walkthrough of character creation for the existing migrated
  campaign, documented in the handoff — this is the task that finally
  exercises the whole composed system end-to-end in a real browser, so it
  carries more weight than the frontend-only tasks earlier in this
  sequence's honest "no browser automation available" caveat.

## Risks and assumptions

- This is the task where a mistake in TASK-030/031's field-ownership or
  ordering decisions becomes visible as an actual behavioral difference
  (the parity test either passes or it doesn't) — if parity fails, the fix
  belongs in whichever of TASK-030/031's steps produced the wrong value, not
  as a patch bolted onto this integration task, to keep each task's own
  acceptance criteria honest.
- Deleting the old wizard files is a one-way door for this codebase's only
  character-creation path — do not delete until both the parity test and the
  manual browser walkthrough are green.

## Blocker

Resolved 2026-09-19. This task's first run correctly discovered that the
server-side CommonJS step manifests (`getSystemForCampaign(...).steps` /
`getUniverseForCampaign(...)?.steps`) had no delivery path to the browser
ES-module dashboard, and stopped rather than guessing at an architecture
change outside its approved scope. Patrick resolved this by approving
CONTRACT-002 (2026-09-19), which retires CONTRACT-001 and specifies that
step modules live as native ES modules at `public/js/systems/<id>/` and
`public/js/universes/<id>/`, loaded via dynamic `import()` — see this task's
updated Related contracts, Scope, and Plan above, which now implement
against CONTRACT-002 instead.

Resolved 2026-09-19 (second round). The prior "relocate, don't rewrite"
wording was Claude's own mistake in CONTRACT-002/this task file: it
conflated "no Node-only API calls" with "already browser-compatible,"
missing that CommonJS syntax (`require`/`module.exports`) itself cannot run
in a browser regardless of which APIs it calls. This is now corrected
throughout CONTRACT-002 and this task's Scope/Plan/Acceptance criteria:
converting the two step files' module syntax from CommonJS to native ES
modules (`import`/`export`) is explicitly authorized and required — their
`render`/`validate`/`collect` logic and step shape must stay byte-for-byte
unchanged, only the module wrapper changes. Two further mechanics are now
spelled out explicitly in Scope to avoid a third blocked round: (1) add
`{"type": "module"}` `package.json` files in `public/js/systems/` and
`public/js/universes/`, mirroring the existing
`public/js/player/package.json` boundary, so Node correctly parses the
relocated ES-module syntax; (2) replace each file's `require()` of its
CommonJS content dependency with the same top-level-`await fetch(...)`
pattern `public/js/player/player-wizard-data.js` already uses for exactly
this purpose. No implementation files were changed by either blocked round;
this task remains `in-progress` and can now proceed.

## Implementation handoff

### Changes made

- Relocated the D&D 5e and Amber step contributions to their contract-defined
  `public/js/systems/dnd5e/` and `public/js/universes/amber/` paths, converted
  only their CommonJS/content-loading wrappers to native ES modules and
  endpoint-backed top-level fetches, and added the two `type: module` package
  boundaries. Their render/validate/collect implementations and step shapes
  were otherwise preserved.
- Removed the server-manifest `steps` keys and wired the player dashboard to a
  new composed-wizard entry point that resolves the active campaign, dynamically
  imports its system and optional universe modules, drives TASK-029's host, and
  surfaces module-load failures in both the modal and toast UI.
- Added filtered submission construction for universal, active D&D 5e, and
  active Amber fields, including the legacy-equivalent starting-HP calculation;
  host-only state such as `shadows` and `abilityScoreModifiers` is excluded.
- Retired `player-wizard-core.js`, `player-wizard-steps.js`, and
  `player-wizard-data.js`; removed their dashboard tags, dependent imports,
  obsolete frontend tests, and the temporary Amber-to-D&D compatibility export
  merge.
- Added an integrated parity suite using the real convention-based dynamic
  imports, an integrated D&D-with-no-universe case, and a failed-module-load
  case. Updated the existing D&D 5e and Amber step suites to dynamically import
  the relocated browser modules.

### Validation performed

- `node --test tests/player-wizard-host.test.js tests/dnd5e-wizard-steps.test.js tests/amber-wizard-steps.test.js tests/player-wizard-integration.test.js` — passed, 18/18.
- `npm test` — passed, 110/110.
- `git diff --check` — passed (only existing Git line-ending conversion warnings).
- Grepped `public/`, `src/`, and `tests/` for the three retired filenames and
  the old server-side wizard-step imports/manifest assignment — no remaining
  references.
- No real browser was available in this implementation environment, so the
  requested manual Amber campaign walkthrough was not performed and is not
  claimed as tested. The automated jsdom integration exercises the real host,
  real relocated step modules, convention-based dynamic-import paths, complete
  representative input collection, filtering, and review transition.

### Assumptions and deviations

- The active campaign continues to come from the existing authenticated
  `/api/auth/campaigns` response; no endpoint or schema changes were made.
- Submission allowlists are kept in the browser integration for the currently
  approved D&D 5e + Amber worked example. This matches the task scope and the
  server's existing field ownership lists without expanding either step-module
  interface.
- The manual-browser validation criterion remains unchecked because no real
  browser was available; this is the only validation deviation.

### Unresolved risks

- A human reviewer should perform the real-browser Amber creation walkthrough,
  including variable step chrome, back/next navigation, review, Save for Later,
  and Save & Continue Editing, before human acceptance.

### Documentation updated

- Updated this task's acceptance checklist and implementation handoff. No
  contract or architecture documentation change was needed because the
  implementation follows corrected CONTRACT-002 and ADR-001 as written.

## Review

Reviewer: Claude
Date: 2026-09-19

This is the highest-stakes task in the sequence (deletes the app's only
character-creation path), so verified at matching depth — every claim below
checked against the actual code and a real test run, not accepted on the
handoff's word.

- **Relocation is genuinely mechanical.** Diffed `public/js/systems/dnd5e/wizard-steps.js`
  and `public/js/universes/amber/wizard-steps.js` against the TASK-030/031
  versions I already reviewed: every `render`/`validate`/`collect` function,
  step id, and `order` value is byte-for-byte identical. Only the module
  header changed — `require(...)` replaced by a top-level `await fetch(...)`
  against `/api/system/content/wizard` / `/api/universe/content/wizard`
  (throwing a clear error on a non-OK response), and `module.exports`
  replaced by `export`. `public/js/systems/package.json` and
  `public/js/universes/package.json` both correctly declare
  `{"type":"module"}`, mirroring the existing `public/js/player/package.json`
  boundary.
- **The dynamic-import path is proven, not assumed.** Read
  `tests/player-wizard-integration.test.js` in full: its `browserImporter`
  performs a **real** `import()` against the actual files on disk via
  `pathToFileURL`, not a mock — so `loadWizardModules`'s
  `/js/systems/${systemId}/wizard-steps.js` /
  `/js/universes/${universeId}/wizard-steps.js` convention is exercised for
  real, exactly as CONTRACT-002 requires. This is the thing the first two
  blocked rounds existed to force into the open, and it's genuinely proven
  here.
- **Hand-verified the parity test's math independently** rather than trusting
  the frozen expected object: order-chaos 75 (+INT+WIS), FirstPattern
  (+WIS2+CON1), Pure blood (+WIS1) → modifiers `{CON:+1,INT:+1,WIS:+4}` on
  raw `[15,14,13,12,10,8]` (STR..CHA) gives effective
  `STR15/DEX14/CON14/INT13/WIS14/CHA8` — matches the frozen payload exactly.
  Wizard's `hitDie:6` + `floor((14-10)/2)` = 8 — matches `max_hp`/`current_hp:8`
  exactly. This is a real, independently-checkable proof, not a
  rubber-stamped fixture.
- **`filterWizardPayload` correctly excludes host/step-internal bookkeeping**:
  confirmed `abilityScoreModifiers` and the host-only `shadows` key (used to
  populate the shadow-origin dropdown) are both absent from the filtered
  payload in the parity test's own assertions — this was the specific risk
  TASK-031's review flagged for this task's awareness, and it's handled
  correctly.
- **Cutover is clean**: grepped `public/`, `src/`, `tests/` for
  `player-wizard-core`, `player-wizard-steps.js`, and `player-wizard-data.js`
  — zero remaining references anywhere, including
  `public/player-dashboard.html`'s script tags (now a single
  `player-wizard.js` entry point) and the two other player modules that
  imported from the old core file (`player-account.js`, `player-core.js`).
  Independently reran `npm test`: 110/110 passing, matching the handoff.

Two minor, non-blocking observations:

1. In the parity test, the flaws-traits checkbox interaction
   (`document.querySelectorAll('input[type="checkbox"]')[0].dispatchEvent(new Event('change'))`)
   never sets `.checked = true` first, so it's a no-op against the listener's
   logic — the frozen payload's `amber_flaws: []` reflects that inert
   interaction, not a proof that flaw selection round-trips correctly through
   this integration path. Not a production bug (flaw collection has its own
   real coverage in `tests/amber-wizard-steps.test.js`), just a slightly
   weaker moment in an otherwise strong test.
2. `player-shadows.js`'s removed focus/blur "info panel" delegation
   (`wizardFocusField`/`wizardShowInfoPanel`) is correctly dead code — TASK-031
   already inlined the equivalent `FIELD_INFO`/`WIZARD_STEP_INFO` lore text
   directly into each step's `render()` as always-visible notes rather than
   hover-triggered panels — but this UX change (hover-panel → inline note)
   was never explicitly called out as a deviation in any of TASK-030/031/032's
   handoffs. No content is lost, just presented differently; worth a
   one-line mention for the record rather than a silent diff.

No blocking findings. This closes out CONTRACT-002's Validation requirements
in full: byte-identical filtered submission, the no-universe path, and the
new module-load-failure mode are all proven through the real integrated
system, not isolated units. Ready for human acceptance — the one outstanding
item is the manual real-browser walkthrough the handoff honestly flags as
unperformed (no browser available in this environment), consistent with
this project's established pattern for frontend-only tasks.

## Human acceptance

Pending.
