# TASK-044: Campaign kind (one-off vs. full) and promotion

Owner role: Implementer
Assigned agent: openai-coder
Proposed by: Claude
Proposed date: 2026-10-06
Approved by: Patrick
Approved date: 2026-10-06
Related contracts: None.
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins). This task adds a lightweight classification to that
existing root; it does not introduce a new entity, and deliberately follows
ADR-005's precedent of rejecting per-entity forking/duplication (that ADR
rejected forking character stats per campaign in favor of one shared source
of truth — this task applies the same preference: a one-off and a full
campaign are the same row, distinguished by one column, not two structures).
Dependencies: TASK-043 (per-campaign `session_number` uniqueness) must land
first — one-off campaigns make "several campaigns each starting at session 1"
the common case, not a hypothetical one.

## Desired outcome

A DM can create a short "one-off" campaign (intended for 1–3 sessions, to
test a new world idea) through the existing campaign-creation flow, visually
distinguished from a full campaign. Later, the DM can promote a one-off to a
full campaign with no data migration — because a one-off's structure never
differed from a full campaign's in the first place, promotion is a
classification change only.

## Context

Per ADR-005, `Campaign` is already the tenant root, with `System` and
`Universe` as independent, code-defined plugin axes selected per campaign.
A campaign can already set `universe_id` to empty (homebrew, no canned
setting — see `src/routes/auth.js:304-306`) and build `shadows`/`npcs`
freehand, scoped by `campaign_id` like everything else. **This already fully
supports "testing a new world idea" with zero new content mechanism** —
confirmed and scoped down with the human during design (2026-10-06): no new
Universe/System plugin mechanism is wanted here, and no content
cloning/reuse between one-offs is wanted either. Abandoned one-off campaigns
are simply left as-is or deleted later, never merged or copied from.

Campaign creation already exists: `POST /api/auth/campaigns`
(`src/routes/auth.js:290-319`) takes `name`, `system_id`, `universe_id`, and
there's a minimal campaign switcher/creation UI from TASK-023/028. Neither
has any concept of a campaign's intended size or lifecycle stage — every
campaign is implicitly "full." The gap this task fills is purely that
classification, plus a promotion action.

## Scope

### Included

1. `campaigns.kind` column: `TEXT NOT NULL DEFAULT 'campaign'
   CHECK(kind IN ('campaign', 'oneshot'))`. Migration adds the column
   (guarded `ALTER TABLE`, following existing idempotent-migration precedent)
   and backfills all existing rows to `'campaign'` (i.e., no behavior change
   for campaign #1 or any other existing campaign).
2. `campaigns.planned_session_limit` column: nullable `INTEGER`.
   Informational only — this task must not enforce it anywhere (no blocking
   a DM from creating a 4th session on a 3-session one-off). It exists purely
   so the UI can show something like "2 / 3 sessions."
3. `POST /api/auth/campaigns` accepts optional `kind` and
   `planned_session_limit` in the request body. Validate `kind` is one of the
   two allowed values when provided. Omitting either field must preserve
   today's exact behavior (defaults to `'campaign'`, no limit).
4. A promotion action: sets `kind = 'campaign'` and clears
   `planned_session_limit` for a given campaign. One-directional in this
   task's scope (no "demote back to one-off" action). Restricted to that
   campaign's DM — reuse the existing campaign-role authorization pattern
   from TASK-023/028 rather than inventing a new check. Check first whether
   a general campaign-update endpoint already exists to extend; if not, add
   a minimal new one rather than overloading an unrelated route.
5. `GET /api/auth/campaigns` includes `kind` and `planned_session_limit` per
   campaign in its response, so the UI can distinguish them.
6. Minimal UI, in the existing campaign switcher/creation UI (from
   TASK-023/028):
   - A visual marker (e.g. a "one-shot" badge) on campaigns with
     `kind = 'oneshot'`.
   - A "Promote to full campaign" action, visible only to that campaign's DM.
   - A way to pick `kind` at creation time (e.g. a checkbox/toggle),
     defaulting to full campaign so a DM who ignores it sees no change.

### Excluded

- No enforcement of `planned_session_limit` — display only.
- No cross-one-off or one-off-to-campaign content cloning, duplication, or
  merging. Promotion only flips the classification; nothing is copied
  because nothing was ever duplicated. (Explicitly decided with the human
  during design — see Context.)
- No new Universe or System plugins for testing worlds. One-offs use the
  existing homebrew (empty `universe_id`) or any existing universe exactly
  like a full campaign does today.
- No archival or soft-delete workflow for abandoned one-offs. Deleting a
  campaign, if that doesn't already exist, is separate scope from this task.
- No change to character-to-campaign linkage semantics (ADR-005's
  many-to-many `campaign_characters` model is untouched).

## Plan

1. Check whether a general campaign-update endpoint already exists to extend
   for the promote action; decide extend-vs-new-endpoint and note the choice.
2. Write the migration for `kind` and `planned_session_limit`, guarded and
   idempotent per existing precedent (e.g. the `PRAGMA table_info` guard
   pattern used in migration 013).
3. Update `schema.sql` to match.
4. Extend `POST /api/auth/campaigns` and `GET /api/auth/campaigns`.
5. Add the promote endpoint/action with DM-only authorization.
6. Minimal frontend: badge + promote button in the campaign switcher UI;
   `kind` toggle in the campaign creation UI.
7. Tests: creation with and without `kind`; promote endpoint authorization
   for DM vs. player vs. non-member; list endpoint returns the new fields.
8. Run the full test suite; manually verify in a browser per this project's
   UI-change norm (create a one-off, confirm the badge appears, promote it,
   confirm the badge disappears and the limit clears).

## Acceptance criteria

- [ ] A DM can create a campaign with `kind = 'oneshot'` and an optional
      `planned_session_limit` through the existing creation flow.
- [ ] Omitting `kind` at creation still defaults to `'campaign'` with
      behavior identical to today.
- [ ] Only the owning campaign's DM can promote it; players and non-members
      are rejected.
- [ ] Promoting sets `kind = 'campaign'` and clears `planned_session_limit`;
      no other data changes.
- [ ] The campaign list/switcher UI visibly distinguishes one-offs and
      exposes the promote action to that campaign's DM only.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new coverage for creation defaults, promotion
  authorization, and the list endpoint's new fields.
- Manual browser check of the UI badge and promote flow, per this project's
  norm of testing UI changes in a running browser rather than relying on
  type/test coverage alone.

## Risks and assumptions

- Assumes no existing campaign-update endpoint; the implementer must check
  first (Plan step 1) rather than assume one does or doesn't exist.
- Assumes the DM-of-this-campaign authorization check already has a reusable
  helper from TASK-023/028; if not, note the gap in the handoff rather than
  building a parallel ad hoc check.
- Depends on TASK-043 landing first so short campaigns don't collide on
  `session_number`.

## Blocker

Blocked 2026-10-06: Patrick must resolve promotion authorization before
implementation continues. TASK-044 requires promotion restricted to that
campaign's DM and rejection of players, while also requiring reuse of the
existing campaign-role authorization pattern. The existing
`src/middleware/auth.js:128` helper `requireCampaignRole('dm')` permits
campaign members with admin/super-admin claims even when their campaign role
is `player` (line 131). Its documented policy treats admins as DM-equivalent
everywhere (lines 140–146). TASK-028 explicitly excluded changes to these
helpers (`tasks/completed/TASK-028-finish-campaign-scoped-authorization.md:116`).

Decision needed: should promotion retain the existing admin/super-admin
override, or require an actual `campaign_members.role = 'dm'` for this action
as a specific exception? No authorization behavior has been guessed or changed.
The task remains in `in-progress/` per the blocked-work lifecycle rule.

## Implementation handoff

Implementation has not started; blocked after required reading and endpoint/
authorization inspection. This is an investigation record, not a completed
implementation handoff.

- Read CLAUDE.md, AGENTS.md, docs/AI_DEVELOPMENT_SYSTEM.md,
  docs/workflow/lifecycle.md, and docs/DEVELOPMENT.md in order; then read this
  task, TASK-043, the implementation-report template, ADR-005, architecture,
  migration 013, and TASK-022's copy-validation precedent.
- Moved the assigned task from `approved/` to `in-progress/` before inspection.
- Plan step 1: `rg -n 'router\.(put|patch|post).*campaign' src/routes`
  found only campaign switch and creation in `src/routes/auth.js:279,290`;
  no general campaign-update endpoint exists. A minimal promotion endpoint
  is therefore appropriate once authorization is resolved.
- Confirmed the existing helper and the policy conflict described above by
  reading `src/middleware/auth.js` and inspecting TASK-023/028.
- No application, schema, migration, or TASK-043 files changed. Existing
  TASK-043 lifecycle moves in the working tree were left untouched.
- Tests, migration-copy validation, dev server, and browser validation were
  not run because implementation is blocked. No live database was opened.
