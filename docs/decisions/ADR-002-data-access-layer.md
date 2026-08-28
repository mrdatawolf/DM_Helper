# ADR-002: Data access stays in routes; remove the empty model/controller scaffolding

Status: Accepted (2026-08-27, Patrick)
Date: 2026-08-27
Decision owners: Patrick
Related tasks and contracts: TASK-002 (this ADR is its first and only
deliverable); TASK-003 (completed — `buildUpdateQuery` is the shape targeted
extraction already takes in this codebase); TASK-005 (completed —
`characters.js` split by URL sub-resource, not by data-access layer);
TASK-011 (approved, not started — the remaining `buildUpdateQuery` call
sites, independent of this decision either way)

## Context

`src/controllers/` and `src/models/` both exist in the repository and are
completely empty — reconfirmed by directory listing immediately before
drafting this ADR. Neither is required by `src/server.js` or any route file.
All 120 route handlers across 19 files under `src/routes/` (16 top-level
files + the 4-file `characters/` split from TASK-005) do SQL access,
business/validation logic, and HTTP request/response shaping inline, in the
same function — 271 `db.prepare`/`db.exec` calls total, none of them behind
any intermediate layer.

This is the largest-blast-radius item from the original review batch: a real
model layer would eventually touch every one of those 120 handlers
differently, while deleting the scaffolding touches nothing that runs. The
question is whether the empty directories represent a plan worth finishing,
or leftover scaffolding that's actively misleading (a new contributor
reasonably infers `src/models/` exists because some routes already use it).

Since that review, two things changed that bear directly on this decision:

- **TASK-003** already extracted the one piece of data-access logic that was
  genuinely duplicated at meaningful scale (the partial-UPDATE SQL builder,
  copy-pasted across 7+ files) into `src/utils/buildUpdateQuery.js` — a
  plain, dependency-free function, not a model class or a new layer.
- **`src/utils/familiars.js`** (predates this ADR) already demonstrates the
  same shape for familiar power-scaling logic: extract a function when logic
  is real and duplicated, keep it a plain function callable from any route,
  don't build a class hierarchy or a persistence abstraction around it.

Both are targeted extractions of *logic*, not a data-access *layer* — no
route currently goes through an intermediate object that owns `getById`/
`create`/`update`/`delete` for a resource. This ADR is specifically about
whether to build that layer, not about whether extraction happens at all
(it demonstrably already does, twice, without one).

`docs/PROJECT.md` states this app's team size is "effectively a
solo-maintained project (one DM/developer)," explicitly calling for process
and architecture overhead to "stay proportionate" to that scale, and that
the tool should "stay simple enough for one DM to operate and extend without
a build pipeline or hosting complexity."

## Decision

**Option B: delete `src/controllers/` and `src/models/`.** Routes remain the
data-access layer. As part of this task's implementation (once this ADR is
accepted): delete both empty directories, and update `docs/ARCHITECTURE.md`
and `docs/DEVELOPMENT.md` to stop describing them as
planned-but-unbuilt — replacing those references with a short statement of
this decision and a pointer to this ADR.

This does **not** mean "never extract shared logic." `buildUpdateQuery.js`
and `familiars.js` are the established, working pattern for that: when
logic is genuinely duplicated or complex enough to be worth naming and
testing on its own, extract it into `src/utils/` as a plain function,
callable directly from whichever routes need it. That pattern requires no
directory that currently sits empty, and this ADR does not change it or
require re-litigating it per extraction.

## Alternatives considered

- **Option A: build out a real model layer.** All 120 route handlers would
  eventually be refactored to call into `src/models/*.js`
  (`getById`/`create`/`update`/`delete`-shaped), with routes reduced to
  request parsing, calling the model, and shaping the response.
  `src/controllers/` may or may not end up needed depending on how much
  logic routes still carry after that split.

  Rejected for now. Concrete reasons, not just "seems like more work":
  - **No live pain point motivates it.** Nothing in this codebase's history
    shows a bug caused by inline SQL in routes, a case where two routes
    silently diverged on the same query, or a testing need blocked by the
    lack of a model layer. The one thing that *did* hurt (the duplicated
    UPDATE-builder) was already fixed by TASK-003's narrow extraction, not
    by a model layer.
  - **Cost is large and proportionate to a bigger team than this app has.**
    120 handlers, 271 raw SQL statements, across 19 files — building and
    then *maintaining* an abstraction over all of that for a single-DM,
    low-traffic app contradicts `docs/PROJECT.md`'s explicit
    proportionality constraint. A model layer pays for itself when multiple
    routes need the same data operation with the same shape, or when
    swapping/mocking the data layer for tests matters; this app does
    neither today (tests already exercise real SQLite directly and
    intentionally, per `docs/DEVELOPMENT.md`'s testing philosophy).
  - **It would need to happen in one deliberate pass, not incrementally
    by accident.** A half-migrated model layer (some routes going through
    `src/models/`, most not) would be strictly worse than the current
    consistent inline-SQL pattern — two competing conventions instead of
    one. That means Option A isn't "start small and grow it," it's "commit
    to a real project," which is exactly the kind of decision this ADR
    exists to make explicit rather than let happen by drift.
  - Kept as a real, reversible option: nothing about Option B forecloses
    building a model layer later if a concrete need appears (e.g., a second
    campaign/tenant, a swap to a different datastore, or genuine
    cross-route query duplication beyond what targeted `src/utils/`
    extraction handles). Revisiting is cheap; the empty directories
    contribute nothing to that future decision either way.

## Consequences

### Benefits

- Removes two directories that currently look like an unfinished plan but
  are dead weight — a new contributor (human or LLM) reading
  `src/controllers/`/`src/models/` reasonably infers a data-access layer is
  in progress or intended soon; neither is true.
- Closes out the largest-blast-radius open question from the original
  review with a recorded, deliberate answer instead of leaving it ambiguous
  for whoever touches routing code next.
- No behavior change, no migration risk — the directories are unreferenced
  by any code path.

### Costs and risks

- If a real need for a model layer emerges later (multi-campaign support,
  swapping the datastore, or genuine cross-route data-operation
  duplication), this decision will need deliberate revisiting rather than
  quietly resuming half-built scaffolding — treated as acceptable, since
  that revisit would itself deserve a fresh ADR reflecting whatever
  motivates it at the time, not a resurrection of directories that sat
  empty and undocumented.
- Routes continue to mix HTTP handling, validation, and SQL in one
  function. This is an accepted, existing characteristic of the codebase,
  not something this ADR changes — targeted `src/utils/` extraction (the
  established pattern) remains available per-case without requiring this
  decision to be revisited.

## Follow-up work

- Delete `src/controllers/` and `src/models/` as part of this task's
  implementation, once accepted.
- Update `docs/ARCHITECTURE.md` (and any other doc referencing the two
  directories as planned) to reflect this decision.
- No new task is opened for a model-layer build-out, since Option A was not
  chosen.
