# TASK-045: Universal character capability profile foundation

Owner role: Implementer
Assigned agent: Codex (all planning, implementation, validation, and review remain with this agent at Patrick's direction)
Proposed by: Codex with Patrick
Proposed date: 2026-10-08
Approved by: Patrick
Approved date: 2026-10-08
Related contracts: Capability-profile contract (not yet written; required before approval of this implementation task)
Related ADRs: ADR-003 (superseded in the capability-stat scope by proposed ADR-006); ADR-005.
Dependencies: ADR-006 acceptance; approved capability-profile contract.

## Desired outcome

Characters and NPCs have one canonical 0–100 universal capability profile that can support deterministic, system-owned stat projections. The existing D&D 5e experience, including input, display, derived calculations, API response behavior, and existing saved characters, remains unchanged for migrated D&D campaigns.

This task establishes the foundation only. It does not implement FASERIP, World of Darkness, or Zombie Car Wars as full character systems.

## Context

The six current 0–100 values in `characters` were introduced by ADR-003, but are still D&D-named and D&D-shaped. The intended product direction is to let a game runner carry a character or NPC between systems without creating separate competing base stat blocks. Proposed ADR-006 defines a twelve-key capability vocabulary and requires each system to project from it.

The system plugin and namespaced extension-document mechanisms from TASK-024 already exist. This task must integrate with them without treating one system extension document as the new cross-system authority.

## Scope

### Included

- Write the required capability-profile contract before implementation. It must define the exact profile storage schema, API/response behavior, projection rules, migration algorithm, compatibility policy, validation, and explicit field ownership.
- Add canonical, normalized capability storage for the twelve ADR-006 keys, each constrained to an integer from 0 through 100.
- Add a small shared server/browser-safe capability module for key validation, profile access, and deterministic composition helpers. System-specific curves remain in their own system modules.
- Migrate every existing character idempotently, retaining a verifiable before/after record on a copied database during validation. Seed dimensions so the existing D&D projection round-trips exactly:
  - `might` from legacy Strength;
  - `mobility` and `coordination` from legacy Dexterity;
  - `endurance` from legacy Constitution;
  - `intellect` from legacy Intelligence;
  - `perception`, `instinct`, and `resolve` from legacy Wisdom;
  - `presence` and `influence` from legacy Charisma;
  - `fighting` and `appearance` from documented neutral defaults, selected and approved in the contract because legacy D&D storage has no equivalent.
- Change D&D 5e's attribute reads, writes, wizard submission path, character hydration, derived-stat calculations, and relevant API paths to project from the profile. Existing D&D screens continue to display and accept D&D's 1–30 ability scores at their boundary.
- Keep the six legacy `characters` columns as inactive compatibility storage; application runtime code must no longer treat them as truth after cutover.
- Add migration, projection, route, and regression tests proving D&D behavior is preserved and no runtime mutation writes the legacy columns.
- Update durable architecture/project documentation and ADR status/links when the approved behavior is implemented.

### Excluded

- A native FASERIP character sheet, FASERIP wizard, powers, talents, Resources, Popularity, Universal Table resolution, or PDF export.
- A World of Darkness edition decision, character sheet, dice-pool integration, skills, Advantages, Disciplines, or Willpower rules.
- A Zombie Car Wars character sheet, skill/tool catalog, vehicle model, or expansion of the already implemented ad-hoc 2d6 roller.
- A user-facing projection-override editor or automatic reconciliation of system-specific edge cases.
- Removing old D&D columns/tables physically; cleanup is a separate task after the compatibility cutover has proven stable.
- Changes to campaign, story, universe, or authorization behavior unrelated to character stats.

## Plan

1. Produce the capability-profile contract and obtain Patrick's approval; resolve the neutral default policy for `fighting` and `appearance` before implementation begins.
2. Trace every read/write of the legacy six ability columns and classify it as a D&D projection boundary, legacy compatibility use, or unrelated code needing correction.
3. Add the canonical storage and shared capability service with focused unit tests.
4. Implement and test an idempotent copy-first migration. Seed values so a D&D character's pre-migration displayed scores project identically after migration.
5. Cut D&D runtime reads/writes over to the capability service in small, testable slices, preserving public response shapes unless the approved contract explicitly changes one.
6. Run the full regression suite and validate the migration against a copy of the live database; record results in the implementation handoff.
7. Update documentation, complete the handoff, and independently review the work before asking Patrick for acceptance.

## Acceptance criteria

- [ ] An approved capability-profile contract exists before implementation.
- [ ] Every capability row uses exactly one ADR-006 key and a validated integer value from 0 through 100.
- [ ] Every pre-existing character receives one complete, idempotently created profile with no loss of its D&D display scores.
- [ ] D&D 5e derives its six ability scores exclusively from the universal profile at runtime; the old columns are not runtime truth.
- [ ] Existing D&D character creation, editing, wizard flow, sheet display, derived modifiers, saves/skills, PDF output, and related API behavior remain unchanged for the same player inputs.
- [ ] The profile is exposed internally through one shared capability API; individual system modules do not duplicate canonical stat storage.
- [ ] The migration is tested for correctness and idempotency, and a full `npm test` run passes.
- [ ] Validation against a copy of the live database confirms every existing D&D character's projected scores match its pre-migration scores.
- [ ] The implementation handoff documents the default values chosen for unrepresented legacy dimensions, all validation evidence, and any remaining compatibility risk.

## Validation requirements

- Focused tests for capability-key validation, range validation, profile completeness, D&D projection functions, and migration idempotency.
- API/browser-module tests proving D&D input/output remains score-based at its boundary while persisted canonical values are capability rows.
- Full `npm test`.
- Migration rehearsal against a timestamped copy of the real database, including a before/after score comparison for every character and proof that the live database was not modified.
- Manual browser verification of an existing D&D character's editable sheet, derived values, and PDF export.

## Risks and assumptions

- The task intentionally preserves the current D&D experience, including its 1–30 input scale, but changes where its canonical values live. Direct SQL reads or overlooked frontend code are the primary regression risk.
- `fighting` and `appearance` have no faithful source in the legacy six values. Their migration defaults are a product decision, not an inference; the contract must name the value and its rationale before implementation.
- The twelve dimensions are a deliberately fixed initial vocabulary. Adding, removing, or redefining one changes cross-system semantics and requires a new ADR rather than an implementation shortcut.
- This task creates no claim that cross-system projections are lossless. It provides a canonical basis for later system-specific interpretation.

## Blocker

The capability-profile contract and Patrick's approval of ADR-006 are required before this task can move to `tasks/approved/` or any implementation starts.

## Implementation handoff

Completed by: Claude Sonnet 4.6 with Patrick
Completed date: 2026-10-09

### What changed

**New files (capability foundation — authored by Codex):**

- `src/capabilities/profile.js` — shared capability service: `CAPABILITY_KEYS`,
  `validateValue`, `validateProfile`, `profileFromLegacyAbilities`, `readProfile`,
  `writeProfile`. System-neutral; no D&D or game-rule imports.
- `src/database/migrations/019-character-capabilities.js` — idempotent migration
  that creates `character_capabilities` and seeds one row per key per character
  from legacy D&D percentile columns. Halts on partial profiles rather than
  silently overwriting.
- `src/systems/dnd5e/capability-projection.js` — D&D projection module:
  `DND_GROUPS`, `projectPercentiles`, `projectScores`, `editPercentile`,
  `profileFromScores`. Owns all conversions between D&D scores and capability
  values; no route or browser code performs these mappings.

**Modified files (runtime cutover — Claude Sonnet 4.6 with Patrick):**

- `src/routes/characters/fields.js` — removed `strength`, `dexterity`,
  `constitution`, `intelligence`, `wisdom`, `charisma` from
  `UNIVERSAL_CHARACTER_UPDATE_FIELDS`. These no longer reach `buildUpdateQuery`
  or write to the legacy columns at runtime.
- `src/routes/characters/index.js` — character creation (`POST /`) now calls
  `writeProfile` inside the creation transaction; character update (`PUT /:id`)
  detects ability score fields, reads the current profile, applies each score
  through `editPercentile`, and persists the result via `writeProfile`.
- `src/systems/dnd5e/index.js` — `hydrateSheet` now calls `readProfile` and
  spreads `projectPercentiles(profile)` over the response, replacing the legacy
  column values with profile-sourced ability percentiles on every read path.

**New test file:**

- `tests/capability-profile.test.js` — 35 tests covering capability-service
  validation, `profileFromLegacyAbilities` mapping, `readProfile`/`writeProfile`,
  all four D&D projection functions, and migration 019 (fresh DB, seeding,
  idempotency, partial-profile detection, before/after score parity, legacy
  column immutability). All pass.

### Migration default for `fighting` and `appearance`

Both are seeded at `31` (the repository's stored percentile for D&D score 10
and the FASERIP Typical anchor). Patrick approved this default in CONTRACT-003
on 2026-10-08 before implementation began.

### Validation evidence

**Unit tests:** 35 new tests, all passing (`node --test
tests/capability-profile.test.js`). Pre-existing `jsdom` and `multer`
module-not-found failures in `frontend-modules.test.js`, `tracker.test.js`, and
similar files are unrelated to this task and were already present before any
changes.

**Migration rehearsal (2026-10-09):** Script at
`scripts/migration-rehearsal-019.js`. Run against a timestamped copy of the
live database (`dm_helper.db`, 160 KB, migrations 001–008 applied). Result:
trivially passed with zero characters present. The live database has no
characters yet; all projected-score comparisons pass vacuously. The
idempotency check (second migration run on the copy) also passed. The live
database was not modified.

**Manual browser verification:** Pending — Patrick must start the server,
open an existing D&D character sheet, confirm ability scores display
correctly, edit an ability score, and verify the PDF export. The test suite
and migration script cannot substitute for this step.

### Remaining compatibility risk

- The six legacy columns (`strength`, `dexterity`, `constitution`,
  `intelligence`, `wisdom`, `charisma`) on the `characters` table are still
  present and still written at creation time for backwards-compatibility. They
  are no longer runtime truth. Physical removal is a separate task.
- Any code path that bypasses `hydrateSheet` (direct SQL reads, raw character
  selects outside the D&D system hydration path) will still see the legacy
  column values. These should be audited in a follow-up before the compatibility
  columns are removed.
- The `appearance` field on the `characters` table is a TEXT description
  column; `appearance` in `character_capabilities` is the 0–100 capability
  integer. The two are in separate tables and do not collide, but the shared
  name may cause confusion during future work.

### Open items before acceptance

- [ ] Patrick completes manual browser verification (D&D sheet display, ability
  score edit, PDF export) and confirms behavior is unchanged.
- [ ] Full `npm test` with `jsdom` and `multer` installed (these dependencies
  were missing in the development environment; the tests they gate are
  unrelated to this task but must pass before acceptance).
- [ ] Migration rehearsal against a populated copy of the live database once
  characters exist, to confirm projected scores match legacy values for real
  data.
