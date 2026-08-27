# TASK-003: Extract a shared buildUpdateQuery helper

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None (independent of TASK-002; can proceed either way that
decision goes, since it operates within whichever layer ends up owning SQL —
routes today, models later)

## Desired outcome

One shared, unit-testable helper that builds a dynamic partial-UPDATE SQL
statement (`SET` clause + parameter list) from an `allowedFields` list and a
request body, replacing the near-identical version currently copy-pasted into
seven route files.

## Context

The same pattern — iterate over an `allowedFields` array, check which keys are
present in the incoming request body, and build up a parameterized `SET`
clause for a SQL `UPDATE` — is duplicated near-verbatim in:

- `src/routes/characters.js`
- `src/routes/npcs.js`
- `src/routes/primal-patterns.js`
- `src/routes/progress.js`
- `src/routes/scenes.js`
- `src/routes/sessions.js`
- `src/routes/shadows.js`

Because it's copy-pasted rather than shared, any bug fix or behavior change
(e.g., how `null` vs. `undefined` vs. missing keys are treated, SQL injection
safety of field names, handling of empty update bodies) has to be applied
seven times, and already may have silently drifted between the seven copies.

## Scope

### Included

- A single `buildUpdateQuery(table, allowedFields, body)` (or similarly named)
  helper in `src/utils/`, callable without Express or a live SQLite connection
  — it should return the SQL string and parameter array/object, not execute
  the query itself, so it can be unit tested in isolation.
- Replacing the duplicated inline logic in all seven files listed above with
  calls to the shared helper.
- Unit tests for the helper covering: a normal partial update, an update with
  no matching fields (should behave sensibly — decide and document, don't
  execute a malformed query), and field-name safety (only fields present in
  `allowedFields` are ever interpolated into SQL).

### Excluded

- Changing which fields are allowed to be updated on any given resource — this
  is a pure extraction, not a permissions or schema change.
- Building a full query-builder abstraction beyond this one UPDATE pattern.
- Wiring this into a model layer — that depends on the outcome of TASK-002; if
  Option A is later chosen there, this helper is exactly the kind of thing
  that would move into `src/models/`, but that move is out of scope here.

## Plan

1. Read all seven existing copies to confirm they are in fact equivalent (or
   catalog any behavioral differences found — a difference may be an existing
   bug worth flagging to the human rather than silently "fixing" via the
   extraction).
2. Write the shared helper and its unit tests first.
3. Replace each of the seven call sites one file at a time, confirming
   existing tests still pass after each file.

## Acceptance criteria

- [ ] `buildUpdateQuery` (or equivalent) exists in `src/utils/`, is
      independently unit-tested, and requires neither Express nor a live
      database connection to test.
- [ ] All seven files (`characters.js`, `npcs.js`, `primal-patterns.js`,
      `progress.js`, `scenes.js`, `sessions.js`, `shadows.js`) use the shared
      helper instead of an inline copy of the pattern.
- [ ] Any behavioral difference discovered between the seven original copies
      is reported to the human, not silently resolved one way.
- [ ] `npm test` passes, including new unit tests for the helper.

## Validation requirements

- New unit tests for `buildUpdateQuery` covering normal, empty, and
  field-safety cases.
- `npm test` run after each file's migration, not just at the end, to isolate
  any regression to the specific file that introduced it.
- A manual or scripted partial-update request against at least two of the
  seven affected resources, confirming identical behavior to before the
  change.

## Risks and assumptions

- Assumes the seven copies are behaviorally close enough to unify without a
  product decision; if implementation reveals real divergence (e.g., one
  route allows updating a field the others don't, for a reason), that's a
  signal to pause and ask rather than guess.
- Low architectural risk, moderate mechanical risk (seven call sites to get
  right) — comparable in shape to TASK-001.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26.

What changed:
- Added `src/utils/buildUpdateQuery.js`, exporting two functions:
  `collectUpdateFields(allowedFields, body)` — the truly duplicated part,
  returns `{ setClauses, values }` for whichever allowed fields are present
  in the body — and `buildUpdateQuery(table, allowedFields, body, idValue,
  options)`, a thin wrapper that finalizes the full SQL string (appending
  `updated_at = CURRENT_TIMESTAMP` and the `WHERE <idColumn> = ?` clause) and
  returns `{ sql, values }`, or `null` if no allowed field was present.
  Deliberately does NOT own the "nothing to update" error response — it
  returns `null` and leaves the message to the caller (see divergence #2
  below).
- Added `tests/build-update-query.test.js`: 7 unit tests, no Express or live
  DB — normal partial update, empty body, no-matching-fields, field-name
  safety (a body key crafted to look like a SQL injection attempt via the
  field *name* never reaches the generated SQL, since only names literally
  present in `allowedFields` are used), `touchUpdatedAt: false`, custom
  `idColumn`, and `collectUpdateFields` used standalone for a caller-layered
  extra field.
- Migrated all 7 named files/8 call sites (`characters.js` — 1 site,
  `npcs.js` — 1, `primal-patterns.js` — 2, `progress.js` — 1, `scenes.js` —
  1, `sessions.js` — 1, `shadows.js` — 1) to use the helper, running
  `npm test` after each file per the task's plan (39/39 passing throughout;
  32 pre-existing + 7 new unit tests).

Divergences found between the seven original copies (per the task's Risk
note, reported rather than silently resolved):
1. **`npcs.js` has an extra `stats` field** requiring `JSON.stringify()`
   before storage — not a plain pass-through like every other field. Kept
   as a genuine special case: `npcs.js` now calls `collectUpdateFields` for
   its plain fields, then appends the JSON-encoded `stats` clause itself,
   exactly mirroring its original structure. The generic helper does not
   know about `stats` by name.
2. **Error message wording differs**: `primal-patterns.js` (both of its two
   sites) responds `"No fields to update"` on an empty update, while the
   other six sites all say `"No valid fields to update"`. Rather than
   picking one, `buildUpdateQuery` returns `null` on empty and leaves the
   400 response (with whichever message that call site already used)
   entirely to the caller — no wording was unified or changed anywhere.
3. **`scenes.js` builds its `allowed` list dynamically** (`if (dm)
   allowed.push('status')`) before calling the helper — no special
   accommodation needed, since the helper just takes whatever array it's
   given.
4. Two differences found to be behaviorally inconsequential, unified without
   flagging as a decision: `sessions.js` pushed `req.body[field] ?? null`
   instead of the plain `req.body[field]` everyone else uses, but since
   `hasOwnProperty` only returns true for keys parsed from real JSON (which
   can never produce a JS `undefined` value), the `?? null` was dead code —
   confirmed by reasoning, not by finding a live case it mattered. Also,
   `req.body.hasOwnProperty(field)` (used in `characters.js`, `sessions.js`,
   `scenes.js`, `progress.js`, `shadows.js`) vs.
   `Object.prototype.hasOwnProperty.call(req.body, field)` (used in
   `npcs.js`, `primal-patterns.js`) produce identical results for any
   `req.body` coming from `express.json()`, which is always a plain object;
   the helper uses the safer `Object.prototype.hasOwnProperty.call` form
   throughout.

**Scope boundary found, deliberately not acted on**: while migrating
`characters.js`, found that its *other* three PUT routes — gear
(`PUT /:id/gear/:gearId`), powers (`PUT /:id/powers/:powerId`), and
familiars (`PUT /:id/familiars/:familiarId`) — use the same duplicated
inline pattern, and so does `combats.js` (`PUT /:id` for encounters and
`PUT /:id/combatants/:cid`), which this task never named at all. These are
additional, genuine instances of the pattern this task exists to fix, but
they are outside this task's literally-approved scope (its Acceptance
criteria name exactly the seven files above), each carries its own small
variation (no `updated_at` touch on `character_gear`/`character_powers`/
`familiars`/`combatants`; a boolean coercion on `is_equipped`; a JSON-encode
on `conditions`; a conditional extra `ended_at` clause on
`combat_encounters`), and none of them are surprising for the already-built
helper to handle. Per the operating instructions not to silently expand
approved scope, these were left untouched and a new follow-up task,
TASK-011, was opened in `tasks/proposed/` to cover them — the helper
already exists and is unit-tested, so that follow-up is pure call-site
migration, no new design work.

Validation performed:
- `npm test` after each of the 7 files' migration and once at the end:
  39/39 passing throughout (32 pre-existing + 7 new unit tests), no
  test-expectation changes needed.
- `node -c` on every modified file: all syntactically valid.
- `grep` confirmed no remaining inline `updateFields.push`/`updates.push`/
  `sets.push` SET-clause-building loops in any of the 7 named files (the
  only remaining instances anywhere in `src/routes/` are the 5 unscoped
  sites documented above, now covered by TASK-011).
- Live manual verification against two of the seven resources, per the
  task's validation requirement: started a second spare-port server
  instance, registered a throwaway user, and exercised
  `characters.js` (`PUT /api/characters/:id` — confirmed a real partial
  update applies only the given fields, an unrelated body key is ignored,
  and an empty body returns `400 { error: 'No valid fields to update' }`)
  and `primal-patterns.js` (promoted the throwaway user to DM, confirmed
  `PUT /api/primal-patterns/:id` applies a real update and that an empty
  body returns its own distinct `400 { error: 'No fields to update' }` —
  confirming divergence #2 above is genuinely preserved end-to-end, not
  just in the code). Cleaned up all throwaway data (test user, test
  character, and reverted the one real primal-pattern row's `display_order`
  back to 0) and stopped the spare server instance afterward.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method/caveat: TASK-001 (centralized error handling) is also uncommitted and
touches the same route files, and `codex review --uncommitted` cannot be
scoped to specific files when a custom prompt is supplied (`--uncommitted`
and a custom instructions argument are mutually exclusive on this CLI
version). Rather than hand-splitting the diff at the hunk level, this review
ran against the combined uncommitted diff (TASK-001 + TASK-003 together, with
the unrelated DbC scaffolding and TASK-006 deletions stashed out as before).
TASK-001's portion of that diff was already independently reviewed and
recorded in its own task file; this review additionally covers the
`buildUpdateQuery`/`collectUpdateFields` extraction and all 8 migrated call
sites.

Finding: no actionable regressions identified across the combined diff; the
centralized error handling and the shared update-query refactor both
preserve existing behavior, and the full test suite passes (Codex ran it
independently rather than trusting this task's reported result, consistent
with its TASK-001 review).

## Human acceptance

Pending. See TASK-011 (`tasks/proposed/`) for the five additional
same-pattern call sites found but deliberately left out of this task's
scope.
