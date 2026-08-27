# TASK-001: Centralized route error handling

Owner role: Patrick
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

A single, consistent way to handle errors thrown or rejected from route
handlers, so that adding a new route no longer requires hand-writing a
try/catch/500-JSON block, and so that error responses are consistent across
the whole API.

## Context

A prior code-review pass found roughly 120 near-identical blocks of the form

```js
try {
    // ... route logic
} catch (error) {
    res.status(500).json({ error: error.message });
}
```

repeated across all 16 files in `src/routes/` (`admin.js`, `arcs.js`,
`auth.js`, `beats.js`, `characters.js`, `claims.js`, `combats.js`,
`journal.js`, `npcs.js`, `primal-patterns.js`, `progress.js`, `scenes.js`,
`session-notes.js`, `sessions.js`, `shadows.js`, `tracker-shared.js`). This is
pure boilerplate: it adds no per-route value, obscures the actual route logic,
and means any future change to error-response shape (e.g., adding an error
code, hiding internal messages in production) has to be repeated ~120 times.

Express 5 (already in use here) natively forwards rejected promises from async
handlers to error-handling middleware, which makes a wrapper + centralized
handler straightforward without extra dependencies.

## Scope

### Included

- An `asyncHandler` (or equivalently named) wrapper function, likely in
  `src/middleware/` or `src/utils/`, that wraps an async route handler and
  forwards thrown/rejected errors to `next(error)`.
- One centralized Express error-handling middleware, mounted last in
  `src/server.js`, that produces the JSON error response currently duplicated
  per-route (`{ error: error.message }` with a 500 status, or better status
  codes where an error carries one).
- Migrating existing route handlers in all 16 files under `src/routes/` to use
  the wrapper instead of their local try/catch.

### Excluded

- Changing the actual error *messages* or status codes returned by any
  existing endpoint (behavior preservation, not an API redesign) unless a
  bug is found in passing — flag any such finding to the human rather than
  fixing it silently.
- Structured/typed application error classes (e.g., a `NotFoundError`,
  `ValidationError` hierarchy) — worth considering as a follow-up but not
  required to satisfy this task; note it as a possible follow-up if it comes
  up naturally during implementation.
- Frontend error handling (see TASK-007 for the frontend fetch-wrapper work).

## Plan

1. Add the `asyncHandler` wrapper and the centralized error-handling
   middleware.
2. Mount the centralized middleware last, after all routers, in
   `src/server.js`.
3. Migrate route handlers file by file, removing the local try/catch and
   wrapping the handler with `asyncHandler` instead.
4. Confirm existing tests in `tests/` still pass unmodified (they exercise
   API behavior, which should be unchanged).

## Acceptance criteria

- [ ] `asyncHandler` (or equivalent) exists and is used by every route handler
      in all 16 files under `src/routes/` that previously had a manual
      try/catch-500 block.
- [ ] Exactly one centralized error-handling middleware exists in
      `src/server.js`, mounted after all routers.
- [ ] No route file contains a duplicated `catch (error) { res.status(500)...}`
      block after the change.
- [ ] Existing behavior is preserved: for a sample of routes across different
      files, an error still produces the same status code and error message
      shape as before the change.
- [ ] `npm test` passes without modification to existing test expectations
      (unless a genuine pre-existing bug is uncovered, in which case it must
      be reported to the human rather than silently fixed).

## Validation requirements

- Run `npm test` (`node --test`) and confirm all existing suites pass.
- Manually or via a quick script, trigger at least one error path per route
  file category (e.g., a 404 lookup, a validation failure) to confirm the
  centralized handler responds correctly.

## Risks and assumptions

- Assumes no route currently relies on catching an error to do something
  other than return a 500 (e.g., a partial recovery) — this should be
  verified per file during implementation, not assumed blindly.
- Low architectural risk: this is a mechanical, behavior-preserving
  refactor across many files, so the main risk is a copy-paste mistake in one
  of the 16 files being missed or handled inconsistently. A file-by-file
  checklist during implementation is recommended.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26.

What changed:
- Added `src/middleware/errorHandler.js`: `asyncHandler(fn)` wraps a handler
  and forwards both synchronous throws and rejected promises to `next(err)`;
  `errorHandler(err, req, res, next)` is the single centralized responder —
  logs via `console.error('Error:', err)`, then responds
  `{ error: message }` with `err.status || err.statusCode || 500`, where
  `message` is `err.clientMessage || err.message`.
- Mounted `errorHandler` as the last `app.use(...)` in `src/server.js`,
  replacing the previous inline fallback middleware (which was dead code —
  every route caught its own errors before this change, so it was never
  actually reached; it also unconditionally returned status 500 regardless
  of `err.status`, and used a different response shape,
  `{ error: 'Internal server error', message: err.message }`, than the
  ~120 per-route catches did).
- Migrated all 16 files under `src/routes/`. 110 of ~120 catch blocks
  matched a single uniform shape (`try { ... } catch (error|err) {
  res.status(500).json({ error: (error|err).message }); }`) across 13 files
  (`admin`, `arcs`, `beats`, `characters`, `claims`, `combats`, `npcs`,
  `primal-patterns`, `progress`, `scenes`, `session-notes`, `sessions`,
  `shadows`) and were migrated via a small one-off codemod script (matched
  on same-indentation try/catch pairs so nested try/catch — see below — was
  left untouched; verified with a dry run reporting exact per-file match
  counts before writing anything). Each now reads
  `router.METHOD(path, ...middleware, asyncHandler((req, res) => { <body,
  dedented> }));` with the try/catch removed entirely.
- 9 catch blocks in `auth.js` (4) and `journal.js` (5) do NOT match the
  uniform shape — they `console.error(<route-specific label>, error)` and
  return a fixed client-facing message instead of `error.message` (e.g.
  hiding a real DB error behind "Login failed"). These were migrated by
  hand: the handler is now `asyncHandler((req, res, next) => { ... })`
  (added `next` to the signature), the `console.error` call is unchanged,
  and `res.status(500).json({ error: '<message>' })` became
  `next(Object.assign(error, { clientMessage: '<message>' }))` — the
  centralized handler reads `err.clientMessage` to reproduce the exact
  original response.
- 1 catch block in `claims.js` (the `/allocate` handler) wraps a manual
  `BEGIN TRANSACTION`/`COMMIT` with a nested try/catch that does
  `db.exec('ROLLBACK'); throw error;` on failure — this is real logic, not
  boilerplate, and was left completely untouched. Only the *outer* catch
  around it (the standard `res.status(500).json({ error: error.message })`)
  was removed; the rethrown error now propagates via `asyncHandler` to the
  centralized handler exactly as it reached the old outer catch before.
- `tracker-shared.js` has no route handlers (helpers only) and was
  untouched.

Deviation found and flagged rather than silently fixed: sending a
malformed-JSON request body (caught by `express.json()` before any route
runs) previously always produced `500 { error: 'Internal server error',
message: '<parse error>' }` from the old dead fallback middleware, which
ignored `err.status`. It now produces `400 { error: '<parse error>' }`,
since the centralized handler honors `err.status` (body-parser sets 400)
and body-parser's error carries the real parse-error message. This is a
strictly more-correct status code for a client error, but it *is* a
response-shape change on a path the task's exclusions didn't anticipate
(it's not one of the ~120 route catches — it's upstream of all routing).
No existing test exercises this path. Flagging per the task's instruction
to report rather than silently fix.

One naming decision made independently: the task's scope suggested
`asyncHandler` (used as-is) but didn't name the client-message-override
field. It is deliberately NOT called `expose` — Express's own error
ecosystem (body-parser, `http-errors`, etc.) already uses `err.expose` as a
boolean meaning "safe to show `err.message`", a different contract than a
replacement string. Naming it that way was tried first and caught by
manual testing below: a malformed JSON body produced `{"error":true}`
because body-parser's error already carries `expose: true`. Renamed to
`err.clientMessage` to avoid the collision; documented in
`errorHandler.js`.

Validation performed:
- `npm test`: 32/32 passing, no test-expectation changes needed.
- `node -c` on all 16 modified route files plus `server.js` and the new
  `errorHandler.js`: all syntactically valid.
- `grep` confirmed zero remaining `res.status(500)` calls anywhere in
  `src/routes/`, and that the only remaining `catch (error|err)` blocks are
  exactly the 9 special-cased ones plus the 1 untouched rollback block.
- Live manual verification: started a second server instance on a spare
  port (the box already had an unrelated `node src/server.js` running,
  left untouched) and exercised one error path per category with `curl`:
  - Generic route, `error.message` style (`characters.js` gear endpoint,
    unbindable field type) → `500 { error: 'Too few parameter values were
    provided' }` — the real thrown message, unchanged shape.
  - Generic route, `err.message` style on a CRLF-line-ending file
    (`sessions.js`) — reached (403 from an unrelated DM-only check, but
    confirms routing/wrapping is intact after the codemod on a CRLF file).
  - `auth.js`/`journal.js` custom-message path: registered a throwaway
    user, created a throwaway character, then POSTed a journal entry with
    an unbindable `content` field → `500 { error: 'Failed to create
    journal entry' }`, and confirmed via the server log that BOTH the
    route's own `console.error('Create journal entry error:', ...)` and
    the centralized handler's `console.error('Error:', ...)` fired (minor,
    expected double-logging for these 9 routes only — server-side only,
    no client-visible effect).
  - Malformed JSON body → see deviation above.
  - Cleaned up the throwaway user/character from the dev database
    afterward; stopped the spare server instance.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method: reviewed the working-tree diff in isolation (the in-progress DbC
scaffolding and the separate TASK-006 deletions were stashed out for the
duration of the review so only this task's changes were visible). Codex
inspected the full diff across all 16 route files plus `server.js` and the
new `errorHandler.js`, and independently ran the test suite itself rather
than relying on this task's reported result.

Finding: confirmed centralized error handling preserves route behavior,
correctly forwards both synchronous throws and rejected promises, and the
full test suite passes. No actionable regressions identified. No issues
raised on the `clientMessage`/`expose` naming decision or the claims.js
nested-rollback handling.

## Human acceptance

Pending. Note the malformed-JSON-body status-code deviation documented
above in Implementation handoff — flagged for your awareness, not treated
as a defect by either reviewer.
