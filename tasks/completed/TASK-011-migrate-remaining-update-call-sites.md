# TASK-011: Migrate the remaining dynamic-UPDATE call sites to buildUpdateQuery

Owner role: Pending
Assigned agent: openai-coder (Codex CLI)
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

- [x] All five sites listed above use `collectUpdateFields`/`buildUpdateQuery`
      instead of an inline copy of the pattern.
- [x] `grep` for `updates.push(\`` / `updateFields.push(\`` / `sets.push(\``
      across `src/routes/` returns no matches.
- [x] Every detail cataloged in Context (per-field transforms, `updated_at`
      presence/absence, the conditional `ended_at` clause, each site's exact
      error message) is preserved unchanged.
- [x] `npm test` passes.

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

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-27

### Changes made

- Migrated the gear, power, familiar, combat encounter, and combatant update
  routes to `collectUpdateFields`/`buildUpdateQuery`.
- Preserved the role-dependent allowlists, exact empty-update response, all
  existing value transforms, the familiar-only `updated_at` behavior, and the
  combat-completion `ended_at` clause.
- Did not change `src/utils/buildUpdateQuery.js`.

### Validation performed

- Ran `npm test` after each of the five call-site migrations; every run passed
  all 44 tests. Ran it once more after final verification edits; 44 passed, 0
  failed.
- Confirmed all three required grep patterns return no matches under
  `src/routes/`.
- Ran a live manual end-to-end check against an in-memory database on spare
  port 21851. A gear partial update returned 200 and preserved the
  `is_equipped` coercion; an empty update returned the existing
  `400 {"error":"No valid fields to update"}` response. The throwaway
  character and user were deleted and absence of the user was verified; the
  server was stopped and the in-memory database closed.

### Assumptions and deviations

- Repository drift since the task snapshot split `characters.js` into route
  modules. The named handlers now live in `src/routes/characters/gear.js`,
  `powers.js`, and `familiars.js`; those current locations were migrated.
- The familiar handler had gained an existing DM-only `growth_table` JSON
  transform not cataloged in Context. It was preserved and layered on top of
  `collectUpdateFields` alongside `base_stats`, because omitting it would have
  changed current behavior. No approved behavior was otherwise changed.

### Unresolved risks

None identified.

### Documentation updated

Only this implementation handoff and the satisfied acceptance checkboxes.

## Review

Independent review by Claude, 2026-08-27/28 — the first task implemented by
`openai-coder` (Codex CLI) under the new coder/reviewer split (see
`docs/AI_DEVELOPMENT_SYSTEM.md`); reviewed by Claude rather than Codex
itself, since a coder cannot credibly review its own patch.

Method: read the full diff for all four changed files (`gear.js`,
`powers.js`, `familiars.js`, `combats.js`) directly rather than trusting the
handoff's self-report. Independently re-ran `npm test` (44/44 passing) and
the three required grep patterns (no matches) rather than accepting Codex's
reported results. Independently live-verified the two structurally riskiest
sites against a spare-port server with throwaway data:
- **Familiars** (the most complex site — a plain field plus two independent
  DM-only JSON transforms layered on `collectUpdateFields`): created a
  familiar, updated `name` + `base_stats` + `growth_table` together,
  confirmed the response correctly reflects all three (including
  `next_tier` recomputed from the new `growth_table`), then confirmed an
  empty-body update returns the original exact `400 {"error":"No valid
  fields to update"}`.
- **Combatants/combat encounters**: updated `current_hp` + `conditions`
  together, confirmed `conditions` is stored JSON-stringified exactly as
  before; separately confirmed setting `status: 'completed'` on an
  encounter still populates `ended_at`.
- Did not live-test `gear.js`/`powers.js` directly — their diffs are simple
  and, for `powers.js`, match the already-tested `buildUpdateQuery` pattern
  from TASK-003's `npcs.js` call site exactly.
- All throwaway data (2 users, 1 character, 1 familiar, 1 session, 1
  encounter, 1 combatant) confirmed deleted afterward via direct query;
  spare server stopped.

Findings:
1. **[Confirmed, not a defect]** The `growth_table` transform the handoff
   flagged as "not cataloged in Context" is real — verified against the
   pre-change file — and correctly preserved.
2. **[Minor, non-blocking]** `gear.js`'s `magical_properties` field is
   migrated via its own separate `collectUpdateFields(['magical_properties'],
   req.body)` call, appended to `setClauses`/`values` after the main
   `collectUpdateFields(allowed, req.body)` call — functionally correct
   (verified: the two arrays stay positionally matched), but unnecessarily
   convoluted, since `magical_properties` has no transform and could simply
   have been included in the main `allowed` array like `item_name`/
   `item_type`/`description`/`quantity`. Not fixed (reviewer does not
   implement fixes) — worth a one-line simplification if anyone touches
   this file again, not worth a dedicated follow-up task on its own.

No blocking findings. Acceptance criteria and validation requirements are
genuinely satisfied.

## Human acceptance

Pending.
