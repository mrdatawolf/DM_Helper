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

**Resolved 2026-10-06 by Patrick:** reuse `requireCampaignRole('dm')` as-is,
admin/super-admin override included. Promotion's authorization should behave
like every other DM-gated action in the app; carving out a stricter
one-off-only exception would make authorization inconsistent across actions
and would re-litigate TASK-028's documented policy locally rather than
through a deliberate, broader change. Implementation may proceed.

## Implementation handoff

Task: TASK-044: Campaign kind (one-off vs. full) and promotion
Implementer: openai-coder
Date: 2026-10-06

### Changes made

- Added guarded migration 018-campaign-kind.js and matching schema.sql columns:
  kind defaults to 'campaign', constrained to 'campaign'/'oneshot';
  planned_session_limit is nullable INTEGER. SQLite's ALTER-column default
  backfills existing campaigns without rewriting their other data. Re-running
  the migration preserves existing one-shot classifications and limits.
- Extended POST /api/auth/campaigns to accept kind and planned_session_limit,
  return both fields, and preserve defaults when omitted. Invalid kinds and
  non-integer/non-null limits receive 400. GET /api/auth/campaigns includes
  both fields on each campaign.
- Plan step 1 found no general campaign-update endpoint. Added minimal
  POST /api/auth/campaigns/promote for the selected campaign (JWT campaign
  context), using authenticate and requireCampaignRole('dm') unchanged.
  It sets only kind = 'campaign' and planned_session_limit = NULL. Admin
  and super-admin member overrides follow Patrick's resolved decision;
  non-members still cannot promote, including admins.
- Added a One-shot marker in switcher options and a visible badge for the
  selected one-shot, showing its optional planned session limit. Promotion
  appears for the selected campaign's DM or admin-equivalent member and
  refreshes the switcher on success. Creation uses a small native dialog
  with a One-shot checkbox (unchecked by default) and optional limit.
- Added API and migration regression coverage. No session-limit enforcement,
  content copying, plugin changes, or character-linkage changes were added.

### Validation performed

- npm test: 134 tests passed, 0 failed, 0 skipped (final run).
- Fresh in-memory database: schema.sql plus the complete migration runner
  passed, including schema shape synchronization. Migration 018 was also
  exercised twice on a populated pre-column in-memory campaigns table:
  existing rows default correctly, later one-shot data survives re-running,
  and invalid/null kinds are rejected by database constraints.
- API tests cover creation defaults, one-shots with/without limits, invalid
  kinds/limit types, list fields before/after promotion, DM success, ordinary
  player rejection, non-member rejection, admin and super-admin player-member
  overrides, admin non-member rejection, and rejection of legacy DM claims
  without the required live campaign role/membership. Promotion preserves
  every other campaign column, session rows, and membership rows; a repeated
  promotion succeeds. Session 4 remains creatable with a planned limit of 3.
- Running-browser verification: launched the real Express app on an ephemeral
  localhost port with DB_PATH=:memory:, then used Playwright with installed
  Edge (headless). Verified the creation checkbox defaults unchecked; filled
  the form to create a one-shot with limit 3; followed the actual UI reload;
  confirmed the visible One-shot badge and planned limit; clicked promotion;
  confirmed badge/button disappear and database kind/limit become campaign/NULL.
  The server and browser were closed afterward.
- Manual interactive browser verification was not performed: this environment
  provides shell-driven browser automation, without an interactive browser
  control tool. The check above is an actual scripted browser check, not a
  claim of manual verification. The temporary browser script is outside the
  repository at %TEMP%/task044-browser.cjs.
- git diff --check passed. No live dm_helper.db file was opened or migrated;
  no real-database copy was needed because all validation used memory.

### Acceptance criteria evidence

- Creation and listing defaults/new fields are covered by real API tests;
  the running browser exercised the new creation controls and badge.
- Promotion authorization is covered for DM, admin, super-admin, player,
  and non-member, following the resolved authorization policy.
- Exact campaign-row comparison plus session/member comparisons verifies
  promotion only changes kind and clears the informational limit.
- The running browser confirms the promote action refreshes the visible UI.
- All 134 tests pass. Manual interactive verification remains unperformed,
  as explicitly distinguished above; independent review/human acceptance
  remain separate steps.

### Assumptions and deviations

- Promotion uses the selected campaign rather than a campaign-id URL/body,
  matching the existing helper and other DM-gated route context. Select the
  intended campaign through the existing switcher before promoting it.
- The resolved admin/super-admin override applies to UI visibility as well
  as backend permission. Existing role helpers were not changed.
- planned_session_limit accepts any safe integer or null; no positive range
  or 1-3 cap was imposed because the approved scope specifies informational
  nullable INTEGER, not a restriction. Omission defaults to null.
- Browser validation was scripted in headless Edge rather than manual;
  no architectural or implementation scope deviations.
- Preserved unrelated TASK-043 lifecycle changes in the working tree.

### Unresolved risks

- No known implementation blocker. Manual interactive visual/responsive
  inspection remains for review. Live database migration remains pending
  normal startup/deployment; it was deliberately not applied in this session.

### Documentation updated

- schema.sql documents the new approved column definitions.
- Replaced this implementation handoff with the complete report, retained
  the original Blocker history and Patrick's resolution intact, and moved
  the task to tasks/review/ for independent review and human acceptance.

## Review

Reviewer: Claude
Date: 2026-10-06

Verified independently rather than trusting the handoff's self-report:

- `git show --stat 9c340d7`: migration, schema.sql, `auth.js`, navigation
  HTML/JS, and both test files changed — no session-limit enforcement, no
  content-cloning code, no new system/universe plugin, no archival/delete
  workflow added. Matches the task's Excluded scope exactly.
- Read `018-campaign-kind.js`: a plain guarded `ALTER TABLE ... ADD COLUMN`
  with `DEFAULT`, correctly simpler than TASK-043's rebuild since adding a
  defaulted column needs no table rebuild in SQLite. Re-running is a no-op
  via the `PRAGMA table_info` column-existence guard — confirmed by the new
  migration test, which also asserts the `CHECK(kind IN (...))` and
  `NOT NULL` constraints actually reject bad data at the DB level, not just
  the route layer.
- Read `src/routes/auth.js`'s new `POST /api/auth/campaigns/promote`: uses
  `authenticate, requireCampaignRole('dm')` exactly like other DM-gated
  routes, acts on `req.campaign.id` (the session's *currently selected*
  campaign, per `requireCampaignMembership` in `middleware/auth.js:122`) —
  consistent with how every other campaign-scoped DM action in this app
  already resolves "which campaign." This matches Patrick's resolved
  decision to reuse the existing helper unchanged, including the
  admin/super-admin override.
- The new `tests/api.test.js` coverage is genuinely adversarial, not a happy-
  path smoke test: it checks a non-member token is rejected, that a *forged
  legacy `is_dm: 1` JWT claim* cannot substitute for live `campaign_members`
  membership (both with and without an existing player-role row), that
  admin/super-admin still require an actual membership row before promoting,
  and that promotion is idempotent and touches only `kind`/
  `planned_session_limit` — verified by exact row-equality assertions against
  `campaign_sessions` and `campaign_members` before/after. This directly
  encodes the task's acceptance criteria as regression tests rather than
  asserting status codes alone.
- Ran `npm test` myself: 134/134 passing, matching the handoff.
- Read the frontend diff: the one-shot badge, promote button, and a proper
  `<dialog>`-based creation form (replacing the old `window.prompt`) are each
  minimal and scoped to what the task asked for; the promote button's
  visibility check (`activeCampaign.role === 'dm' || user.is_admin || ...`)
  correctly mirrors the backend's authorization rather than inventing a
  separate client-side policy.
- The handoff's distinction between its real scripted-Playwright browser
  check and "manual interactive verification" (which it says plainly it
  could not perform in its environment) is the right call — it reported what
  it actually did rather than claiming manual testing it didn't do.

No blocking findings. One non-blocking note for future work: promotion acts
on "whatever campaign is currently selected in the caller's session," not on
an explicit campaign id in the request — correct and consistent with this
app's existing pattern, but worth remembering if a future UI ever lets a DM
act on a campaign without first switching to it.

All acceptance criteria are genuinely satisfied and independently verified.
Ready for human acceptance.
