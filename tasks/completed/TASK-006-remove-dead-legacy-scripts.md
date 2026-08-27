# TASK-006: Remove confirmed-dead legacy database scripts

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

The three confirmed-dead legacy migration scripts are removed from the
working tree, reducing the surface area of code that looks live but isn't.
Git history preserves them if ever needed for reference.

## Context

`src/database/legacy/migrate-argent-refrain.js` (435 lines),
`src/database/legacy/migrate-primal-patterns.js` (430 lines), and
`src/database/legacy/expand-character-sheet.js` (176 lines) — 1,041 lines
total — are confirmed to have zero references anywhere in `src/` or
`package.json`. `src/database/migrate.js` only scans
`src/database/migrations/` (a different, current directory); it never reads
from `src/database/legacy/`.

This is explicitly the **lowest-risk, quickest win** among the findings in
this batch: deleting unreferenced files that are already established as
historical-only per `src/database/legacy/README.md` ("These one-off scripts
built up the production schema before the migration runner existed... kept
for historical reference only — do not run them.").

Note for whoever implements this: `src/database/legacy/` currently contains
16 other files beyond these three (e.g., `migrate-claims.js`, `migrate-auth.js`,
`add-journal-table.js`, `initialize-claim-pools.js`, and others), plus the
README. The prior review that produced this finding only explicitly verified
these three as zero-reference dead code — it did not claim the same for the
rest of the directory. **Do not delete anything beyond these three files**
without independently re-confirming zero references for each additional file
first; that's explicitly out of scope here.

## Scope

### Included

- Deleting exactly:
  - `src/database/legacy/migrate-argent-refrain.js`
  - `src/database/legacy/migrate-primal-patterns.js`
  - `src/database/legacy/expand-character-sheet.js`
- Re-verifying, immediately before deletion, that none of the three are
  referenced anywhere in `src/`, `package.json`, or `tests/` (a quick grep for
  each filename), since time may have passed since this task was written.

### Excluded

- Any other file currently in `src/database/legacy/`, including the README.
- Any change to `src/database/migrate.js` or the migrations pipeline.

## Plan

1. Grep the repository for each of the three filenames (`migrate-argent-
   refrain`, `migrate-primal-patterns`, `expand-character-sheet`) to reconfirm
   zero references outside `src/database/legacy/` itself.
2. Delete the three files.
3. Run `npm test` and `npm start` (or at least `npm run migrate`) to confirm
   nothing broke.

## Acceptance criteria

- [ ] The three named files no longer exist in the working tree.
- [ ] No other file in `src/database/legacy/` was touched.
- [ ] `npm test` passes.
- [ ] The app starts cleanly (`npm run migrate` and/or `npm start` succeed)
      after the deletion.

## Validation requirements

- Pre-deletion grep confirming zero references, recorded in the
  implementation handoff.
- `npm test` and a startup check (`npm run migrate`, or full `npm start`
  followed by a basic health check) after deletion.

## Risks and assumptions

- Very low risk given the prior confirmed zero-reference finding — this is
  flagged as the safest task in this batch and a good candidate to approve
  and implement first if the human wants an easy, low-stakes starting point.
- Git history fully preserves the deleted files' content if ever needed again.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-25.

What changed:
- Deleted `src/database/legacy/migrate-argent-refrain.js`,
  `src/database/legacy/migrate-primal-patterns.js`, and
  `src/database/legacy/expand-character-sheet.js`. No other file in
  `src/database/legacy/` (17 files + README remain) was touched.

Validation performed:
- Re-grepped the whole repo (excluding `node_modules`/`.git`) for each of the
  three filenames immediately before deletion. Zero external references
  found; the only hit was a self-referential comment inside
  `migrate-argent-refrain.js` itself (`// Run once: node
  src/database/migrate-argent-refrain.js`), which was deleted along with the
  file.
- `npm test`: 32/32 passing, no changes to test expectations required.
- `npm run migrate`: ran cleanly against the existing dev database
  (`Migrations up to date.`).

Deviations/assumptions: none. Scope followed exactly as written.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-25.

Method: reviewed the working-tree diff in isolation (unrelated in-progress
scaffolding changes were stashed out for the duration of the review so only
the three deletions were visible). Codex independently pulled the deleted
files' prior content from git history (`git show HEAD:...`) and cross-checked
it against `src/database/schema.sql` and `src/database/migrations/*.js`
rather than relying on this task's own claims.

Finding: confirmed the deletions are safe. `migrate-primal-patterns.js`'s
schema (the `primal_patterns`, `primal_pattern_sections`, and
`character_pattern_lore` tables) is superseded by
`src/database/migrations/003-feature-tables.js`; `expand-character-sheet.js`'s
column additions (e.g. `subclass`) are superseded by
`src/database/migrations/002-expand-character-columns.js`. No active code
references any of the three removed files. No issues raised.

## Human acceptance

Pending.
