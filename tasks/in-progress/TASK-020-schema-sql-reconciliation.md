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

- [ ] A comparison between a `schema.sql`-only database and a fully
      `runMigrations`-applied database shows zero column/type/default
      discrepancies, for every table defined in `schema.sql`.
- [ ] `schema.sql`'s existing comments and per-table organization are
      preserved; new columns are added consistent with that style, not via
      a wholesale mechanical regeneration.
- [ ] No table that was previously absent from `schema.sql` has been added
      to it.
- [ ] No migration file's logic changed (diff should show `schema.sql` and
      new/changed test files only).
- [ ] A permanent test guards this invariant going forward and is part of
      the normal `npm test` run.
- [ ] `npm test` passes.

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

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
