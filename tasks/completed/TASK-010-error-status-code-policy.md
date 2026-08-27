# TASK-010: Decide how status codes are chosen for centralized errors

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (TASK-001 implementation session)
Proposed date: 2026-08-26
Approved by: Patrick
Approved date: 08/26/26
Related contracts: None
Related ADRs: None yet — this task's likely deliverable is a short ADR or a
documented policy in `docs/DEVELOPMENT.md`; see Plan.
Dependencies: TASK-001 (centralized error handling) — completed; this task
picks up a deviation found during that implementation.

## Desired outcome

A deliberate, documented answer to "what HTTP status code does a given
error produce?", so the centralized error handler's behavior is a chosen
policy rather than an accident of which upstream error object happened to
set `err.status`.

## Context

While implementing TASK-001, a behavior difference was found and flagged
rather than silently resolved: a malformed JSON request body (rejected by
`express.json()` before any route runs) used to always produce `500
{ error: 'Internal server error', message: '<parse error>' }`, because the
old fallback error middleware in `src/server.js` ignored `err.status`
entirely and hardcoded 500. That old middleware was dead code — every route
caught its own errors at the time, so it was never actually reached for a
route-level error, but body-parser errors occur *before* routing and did
reach it.

The new centralized handler (`src/middleware/errorHandler.js`) honors
`err.status || err.statusCode || 500`. Since body-parser sets `status: 400`
on JSON parse errors, the same malformed-body request now produces `400
{ error: '<parse error>' }` instead. This is arguably more correct (400 is
the right status for a client's malformed request), but it's a real,
user-visible change on a path no existing test covers, and it was decided
implicitly as a side effect of writing the centralized handler generically,
not as a deliberate choice.

The broader question this exposes: `err.status`/`err.statusCode` may be set
by several different sources going forward (body-parser, any future use of
`http-errors`, a hand-thrown error with `.status` attached, better-sqlite3
exceptions which never set either) — the codebase doesn't yet have a stated
policy for which of these should be trusted for the response's status code,
versus which errors should always collapse to 500 regardless of what they
happen to carry.

## Decision

**Option A — trust upstream status codes as-is.** Decided by Patrick,
2026-08-26. No change to `src/middleware/errorHandler.js`'s existing
`err.status || err.statusCode || 500` logic — this task's implementation is
documenting the policy explicitly and adding the regression test the
original finding was missing, not changing behavior.

## Scope

### Included

- Deciding, and writing down, one of (at minimum):
  - **Option A — Trust upstream status codes as-is** (current behavior):
    any error with a numeric `err.status`/`err.statusCode` uses it; anything
    without one defaults to 500. Simple, matches Express/Connect ecosystem
    convention, but means any dependency that sets `.status` on an error
    object can silently change a route's response code.
  - **Option B — Allowlist which error sources may set a non-500 status**:
    e.g. explicitly trust body-parser/`http-errors`-style errors (a known,
    narrow set), but always force 500 for anything thrown from inside route
    handlers or from better-sqlite3, on the theory that "the DM's SQL threw"
    should never surface as a 4xx unless a route explicitly opts in (e.g. via
    `err.status` set deliberately by application code, not by a database
    driver).
  - **Option C — Revert to always-500 from the centralized handler**, and
    have specific routes that want a different status set it via an explicit
    mechanism (e.g. throwing a small typed error, or calling
    `res.status(400)` before delegating the message), restoring the old
    always-500 default for anything not explicitly opted in.
  - Document whichever is chosen in `docs/DEVELOPMENT.md` (or a short ADR if
    the human wants it recorded as a real architectural decision — use
    judgment/ask, given this is a small, low-blast-radius policy question
    compared to TASK-002/TASK-008's ADR-first items).
- Adding at least one test (in `tests/`) covering the chosen behavior for a
  malformed-JSON-body request, since none currently exists either way.

### Excluded

- Introducing a structured/typed application error class hierarchy — noted
  as a possible follow-up in TASK-001 already; only take it on here if it
  turns out to be the cleanest way to implement whichever option is chosen,
  and call that out explicitly rather than assuming it.
- Re-litigating anything else about TASK-001's implementation; this task is
  scoped narrowly to the status-code policy question.

## Plan

1. Review the three options above (and any better one that comes up) against
   the actual current error sources in this codebase: body-parser, JWT
   verification failures, better-sqlite3 exceptions, and the hand-written
   `clientMessage`-carrying errors in `auth.js`/`journal.js`.
2. Decide and document the policy.
3. Adjust `src/middleware/errorHandler.js` if the decision differs from
   current behavior (Option A, i.e. no code change, is on the table).
4. Add a regression test for the malformed-JSON-body case reflecting the
   decided behavior.

## Acceptance criteria

- [ ] A written policy exists (in `docs/DEVELOPMENT.md` or an ADR) stating
      which error sources may set a non-500 status code and which always
      collapse to 500.
- [ ] `src/middleware/errorHandler.js` matches the documented policy.
- [ ] A test in `tests/` exercises a malformed-JSON-body request and asserts
      the decided status code and response shape.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including the new regression test.
- Manually confirm the malformed-JSON-body path still behaves as documented
  (a quick `curl` against a locally running instance is sufficient, as was
  done during TASK-001).

## Risks and assumptions

- Low risk either way — this only affects the status code (and, depending
  on the option chosen, possibly the message) of error responses on paths
  that are not exercised by any current test, so there is no existing
  behavior under test to break.
- Assumes no client code (frontend `fetch` calls) branches on a 400 vs 500
  status for any of the affected paths today; worth a quick grep of
  `public/js/` for status-code checks before finalizing, in case one exists.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26. Per the Decision above
(Option A), no code change was needed to `src/middleware/errorHandler.js`
itself — this task's work was documenting the existing behavior as a
deliberate policy and adding the regression test that was missing either
way.

What changed:
- `docs/DEVELOPMENT.md`: added an "Error handling" section (between
  "Coding conventions" and "Testing philosophy") stating the policy in
  full — `errorHandler` trusts `err.status || err.statusCode || 500`,
  naming the two current sources that rely on this (body-parser's 400s,
  and the `clientMessage`-carrying errors in `auth.js`/`journal.js`), the
  reasoning for choosing this over an allowlist or an always-500 default,
  and the accepted tradeoff (a future dependency could silently pick a
  status via `.status`). Cross-references the concrete malformed-JSON-body
  example the decision was made against.
- `tests/error-handling.test.js` (new): two tests against the real running
  app (same in-memory-DB pattern as `tests/api.test.js`) —
  1. A malformed JSON body → `400` with the actual parse-error message,
     explicitly asserting it's *not* the old dead code's
     `'Internal server error'` wrapper text, so a future regression back
     toward that shape would fail loudly.
  2. A route error with no `.status` set (an unbindable SQL parameter type
     on a real authenticated character-create call) → confirms the `500`
     default still applies when nothing overrides it.

Validation performed:
- `node --test tests/error-handling.test.js` in isolation: 2/2 passing.
- `npm test`: 41/41 passing (39 pre-existing + 2 new), no other test
  expectations touched.
- Manual `curl` against a spare-port live instance: malformed JSON body →
  `400 {"error":"Expected property name or '}' in JSON at position 1 (line
  1 column 2)"}`, matching the documented policy and the automated test.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method/caveat: attempted to isolate this review to just the two files this
task actually changed (`docs/DEVELOPMENT.md`, `tests/error-handling.test.js`)
by stashing out everything else, including all of `src/`. That went too far
— `src/middleware/errorHandler.js` (from the already-completed, already-
reviewed-and-accepted TASK-001) was stashed along with it, even though this
task's documentation and regression test both correctly depend on it
existing. Both of Codex's findings are consequences of that over-isolation,
not real defects:

1. **[False positive]** "The regression test fails: `src/server.js` always
   responds 500, malformed JSON produces 500 not 400" — true only in the
   stashed view, where `errorHandler.js` didn't exist to look at. Restored
   the stash and re-ran `npm test` immediately after: 41/41 passing,
   including both new tests in `tests/error-handling.test.js`.
2. **[False positive]** "`docs/DEVELOPMENT.md` documents a nonexistent
   `errorHandler.js`/`asyncHandler`" — same cause; both exist and have been
   in the codebase since TASK-001.

Lesson for future reviews of small doc/test-only tasks that depend on
already-completed work: isolating to *only* the files a task literally
touched can hide the completed dependency that documentation or tests
correctly reference, producing exactly this false-positive shape (also seen
once in TASK-007's review, for the same underlying reason). No code or doc
change was needed in response to either finding.

## Human acceptance

Pending.
