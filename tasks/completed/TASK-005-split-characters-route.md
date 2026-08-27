# TASK-005: Split characters.js into sub-resource routers

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: Recommended after TASK-004 (permission-check consolidation),
since `characters.js` currently holds the duplicated permission logic
TASK-004 removes — splitting first would just spread that duplication across
more files.

## Desired outcome

`src/routes/characters.js` is split into a small set of focused sub-routers
mounted together, so that character CRUD, gear, powers, and familiars are each
in their own file, matching the file's actual sub-resource boundaries.

## Context

`src/routes/characters.js` is 602 lines and covers four distinct
sub-resources in one file: character CRUD, gear, powers, and familiars. This
makes the file harder to navigate than any other route file (the next largest
route files are much smaller) and mixes concerns that don't need to be
co-located.

`src/utils/familiars.js` already demonstrates the target pattern for this
codebase: familiar-serialization logic was properly extracted out of a route
file into its own reusable module. This task extends that same idea to the
routing layer itself.

## Scope

### Included

- Splitting `src/routes/characters.js` into:
  - `src/routes/characters/index.js` — character CRUD, mounted at the same
    base path `characters.js` currently uses.
  - `src/routes/characters/gear.js`
  - `src/routes/characters/powers.js`
  - `src/routes/characters/familiars.js`
  - mounted together as sub-routers, preserving all existing URL paths exactly
    (this is a structural refactor, not an API redesign).
- Updating the mount point in `src/server.js` to point at the new
  `src/routes/characters/` directory instead of the single file.
- Preserving whatever permission-check calls exist post-TASK-004 (or, if
  TASK-004 hasn't landed yet when this is implemented, preserving the
  existing local checks as-is rather than duplicating the TASK-004 work here).

### Excluded

- Any change to request/response shape, URL paths, or authorization behavior
  — existing frontend code and tests must continue to work unmodified against
  the same endpoints.
- Introducing a model/data-access layer (see TASK-002) — this task only
  reorganizes routing, not the SQL/business logic within each handler.

## Plan

1. Confirm TASK-004 status; if it has landed, the permission helpers are
   already shared and this split is purely mechanical. If not, note the
   as-is local checks will move with their respective sub-resource.
2. Inventory every route currently defined in `characters.js` and which
   sub-resource (CRUD / gear / powers / familiars) it belongs to.
3. Create the four new files under `src/routes/characters/`, moving each
   route's handler verbatim (adjusting only `require` paths and router
   mounting, not logic).
4. Wire the four sub-routers together (e.g., via `characters/index.js`
   mounting the other three, or all four mounted directly in `server.js` —
   pick whichever keeps `server.js` no more cluttered than it already is, and
   document the choice in the implementation handoff).
5. Update `src/server.js`'s require/mount for `characters.js` accordingly.
6. Delete the original `src/routes/characters.js` once its contents are fully
   moved.

## Acceptance criteria

- [ ] `src/routes/characters.js` no longer exists as a single 602-line file;
      its contents are split across `src/routes/characters/index.js`,
      `gear.js`, `powers.js`, and `familiars.js`.
- [ ] Every URL path and HTTP method previously handled by `characters.js` is
      still handled identically (same path, method, request/response shape,
      authorization behavior).
- [ ] `src/server.js` mounts the new sub-routers correctly.
- [ ] `npm test` passes without modification to existing test expectations.
- [ ] No route file exceeds roughly 200 lines as a result of the split (per
      this project's general file-size guidance), or if one does, the reason
      is noted in the implementation handoff.

## Validation requirements

- `npm test`, including `tests/gear-powers.test.js` and
  `tests/familiars.test.js`, which directly exercise sub-resources being
  moved.
- Manual/scripted smoke test hitting at least one endpoint from each of the
  four sub-resources (CRUD, gear, powers, familiars) to confirm routing still
  resolves correctly end-to-end through `src/server.js`.

## Risks and assumptions

- Purely structural risk: the main failure mode is a route accidentally not
  re-mounted, or a relative `require` path broken in the move. A careful
  before/after route inventory (step 2 of the Plan) mitigates this.
- Assumes gear/powers/familiars sub-resources are cleanly separable by URL
  prefix in the current file; if implementation finds them intertwined in a
  way that resists clean separation, report that rather than forcing an
  awkward split.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26, after TASK-004 landed (its
`isDMOrAdmin`-based checks were already in place, so this split moved
already-clean permission logic rather than spreading duplication).

What changed:
- Route inventory confirmed a clean split by URL prefix: CRUD (`GET /`,
  `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`), gear (3 routes under
  `/:id/gear`), powers (4 routes under `/:id/powers`), familiars (4 routes
  under `/:id/familiars`) — matching the task's Context exactly, no
  intertwining found that would have resisted separation.
- Created `src/routes/characters/{index.js, gear.js, powers.js,
  familiars.js, shared.js, fields.js}`, deleted `src/routes/characters.js`.
  Every route handler was moved verbatim — no logic, validation, or
  response-shape changes.
- `canModifyCharacter()` and `requireDMUser()` are used across multiple
  sub-resources (`canModifyCharacter` in all four; `requireDMUser` in both
  powers and familiars), so neither could live inside a single sub-resource
  file without creating a cross-file dependency on a non-shared module.
  Extracted both into `src/routes/characters/shared.js` — mirroring this
  codebase's own existing convention (`src/routes/tracker-shared.js`,
  already shared by `scenes.js`/`session-notes.js`/`combats.js`), rather
  than inventing a new pattern.
- `src/server.js` required **zero changes**. It already does
  `require('./routes/characters')` with no extension; Node's module
  resolution tries `characters.js` first, then falls back to
  `characters/index.js` — since the old file was deleted, the existing
  require line now resolves to the new directory automatically.
- `index.js` came out at 251 lines — over the ~200-line guidance — almost
  entirely because of a ~90-line `allowedFields` array for the character
  PUT route. Rather than just noting the overage per the acceptance
  criteria's allowance, extracted that array as-is (zero behavior change)
  into `src/routes/characters/fields.js` (`CHARACTER_UPDATE_FIELDS`),
  bringing `index.js` down to 197 lines. All five new files are now under
  200 lines: `index.js` 197, `powers.js` 92, `familiars.js` 130, `gear.js`
  76, `shared.js` 21, `fields.js` 59.
- Preserved one pre-existing wording oddity verbatim rather than "fixing"
  it in passing (Excluded: no request/response shape changes): the 403
  message for trying to bond or release a familiar without DM authority is
  `"Powers are granted by the DM"` — literally about powers, reused for
  familiars in the original file too. Documented this explicitly in
  `shared.js`'s comment on `requireDMUser` so it doesn't read as this
  split's mistake.

Validation performed:
- `npm test`: 39/39 passing, including `tests/gear-powers.test.js` and
  `tests/familiars.test.js` (which directly exercise the moved
  sub-resources) and `tests/api.test.js` (which exercises character CRUD) —
  no test-expectation changes needed.
- `node -c` on all six new files: syntactically valid.
- Started a full server instance on a spare port and confirmed it boots
  cleanly (i.e., Node's module resolution actually finds
  `characters/index.js`, not just that each file syntax-checks in
  isolation) — `DM Helper server running on http://localhost:6809` with no
  errors.
- Live smoke test hitting one endpoint from each of the four sub-resources
  through the running server, per the task's validation requirement:
  registered a throwaway user, created a throwaway character, then
  `GET /api/characters/:id` (CRUD, 200), `POST /:id/gear` (gear, 201),
  `POST /:id/powers` as a non-DM (powers, 403
  `{ error: 'Powers are granted by the DM' }` — confirms the shared
  `requireDMUser` still works with its exact original message from the new
  location), `GET /:id/familiars` (familiars, 200). Cleaned up the
  throwaway user/character afterward and stopped the spare server instance.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method/caveat: as with TASK-003/TASK-004's reviews, this ran against the
combined uncommitted diff (TASK-001 + TASK-003 + TASK-004 + TASK-005
together, unrelated DbC scaffolding and TASK-006 deletions stashed out),
since `--uncommitted` can't be paired with a custom scoping prompt on this
CLI version. The three earlier tasks' portions were already independently
reviewed on their own; this review additionally covers the `characters.js`
split into `src/routes/characters/`.

Finding: no actionable regressions identified; the refactoring preserves
existing route behavior while centralizing error handling, update-query
construction, and authorization checks (the cumulative effect of the four
tasks reviewed together). Full test suite passes, run independently by
Codex as in its prior reviews.

## Human acceptance

Pending.
