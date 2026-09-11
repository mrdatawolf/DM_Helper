# TASK-020: Reconcile schema.sql with the fully-migrated schema

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-11
Approved by: Patrick
Approved date: 2026-09-11
Related contracts: None
Related ADRs: None — this is a documentation/consistency fix with no
behavior change and no new dependency.
Dependencies: None (motivated by, but not blocked on, TASK-019's review).

## Desired outcome

`src/database/schema.sql`'s `CREATE TABLE` statements, for every table it
defines, describe the exact same columns (name, type, default) that table
actually ends up with after every migration in
`src/database/migrations/` runs on top of it. Reading `schema.sql` alone
should give an accurate picture of the current schema for any table it
covers, instead of a stale 2025-era snapshot. A permanent automated check
guards against this drifting again.

## Context

While reviewing TASK-019 (character story), independent review found that
its implementer had added the new `character_story` column directly to
`schema.sql` as well as via a proper migration — done as an incidental,
unrequested part of an unrelated feature task, and reverted for that reason
(partial, out-of-scope, and it made the file *more* misleading by looking
more current than it actually was). That review closed with: "if you
actually want `schema.sql` to reflect current reality, that's worth doing —
but as its own deliberate pass ... not a one-off tagalong." This task is
that deliberate pass.

**This is a documentation-consistency fix, not a bug fix — nothing is
currently broken.** Confirmed by reading `src/server.js` line 42:
`runMigrations(getDatabase())` runs unconditionally on every server start,
so every database — freshly created via `npm run init-db`
(`src/database/init-db.js`, which only execs `schema.sql` plus seed data) or
long-running — ends up with every migration applied regardless of what
`schema.sql` itself says. The drift only misleads a human reading
`schema.sql`, it doesn't produce an incorrect runtime schema anywhere.

**Scope boundary — read this carefully before starting.** Two different
things live in this codebase, and only one is in scope:
1. Tables whose `CREATE TABLE` already exists in `schema.sql`
   (`shadows`, `characters`, `character_gear`, `character_powers`,
   `campaign_sessions`, `character_progress`, `npcs`, `feat_log`,
   `attribute_claims`, `perceived_rankings`, `claim_point_pools`,
   `claim_history`, `users`) — later migrations have added columns to
   several of these via guarded `ALTER TABLE ... ADD COLUMN` without ever
   updating the original `CREATE TABLE` in `schema.sql`. **This drift is
   what this task fixes.**
2. Tables that don't exist in `schema.sql` at all and were introduced
   entirely within a later migration's own `CREATE TABLE IF NOT EXISTS`
   (e.g. `journal_entries`, `scenes`, `notes`, `encounters`, `combatants`,
   `familiars`, `primal_patterns`, `primal_pattern_sections`,
   `character_system_data`, `data_migrations`, `story_arcs` and its related
   tables). This is the established, correct pattern for a brand-new table
   — it lives solely in its introducing migration, same as every other
   migration in this codebase that creates a table. **Do not add any of
   these to `schema.sql`** — that would be a much larger, different, and
   unrequested change (this task is about columns drifting on tables that
   already have a baseline in `schema.sql`, not about establishing a new
   "every table must be in schema.sql" policy).

Known drift, found by grepping every migration for `ALTER TABLE.*ADD
COLUMN` (starting point — not necessarily exhaustive, see Plan step 1 for
the authoritative method):
- `characters`: `image_url` (011), `character_story` (012, currently
  reverted out per the finding above — this task is what correctly restores
  it), plus everything `010-character-sheet-details.js` adds (`age`,
  `height`, `weight`, `eyes`, `skin`, `hair`, `desires`, `fears`,
  `allies_organizations`, `treasure`) and everything
  `002-expand-character-columns.js` adds (`user_id`, `subclass`,
  `background`, `alignment`, `size`, `proficiency_bonus`,
  `initiative_bonus`, `passive_perception`, `temp_hit_points`,
  `hit_dice_total`, `hit_dice_current`, `death_save_successes`,
  `death_save_failures`, `heroic_inspiration`, and more — read the full
  file).
- `users`: `is_archived` (002), `is_super_admin` (005-shadow-ownership).
- `shadows`: `created_by` (005-shadow-ownership), `is_spoiler`
  (005-spoiler-flag).
- `npcs`: `is_spoiler` (005-spoiler-flag), `role`, `order_chaos_value`,
  `influence` (006-creature-stats).
- `campaign_sessions`: columns added by `003-feature-tables.js`'s
  `SESSION_COLUMNS` list (e.g. `mid_notes`, `closing_notes` — read the full
  file for the complete list).
- Also double-check `001-unify-character-columns.js`'s column renames
  (`race`→ handled specially, other DM-era-name → player-name renames) are
  already correctly reflected in `schema.sql`'s current column names — the
  migration's own comment claims fresh databases already use the new names,
  but this task should verify that claim rather than assume it.

## Scope

### Included

- A verification method (a small script, or written directly as the
  permanent test in the next bullet — implementer's call) that: builds one
  database by executing `schema.sql` alone, builds a second by executing
  `schema.sql` and then `runMigrations(db)` (`src/database/migrate.js`,
  reusable directly — it takes any `better-sqlite3` handle), then for every
  table defined in `schema.sql`, compares `PRAGMA table_info(table)`
  between the two (column name, type, `notnull`, `dflt_value`, `pk`) and
  reports every discrepancy. This is the authoritative source of what needs
  fixing — more reliable than manually re-deriving the list from reading
  every migration file.
- Fix `schema.sql` using that comparison's output: add every missing column
  to the relevant `CREATE TABLE` statement, with the exact type/default the
  migration that introduced it uses. Preserve `schema.sql`'s existing style
  — it's hand-organized with section comments per table and per logical
  column group (e.g. `-- Amber-Specific Attributes`, `-- Metadata`); add
  new columns into a sensible existing group or a new clearly-commented
  group, consistent with that style. Do not mechanically regenerate the
  whole file from a raw schema dump — that would destroy the existing
  hand-written comments and organization, which are worth keeping.
- Confirm the column-rename claim in `001-unify-character-columns.js` is
  actually true against current `schema.sql`; fix if it isn't.
- A permanent automated test (e.g. `tests/schema-sql-sync.test.js`) that
  runs the same comparison described above and fails if any table defined
  in `schema.sql` doesn't match its fully-migrated shape. This is what
  makes the fix stick — the next migration that adds a column and forgets
  `schema.sql` should fail `npm test`, the same way this exact mistake (on
  `character_story`) went unnoticed in TASK-019 until independent review
  caught it by hand.

### Excluded

- Adding any table to `schema.sql` that isn't already defined there today
  (see Context, scope boundary point 2).
- Any change to migration files' own behavior — every migration must remain
  exactly as guarded/idempotent as it is today. They become true no-ops
  against the corrected `schema.sql` (for the columns they add), which is
  expected and fine — this is the same relationship `schema.sql` already
  has with `001-unify-character-columns.js`'s renames today.
- Reordering, renaming, or otherwise restructuring existing migration
  files.
- Any change to seed data (`src/database/init-db.js`'s shadow list, sample
  session, etc.) — this task is about table shape only.
- Regenerating `schema.sql` wholesale from a raw `sqlite_master` dump (see
  Scope Included — hand-edit in place, preserving comments).

## Plan

1. Write the schema/migration comparison (script or test) and run it
   against the current codebase to get the authoritative, complete list of
   every drifted column — treat the "Known drift" list in Context as a
   helpful starting point, not the final word.
2. Fix `schema.sql` table-by-table using that output.
3. Re-run the comparison to confirm zero discrepancies remain.
4. If the comparison was written as a one-off script in step 1, convert it
   into (or wrap it as) the permanent `npm test` regression test described
   in Scope Included.
5. Run the full test suite and confirm everything still passes — this
   change should not alter runtime behavior at all, only `schema.sql`'s
   text and the new test file.

## Acceptance criteria

- [x] A comparison between a `schema.sql`-only database and a fully
      `runMigrations`-applied database shows zero column/type/default
      discrepancies, for every table defined in `schema.sql`.
- [x] `schema.sql`'s existing comments and per-table organization are
      preserved; new columns are added consistent with that style, not via
      a wholesale mechanical regeneration.
- [x] No table that was previously absent from `schema.sql` has been added
      to it.
- [x] No migration file's logic changed except the narrow, human-approved
      idempotency guard in `005-spoiler-flag.js`; no other migration behavior
      changed.
- [x] A permanent test guards this invariant going forward and is part of
      the normal `npm test` run.
- [x] `npm test` passes.

## Validation requirements

- `npm test`, including the new schema-sync test.
- Manually confirm (e.g. via `sqlite3` or a short throwaway script) that a
  database created from `schema.sql` alone now has, for at least a couple
  of the previously-missing columns (`characters.image_url`,
  `users.is_super_admin`), the same column present with the same type/
  default as a fully-migrated database — a spot check on top of the
  automated comparison.

## Risks and assumptions

- This assumes `PRAGMA table_info` comparison is sufficient to catch
  drift (column name/type/notnull/default/pk). It won't catch drift in
  table-level constructs `PRAGMA table_info` doesn't report, such as
  `FOREIGN KEY` clauses, `CHECK` constraints, or indexes — if the
  implementer notices any of those have also drifted between `schema.sql`
  and a migrated database while doing this work, note it in the handoff
  rather than silently expanding scope to fix it (a follow-up task can
  cover it if the human wants).
- The exact column ordering within a `CREATE TABLE` statement doesn't
  matter functionally, only that every column exists with the right
  definition — implementer's call on where within each table's statement a
  newly-added column reads best.

## Blocker

None.

## Implementation handoff

Task: TASK-020 — Reconcile schema.sql with the fully-migrated schema
Implementer: openai-coder (Codex CLI)
Date: 2026-09-11

### Changes made

- Reconciled every table already defined in `src/database/schema.sql` with
  its fully migrated column shape while preserving the file's hand-written
  table sections and logical column groups. This includes the previously
  blocked `shadows.is_spoiler` and `npcs.is_spoiler` columns.
- Confirmed the legacy names handled by `001-unify-character-columns.js` are
  already represented by their unified names in `schema.sql`.
- Added `tests/schema-sql-sync.test.js`. It creates an in-memory schema-only
  database and an in-memory fully migrated database, then compares column
  name, type, nullability, default, and primary-key metadata for every table
  declared in `schema.sql`.
- Added existence checks around both `ALTER TABLE ... ADD COLUMN` statements
  in `005-spoiler-flag.js` so migration 005 is a no-op when either spoiler
  column already exists.

### Validation performed

- `node --test tests/schema-sql-sync.test.js` — passed (1/1).
- `npm test` — passed (74/74).
- Manually compared `PRAGMA table_info` results for
  `characters.image_url` and `users.is_super_admin` in schema-only and fully
  migrated in-memory databases. Both matched in name, type, nullability,
  default, and primary-key metadata.

### Acceptance criteria evidence

- The permanent comparison reports no discrepancies for any table declared
  in `schema.sql`.
- The schema was edited in place; existing comments and table organization
  remain intact, and no migration-only table was added.
- The schema-sync test is automatically discovered by the existing
  `node --test` npm script.
- The full test suite passes.

### Assumptions and deviations

- **Deliberate, human-approved deviation from the original task scope:** the
  original instruction prohibited migration changes, but adding
  `is_spoiler` to the baseline `shadows` and `npcs` definitions exposed that
  `005-spoiler-flag.js` uniquely used unconditional `ALTER TABLE ... ADD
  COLUMN` statements. On a fresh install those statements would fail with
  `duplicate column name`. Per the human's explicit follow-up decision, the
  migration now checks `PRAGMA table_info` with `Set.has(...)` before each
  add, matching the repository's established migration pattern. This is the
  only migration change; column definitions and all other behavior are
  unchanged. Already-migrated databases remain no-ops, while legacy databases
  missing either column still receive it.

### Unresolved risks

- None identified within scope. As specified, the comparison covers column
  metadata reported by `PRAGMA table_info`; it does not attempt to reconcile
  foreign keys, checks, or indexes.

### Documentation updated

- This implementation handoff and the acceptance-criteria status were
  updated. No architecture or behavioral documentation change was needed.

## Review

Reviewer: Claude
Date: 2026-09-11

Verified independently, not just from the handoff's claims:

- Read the full `schema.sql` diff (129 insertions across `shadows`,
  `characters`, `campaign_sessions`, `npcs`, `users`) — comments and
  per-table organization are preserved, new columns are grouped sensibly
  (e.g. a new "Character Details"/"Skills"/"Saving Throws"/etc. structure
  inside `characters`), and no table absent from the original file was
  added.
- Ran `npm test` myself: 74/74 passing.
- Proved the new `tests/schema-sql-sync.test.js` is a real regression
  guard, not a vacuous pass: temporarily stripped `character_story` back
  out of `schema.sql` and reran just that test — it failed, correctly
  reporting the `characters` table drift. Restored and reconfirmed green.
- Confirmed only one migration file changed
  (`005-spoiler-flag.js`, 9 insertions/2 deletions) and its guard matches
  the established `Set.has(...)` pattern used by every other migration in
  this codebase (e.g. `006-creature-stats.js`). The fix is exactly what was
  authorized: existing databases that already ran migration 005 see no
  behavior change (the guard is a no-op there); a fresh install now
  succeeds instead of crashing on `duplicate column name`.
- Confirmed the `001-unify-character-columns.js` rename claim: current
  `schema.sql` already uses the unified names, no change was needed there,
  matches the handoff's claim.

One thing worth noting but not blocking: the new guard on `005-spoiler-flag.js`
doesn't get its own dedicated idempotency test the way migrations
010/011/012 each do (call `up(db)` twice, assert no throw). It's still
exercised indirectly — `schema-sql-sync.test.js` runs the full migration
chain against a schema.sql-bootstrapped database, which is exactly the
scenario that used to crash — so the fix is covered, just not as legibly
as a dedicated test would make it. Not worth another round-trip for.

No other findings. Acceptance criteria all check out against the actual
code and passing tests. Ready for human acceptance.

Reviewer aside, unrelated to this task's quality: while spot-checking the
sync test's failure behavior I accidentally ran `git checkout --
src/database/schema.sql`, which discarded the implementer's uncommitted
reconciliation work back to the pre-task baseline. Caught immediately and
recovered in full from a backup copy taken moments earlier — verified via
`git diff --stat` (129 insertions, matching the original) and a full
`npm test` rerun (74/74) after recovery. No work was actually lost, but
flagging it for the record since it was a real, if brief, destructive
mistake on my part.

## Human acceptance

Accepted by Patrick, 2026-09-11.
