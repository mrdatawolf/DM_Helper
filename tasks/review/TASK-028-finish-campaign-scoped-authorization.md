# TASK-028: Finish campaign-scoped authorization for the remaining routers

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-13
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins).
Dependencies: TASK-023 (campaign-scoped authorization — completed for
`auth.js` and the characters router; this task finishes the rest).

## Desired outcome

Every remaining campaign-owned route filters and authorizes by the current
campaign, using the exact mechanism TASK-023 already built and proved
correct — `requireCampaignMembership`/`requireCampaignRole`
(`src/middleware/auth.js`) plus query-level filtering through `campaign_id`
or a campaign-linking table, following `src/routes/characters/index.js` as
the working reference pattern. When this task is done, TASK-023's Blocker
("multi-campaign isolation is not yet real for 13 of 16 routers") no longer
applies to any route in the application except `admin.js` (correctly
account-level, not campaign-owned).

## Context

TASK-023 built and independently verified the core mechanism: a
`requireCampaignMembership` middleware that queries `campaign_members`
against the live database on every request (never trusting the JWT's
`currentCampaignId` claim for authorization, only for *which* campaign to
check), overwrites `req.user.isDM` from that live row, and sets
`req.campaign = { id, role, name, system_id, universe_id }`; a
`requireCampaignRole(role)` wrapper for role-gated routes; and a working
example of query-level scoping in `src/routes/characters/index.js` (joining
through `campaign_characters` for characters, and reading `req.campaign.id`
directly for tables with a plain `campaign_id` column, per TASK-022's
schema).

Confirmed by direct inspection (2026-09-13) — none of these files currently
reference `requireCampaignMembership`/`requireCampaignRole`, they all still
use the pre-TASK-023 global `authenticate`/`requireDM`/`isDMOrAdmin`:

- `src/routes/shadows.js` — world/lore data (`shadows` table has
  `campaign_id` per TASK-022).
- `src/routes/npcs.js` — NPC data (`npcs.campaign_id` exists).
- `src/routes/sessions.js`, `src/routes/session-notes.js`,
  `src/routes/scenes.js`, `src/routes/combats.js`, `src/routes/progress.js` —
  session/tracker data (`campaign_sessions.campaign_id`,
  `character_progress.campaign_id` exist per TASK-022; `scenes`,
  `combat_encounters`, `combatants`, `session_notes` are migration-only
  tables that also received `campaign_id` per TASK-022's `CAMPAIGN_TABLES`
  list — verify current column presence before assuming).
- `src/routes/journal.js`, `src/routes/arcs.js`, `src/routes/beats.js`,
  `src/routes/primal-patterns.js` — narrative/story data
  (`journal_entries`, `story_arcs`, `chapters`, `beats`, `beat_chapters`,
  `primal_patterns`, `primal_pattern_sections` all received `campaign_id` per
  TASK-022).
- `src/routes/claims.js` — attribute claims (`attribute_claims`,
  `perceived_rankings`, `claim_point_pools`, `claim_history` all received
  `campaign_id` per TASK-022). Note `claims.js` already has some
  finer-grained authorization (`allocate`/`perception`/`resolve` are
  player-accessible, `grant-points` is DM-only) — preserve that distinction
  when adding campaign scoping, don't collapse it to a single campaign-role
  gate.
- `src/routes/tracker-shared.js` — **not a mounted router**, a shared helper
  module (`isDM()`, `ownsCharacter()`, `participatesInScene()`) used by
  `combats.js`, `scenes.js`, and `session-notes.js`. Its `isDM()` wraps the
  global `isDMOrAdmin` and will need to become campaign-role-aware (e.g.
  accept the request's `req.campaign.role` instead of/alongside the global
  claim) since three routers depend on it for their own authorization
  decisions.

`admin.js` is correctly out of scope — it's account-level administration,
not campaign-owned data, per TASK-023's own precedent.

## Scope

### Included

- Migrate every router listed in Context to use
  `requireCampaignMembership`/`requireCampaignRole` in place of
  `authenticate`/`requireDM`/`optionalAuth`, following the exact pattern
  `characters/index.js` established (mount at the router level where the
  whole resource is campaign-scoped; use `requireCampaignRole('dm')` for
  DM-only actions the way `claims.js`'s `grant-points` route needs).
- Add real query-level filtering (a `WHERE campaign_id = ?` /
  `AND campaign_id = ?` clause using `req.campaign.id`, or the equivalent
  join where a table's scoping is indirect) to every read and write in these
  routers that touches a campaign-owned table — not just a top-of-router
  authorization gate. Follow `characters/index.js`'s pattern of filtering in
  the SQL itself, not just checking the campaign after the fact.
- Update `tracker-shared.js` so `isDM()` (and any other authorization
  helper in that module the migrated routers rely on) reflects live
  campaign-role membership rather than the global claim, consistent with
  what `requireCampaignMembership` already does to `req.user.isDM`.
- Preserve `claims.js`'s existing finer-grained player-vs-DM route
  distinctions (allocate/perception/resolve vs. grant-points) — add campaign
  scoping without collapsing that existing authorization model.
- Add integration tests proving both directions for a representative
  sample across the migrated routers (same-campaign access allowed,
  cross-campaign access denied), following the pattern of TASK-023's
  `campaign switching scopes character access and rejects non-members` test
  in `tests/api.test.js`. Every migrated router needs at least one such test;
  it does not need exhaustive per-endpoint coverage if the router's
  authorization is uniform across its endpoints.
- Once every router in Context is migrated and verified, remove the
  now-obsolete blanket statement in TASK-023's own Blocker section is
  superseded — note this in the handoff, no separate doc edit needed beyond
  what TASK-023's own file already records.

### Excluded

- `admin.js` — account-level, not campaign-owned, unchanged.
- No change to the `requireCampaignMembership`/`requireCampaignRole`
  middleware itself, or to the campaign switch/create endpoints — those are
  TASK-023's, already built and verified. This task only adopts them more
  widely.
- No change to TASK-024/TASK-025's system/universe plugin work — unrelated
  axis.
- No production-grade session hardening beyond what TASK-023 already
  decided (JWT re-issue on switch, live membership re-check per request) —
  this task extends that same model, it doesn't redesign it.

## Plan

1. Confirm current `campaign_id` presence (or the correct linking path) for
   every table each router touches — TASK-022's migration is the source of
   truth, but verify directly (`PRAGMA table_info`) rather than assuming the
   Context list above is exhaustive or unchanged.
2. Migrate routers one at a time, in an order that surfaces `tracker-shared.js`
   changes early (since three routers depend on it) — e.g. `scenes.js` or
   `session-notes.js` first, adjust `tracker-shared.js`, then `combats.js`.
3. For each router: swap authorization middleware, add query-level campaign
   filtering, write/adjust its test(s), and run the full suite before moving
   to the next router — matching TASK-023's own incremental discipline.
4. If full coverage of all 13 routers cannot be completed and verified to a
   high standard in one pass, it is acceptable to land and verify a coherent
   subset and use this task's Blocker section to document exactly which
   routers remain, mirroring TASK-023's own precedent — do not claim
   unverified coverage.
5. Full regression pass and final review of which routers are now genuinely
   campaign-isolated versus not.

## Acceptance criteria

- [x] Every router listed in Context (or explicitly documented exceptions,
      per the partial-completion allowance) uses
      `requireCampaignMembership`/`requireCampaignRole` and filters its
      queries by the current campaign.
- [ ] `tracker-shared.js`'s authorization helpers reflect live campaign-role
      membership, not the global JWT claim.
- [ ] `claims.js`'s existing player-vs-DM route distinctions are preserved
      alongside the new campaign scoping.
- [x] A representative integration test exists per migrated router proving
      both same-campaign access and cross-campaign denial.
- [x] `npm test` passes.
- [x] The task's own handoff states plainly which routers (if any) remain
      unmigrated, if full coverage wasn't achieved in one pass.

## Validation requirements

- `npm test`, including new campaign-isolation tests for each migrated
  router.
- Manual sanity check: with two campaigns (e.g. reuse or recreate the
  "Second Campaign" test fixture from TASK-023's test), confirm a DM/player
  in campaign #1 cannot see or modify campaign #2's shadows, NPCs, sessions,
  journal entries, story arcs, or claims, and vice versa.

## Risks and assumptions

- This is mechanical but wide, same as TASK-023's own caution — consider
  splitting into 2-3 sub-tasks by router group (e.g. world/lore
  `shadows`+`npcs`; session/tracker `sessions`+`session-notes`+`scenes`+
  `combats`+`progress`+`tracker-shared`; narrative `journal`+`arcs`+`beats`+
  `primal-patterns`; `claims` on its own given its finer-grained model) at
  approval time if that makes review more tractable — this task file
  describes the whole remaining scope, but doesn't mandate doing it in one
  pass.
- `claims.js`'s existing non-uniform authorization (some routes player-safe,
  one DM-only) is the one router where a naive "just gate the whole router"
  approach would be wrong — read it carefully before changing it.
- Assumes TASK-022's `CAMPAIGN_TABLES` list is still accurate for every table
  these routers touch — verify directly rather than trusting this task's
  Context section, which was written from TASK-022's original migration file
  and may not reflect later changes.

## Blocker

Partial implementation blocker (2026-09-13): this pass completed and verified
the coherent world/lore subset (`shadows.js` and `npcs.js`). The following
approved scope remains unmigrated: `sessions.js`, `session-notes.js`,
`scenes.js`, `combats.js`, `progress.js`, `tracker-shared.js`, `journal.js`,
`arcs.js`, `beats.js`, `primal-patterns.js`, and `claims.js`. Those routers
retain their pre-TASK-028 authorization and query behavior. The implementer
stopped at the task's explicit partial-completion boundary rather than make
wide, unverified changes across the tracker, narrative, and claims groups.
Completing TASK-028 requires another implementation pass over those files,
including live-role changes to `tracker-shared.js` and preservation of
`claims.js`'s non-uniform route permissions.

## Implementation handoff

Implementer: Codex
Date: 2026-09-13

### Changes made

- Migrated `shadows.js` to router-level authentication and live campaign
  membership. Every shadow read/write now includes `req.campaign.id`; visited
  shadow queries scope the character link, progress, shadow, and session; and
  current-character lookup uses `campaign_characters.current_shadow_id`.
- Preserved TASK-025's universe-specific shadow validation calls, now dispatching
  create and update validation through the live `req.campaign.id`.
- Migrated `npcs.js` to router-level authentication/live membership and
  `requireCampaignRole('dm')` for writes while retaining member reads and the
  existing DM-only `dm_notes` serialization behavior. All NPC SQL is scoped by
  `campaign_id`, including inserts and mutations.
- Updated API integration coverage so campaign-owned shadow reads reject
  anonymous access and both migrated routers prove same-campaign access plus
  cross-campaign `404` isolation.

### Validation performed

- `node --test tests/api.test.js`: **16 passed, 0 failed**.
- `npm test`: **88 passed, 0 failed**.
- Manual SQL audit with `rg` confirmed every `shadows`/`npcs` statement in the
  migrated routers either binds `campaign_id` directly or uses the active
  campaign's linking row.

### Acceptance criteria evidence

- Migrated routers use `requireCampaignMembership`; NPC DM writes use
  `requireCampaignRole('dm')`.
- Cross-campaign tests create a shadow and NPC in campaign 2, allow campaign 2's
  token to read each, and return `404` to campaign 1's token.
- Remaining acceptance criteria are intentionally unchecked because the tracker,
  narrative, and claims routers are listed in the Blocker above.

### Assumptions and deviations

- Used the task's explicit partial-completion allowance and selected its suggested
  world/lore grouping. No behavior outside that group was claimed as migrated.
- Campaign-owned reads now require an authenticated campaign member, consistent
  with the task's instruction to replace `optionalAuth` and mount campaign
  membership at router level.

### Unresolved risks

- The routers named in Blocker remain cross-campaign isolation risks until a
  subsequent implementation pass completes them.

### Documentation updated

- This task file only; no architecture or behavior contract changed beyond the
  approved TASK-028 scope.

## Review

Not reviewed.

## Human acceptance

Pending.
