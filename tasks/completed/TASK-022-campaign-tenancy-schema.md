# TASK-022: Campaign tenancy schema (campaigns, campaign_members, campaign_characters)

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins); ADR-003 (universal core attributes — `story_arcs.game_system`
and `character_system_data` were added there as unused future extension
points this task's design supersedes/formalizes).
Dependencies: None (first schema task in the ADR-005 sequence; TASK-023
depends on this one).

## Desired outcome

A `campaigns` table exists as the top-level tenant object; a `campaign_members`
table records each user's role within a specific campaign; a
`campaign_characters` table records which campaigns a character is currently
linked into (many-to-many, since ADR-005 allows a character to be played
concurrently across campaigns with one shared sheet). Every genuinely
campaign-owned table gains a `campaign_id` foreign key. The existing database's
current data is migrated in place to become **campaign #1** — system `dnd5e`,
universe `amber`, name "The Shattering of the Liminal" — with no data loss and
no behavior change for the existing single campaign.

This task is schema and data migration only. It does not change any route's
authorization logic (that's TASK-023) and does not build the system/universe
plugin mechanism itself (that's TASK-024/TASK-025) — it only makes the
tenancy structure exist and correctly reflect current reality.

## Context

Today there is no campaign/tenant concept at all — `dm_helper.db` itself is
the only "campaign," and no table has any notion of which campaign a row
belongs to. Confirmed tables that need a `campaign_id` (per
`src/database/schema.sql` and `src/database/migrations/003-feature-tables.js`):
`shadows`, `npcs`, `campaign_sessions`, `character_progress`, `feat_log`,
`attribute_claims`, `perceived_rankings`, `claim_point_pools`, `claim_history`,
`journal_entries`, `story_arcs`, `chapters`, `beats`, `beat_chapters`, plus
whatever else a fresh grep for tables without a natural per-character or
per-user scope turns up (verify against the full current schema — migrations
have been added since the last audit, e.g. familiars in
`007-familiars.js`, primal patterns in `008-primal-pattern-category.js`).

`characters` is the one table that does **not** get a simple `campaign_id`
column, per ADR-005's explicit decision: characters relate to campaigns
many-to-many through `campaign_characters`, because the group wants a
character playable concurrently across separate campaigns with one shared
sheet (no per-campaign forking of stats).

`users` (`schema.sql` lines ~372-381) has no campaign reference today and
should not gain one directly — a user's relationship to campaigns is entirely
expressed through `campaign_members` (their role can differ per campaign).

`story_arcs.game_system` (added unused in migration
`009-universal-core-attributes.js`) is currently scoped per-character, not
per-campaign, and is a red herring for "which system a campaign uses" — that
belongs on the new `campaigns.system_id` column instead. Leave
`story_arcs.game_system` alone in this task (don't repurpose or remove it
without a separate, deliberate decision); TASK-024 is where the real system
identifier gets wired up.

The existing single-DM/single-campaign data must migrate to campaign #1
without loss — this is a live-data migration, same class of risk as ADR-003's
percentile migration (TASK-014): it must be backed up, idempotent, and
verified against a copy of the real database, not just a fresh schema.

## Scope

### Included

- New migration (next sequential number after 012) creating:
  - `campaigns (id, name, owner_user_id, system_id, universe_id, created_at,
    updated_at)`. `system_id`/`universe_id` are plain text identifiers at this
    stage (e.g. `'dnd5e'`, `'amber'`) — the registries that give those
    identifiers real behavior are TASK-024/TASK-025's job, not this task's.
  - `campaign_members (id, campaign_id, user_id, role, created_at)` with a
    unique constraint on `(campaign_id, user_id)`. `role` at minimum
    distinguishes DM vs. player within that campaign.
  - `campaign_characters (id, campaign_id, character_id, current_shadow_id,
    joined_at)` or similar — the per-link fields that describe a character's
    state *within* a specific campaign (e.g. current location in that
    campaign's story) as called out in ADR-005, distinct from the character's
    own shared sheet data. Exact additional columns beyond `campaign_id`/
    `character_id` are the implementer's call, based on what's genuinely
    campaign-specific about a character's participation versus what's part of
    the shared sheet — note the reasoning in the handoff.
  - `campaign_id` columns (with FK) added to every genuinely campaign-owned
    table identified in Context, via guarded `ALTER TABLE ... ADD COLUMN`
    following the existing idempotent migration style (e.g.
    `005-spoiler-flag.js`'s `PRAGMA table_info` guard pattern).
- Data backfill, in the same migration: create one `campaigns` row
  representing the existing campaign (`name = 'The Shattering of the
  Liminal'`, `system_id = 'dnd5e'`, `universe_id = 'amber'`,
  `owner_user_id` = the existing DM user — identify this correctly, e.g. the
  user with `is_dm = 1`, or ask in the handoff if more than one such user
  exists), a `campaign_members` row for every existing user (DM and each
  player) against that campaign with the appropriate role, a
  `campaign_characters` row linking every existing character to that
  campaign, and the new `campaign_id` on every other affected row set to that
  campaign's id.
- Idempotency: safe to run twice without creating a duplicate campaign or
  duplicate membership/link rows (matching the durable-marker approach
  `009-universal-core-attributes.js` used, or an equivalent guard —
  implementer's call, document the choice).
- Update `src/database/schema.sql` to include the new tables in the same
  hand-organized style as the rest of the file (per the precedent set in
  TASK-020), so a fresh install's baseline reflects them — or, if the
  implementer judges these are better treated as migration-only new tables
  (the established pattern for `journal_entries`, `story_arcs`, etc. per
  TASK-020's own scope boundary), follow that precedent instead. State which
  approach was taken and why in the handoff.

### Excluded

- No route or middleware changes, no authorization logic — every existing
  route continues to behave exactly as before this task (TASK-023 is where
  routes start actually filtering by campaign). This task only makes the data
  and its shape exist.
- No UI (no campaign switcher, no campaign creation form) — that's part of
  TASK-023.
- No change to what `system_id`/`universe_id` actually do at runtime — they
  are inert identifiers on `campaigns` in this task, the same way
  `story_arcs.game_system` was inert when ADR-003 added it.
- No change to `character_system_data`, `story_arcs.game_system`, or any
  existing table's non-campaign columns.

## Plan

1. Grep the full current schema (`schema.sql` plus every migration) for every
   table lacking a natural per-character/per-user scope, to get the
   authoritative list of tables needing `campaign_id` — treat the Context
   list as a starting point, not the final word (same caution TASK-020 used).
2. Write the new migration: table creation, guarded `campaign_id` additions,
   and the backfill logic, in that order within one transaction-wrapped
   migration file.
3. Test the migration against a fresh in-memory database (full chain from
   `schema.sql`) and confirm the new tables and columns exist with correct
   backfill logic against seed data.
4. Test the migration against a copy of the real `dm_helper.db` (never the
   live file directly) — confirm exactly one campaign row is created, every
   existing user gets exactly one `campaign_members` row with the correct
   role, every existing character gets exactly one `campaign_characters` row,
   and every other affected table's existing rows get the correct
   `campaign_id`.
5. Run the migration twice against the same copy and confirm no duplicates or
   double-backfill.
6. Decide and document the `schema.sql`-vs-migration-only approach for the
   new tables.
7. Run the full test suite.

## Acceptance criteria

- [x] `campaigns`, `campaign_members`, and `campaign_characters` tables exist
      with the columns described above.
- [x] Every genuinely campaign-owned table gains a working `campaign_id`
      foreign key.
- [x] `characters` itself gains no `campaign_id` column — its relationship to
      campaigns is exclusively through `campaign_characters`.
- [x] Running the migration against a copy of the real database produces
      exactly one campaign (matching the existing DM/players/characters/data),
      with no rows lost or duplicated.
- [x] The migration is idempotent — running it twice produces the same result
      as running it once.
- [x] No existing route's behavior changes (the app works exactly as it did
      before this task, since no route reads `campaign_id` yet).
- [x] `npm test` passes.

## Validation requirements

- `npm test`, including new coverage for the migration's backfill logic and
  idempotency (following the pattern of `009-universal-core-attributes.js`'s
  and `010`/`011`/`012`'s idempotency tests).
- Migration run against a **copy** of `dm_helper.db`, not the live file,
  with before/after row counts and spot-checked FK values confirmed by hand
  for at least a few real characters/users/shadows.
- Confirm double-run safety against the same copy.

## Risks and assumptions

- **Primary risk: live data.** This migration touches nearly every table in
  the database by adding a foreign key and backfilling it. Follow the same
  backup-and-copy-first discipline TASK-014 used, and flag explicitly before
  this ever runs against the real `dm_helper.db` (it will run automatically
  on next server start per `src/server.js`'s unconditional
  `runMigrations(getDatabase())`, so the real backup needs to happen before
  that deploy, not just during this task's own validation).
- Assumes exactly one existing DM user backfills as `campaigns.owner_user_id`
  — if the real database has more than one `is_dm = 1` user, the implementer
  must surface this rather than guessing, since ADR-005 doesn't specify how
  to handle a pre-existing multi-DM database.
- The exact extra columns on `campaign_characters` (beyond `campaign_id`/
  `character_id`) are left to implementer judgment per ADR-005's own framing
  ("per-link fields such as the character's current shadow/location") —
  document the reasoning, since this is genuinely a small design choice
  within an otherwise mechanical task.

## Blocker

Resolved 2026-09-12 by Patrick: of the three `is_dm = 1` users found in the
real `dm_helper.db` (`testdm` id 1, `mrdatawolf` id 3,
`lucas.norman@gmail.com` id 6), **user id 3 (`mrdatawolf`) owns campaign #1**
("The Shattering of the Liminal"). Backfill `campaigns.owner_user_id = 3` for
that campaign. The other two `is_dm = 1` users still get a `campaign_members`
row for campaign #1 with the DM role (per the task's original backfill
scope — every existing user gets a membership row with their appropriate
role); only the single `owner_user_id` column on `campaigns` itself was
ambiguous and is now resolved. Implementation may proceed.

## Implementation handoff

Task: TASK-022 — Campaign tenancy schema
Implementer: openai-coder (Codex CLI)
Date: 2026-09-12

### Changes made

- Added `013-campaign-tenancy.js`. It creates `campaigns`,
  `campaign_members`, and `campaign_characters`; adds guarded nullable
  `campaign_id` foreign keys to all 25 campaign-owned tables found by the
  full schema/migration audit; and backfills all existing data to campaign
  #1 in the migration runner's transaction.
- Backfilled campaign #1 as "The Shattering of the Liminal" with system
  `dnd5e`, universe `amber`, and the human-resolved owner user id 3
  (`mrdatawolf`). Every user receives one membership, with every legacy
  `is_dm = 1` user assigned `dm` and all other users assigned `player`.
- Linked every existing character through `campaign_characters` and copied
  its current `characters.current_shadow_id` into the link's
  `current_shadow_id`. `characters` itself did not receive `campaign_id`.
- Used campaign id 1 plus `ON CONFLICT`/`INSERT OR IGNORE` and guarded column
  additions as durable idempotency markers. Re-running the migration updates
  only still-null legacy tenant columns and creates no duplicate campaign,
  membership, or character-link rows.
- Updated `schema.sql` with the new tenancy tables and `campaign_id` columns
  on tables it already defines, preserving its hand-organized style and the
  permanent schema-sync invariant from TASK-020. No route, middleware, UI,
  or non-campaign column behavior changed.

### Validation performed

- `node --test tests/schema-sql-sync.test.js tests/migration.test.js` — passed
  (9/9). The new migration test uses a fresh in-memory database, seeds four
  users including all three legacy DM identities, runs migration 013 twice,
  verifies the campaign/member/character backfill, checks all 25 tenant
  columns and foreign keys, and confirms `characters.campaign_id` is absent.
- Created the timestamped validation copy
  `dm_helper.db.task-022-validation-20260912-231932` before applying the final
  logic. Its initial SHA-256 matched the live `dm_helper.db`; all migration
  validation was run against the copy, never the live file. The copy is
  excluded from staging and was not committed.
- Copy-database before/after row counts were identical for all 25 affected
  tables: shadows 21, NPCs 8, sessions 2, progress 1, feat log 1, claims 3,
  perceived rankings 0, point pools 5, claim history 3, journals 3, arcs 5,
  chapters 8, beats/beat links 0, grand narrative 1, session association
  tables 0, primal patterns 3, primal sections 17, and tracker tables 0.
  Every existing row had `campaign_id = 1` afterward.
- Copy-database spot checks confirmed shadows 1–5 have `campaign_id = 1`;
  all five characters received one campaign link; and Aelindra Moonshadow's
  link retained current shadow id 3. `PRAGMA foreign_key_check` returned no
  violations.
- Copy-database membership checks confirmed all seven existing users received
  exactly one row. The three original `is_dm = 1` users — `testdm` id 1,
  `mrdatawolf` id 3, and `lucas.norman@gmail.com` id 6 — all received role
  `dm`; users 2, 4, 5, and 7 received role `player`. The single campaign row
  has `owner_user_id = 3`.
- Ran migration 013 a second time against the same copy. Counts remained one
  campaign, seven memberships, five character links, and unchanged counts in
  every affected source table, with no null campaign ids or FK violations.
- `npm test` — passed (75/75).

### Acceptance criteria evidence

- All three tenancy tables and their uniqueness/role constraints exist; every
  audited campaign-owned table has a foreign key to `campaigns`.
- Fresh-database tests and copied-live-data validation both prove complete
  backfill and double-run safety without lost or duplicated rows.
- Existing route behavior remains covered by the complete passing API and
  tracker suites; no runtime route code changed.

### Assumptions and design calls

- **`campaign_characters` per-link fields:** included `current_shadow_id` and
  `joined_at` in addition to the two foreign keys. Current location is story
  state within one campaign and can legitimately differ when the shared sheet
  participates in multiple campaigns; the migration seeds it from the legacy
  character column without removing or repurposing that column. `joined_at`
  records link lifecycle. No shared stats or other character-sheet fields were
  duplicated.
- **`schema.sql` placement:** included the new tables in `schema.sql`, while
  retaining guarded `CREATE TABLE IF NOT EXISTS` statements in migration 013.
  Unlike historical migration-only feature tables, these tables are the
  parent targets of foreign keys added to nine existing baseline tables.
  Defining them in the baseline keeps those FKs valid during fresh setup and
  satisfies TASK-020's permanent schema-only versus fully-migrated shape test;
  keeping the migration DDL remains necessary for existing databases.
- The owner-selection helper prefers the explicitly resolved user id 3 when
  that user is a DM. For fresh/test databases without that historical id it
  uses the lowest-id DM, or null when no DM exists, avoiding a dangling FK;
  this fallback does not alter the resolved live-data result.

### Deviations and unresolved risks

- No scope deviations or unresolved blockers were identified.
- The live database has not been migrated. Migration 013 will run
  automatically on the next server start, so the task's deployment warning
  still applies: take the normal production backup before that start.

### Documentation updated

- Updated this implementation handoff and acceptance-criteria status. No ADR
  change was needed; implementation follows ADR-005.

## Review

Reviewer: Claude
Date: 2026-09-13

Verified independently rather than trusting the handoff's self-report:

- `git show --stat 2af910e`: exactly the four expected files changed
  (`013-campaign-tenancy.js`, `schema.sql`, `tests/migration.test.js`, and
  this task file) — no route, middleware, or UI file touched, matching the
  task's Excluded scope.
- Read the full migration and confirmed each idempotency mechanism actually
  works: `CREATE TABLE IF NOT EXISTS`, a `PRAGMA table_info` guard before each
  `campaign_id` column addition, `ON CONFLICT(id) DO NOTHING` for the single
  campaign row, `INSERT OR IGNORE` against `UNIQUE(campaign_id, user_id)` /
  `UNIQUE(campaign_id, character_id)` for memberships and character links, and
  an `UPDATE ... WHERE campaign_id IS NULL` backfill that only ever touches
  still-null rows.
- **Independently re-ran the migration myself against a fresh copy of the
  real `dm_helper.db`** (not the handoff's copy, my own), calling `up(db)`
  twice in a row: resulted in exactly one campaign
  (`owner_user_id = 3`, `dnd5e`/`amber`), 7 `campaign_members` rows (3 `dm` —
  matching all three legacy `is_dm=1` users `testdm`/`mrdatawolf`/
  `lucas.norman@gmail.com` — and 4 `player`), 5 `campaign_characters` rows (one
  per existing character), zero `NULL campaign_id` rows in `shadows`/`npcs`,
  zero `PRAGMA foreign_key_check` violations, and confirmed `characters`
  itself has no `campaign_id` column. This matches the handoff's claimed
  numbers exactly and proves idempotency directly rather than trusting the
  self-report. The copy was deleted after verification; the live
  `dm_helper.db` was never touched by my check or (per the handoff, and
  consistent with its absence from the commit) by Codex's.
- Read `tests/migration.test.js`'s new test (`013 creates and idempotently
  backfills campaign tenancy`): it's a real, non-vacuous test — it seeds the
  exact multi-DM scenario (`testdm`/`player`/`mrdatawolf`/
  `lucas.norman@gmail.com`) that produced the original blocker, asserts exact
  membership roles and campaign/character-link contents, iterates every
  `CAMPAIGN_TABLES` entry for both the column and its FK, and explicitly
  asserts `characters` does *not* get `campaign_id` — directly encoding
  ADR-005's many-to-many decision as a regression guard.
- Ran `npm test` myself: 75/75 passing, matching the handoff.
- **`schema.sql` placement decision**: sound and well-reasoned — the three new
  tenancy tables are the FK *targets* for columns added to nine
  already-baseline tables, so they belong in `schema.sql` for a fresh install
  to have valid foreign keys from the start, unlike TASK-020's migration-only
  precedent (which covered tables with no such baseline FK dependency). The
  other sixteen `CAMPAIGN_TABLES` entries correctly stay migration-only,
  consistent with that precedent.
- **`campaign_characters` extra columns** (`current_shadow_id`, `joined_at`):
  reasonable and minimal — correctly seeds from the legacy
  `characters.current_shadow_id` without removing or repurposing that column,
  and doesn't duplicate any shared-sheet data, consistent with ADR-005's
  "one shared source of truth" decision.
- Cleaned up two leftover timestamped validation database copies
  (`dm_helper.db.task-022-validation-*`) that were left untracked in the repo
  root after Codex's work — harmless (untracked, correctly excluded from the
  commit) but worth removing rather than leaving stray multi-hundred-KB
  database copies lying around.

One non-blocking observation: `chooseOwnerUserId()` hardcodes the literal user
id `3` as the historically-resolved owner, with a fallback to the lowest-id DM
for databases where that id doesn't apply. This is a reasonable, clearly
commented, one-time reconciliation for this specific live dataset — in the
same spirit as migration 001's legacy-specific column renames — but a future
reader encountering `id === 3` in permanent migration source without reading
the comment could reasonably be confused. Not worth blocking on; ADR-005 and
this review record the reasoning if it ever needs re-deriving.

No blocking findings. All acceptance criteria are genuinely satisfied — this
was independently verified against real data, not just checked off. Ready for
human acceptance. Per the task's own note (and TASK-014's precedent), the live
`dm_helper.db` has not yet been migrated — it will migrate automatically on
the next server start, so take the normal backup before that deploy.

## Human acceptance

Pending.
