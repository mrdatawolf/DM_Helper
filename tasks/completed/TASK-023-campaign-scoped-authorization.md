# TASK-023: Campaign-scoped authorization and campaign switcher

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None — a contract may be warranted given this changes
authorization behavior on every route; human/architect call at approval time.
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins).
Dependencies: TASK-022 (campaigns/campaign_members/campaign_id schema must
exist first).

## Desired outcome

A user's DM/player role is evaluated **per campaign** via `campaign_members`,
not baked globally into their JWT at login. Every route that reads or writes
campaign-owned data (per TASK-022's `campaign_id` additions) filters by, and
authorizes against, the campaign currently in context. A logged-in user can
have a "current campaign" (carried in session/JWT) and switch it via a
campaign switcher in the UI (header or footer, DM's call on exact placement).
Existing single-campaign behavior is fully preserved for the migrated
campaign #1 — this task must not change what the current DM/players can see
or do in their existing campaign, only add the scoping/authorization
mechanism underneath it.

## Context

`src/middleware/auth.js` currently bakes `isDM`/`isAdmin`/`isSuperAdmin` into
the JWT at issuance (`generateToken`, lines 14-26) and never re-checks them —
`authenticate` (lines 43-74) just copies the token's claims onto `req.user`.
`requireDM`/`requireAdmin` (lines 120-143) are global, all-or-nothing checks.
This is exactly right for one global DM and wrong once role can differ by
campaign (per ADR-005, a user could DM one campaign and play in another).

ADR-005 identifies this as "the highest-blast-radius change in this
decision, since it touches all existing route files" — all 16 routers under
`src/routes/` (`admin.js`, `arcs.js`, `auth.js`, `beats.js`,
`characters/*.js`, `claims.js`, `combats.js`, `journal.js`, `npcs.js`,
`primal-patterns.js`, `progress.js`, `scenes.js`, `session-notes.js`,
`sessions.js`, `shadows.js`, `tracker-shared.js`) currently trust `req.user`'s
baked-in role without any campaign context at all.

TASK-022 will have added `campaign_id` to every genuinely campaign-owned
table and a `campaign_members` table recording per-campaign role — this task
is what actually makes routes use that data for authorization, and introduces
"which campaign is this request/session for" as a real concept for the first
time.

## Scope

### Included

- A `current_campaign_id` carried per session (either re-issued in the JWT on
  campaign switch, or tracked server-side against the session — implementer's
  call, document the choice and its tradeoffs, e.g. JWT re-issue means a
  logout/login-like token refresh on switch; a server-side session store is a
  new piece of infrastructure this app doesn't have today).
- New middleware (e.g. `requireCampaignRole(role)`) that checks the request's
  campaign in context against `campaign_members` for `req.user.userId`,
  replacing route-level use of the current global `requireDM`/`requireAdmin`
  wherever the route operates on campaign-owned data. `isAdmin`/`isSuperAdmin`
  (account-level administration, per `docs/PROJECT.md`'s existing DM vs Admin
  vs Super Admin distinction) remain global concepts, not per-campaign — only
  DM-vs-player campaign membership becomes per-campaign.
- Update every route under `src/routes/` that reads/writes a campaign-owned
  table to filter its queries by the current campaign and authorize via the
  new campaign-role check, instead of the current global `requireDM`.
- A campaign switcher in the UI (header or footer) for users who belong to
  more than one campaign, and a campaign creation/selection flow for a user
  with no current campaign (e.g. first login, or after leaving their only
  campaign) — minimal UI, consistent with this app's existing static-HTML +
  vanilla-JS approach (no new frontend framework).
- Preserve current behavior exactly for campaign #1 (the migrated existing
  campaign) — every existing user's role there matches their current
  `is_dm`/`isAdmin`/`isSuperAdmin` status, and the app functions identically
  for a single-campaign user who never switches.

### Excluded

- No change to account-level admin/super-admin authorization — those remain
  global per `docs/PROJECT.md`'s existing model.
- No UI for creating a *new* system or universe (that's code-defined, per
  ADR-005) — the campaign creation flow only lets a DM pick from the
  system/universe identifiers that already exist as `campaigns.system_id`/
  `universe_id` values (currently just `dnd5e`/`amber`, until TASK-024/025
  build out the registries).
- No change to `character_system_data`, wizard content, guide content, or
  home screen branding — those are TASK-024/025/026/027.
- No production-grade session/token hardening (rotation policies, refresh
  tokens, rate limiting) beyond what's needed to make per-campaign role
  checks correct — per ADR-005, this remains a small trusted self-hosted
  deployment, not a hardened multi-tenant SaaS product.

## Plan

1. Design the `current_campaign_id` mechanism (JWT re-issue vs. server-side
   session) and get sign-off on the tradeoff before implementing broadly,
   given its blast radius — flag this as the first checkpoint in the
   implementation handoff if a design contract seems warranted instead of
   proceeding straight to code.
2. Build `requireCampaignRole` middleware and the campaign-switch endpoint.
3. Migrate routes one file at a time from global `requireDM` to
   campaign-scoped checks, verifying each router's existing tests still pass
   before moving to the next.
4. Build the campaign switcher UI and campaign creation/selection flow.
5. Full regression pass: confirm the existing single campaign works exactly
   as before for every existing user/role.

## Acceptance criteria

- [ ] A user's DM/player authority for campaign-owned actions is determined
      by their `campaign_members` row for the campaign in context, not a
      global JWT claim.
- [ ] Every route operating on campaign-owned data filters by the current
      campaign and rejects access to data outside a user's campaign
      membership.
- [ ] Account-level admin/super-admin authorization is unchanged.
- [ ] A user belonging to more than one campaign can switch their current
      campaign via the UI, and subsequent requests reflect the new campaign
      context.
- [ ] Every existing user, in the migrated campaign #1, retains exactly the
      access they had before this task (no regression for the current
      single-campaign use).
- [ ] `npm test` passes, with new coverage for campaign-scoped authorization
      (including a negative test: a user cannot access another campaign's
      data).

## Validation requirements

- `npm test`, including new authorization tests covering: same-campaign
  access allowed, cross-campaign access denied, campaign switch changes
  subsequent request behavior, and account-level admin checks unaffected.
- Manual verification: log in as the existing DM and as an existing player,
  confirm all current dashboards/actions behave identically to before this
  task.
- If a second test campaign is created during validation, confirm a user in
  neither campaign membership is correctly denied, and a user in both can
  switch and see the correct campaign's data each time.

## Risks and assumptions

- This is the highest-risk task in the ADR-005 sequence per the ADR itself —
  a mistake here could leak one campaign's data into another's view, which is
  the one thing this whole model must get right. Err toward denying access
  and surfacing the case in review rather than defaulting open.
- The `current_campaign_id` mechanism choice (JWT re-issue vs. session store)
  has real tradeoffs this task file doesn't resolve — that's a deliberate gap
  for the implementer/reviewer/human to settle, not an oversight, given it
  touches session infrastructure this app doesn't currently have.
- Migrating 16 route files' authorization is mechanical but wide; consider
  whether this should be split into smaller sub-tasks per router group at
  approval time rather than one large task, if that makes review more
  tractable.

## Blocker

**Partial implementation only. Do not treat multi-campaign isolation as complete.**

The authentication/campaign-context endpoints and the complete character router
surface are migrated and verified. The following campaign-owned routers remain
unmigrated: `arcs.js`, `beats.js`, `claims.js`, `combats.js`, `journal.js`,
`npcs.js`, `primal-patterns.js`, `progress.js`, `scenes.js`,
`session-notes.js`, `sessions.js`, `shadows.js`, and `tracker-shared.js`.
`admin.js` is intentionally unchanged because it is account-level, not
campaign-owned. The remaining routers still use legacy JWT/global-DM behavior
and/or unscoped SQL, so a second campaign must not be considered isolated until
they are migrated and independently tested. Work stopped at this boundary to
send a small, provably scoped slice for review rather than claim unverified
coverage across the highest-blast-radius portion of the task.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-09-12

### Design checkpoint: current campaign mechanism

- Chose JWT re-issue on campaign switch. Login selects the user's first
  membership, and successful switch/create responses issue a new 24-hour token
  containing `currentCampaignId` and replace the HTTP-only cookie. The static UI
  also replaces its local-storage bearer token before reloading.
- This preserves the existing stateless deployment and avoids introducing a
  server-side session store, persistence/cleanup policy, and another runtime
  dependency solely for campaign selection.
- Tradeoff: a copied pre-switch token retains its old campaign context until its
  normal expiry; switching does not revoke it. This is acceptable for the
  approved small self-hosted scope because every migrated request re-checks the
  token's campaign against live `campaign_members`, so membership removal is
  immediate and an old token cannot select a campaign the user never joined.
  Production-grade token rotation/revocation remains explicitly out of scope.

### Changes made

- Added `currentCampaignId` to issued/decoded JWT context plus
  `requireCampaignMembership` and `requireCampaignRole`. Membership is queried
  on every protected campaign request, and the request's effective `isDM` is
  replaced with the live membership role before downstream authorization.
- Added authenticated campaign list, switch, and create endpoints under
  `/api/auth/campaigns`. Switching rejects non-members. Creation is limited to
  legacy DM/admin/super-admin accounts, creates the owner membership
  transactionally, and selects the new campaign.
- Preserved migrated campaign #1 compatibility: registrations join it as
  players when it exists, and the still-legacy account-admin DM grant is
  reflected into campaign #1 at login.
- Migrated `auth.js`'s character listing and the complete characters router,
  including the gear, powers, familiars, weapons, spells, image, and story
  subrouters. Character visibility is enforced through `campaign_characters`;
  creation adds that link and scopes the initial claim pool. Recent progress is
  filtered by campaign.
- Added a minimal navigation campaign selector and campaign-creation prompt.
  Users with multiple memberships can switch; eligible DM/admin users can
  create a `dnd5e`/`amber` campaign, matching the only identifiers currently
  available.
- Added integration coverage for same-campaign character access, cross-campaign
  concealment, denied switching by a non-member, switching back to campaign #1,
  and unchanged global admin access.

### Router coverage

- Migrated and verified: `auth.js`; `characters/index.js` and all mounted
  character subrouters via shared router-level membership and character-link
  guards.
- Intentionally unchanged: `admin.js` (account-level administration).
- Not yet migrated: every router listed in the Blocker section. No claim is made
  that those resources are tenant-isolated.

### Validation performed

- Ran focused character/auth suites: 35 passed, 0 failed.
- Ran `npm test`: 77 passed, 0 failed. New assertions exercise both positive
  and negative campaign authorization and verify account-level admin remains
  global.
- Did not perform the required interactive DM/player browser walkthrough; this
  environment has no browser-control harness. The UI code paths were traced,
  and backend switch behavior is integration-tested, but visual interaction is
  left for review.

### Assumptions and deviations

- This is the task-authorized partial path: correctness was prioritized over
  migrating all routers in one pass. Acceptance boxes remain unchecked because
  the task as a whole is not complete.
- A character outside the current campaign returns 404 rather than 403 to avoid
  disclosing that another campaign's character id exists.
- Campaign creation uses the currently available `dnd5e`/`amber` identifiers;
  no registry or new system/universe UI was introduced.

### Unresolved risks

- The unmigrated routers are a known cross-campaign disclosure/write risk and
  prevent enabling trustworthy multi-campaign operation.
- The campaign switcher requires manual browser verification for layout,
  keyboard interaction, and redirect/reload behavior.
- Legacy `isDM` remains in JWTs for unmigrated routes only. Migrated character
  requests overwrite it from live membership; removing the legacy claim must
  wait until every dependent router is migrated.

## Review

Reviewer: Claude
Date: 2026-09-13

This is a deliberately partial implementation, sent to review as such per the
task's own Blocker section — reviewed on that basis, not as claiming full
16-router coverage.

Verified independently rather than trusting the handoff's self-report:

- `git show --stat 66f2141`: `src/middleware/auth.js`, `src/routes/auth.js`,
  `src/routes/characters/index.js`, `src/routes/characters/shared.js`, plus
  navigation UI files and tests. No other router touched.
- **Confirmed the "live re-check, not trusted JWT claim" design decision is
  real, not just asserted**: `requireCampaignMembership`
  (`src/middleware/auth.js`) queries `campaign_members` against the database
  on every request and overwrites `req.user.isDM` from that live row before
  any downstream authorization runs — the JWT's `currentCampaignId` only says
  *which* campaign to check, it never grants access by itself. This is exactly
  the property ADR-005/TASK-023 needed and directly addresses the stale-token
  tradeoff the handoff documents (a copied pre-switch token can't select a
  campaign the user isn't currently a member of, because membership is
  re-checked live every time).
- **Confirmed character-router scoping is real query-level filtering, not just
  a top-of-route gate**: `GET /`, `GET /:id`, `POST /`, and `/api/auth/characters`
  all join/filter through `campaign_characters.campaign_id = req.campaign.id`
  (or `req.user.currentCampaignId`). `router.use('/:id', requireCampaignCharacter)`
  is registered before the six mounted subrouters (`gear`, `powers`,
  `familiars`, `weapons`, `spells`, `image`, `story` — confirmed via
  `src/routes/characters/index.js` lines 205-211), so a character outside the
  current campaign 404s before any subrouter handler runs, without needing to
  edit each subrouter individually.
- **Confirmed the "not yet migrated" list is accurate, not just claimed**:
  grepped every file under `src/routes/` for `requireCampaignMembership`/
  `requireCampaignRole` — only `characters/index.js` uses it. All 13 routers
  named in the Blocker section (`arcs.js` through `tracker-shared.js`) still
  have zero references to the new middleware, matching the handoff exactly.
  `admin.js` correctly untouched (account-level, not campaign-owned, per the
  task's own scope).
- Read the new `campaign switching scopes character access and rejects
  non-members` test (`tests/api.test.js`): genuinely exercises both directions
  — a second campaign's character is reachable with that campaign's token and
  returns 404 for the original DM's (different-campaign) token, a non-member
  is refused a switch (403), and switching back restores access. Not a
  vacuous test.
- Independently ran `npm test`: 77/77 passing, matching the handoff.
- Registration/login backward-compatibility shims (new registrants join
  campaign #1 as players; a legacy `is_dm=1` login reflects into campaign #1's
  membership role) are reasonable, narrow, and clearly commented as
  migration-era compatibility rather than permanent design.
- `POST /api/auth/campaigns` correctly restricts creation to
  DM/admin/super-admin and creates the owner's membership in the same
  transaction as the campaign row — no window where a campaign exists without
  its owner being a member.
- The 404-not-403 choice for an out-of-campaign character (to avoid confirming
  another campaign's id exists) is a sound, deliberate information-disclosure
  call, not an oversight.

No blocking findings **for the scope actually delivered**. The Blocker
section's framing is exactly right and I'd underline it rather than soften
it: this task is not done, multi-campaign isolation is not yet real for 13 of
16 routers, and none of that unmigrated surface should be treated as
tenant-safe. What's here is a solid, correctly verified foundation (auth
middleware + the campaign-switch/create endpoints + the full character
surface) for the remaining routers to build on — recommend a follow-up task
(or several, per router group, as ADR-005's own risk note suggested) to
finish the migration, rather than treating this as complete. Ready for human
acceptance **as a partial, honestly-scoped increment**.

## Human acceptance

Pending.
