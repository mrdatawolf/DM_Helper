# TASK-002: Decide the fate of the data-access layer (controllers/models)

Owner role: Patrick
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None yet — this task's first deliverable is an ADR; see Plan.
Dependencies: None

## Desired outcome

A deliberate, recorded decision about whether DM Helper will introduce a real
data-access/model layer between routes and SQLite, or formally remove the
empty `src/controllers/` and `src/models/` directories that currently imply
one was planned. Whichever direction is chosen, the codebase should stop
containing misleading, unused scaffolding.

## Context

`src/controllers/` and `src/models/` both exist in the repository but are
completely empty — confirmed via directory listing, not just a guess. They
are not required by `src/server.js` or any route file. All current route
files in `src/routes/` do SQL access, business/validation logic, and HTTP
request/response handling inline, in the same function.

This is flagged separately from the other findings because it is the
**largest-blast-radius item** in the review: choosing to build a real model
layer (e.g., `src/models/characters.js` exporting `getById/create/update/
delete`, with routes becoming thin HTTP adapters over it) versus choosing to
delete the empty directories are both reasonable, but they have very
different implementation costs and touch every route file differently. This
should not be decided implicitly by whoever happens to pick up the task next.

## Scope

### Included

- Producing an ADR (`docs/decisions/ADR-001-data-access-layer.md` or the next
  free ADR number) that lays out the choice explicitly:
  - **Option A**: Build out a real model layer. All 16 route files would
    eventually be refactored to call into `src/models/*.js`, with routes
    reduced to request parsing, calling the model, and shaping the response.
    `src/controllers/` may or may not be needed depending on how much logic
    routes still carry.
  - **Option B**: Delete `src/controllers/` and `src/models/` entirely (git
    history preserves them) and accept that routes remain the data-access
    layer, revisiting only if/when the inline-SQL-in-routes pattern causes a
    concrete problem.
  - Tradeoffs for each: testability, how it interacts with TASK-003 (the
    `buildUpdateQuery` extraction) and TASK-005 (splitting `characters.js`),
    effort proportional to a single-DM, low-traffic app, and consistency with
    the project's stated preference (per `docs/DEVELOPMENT.md`) for following
    existing patterns before introducing new ones.
- If Option A is chosen and approved, a **follow-up task** (not this one)
  should scope the actual model-layer build-out, likely starting with one
  resource (e.g., characters, given TASK-005 already touches that file) as a
  proof of shape before doing the rest.
- If Option B is chosen and approved, deleting the two empty directories is a
  small, low-risk follow-up (could be folded into this task's implementation
  once the ADR is accepted, since there's no code to migrate).

### Excluded

- Actually implementing a model layer for any resource — that is deliberately
  out of scope for this task and would be its own follow-up task(s) once the
  ADR is accepted.
- Any change to route behavior.

## Plan

1. Draft the ADR comparing Option A and Option B, using
   `docs/decisions/ADR-TEMPLATE.md`, and present it to the human for a
   decision.
2. Record the decision, date, and reasoning in the ADR once made.
3. If Option B: delete `src/controllers/` and `src/models/` in this task's
   implementation, since there is nothing to migrate.
   If Option A: this task's implementation is just the ADR; open a new
   `tasks/proposed/` entry scoping the first real model-layer build-out.

## Acceptance criteria

- [ ] An ADR exists under `docs/decisions/` documenting the decision, its
      alternatives, and its consequences, and has been approved by the human.
- [ ] `docs/ARCHITECTURE.md` is updated to reflect the accepted direction.
- [ ] If Option B was chosen: `src/controllers/` and `src/models/` no longer
      exist in the working tree.
- [ ] If Option A was chosen: a new follow-up task exists in
      `tasks/proposed/` scoping the first concrete model-layer build-out.

## Validation requirements

- N/A for the ADR itself (a documentation/decision artifact). If Option B's
  directory deletion is implemented, confirm `npm test` and `npm start` still
  succeed (nothing references the deleted directories).

## Risks and assumptions

- This is explicitly an architecture/decision task, not an implementation
  task — flagged per `docs/workflow/change-classification.md` as
  decision-required. It should not be approved directly into
  `tasks/approved/` as ordinary implementation work; the human should treat
  the ADR draft as the first deliverable.
- Assumes the empty directories are genuinely unreferenced (confirmed by
  directory listing showing zero files in either directory as of this
  scaffolding pass); re-verify at implementation time in case something
  changed in between.

## Blocker

None.

## Implementation handoff

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
