# TASK-024: Generalized system-extension mechanism, with D&D 5e as the reference plugin

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins); ADR-003 (introduced the now-superseded, unused
`character_system_data` table this task replaces/generalizes).
Dependencies: TASK-022 (campaigns table with `system_id` must exist).

## Desired outcome

A generalized, namespaced character-extension mechanism exists (superseding
the unused `character_system_data` table from ADR-003), capable of holding any
system's non-universal character data under a namespace like `system:dnd5e`.
D&D 5e's currently-hardcoded sheet columns (skills, saves, spell slots, and
the rest of the D&D-specific block in `characters`) are migrated into this
mechanism as the **reference implementation** proving the mechanism actually
works — not left as special-cased "core" columns. A small system registry
(extending TASK-016's `{id, label, render}` pattern) makes `campaigns.system_id`
live: a campaign's chosen system determines which sheet renderer, dice
mechanics, and derived-stat math actually apply, rather than that column being
inert as it is today.

## Context

`characters` (`src/database/schema.sql` lines ~24-195) mixes universal fields
with a full D&D-5e sheet: 18 `skill_*` columns, 6 `save_*` columns, 9 tiers of
`spell_slots_N_total/expended`, `armor_class`, `hit_dice_total`,
`proficiency_bonus`, death saves, and D&D-shaped related tables
(`character_gear`, `character_powers`, `character_spells`, `character_feats`,
`character_weapons`). None of this is namespaced or conditional on system —
it's simply always present, for every character, regardless of what system a
campaign might eventually claim to use.

ADR-003 already established the key precedent this task builds on: the six
core ability scores are stored as a system-neutral 0–100 percentile, with
D&D's 1–30 score derived only at display/input boundaries via the shared
`public/js/ability-conversion.js` module. That ADR also added
`character_system_data (id, character_id, game_system, data JSON, ...)` as an
unused escape hatch for exactly this kind of system-specific data, and
`story_arcs.game_system` (default `'dnd5e'`) as an unused system-selection
point. Both are schema-only per ADR-003's explicit scope; this task is the
first thing that actually uses (and per ADR-005, generalizes) that mechanism.

TASK-016 built the first working plugin-style precedent in this codebase: a
small `{id, label, render}` registry reachable via a "View As..." picker on
character cards (`public/js/player/player-characters.js`,
`public/js/dm/dm-lists.js`), currently with one entry (`faserip`, read-only
conversion via `public/js/faserip-conversion.js`). This task grows that
registry into the real thing — driving the actual sheet, not just an
alternate read-only view — and is the reason ADR-005 could point to a working
precedent rather than a purely theoretical plan.

`public/js/player/player-dice.js` already has independent d20/D&D, d10/World
of Darkness, and d6/Car Wars rollers stubbed — these are a separate axis
(dice mechanics) that a system plugin should own going forward, per ADR-005's
description of what a System plugin supplies (sheet shape, dice mechanics,
derived-stat math, PDF export, conversion rendering).

`public/assets/dnd-5e-character-sheet-template.pdf` and its pdf-lib export
logic are D&D 5e's PDF export — this becomes part of the `dnd5e` plugin's
responsibility, not a hardcoded, only-option export path.

## Scope

### Included

- Design and build the namespaced extension mechanism (e.g. generalize
  `character_system_data` into `character_extension_data (id, character_id,
  namespace, data JSON, created_at, updated_at)` with `namespace` values like
  `system:dnd5e`; ADR-005 explicitly calls for one generalized mechanism
  shared with the universe axis, so this table's shape should also work for
  TASK-025's `universe:amber` namespace, even though only the system side is
  populated in this task).
- Migration moving D&D 5e's hardcoded sheet columns (skills, saves, spell
  slots, and related tables) out of `characters`/`character_gear`/etc. into
  `system:dnd5e` extension data, for every existing character. This is a
  live-data migration against real character records — treat with the same
  rigor as ADR-003's percentile migration (backup, copy-first validation,
  idempotency).
- A `src/systems/dnd5e/` module (manifest: id, label, sheet read/write logic,
  dice mechanics, derived-stat math, PDF export, conversion renderer) as the
  reference plugin, built by extracting and organizing the logic already
  scattered across `player-character-sheet.js`, the PDF export code, and
  `player-dice.js`'s D&D roller — not rewriting their behavior.
- Grow TASK-016's system registry so `campaigns.system_id` actually selects
  which system module governs character sheet rendering, dice mechanics, and
  PDF export for characters in that campaign.
- Update character sheet read/write routes and views to source D&D-specific
  data through the `system:dnd5e` extension data via the registry, rather
  than directly off `characters`' now-removed D&D-specific columns.

### Excluded

- No second real system plugin is built in this task (no working FASERIP or
  World of Darkness character sheet) — only the mechanism plus D&D 5e as its
  one reference implementation. TASK-016's existing read-only FASERIP "View
  As..." conversion may remain as-is or be adapted to the new registry shape,
  implementer's call, but building it out into a full plugin is not required
  here.
- No universe-side work (`universe:amber` namespace, Amber-specific columns)
  — that's TASK-025, which depends on this task's extension-data shape but
  not its D&D-specific content.
- No change to the ability-score percentile mechanism from ADR-003 — this
  task treats that as already correct and system-neutral; it only touches the
  D&D-specific columns ADR-003 explicitly left untouched.
- No composable wizard work — that's TASK-026.

## Plan

1. Design `character_extension_data`'s shape so it's genuinely reusable for
   both `system:*` and `universe:*` namespaces (coordinate this shape
   decision with what TASK-025 will need, even though TASK-025 isn't
   implemented yet — read ADR-005's description of the universe axis before
   finalizing the table shape).
2. Write the migration extracting D&D 5e's hardcoded columns into
   `system:dnd5e` extension data, with backup/idempotency discipline matching
   TASK-014's.
3. Build `src/systems/dnd5e/` by extracting existing scattered D&D-specific
   logic (sheet rendering, dice, PDF export) into one organized module,
   preserving current behavior exactly.
4. Wire `campaigns.system_id` to the registry so it actually drives which
   system module applies.
5. Update routes/views to read/write D&D data through the new mechanism.
6. Full regression pass confirming existing character sheets, dice rolls, and
   PDF exports behave identically to before this task.

## Acceptance criteria

- [x] A generalized, namespaced character-extension table exists and holds
      all D&D-5e-specific character data for every existing character,
      correctly migrated with no data loss.
- [x] `characters` and its D&D-specific related tables no longer carry
      D&D-only columns directly (or, if the implementer judges a narrower
      migration is safer, the handoff documents exactly what was and wasn't
      moved and why).
- [x] A `dnd5e` system module exists and is the one path through which D&D
      sheet rendering, dice mechanics, and PDF export operate.
- [x] `campaigns.system_id` actually selects the active system module for
      characters in that campaign, rather than being inert.
- [x] Every existing character's sheet, dice behavior, and PDF export are
      unchanged from a player's/DM's perspective after this task.
- [x] `npm test` passes, with new coverage for the migration's correctness/
      idempotency and the registry's system-selection behavior.

## Validation requirements

- `npm test`, including new migration and registry-behavior tests.
- Migration run against a copy of the real database with before/after
  spot-checks on several real characters' sheet data (skills, saves, spell
  slots, gear).
- Manual verification: an existing character's sheet displays identically,
  dice rolling still works, and PDF export still produces the same output
  shape as before this task.

## Risks and assumptions

- This is a substantial extraction from live, currently-working code
  (character sheet rendering, PDF export) — the primary risk is subtly
  changing D&D 5e behavior while "just" reorganizing where its data lives.
  Prioritize behavioral equivalence over code cleanliness if the two conflict.
- The extension-data table's shape needs to anticipate TASK-025's universe
  needs without TASK-025 being implemented yet — if this creates ambiguity,
  favor the simpler shape ADR-005 describes (namespace + JSON blob) and let
  TASK-025 prove or disprove its sufficiency, rather than over-designing here.
- Assumes `character_system_data` (ADR-003) has zero real usage anywhere to
  migrate away from safely — confirm this via grep before treating its
  replacement as risk-free.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-09-12

### Changes made

- Retained the previously verified generalized table and migration 014. Each
  `system:dnd5e` version-1 document contains the 77 D&D sheet scalars and the
  `gear`, `powers`, `spells`, `feats`, and `weapons` collections.
- Added shared extension-document read/write/mutation helpers and made the D&D
  manifest own sheet defaults, hydration, scalar writes, collection access,
  d20 mechanics, derived-stat math, and PDF metadata.
- Split the character update allow-list into universal and system-owned fields.
  Character creation initializes D&D defaults directly in the extension
  document; PUT updates write D&D fields only there. List, detail, image, story,
  compact player-character, and combat HP reads hydrate from the campaign's
  selected system without changing their established response shapes.
- Cut gear, powers, spells, feats, and weapons CRUD and power-rest behavior over
  to document collections. Existing row shapes, generated integer IDs,
  authorization, boolean normalization, ordering, status codes, and messages
  are preserved. Added the missing feats CRUD endpoints using the existing
  `character_feats` row contract.
- Added a current-system endpoint backed by `src/systems/registry.js`. The
  browser runtime registry loads that campaign-selected id and dispatches the
  editable sheet renderer/binder, derived-stat implementation, dice mechanic,
  and PDF exporter through the registered D&D runtime module.

### Validation performed

- Ran `npm test`: **86 passed, 0 failed**. Coverage includes migration
  correctness/idempotency, new-character defaults, scalar editing, all five
  related-resource create/update/delete paths, legacy-storage non-mutation,
  campaign registry selection, sheet values, D&D derived saves/skills/
  initiative/spell math, campaign-dispatched dice, PDF field output, and combat
  HP reads.
- Ran the normal migration runner against timestamped copy
  `dm_helper.task024-validation-20260912-235347.db`, never the live database.
  It contained 5 characters; all 77 scalar values matched the extracted JSON,
  and all 5 D&D rows were valid JSON. On that copy, runtime scalar and all five
  collection mutations changed only extension JSON and left legacy storage
  unchanged.
- The live database SHA-256 remained
  `F9F5B2D73067C34000A19763867D0225B20E29620E861F8D94D992670D5B5244`.
  The validation copy was deleted and is not committed.
- Fresh in-memory databases are exercised by the API and runtime cutover suites.
  No interactive browser-control harness is available in this environment, so
  no manual browser regression is claimed. As in TASK-014, browser behavior is
  verified by jsdom/module tests and exhaustive static call-site tracing.

### Assumptions and design calls

- Kept the legacy D&D columns and five tables physically present but made them
  inactive compatibility storage: application code no longer reads or writes
  them. Dropping many SQLite columns/tables in the same live-behavior cutover
  would add rebuild/rollback risk without improving runtime correctness. This
  is the narrower migration explicitly permitted by the acceptance criteria and
  preserves a recovery reference for independent review. A later cleanup can
  remove them after the cutover has operated successfully.
- Kept the scalar `characters.feats` response distinct from the related
  `character_feats` collection, matching the pre-existing character response
  contract while still providing collection CRUD at `/feats`.

### Unresolved risks

- The retained legacy columns/tables can become stale by design and must not be
  used as runtime truth. Static tracing and tests guard the current application,
  but future code must continue using the system manifest/document API.
- The real database has no related-resource rows; non-empty migration and CRUD
  equivalence are therefore proven with real in-memory SQLite fixtures rather
  than production-copy examples.

### Documentation updated

- Updated this task's acceptance checklist and implementation handoff. No
  unrelated documentation was changed as part of this implementation.

## Review

Reviewer: Claude
Date: 2026-09-13

This is the riskiest change in the ADR-005 sequence so far (it changes live
character read/write behavior, not just adds scoping), so I reviewed it more
heavily than prior tasks — reading essentially every changed file rather than
sampling, and running my own independent checks against a copy of the real
database rather than relying on the handoff's self-report.

Verified independently:

- `git show --stat 9554ba3`: 22 files, matches the handoff's described
  surface area (character routes/subrouters, the dnd5e manifest, the
  extension-data helpers, browser sheet/dice/registry dispatch, plus
  `combats.js` and `navigation.js` for reasons explained below).
- **Confirmed reads/writes actually go through the extension document, not
  the legacy columns** — read `src/systems/extension-data.js`
  (`readDocument`/`writeDocument`/`mutateDocument`, transactional, using
  `ON CONFLICT ... DO UPDATE`) and `src/systems/dnd5e/index.js`'s
  `hydrateSheet`/`hydrateCharacter`/`updateSheet`, then traced every call site
  in `characters/index.js`, `characters/fields.js`, and all five related
  resource routers (`gear.js`, `powers.js`, `spells.js`, `weapons.js`, and the
  new `feats.js`, all now built on the shared `system-resource.js` helper).
  The split between `UNIVERSAL_CHARACTER_UPDATE_FIELDS` (fields.js) and
  `system.sheet.fields` (from `DND5E_CHARACTER_COLUMNS`) is exhaustive and
  correctly non-overlapping — diffed the old vs new `fields.js` and confirmed
  every removed field is present in `DND5E_CHARACTER_COLUMNS` from migration
  014, nothing silently dropped.
- **Confirmed the `req.campaign` plumbing that `system-resource.js` depends on
  is actually in place** for the five related-resource subrouters even though
  their own route declarations only list `authenticate`: they're mounted
  inside `characters/index.js` *after* `router.use(authenticate,
  requireCampaignMembership)`, sharing the same `req` object, so
  `req.campaign` is populated before any subrouter handler runs. Also
  reconfirmed `router.use('/:id', requireCampaignCharacter)` still gates
  every `/:id/*` path (including the new `/:id/feats`) before reaching a
  handler.
- **Independently reran the full test suite**: 86/86 passing, matching the
  handoff.
- **Independently re-verified the live-data migration end to end on a fresh
  copy of the real database** (not reusing Codex's copy): ran migrations 013
  then 014 against a copy, then called `dnd5e.sheet.hydrateSheet` directly
  against every one of the 5 real characters' rows and asserted every one of
  the 77 `DND5E_CHARACTER_COLUMNS` values exactly equals the pre-migration
  legacy value — zero mismatches. Confirmed the live `dm_helper.db`'s SHA-256
  (`f9f5b2d7...d5b5244`) is byte-identical to what the handoff recorded before
  its own validation — the live file was genuinely never touched by either of
  us.
- Read `tests/system-extension-runtime.test.js` in full: this is a strong,
  non-vacuous, real-HTTP integration test. It proves the exact property that
  matters most for this cutover — after a scalar edit (`armor_class: 17`),
  the API-visible value is 17 while the row in the legacy `characters` table
  stays at its default (10), and the value lives in the extension JSON
  instead. The five-resource CRUD test round-trips create/update/delete
  through the real routes and then asserts all five legacy tables have zero
  rows for that character throughout — directly proving mutations never
  touch legacy storage at all, not just that reads happen to look right.
- **Confirmed the `combats.js` change is a genuine, necessary catch, not
  scope creep**: linking a PC combatant used to read `max_hp`/`current_hp`
  directly off `characters` (lines removed in this diff); since this cutover
  makes those columns stale, leaving that read unfixed would have silently
  frozen every PC combatant's HP at the legacy default. Codex caught a real
  regression outside its originally-listed file list rather than only doing
  what was explicitly named — correct judgment call, not overreach.
- Confirmed `player-characters.js`, `player-dice.js`, `player-character-sheet.js`,
  and `navigation.js` genuinely dispatch through
  `CharacterSystemRegistry`/`src/systems/registry.js` rather than superficially
  referencing it — `system.sheet.render`/`.bind` and
  `system.dice.roll(rollD20WithClaims)` replace the previously hardcoded
  direct calls, with the dnd5e runtime registered as a thin passthrough that
  preserves exact prior behavior.
- The legacy-column-retention design call (keep D&D columns/tables physically
  present but inactive, rather than also dropping them in this same pass) is
  the right call given everything else already at risk in this change — it's
  explicitly permitted by the task's own acceptance criteria, and reviewed
  and re-confirmed as inactive by the integration test above, not just
  asserted.
- No interactive browser regression was performed (no browser-control harness
  in this environment, consistent with TASK-014's precedent) — behavioral
  equivalence is proven via the real-HTTP integration test and direct
  call-site tracing instead, which is the strongest verification available
  here and was honestly represented as such rather than overclaimed.

No blocking findings. This is a large, genuinely risky change that was
implemented with real discipline — verified against live data, not just
tested in the abstract, and with the one caught cross-cutting regression
(`combats.js`) fixed rather than left as a surprise for later. Ready for
human acceptance.

## Human acceptance

Pending.
