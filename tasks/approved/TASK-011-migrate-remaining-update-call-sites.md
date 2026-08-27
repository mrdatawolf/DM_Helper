# TASK-011: Migrate the remaining dynamic-UPDATE call sites to buildUpdateQuery

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (TASK-003 implementation session)
Proposed date: 2026-08-26
Approved by: Patrick
Approved date: 08/26/26
Related contracts: None
Related ADRs: None
Dependencies: TASK-003 (extract buildUpdateQuery helper) — completed. The
helper and its unit tests already exist; this task is pure call-site
migration, no new design work.

## Desired outcome

The remaining five inline copies of the dynamic partial-UPDATE pattern — not
named in TASK-003's original scope — also use the shared
`src/utils/buildUpdateQuery.js` helper, so the whole codebase has exactly one
implementation of this pattern instead of six (one shared + five leftover
inline copies).

## Context

TASK-003 extracted a shared `buildUpdateQuery`/`collectUpdateFields` helper
and migrated the seven call sites it named. While implementing it, five more
instances of the same duplicated pattern were found and deliberately left
untouched, to avoid silently expanding that task's approved scope:

- `src/routes/characters.js`:
  - `PUT /:id/gear/:gearId` — allowed fields: `item_name`, `item_type`,
    `description`, `quantity`, `is_equipped`, `magical_properties`. Has a
    per-field transform: `is_equipped` is coerced to `1`/`0`
    (`field === 'is_equipped' ? (req.body[field] ? 1 : 0) : req.body[field]`).
    Does **not** touch `updated_at` (the query has no such clause today).
  - `PUT /:id/powers/:powerId` — allowed fields depend on role (DM gets six
    fields; a non-DM owner gets only `current_uses`). Does **not** touch
    `updated_at`.
  - `PUT /:id/familiars/:familiarId` — allowed fields depend on role
    (`FAMILIAR_DM_FIELDS` vs `FAMILIAR_OWNER_FIELDS`, both already defined
    as module-level constants in the file), plus a DM-only `base_stats`
    field that's JSON-encoded (`null` if falsy) exactly like `npcs.js`'s
    `stats` field in TASK-003. This one **does** touch `updated_at`.
- `src/routes/combats.js` (not mentioned anywhere in TASK-003):
  - `PUT /:id` (combat encounters) — allowed fields depend on role, plus a
    conditional extra clause: `if (req.body.status === 'completed')
    updates.push('ended_at = CURRENT_TIMESTAMP')`. Does **not** touch
    `updated_at`.
  - `PUT /:id/combatants/:cid` — allowed fields depend on role, with a
    per-field transform: `conditions` is JSON-encoded
    (`field === 'conditions' ? JSON.stringify(req.body[field]) :
    req.body[field]`). Does **not** touch `updated_at`.

None of these need a helper redesign — `buildUpdateQuery`'s
`{ touchUpdatedAt: false }` option and `collectUpdateFields` (for layering a
transformed field on top, exactly as TASK-003 already did for `npcs.js`'s
`stats`) already cover every shape found above.

## Scope

### Included

- Migrating all five call sites listed above to use
  `collectUpdateFields`/`buildUpdateQuery` from `src/utils/buildUpdateQuery.js`,
  following the same pattern TASK-003 used for `npcs.js`'s `stats` field
  (layer the transformed field on top of `collectUpdateFields`'s result
  rather than teaching the helper about specific field names).
- Preserving every detail found above exactly: which sites touch
  `updated_at` and which don't, the `is_equipped`/`conditions`/`base_stats`
  transforms, the conditional `ended_at` clause on combat completion, and
  each site's own "nothing to update" response (confirm exact wording per
  site before changing anything, the way TASK-003 did — don't assume they
  all say the same thing).

### Excluded

- Any change to which fields are allowed, role-based field sets, or any of
  the value transforms themselves — pure call-site migration, not a
  behavior change.
- Touching `src/utils/buildUpdateQuery.js` itself, unless migration reveals
  it's genuinely missing something TASK-003 didn't anticipate (flag rather
  than silently extend if so).

## Plan

1. Re-confirm each of the five sites' current exact behavior (allowed
   fields, transforms, `updated_at` handling, error message) by reading the
   current file state — this task file's Context section is a snapshot from
   TASK-003's implementation and may have drifted.
2. Migrate one site at a time, running `npm test` after each.
3. Manually verify at least one of the five sites end-to-end (a spare-port
   server instance, as TASK-001 and TASK-003 both did), covering both a real
   partial update and the empty-update 400 response.

## Acceptance criteria

- [ ] All five sites listed above use `collectUpdateFields`/`buildUpdateQuery`
      instead of an inline copy of the pattern.
- [ ] `grep` for `updates.push(\`` / `updateFields.push(\`` / `sets.push(\``
      across `src/routes/` returns no matches.
- [ ] Every detail cataloged in Context (per-field transforms, `updated_at`
      presence/absence, the conditional `ended_at` clause, each site's exact
      error message) is preserved unchanged.
- [ ] `npm test` passes.

## Validation requirements

- `npm test` after each site's migration.
- At least one live manual end-to-end check (per the Plan), with any
  throwaway test data cleaned up afterward.

## Risks and assumptions

- Low risk — this is now a well-understood pattern with an existing,
  unit-tested helper and two prior tasks (TASK-001, TASK-003) demonstrating
  the same migrate-and-verify approach on this codebase.
- Assumes the Context section's description of each site is still accurate
  at implementation time; re-verify rather than trusting it blindly, per the
  Plan's first step.

## Blocker

None.

## Implementation handoff

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
