# TASK-004: Consolidate permission-check logic into shared middleware

Owner role: Pending
Assigned agent: Pending
Proposed by: Claude (DbC scaffolding session)
Proposed date: 2026-08-25
Approved by: Patrick
Approved date: 08/25/26
Related contracts: None
Related ADRs: None
Dependencies: None. Recommended (not required) to sequence before TASK-005,
since `characters.js` is both where the duplicated permission logic lives and
the file TASK-005 splits apart — doing this first means TASK-005 splits
already-clean code instead of moving the duplication into multiple new files.

## Desired outcome

Permission checks (DM-or-admin-style authorization) are expressed once, as
shared middleware/helpers in `src/middleware/auth.js`, and reused consistently
across route files — instead of being reinvented locally per file.

## Context

`src/middleware/auth.js` already exports `authenticate`, `optionalAuth`,
`requireDM`, and `requireAdmin`. `requireDM` checks `req.user.isDM` only;
`requireAdmin` checks `req.user.isAdmin || req.user.isSuperAdmin` only — the
two are currently siblings, not composable (`requireDM` does not currently
treat an admin/super-admin as DM-equivalent).

`src/routes/characters.js` alone contains:

- A local `canModifyCharacter()` function.
- A local `requireDMUser()` function.
- Three separate inline `req.user.isDM || req.user.isAdmin` checks.

None of these reuse the existing `requireDM`/`requireAdmin` middleware. This
means the actual authorization rules for `characters.js` are scattered across
five different pieces of logic in one file, none of which are shared with the
other 15 route files, several of which likely need the same
DM-or-admin-equivalent check.

## Scope

### Included

- Deciding (as part of implementation, escalating to the human if it's not
  obvious) whether `isAdmin`/`isSuperAdmin` should be treated as DM-equivalent
  globally, or whether that equivalence is specific to certain resources —
  this is a real semantic question, not just a refactor, since it changes who
  can do what.
- Adding whatever shared middleware/helper(s) are needed in
  `src/middleware/auth.js` to express "DM or admin-equivalent" as a single,
  reusable check (e.g., a `requireDMOrAdmin` middleware, or updating
  `requireDM` itself if the semantic decision above concludes they should
  always be equivalent).
- Replacing `characters.js`'s local `canModifyCharacter()`, `requireDMUser()`,
  and the three inline `isDM || isAdmin` checks with the shared
  middleware/helper.
- A pass over the other 15 route files to identify and replace any other
  inline `req.user.isDM`/`req.user.isAdmin` checks that duplicate what the
  shared helper now covers (grep for `isDM` and `isAdmin` across
  `src/routes/`).

### Excluded

- Changing who is actually authorized to do what, beyond what's needed to
  express the existing behavior through shared code — this is a consolidation
  task, not a permissions redesign. If the semantic decision above reveals the
  current behavior is inconsistent between routes (e.g., one route treats
  admin as DM-equivalent and another doesn't), report that to the human as a
  finding rather than picking one silently.
- The characters.js file-split itself (see TASK-005).

## Plan

1. Grep `src/routes/` for `isDM`, `isAdmin`, `isSuperAdmin`, and any locally
   defined permission-check functions to build a complete inventory (the
   `characters.js` instances above are the known ones; there may be more).
2. Determine, with the human if ambiguous, the intended DM/admin equivalence
   semantics.
3. Add the shared middleware/helper(s) to `src/middleware/auth.js`.
4. Replace `characters.js`'s local checks first (it has the most duplication).
5. Replace any remaining duplicated checks found in step 1 across other route
   files.

## Acceptance criteria

- [ ] `src/middleware/auth.js` exposes a single shared way to express
      "DM or admin-equivalent" authorization, usable by any route file.
- [ ] `characters.js` no longer defines `canModifyCharacter()` or
      `requireDMUser()` locally, and its three inline `isDM || isAdmin` checks
      are replaced by the shared middleware/helper.
- [ ] No other route file contains a hand-rolled equivalent of the shared
      check after the inventory pass in step 1 of the Plan.
- [ ] Any discovered inconsistency in current authorization behavior between
      routes is reported to the human, not silently normalized.
- [ ] `npm test` passes; authorization behavior for DM, admin, and regular
      users is unchanged for every route except where a reported
      inconsistency was explicitly resolved by the human.

## Validation requirements

- `npm test` (existing suites, particularly any covering auth/characters).
- Manual/scripted checks of at least: a DM-only route, an admin-only route,
  and one of the `characters.js` endpoints, exercised as a DM user, an admin
  user, and a regular player, confirming identical allow/deny behavior to
  before the change (except where a human-approved fix was made).

## Risks and assumptions

- The DM/admin-equivalence question is a genuine product decision hiding
  inside what looks like a refactor — do not resolve it by guessing which
  behavior "seems right." Escalate per `AGENTS.md` instruction precedence if
  it isn't already unambiguous from current behavior.
- Moderate risk: this is a security-relevant change (authorization logic)
  touching multiple files — validation should be more thorough than a purely
  cosmetic refactor.

## Blocker

None.

## Implementation handoff

Implemented by Claude (this session), 2026-08-26.

**Semantic decision escalated and resolved before implementation**: found a
genuine three-way pre-existing inconsistency (not a guess — confirmed by
reading every call site): (A) `requireDM` middleware and a few inline checks
treated `isDM` as strictly separate from `isAdmin` — admin excluded; (B)
`characters.js`, `claims.js`'s `ownsCharacter`, and `tracker-shared.js`'s
`isDM()` (used by `scenes.js`/`session-notes.js`/`combats.js`) already
treated `isDM || isAdmin` as equivalent; (C) `shadows.js` used a third,
narrower rule (`isSuperAdmin` specifically, not `isAdmin`) for who besides a
shadow's creator can edit it. Presented this to the human with concrete
consequences for each direction; decided: **admin (and super-admin) are
DM-equivalent everywhere DM authority is checked** — i.e., unify toward
Pattern B/current-majority behavior, extending it to the Pattern-A spots.
Pattern C (`shadows.js`'s super-admin-only edit override) was identified as
a distinct concern — not about DM authority, but about who besides a
resource's creator can override its ownership — and left untouched; flagged
below for a separate decision if the human wants one.

What changed:
- `src/middleware/auth.js`: added `isDMOrAdmin(user)` —
  `!!(user && (user.isDM || user.isAdmin || user.isSuperAdmin))` — the one
  shared primitive. `requireDM` now calls it instead of checking `req.user.isDM`
  alone. Exported alongside the existing exports. `requireAdmin` was
  deliberately NOT touched — the decision was about extending admin→DM
  authority, not the reverse; the admin panel (`admin.js`) stays gated to
  `isAdmin || isSuperAdmin` only, so DM users still cannot manage user
  accounts.
- `src/routes/characters.js`: `canModifyCharacter()` and `requireDMUser()`
  are kept as named functions (see note below on the acceptance criteria's
  literal wording) but their bodies now call `isDMOrAdmin()` instead of
  reinventing `isDM || isAdmin`; the three remaining inline
  `req.user.isDM || req.user.isAdmin` expressions were replaced with
  `isDMOrAdmin(req.user)`. Also fixed one within-file inconsistency found
  while doing this: the `familiars` field on `GET /:id` used a strict
  `!!req.user?.isDM` (no admin fallback) while every other DM-gated spot in
  the same file already included admin — now consistent.
- `src/routes/claims.js`: `ownsCharacter()`'s `isDM || isAdmin` check now
  calls `isDMOrAdmin()`.
- `src/routes/tracker-shared.js`: `isDM(user)` now delegates to the shared
  `isDMOrAdmin()` instead of its own `!!(user.isDM || user.isAdmin)` — this
  one change propagates to every caller in `scenes.js`, `session-notes.js`,
  and `combats.js` with no changes needed in those three files, and closes
  a gap where `tracker-shared.js`'s version didn't account for
  `isSuperAdmin` at all.
- `src/routes/npcs.js`: the write-gate middleware was a byte-for-byte
  duplicate of `requireDM` (same two checks, same exact message) — replaced
  with a direct call to the shared `requireDM`. The two `dm_notes`-visibility
  call sites (`req.user?.isDM`) were changed to `isDMOrAdmin(req.user)`.
- `src/routes/journal.js`: all 5 occurrences of `req.user.isDM` (across 5
  route handlers) replaced with `isDMOrAdmin(req.user)`.
- `src/routes/shadows.js`: the one DM-authority check (line ~45, viewing
  another user's character's visited-shadows list) changed to
  `isDMOrAdmin(req.user)`. The two `isSuperAdmin`-only shadow-edit-permission
  checks (Pattern C above) were deliberately left untouched.

**Note on acceptance criteria wording**: the criteria say `characters.js`
should "no longer define `canModifyCharacter()` or `requireDMUser()`
locally." Both still exist as named functions, but neither reinvents the
DM-or-admin check anymore — `canModifyCharacter` additionally combines it
with resource ownership (`character.user_id === reqUser.userId`), which is
inherently characters.js-specific logic that can't move into a generic
auth middleware; `requireDMUser` is called mid-handler (after the target
resource is already fetched) rather than as router-level middleware, and
preserves its own message ("Powers are granted by the DM") which is more
specific than `requireDM`'s generic "DM access required" — inlining it at
its 4 call sites would just recreate the duplication this task exists to
remove. Read the acceptance criterion as "stop duplicating the isDM/isAdmin
check" (satisfied — there is now exactly one place, `isDMOrAdmin`, that
knows what counts as DM authority) rather than "delete these two function
names" literally. Flagging this reading explicitly in case the human wants
it done more literally.

**Distinct finding, not acted on**: `shadows.js` lines ~138 and ~164 allow
only a shadow's creator or a super-admin (not a regular admin) to edit it —
a real, different rule from "DM authority" (it's about content ownership,
not narrative authority), and untouched by the decision made above. Worth a
deliberate decision of its own if the human wants shadows to follow the
same DM-or-admin-equivalent pattern, but that's a separate question from
this task's scope.

Validation performed:
- `npm test`: 39/39 passing throughout, no test-expectation changes needed.
- `node -c` on all 7 modified files: syntactically valid.
- `grep` inventory confirmed no remaining hand-rolled `isDM`/`isAdmin`
  duplication anywhere in `src/routes/` outside of local variable names
  already computed from `isDMOrAdmin`, and confirmed `admin.js` and the two
  `shadows.js` super-admin checks were correctly left untouched.
- Live manual verification (spare-port server instance, throwaway users):
  full matrix per the task's validation requirement —
  - **DM-only route** (`POST /api/beats`, gated by `requireDM`): DM → 201,
    admin → 201 (new — previously would have been 403), regular player →
    403 `{ error: 'DM access required' }`.
  - **Admin-only route** (`GET /api/admin/users`, gated by `requireAdmin`,
    untouched by this task): admin → 200, DM (not admin) → 403, player →
    403 — confirms DM did NOT gain admin-panel access as a side effect.
  - **`characters.js` endpoint** (`PUT /api/characters/:id`): the
    character's owner → 200, DM (not owner) → 200, admin (not owner) → 200
    (this case already worked pre-change, confirmed unaffected), an
    unrelated third player (not owner, not DM, not admin) → 403
    `{ error: 'You do not have permission to edit this character' }`.
  - **`npcs.js` `dm_notes` visibility** (not explicitly required by the
    task's validation section, but directly changed above): created an NPC
    with `dm_notes` as DM; admin viewing it now sees `dm_notes` (previously
    would not have, since the check was strict `isDM`); a regular player
    still does not see it.
  - Cleaned up all throwaway users/characters/NPCs from the dev database
    afterward and stopped the spare server instance.

## Review

Independent review by Codex CLI (`codex exec review --uncommitted`, GPT-5.6),
2026-08-26.

Method/caveat: as with TASK-003's review, this ran against the combined
uncommitted diff (TASK-001 + TASK-003 + TASK-004 together, unrelated DbC
scaffolding and TASK-006 deletions stashed out) since `--uncommitted` can't
be paired with a custom scoping prompt on this CLI version. TASK-001 and
TASK-003's portions were already independently reviewed on their own; this
review additionally covers the permission-consolidation changes.

Notably, Codex investigated this independently rather than trusting the
task's framing: it read `src/database/migrations/005-shadow-ownership.js`
and found `is_super_admin` is a real, distinct flag (hardcoded to a specific
username, `mrdatawolf`, separate from the literal `admin` account) —
corroborating that the `isSuperAdmin` dimension in `isDMOrAdmin` and in
`shadows.js`'s untouched creator-or-super-admin check is meaningful, not
dead weight.

Finding: no actionable regressions identified; the centralized error
handling, shared update-query refactor, and permission consolidation all
preserve intended behavior, and the full test suite passes (run
independently by Codex, as in its prior two reviews).

## Human acceptance

Pending. Two things escalated in this task for your awareness rather than
decided unilaterally:
1. The `shadows.js` creator-or-super-admin-only edit rule (Pattern C in
   Context above) was left untouched — a distinct question from the
   DM/admin policy you already decided, flagged in case you want it
   addressed too.
2. `canModifyCharacter()`/`requireDMUser()` still exist as named functions
   in `characters.js` (no longer duplicating the DM-or-admin check, but not
   literally deleted) — see the Implementation handoff note on acceptance
   criteria wording if you'd rather they be inlined instead.
