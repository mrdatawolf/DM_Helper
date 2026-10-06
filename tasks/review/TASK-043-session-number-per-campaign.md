# TASK-043: Scope `campaign_sessions.session_number` uniqueness per campaign

Owner role: Implementer
Assigned agent: openai-coder
Proposed by: Claude
Proposed date: 2026-10-06
Approved by: Patrick
Approved date: 2026-10-06
Related contracts: None.
Related ADRs: ADR-005 (campaign as tenant root — this task fixes a schema
constraint that predates ADR-005's multi-campaign reality and was never
revisited when campaign scoping was added).
Dependencies: None. TASK-044 (campaign kind/one-off support) depends on this
task landing first.

## Desired outcome

Two different campaigns can each number their own sessions starting at 1
without a database-level conflict. `campaign_sessions.session_number`
uniqueness is enforced per campaign, not globally.

## Context

`campaign_sessions` already carries `campaign_id` (added by migration 013,
ADR-005) and every route that reads/writes sessions filters by
`req.campaign.id` (`src/routes/sessions.js`). But the column itself still has
a bare, global constraint:

```
src/database/schema.sql:271-284
session_number INTEGER NOT NULL UNIQUE,
```

This has been latent rather than broken because there has only ever been one
real campaign in practice. It stops being latent the moment a second campaign
tries to insert `session_number = 1` — which `POST /api/sessions`
(`src/routes/sessions.js:119-145`) does nothing to prevent, since it only
validates presence, not uniqueness scope. This is a pre-existing gap in the
ADR-005 migration (TASK-022), not something introduced by this task; it is
being raised now because an upcoming one-off-campaign feature (TASK-044) will
make "several campaigns each with sessions 1–3" the common case instead of a
hypothetical one.

## Scope

### Included

- A migration that replaces the standalone `UNIQUE` on `session_number` with
  a composite `UNIQUE(campaign_id, session_number)`. SQLite cannot alter a
  column constraint in place — this requires the rebuild-and-copy table
  pattern. Grep existing migrations for a prior table-rebuild precedent (e.g.
  any migration that changed a `CHECK` constraint) and follow the established
  style rather than inventing a new one.
- Update `src/database/schema.sql` to reflect the new composite constraint,
  in the same hand-organized style as the rest of the file.
- Verify (by grep, not assumption) that no route or query elsewhere depends
  on `session_number` being globally unique (e.g. a lookup by
  `session_number` alone with no `campaign_id` filter). Fix any such call
  site if found, or note in the handoff that none exist.

### Excluded

- No change to how `session_number` values are chosen or supplied — still
  client-supplied via the session creation form, still an implementer-visible
  manual field, not auto-incremented by this task.
- No UI change.
- No work on campaign "kind"/one-off classification — that is TASK-044,
  which depends on this task but is otherwise independent.

## Plan

1. Grep the full codebase for `session_number` usage to confirm every read
   and write is already scoped by `campaign_id`.
2. Write the migration: rebuild `campaign_sessions` with
   `UNIQUE(campaign_id, session_number)` replacing the standalone `UNIQUE`,
   preserving every existing row and all other columns/constraints exactly.
3. Update `schema.sql` to match.
4. Test against a fresh in-memory database (full migration chain) and against
   a copy of the real `dm_helper.db` (never the live file) — confirm existing
   data round-trips with no loss, and run the migration twice to confirm
   idempotency.
5. Add a regression test: two different campaigns can each insert
   `session_number = 1` (and `2`, `3`) without conflict; the same campaign
   still cannot reuse a `session_number` it already has.
6. Run the full test suite.

## Acceptance criteria

- [ ] Two different campaigns can each create sessions numbered starting at 1
      without a `UNIQUE` constraint violation.
- [ ] The same campaign still cannot have two sessions sharing one
      `session_number`.
- [ ] All existing session data for campaign #1 is preserved exactly
      (same rows, same `session_number` values) after migration.
- [ ] The migration is idempotent.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new coverage for the cross-campaign uniqueness case
  and the migration's idempotency.
- Migration run against a fresh in-memory database and against a **copy** of
  the real `dm_helper.db`, with before/after row counts and the new
  constraint's behavior documented in the handoff.
- Run the migration twice against the same copy to confirm double-run safety.

## Risks and assumptions

- SQLite requires a full table rebuild to change this constraint, which
  touches every existing row in `campaign_sessions` — same class of risk as
  prior schema-rewriting migrations in this project (e.g. TASK-014, TASK-022).
  Back up and verify against a copy before touching the live database.
- Assumes no code outside `sessions.js` reads or writes `session_number`
  without campaign scoping. The implementer must confirm this by grep rather
  than assume it, and flag anything found rather than silently fixing it if
  the fix would exceed this task's scope.

## Blocker

None.

## Implementation handoff

Task: TASK-043 — Session number uniqueness per campaign
Implementer: openai-coder
Date: 2026-10-06

### Changes made

- Added `src/database/migrations/017-session-number-per-campaign.js:1`:
  guarded, transactional table rebuild following migration 015's
  `transactional: false` / foreign-key-disable-and-restore pattern. Replaces
  only the global session-number constraint with
  `UNIQUE(campaign_id, session_number)`; preserves all columns, values,
  defaults, foreign keys, explicit indexes/triggers and AUTOINCREMENT high-water
  mark (lines 11, 15, 30, 40). Foreign-key checking occurs before commit (line 42).
- Updated the hand-organized session table in
  `src/database/schema.sql:270`, with the composite constraint at line 284.
- Added fresh-schema and legacy-rebuild regression cases in
  `tests/migration.test.js:352`, exercising the complete migration chain,
  sessions 1–3 in each of two campaigns, duplicate insert/update rejection,
  exact parent/child preservation, column/default/FK preservation, explicit
  index preservation, deleted-ID sequence preservation, direct double-run
  safety, and migration-runner double-run safety.
- Grep-first audit: `rg -n session_number . --glob '!package-lock.json'`.
  No runtime call site relies on globally unique session numbers.
  `src/routes/sessions.js:58`, creation at line 139 and updates at line 178
  are campaign-scoped. Progress reads (`src/routes/progress.js:28`, 62,
  208) and shadow aggregates (`src/routes/shadows.js:76`) join by session
  ID and campaign. Frontend usage is display/form state, not global lookup.
  `src/database/init-db.js:44` inserts the single unassigned initial seed;
  migration 013 backfills it. No call-site changes were necessary.

### Validation performed

- `node --test tests/migration.test.js tests/schema-sql-sync.test.js`:
  exit 0; `tests 14 / pass 14 / fail 0` (450.0954 ms).
- `npm test`: exit 0; `tests 131 / pass 131 / fail 0 / cancelled 0 /
  skipped 0 / todo 0` (17651.5491 ms). Output captured in the OS temporary
  directory as `dm-helper-task043-tests.log`.
- Timestamped real-file copy:
  `dm_helper.db.task-043-validation-20261006T232012795Z`.
  Only this copy was opened by SQLite. Its initial SHA-256 matched the source.
  Two direct `up(db)` calls each retained exact row objects for all 41
  application tables: sessions before 2, after 2, both in campaign #1.
  Added two disposable campaigns to the copy and inserted 1, 2, 3 in each:
  `Cross-campaign 1/2/3: PASS; same-campaign duplicates: REJECTED`.
  Ran the migration runner twice (first applied pending 016 and recorded 017):
  `runner double-run: PASS; foreign_key_check: 0; integrity_check: ok`.
  Deleted the copy and any copy sidecars in a finally block.
- Initial copy `dm_helper.db.task-043-validation-20261006T231951760Z`
  also preserved all 41 tables and both sessions on two direct runs, retained
  session sequence `seq: 6`, and had zero FK violations. Its disposable
  campaign fixture failed because the legacy campaigns table requires
  `universe_id`; corrected the fixture to supply `amber` and reran the
  complete validation above. That first copy was also deleted.
- Live database SHA-256 before and after both validations:
  `6414f61cecc0658ed1795a7b26fbdb3ca569e87baf8c9499df75518a06743c4f`.
  The live file was copied/hashed only; no SQLite connection or migration
  was run against it.
- `git diff --check`: exit 0, no whitespace errors.

### Acceptance criteria evidence

- Cross-campaign numbering: regression inserts 1–3 in campaigns 1 and 2
  (`tests/migration.test.js:391`); successful matching copy checks above.
- Within-campaign uniqueness: duplicate inserts and renumbering updates
  throw `SQLITE_CONSTRAINT_UNIQUE` in both regression variants.
- Existing campaign #1 data: exact before/after equality across all 41 real
  application tables, including both sessions; populated regression row
  exercises every session column and a referencing progress row (line 378).
- Idempotency: direct double-run assertions at lines 382–383 and runner
  repeat assertions at lines 398–401; both also validated on the copy.
- Full suite: 131 tests passed, zero failures.

### Assumptions and deviations

- No behavior or architectural deviation from the approved task. Nullable
  campaign IDs remain nullable, with SQLite's existing NULL uniqueness
  semantics; client-supplied numbering and the UI remain unchanged.
- Rebuild physically orders columns as schema.sql does; names, types,
  defaults, constraints other than the intended uniqueness change, and all
  row values are preserved. Copies of legacy schema may have campaign_id
  appended later than timestamps.
- Validation fixture was adjusted for the real copy's existing required
  universe_id; production campaign schema was not altered.

### Unresolved risks

- No known implementation blocker. Live migration remains pending normal
  application startup/deployment; validation intentionally used copies only.
  Independent review and human acceptance remain separate steps.

### Documentation updated

- This implementation handoff records the audit, validation results and
  assumptions. schema.sql now documents the approved constraint. No other
  behavior/architecture documentation required changes.

