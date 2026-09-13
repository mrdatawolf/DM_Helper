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

- [ ] A generalized, namespaced character-extension table exists and holds
      all D&D-5e-specific character data for every existing character,
      correctly migrated with no data loss.
- [ ] `characters` and its D&D-specific related tables no longer carry
      D&D-only columns directly (or, if the implementer judges a narrower
      migration is safer, the handoff documents exactly what was and wasn't
      moved and why).
- [ ] A `dnd5e` system module exists and is the one path through which D&D
      sheet rendering, dice mechanics, and PDF export operate.
- [ ] `campaigns.system_id` actually selects the active system module for
      characters in that campaign, rather than being inert.
- [ ] Every existing character's sheet, dice behavior, and PDF export are
      unchanged from a player's/DM's perspective after this task.
- [ ] `npm test` passes, with new coverage for the migration's correctness/
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

## Blocker

Partial implementation only. The generalized table, migration, and server-side
system registry are implemented and verified, but the route/view cutover is not.
Specifically:

- D&D scalar fields and the five related-table collections are copied without
  loss into `system:dnd5e`, but their legacy columns/tables remain in place and
  are still the application's active read/write path.
- Consequently, writes made after migration are not yet mirrored into the JSON
  document. Migration 014 is a safe extraction snapshot, not yet the runtime
  source of truth.
- The D&D manifest identifies the existing renderer, d20 mechanic, derived-stat
  helper, PDF template/exporter, and conversion renderer, and campaign lookup
  resolves `campaigns.system_id`; the browser sheet/dice/PDF paths have not yet
  been dispatched through that registry.
- Existing behavior is unchanged because no route or view was migrated. The
  required follow-up is to cut scalar and related-resource CRUD over to the
  extension document (while preserving response shapes), make browser behavior
  dispatch through the selected campaign system, add sheet/dice/PDF regression
  coverage, and only then remove the legacy D&D columns/tables.

The full cutover spans the character update allow-list, creation defaults,
inline sheet edits, five related-resource APIs, player and DM editors, computed
sheet logic, dice, and PDF export. Completing that without adequate behavioral
verification would violate this task's explicit preference for a coherent,
verified subset over a rushed extraction. Leave this task in `in-progress/`.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-09-12

### Changes made

- Added migration 014 and the fresh-schema definition for
  `character_extension_data`. Its shape is one row per
  `(character_id, namespace)`, with a required valid JSON document, timestamps,
  a character foreign key with cascade deletion, a uniqueness constraint, a
  basic colon-delimited namespace check, and indexes for character and namespace
  lookup. This deliberately follows ADR-005's simple `namespace + JSON blob`
  direction and is suitable for TASK-025's future `universe:amber` rows without
  adding universe-specific schema.
- Migration 014 creates `system:dnd5e` documents with `schema_version: 1`, a
  `sheet` object containing 77 D&D-facing scalar columns, and `gear`, `powers`,
  `spells`, `feats`, and `weapons` arrays containing exact source rows. It does
  not delete or mutate any source data in this partial implementation.
- Superseded `character_system_data` rows are copied to `system:<game_system>`.
  If a legacy D&D row exists, its JSON is retained under `legacy_data` while the
  complete reference snapshot is added. Invalid/null legacy JSON is safely
  treated as an empty object.
- Direct reruns recognize a version-1 D&D document and do not overwrite it.
  This makes the extraction idempotent independently of the migration runner's
  `schema_migrations` guard.
- Added `src/systems/dnd5e/index.js`, an immutable reference manifest describing
  its namespace, existing browser sheet renderer, d20 roll, shared D&D modifier
  math, PDF template/export function, and conversion renderer.
- Added `src/systems/registry.js`. It resolves registered systems by id and
  resolves a campaign's module from the current `campaigns.system_id` value.
  Unknown configured system ids fail explicitly rather than silently falling
  back to D&D.

### Validation performed

- Ran `npm test` after implementation: 81 passed, 0 failed. New tests cover
  exact scalar/collection extraction, direct rerun idempotency, preservation of
  superseded extension JSON, the D&D manifest contract, d20 endpoints and
  derived-stat behavior, and campaign-driven registry selection.
- Exercised the normal migration runner against a timestamped copy named
  `dm_helper.task024-validation-20260912-233534.db`, never against the live
  file. The copy contained 5 characters. All 77 selected scalar values for
  every character matched their pre-migration values exactly, all 5 extension
  rows were present, and JSON parsed successfully. The real copy contained 0
  gear, 0 powers, 0 spells, 0 feats, and 0 weapons; the in-memory migration test
  separately proves non-empty gear/spell/weapon arrays retain full source rows.
- Real-data spot checks included character 1 (AC 12, Perception rank 0, Wisdom
  save 0, level-1 slots 0), character 2 (AC 10 with the same checked defaults),
  and character 6 (AC 10 with the same checked defaults).
- Called migration 014 directly a second time on the migrated copy and compared
  all stored D&D JSON strings; they were byte-for-byte unchanged.
- Compared the live `dm_helper.db` SHA-256 hash and UTC modification time before
  and after copy validation; both were unchanged. The timestamped validation
  copy was deleted and is not committed.
- Existing sheet, dice, and PDF tests remained green. No manual browser claim is
  made: those paths were deliberately not cut over in this partial pass.

### Assumptions and design calls

- Treated the old `character_system_data` mechanism as unused after repository
  grep confirmed there are no runtime readers or writers. Migration still
  preserves any unexpected rows rather than discarding them.
- Chose one document per character/namespace instead of field-per-row EAV data.
  This is the simplest shape approved by ADR-005, makes the plugin boundary
  explicit, and allows each plugin to version its own document.
- Included class/species features, D&D currency/attunement, and all five named
  related tables in the snapshot because the task describes the entire D&D
  sheet block and those related resources as the extraction boundary. Amber
  columns and system-neutral percentile abilities are excluded.
- Preserved legacy source storage in this pass. Removing it before all route and
  browser reads/writes are cut over would make existing behavior unsafe.

### Done versus not done

- Done and verified: generalized table shape; compatibility migration from the
  old escape hatch; exhaustive existing-character D&D snapshots; related-row
  snapshots; fresh/in-memory migration coverage; copied-real-database coverage;
  idempotency; D&D server manifest; campaign-to-system registry lookup.
- Not done: runtime extension-data read/write API; legacy schema removal; route
  and view cutover; browser registry dispatch for sheet/dice/PDF; manual browser
  regression. These are the explicit blocker above.

### Unresolved risks

- Until cutover, extension documents are point-in-time migration snapshots and
  can become stale when legacy routes write character data. They must not be
  treated as the runtime source of truth yet.
- The real database had no related-resource rows, so copy validation could only
  prove their empty-array representation. Non-empty related data is covered by
  real SQLite in-memory tests, not by production-copy examples.
- The precise transactional update strategy for editing multiple locations
  inside a JSON document remains a follow-up implementation call. It should be
  resolved while preserving current route response shapes and authorization.

### Documentation updated

- Updated this task's Blocker and Implementation handoff only. No architecture
  or unrelated task documentation was changed.

## Review

Not reviewed.

## Human acceptance

Pending.
