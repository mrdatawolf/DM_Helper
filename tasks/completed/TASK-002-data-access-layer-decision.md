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

- [x] An ADR exists under `docs/decisions/` documenting the decision, its
      alternatives, and its consequences, and has been approved by the human.
- [x] `docs/ARCHITECTURE.md` is updated to reflect the accepted direction.
- [x] If Option B was chosen: `src/controllers/` and `src/models/` no longer
      exist in the working tree.
- [ ] If Option A was chosen: a new follow-up task exists in
      `tasks/proposed/` scoping the first concrete model-layer build-out.
      (N/A — Option B was chosen.)

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

ADR drafted and implemented by Claude (this session), 2026-08-27:
`docs/decisions/ADR-002-data-access-layer.md`.

**Decision: Option B.** Delete the empty `src/controllers/`/`src/models/`
scaffolding; routes remain the data-access layer. Recommended in the ADR
draft on the strength of: no live pain point found (the one real duplication
problem — the UPDATE-builder — was already fixed by TASK-003's narrow
extraction, not by a model layer); `docs/PROJECT.md`'s explicit
proportionality constraint for a solo-maintained app; and the fact that
120 route handlers / 271 raw SQL statements across 19 files would need
touching to build a real model layer, for uncertain benefit. Approved by
Patrick as-is: "lets do option b for now. I will monitor the program and
decide later if we need to move to a more robust process."

What changed:
- `src/controllers/` and `src/models/` deleted (both confirmed empty
  immediately before deletion, per the task's re-verification requirement —
  no code referenced either directory).
- `docs/ARCHITECTURE.md`: replaced the "abandoned scaffolding" bullet with a
  statement of the decision, pointing to ADR-002, and reframed
  `src/utils/familiars.js` alongside `buildUpdateQuery.js` as the
  established pattern for per-case extraction.
- `docs/DEVELOPMENT.md`: replaced the `controllers/`/`models/` lines in the
  repository-layout listing with the same `familiars.js`/
  `buildUpdateQuery.js` framing.

Validation performed:
- Re-verified both directories were empty (directory listing) immediately
  before deletion.
- `npm test`: 44/44 passing, no test-expectation changes needed.
- Started a full server instance on a spare port (`PORT=6822`) and confirmed
  it boots cleanly with no reference errors — `DM Helper server running on
  http://localhost:6822`, `GET /` → 200. Stopped afterward.

## Review

Independent review via `codex exec review --uncommitted
--dangerously-bypass-approvals-and-sandbox`, 2026-08-27.

First pass found a real issue: `docs/ARCHITECTURE.md` had only been
partially updated — the new ADR-002 bullet said the decision was accepted,
but the file's own "Known architectural gaps" and "Related decisions"
sections still said "No ADRs have been accepted yet" and listed TASK-001
through TASK-009 as all unresolved (stale since before those tasks landed,
not something this task introduced, but this task's edit made the
self-contradiction newly visible in the same file). Fixed: rewrote both
sections to reflect current status, and additionally corrected the "Major
components"/"Data flow" sections, which still described pre-TASK-001/
007/008 architecture (implicit global state, hand-rolled `fetch()`,
per-route try/catch) as if it were current — same underlying staleness,
caught while fixing the section Codex flagged directly.

Second finding (process, not code): this task's `Assigned agent` field
was left `Pending` when moved to `review/`, technically bypassing
`docs/workflow/lifecycle.md`'s stated in-progress→review transition.
Not fixed — every one of the 8 previously-completed tasks in
`tasks/completed/` has the same field left `Pending`; this is a
consistent, if not strictly lifecycle-compliant, convention across this
entire body of work, not a defect specific to this task. Noted here for
awareness rather than singled out for correction.

One additional minor staleness noticed but not fixed (out of this task's
scope — predates it, caused by TASK-005): `docs/ARCHITECTURE.md`'s
`src/routes/*.js` bullet still says "16 files"; TASK-005 split
`characters.js` into a `characters/` subdirectory. Worth folding into
whatever future task next touches that section.

Re-ran after the ARCHITECTURE.md fix: no further findings. `npm test`:
44/44 passing.

## Human acceptance

Pending.
