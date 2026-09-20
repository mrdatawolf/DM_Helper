# Project Definition

## Purpose

DM Helper is a multi-tenant campaign management tool for tabletop RPGs. It
replaces ad hoc notes and spreadsheets with a shared web app where multiple DMs
can each run one or more campaigns, choose an independent game system and
universe/setting for each campaign, manage campaign state, and let players view
and manage their characters. The existing Amber Diceless / D&D 5e hybrid,
"The Shattering of the Liminal," is the first campaign and reference
implementation rather than the definition of the whole product.

## Users and stakeholders

- **DM (game master)**: the primary operator. Creates and edits shadows, NPCs,
  sessions, story arcs, and campaign progress; controls what is visible to
  players; and runs one or more of their own campaigns.
- **Players**: view and manage their own character sheets, gear, powers, familiars,
  and the campaign knowledge their character has visited, discovered, or knows
  about. A character may participate in more than one campaign while retaining
  one shared character sheet.
- Both roles authenticate against the same app. Campaign membership determines
  whether a user is a DM or player for a particular campaign; separate
  application-level administration roles govern account/system administration.

This remains a personal, self-hosted tool for a small, trusted group of DMs and
players, not a public multi-tenant SaaS product.

## Desired outcomes

- For each campaign, its DM can manage all campaign entities (characters,
  worlds, NPCs, sessions, story arcs, combats, progress) from one dashboard
  without leaving the browser.
- Within each campaign, players can see their own character's full state and the
  subset of campaign knowledge (worlds, NPCs, lore) their character has
  legitimately discovered in-fiction.
- Spoiler-sensitive campaign content (e.g., a world's true nature) can be
  flagged by the DM and hidden from that campaign's players until revealed.
- The tool stays simple enough for a small group of DMs to operate and extend
  without a build pipeline or hosting complexity beyond a single Node.js
  process and a SQLite file.

## Scope

### Included

- DM dashboard: CRUD over shadows, NPCs, characters, sessions, story arcs,
  chapters/beats, combats, scenes, progress tracking, session notes/journal,
  primal patterns, claims, familiars.
- Player dashboard: character sheet viewing/editing (within DM-granted limits),
  gear/powers/familiars, known shadows, journal, session tracker, character
  creation wizard.
- JWT-based authentication with DM/admin/super-admin role distinctions.
- A spoiler system so the DM can mark shadows/NPCs as hidden-until-revealed.
- Multiple campaigns in one deployment, each owned and run by a DM with its own
  members and independently selected, code-defined system and universe.

### Excluded

- Runtime-installable system or universe packs, a DM-facing plugin manager, and
  plugin sandboxing; adding a pack requires a code change and deployment.
- Public self-signup and production-grade tenant-isolation hardening such as
  rate limiting, abuse prevention, and billing.
- Real-time/live collaboration (no websockets; standard request/response).
- Mobile native apps — the frontend is server-rendered static HTML + vanilla JS
  intended to work in a desktop or mobile browser, not a packaged app.
- General-purpose VTT features (maps, tokens, dice-rolling automation beyond
  what player-dice.js already provides).

## Constraints

- **Technical**: Node.js + Express + better-sqlite3 (synchronous, file-based
  SQLite) on the backend; static HTML + vanilla JS (no framework, no bundler,
  no `type="module"` yet) on the frontend. Must run cross-platform (Windows dev
  machine, Linux-capable deployment) without OS-specific assumptions.
- **Operational**: single SQLite file (`dm_helper.db`) as the datastore; no
  separate database server. Migrations are plain `.js` files auto-run at server
  startup from `src/database/migrations/`.
- **Team size**: effectively a solo-maintained project (one DM/developer), so
  process overhead should stay proportionate — this Design-by-Contract scaffold
  exists to keep larger refactors deliberate, not to slow down small fixes.
- **Compatibility**: existing player and DM data in `dm_helper.db` must be
  preserved across schema changes; destructive migrations are not acceptable
  without an explicit, reviewed migration path.

## Domain language

Campaign is the product-wide tenant boundary. System and Universe are
independent selections for each campaign: a System supplies rules mechanics,
while a Universe supplies setting-specific lore and content. The remaining
terms in this section describe the `amber` reference universe and its current
campaign implementation; other universes may define different domain language.

- **Shadow**: a "world" or reality in the Amber-diceless sense — a place a
  character can visit or originate from. Distinct from a D&D "plane"; shadows
  can be spoiler-flagged by the DM.
- **Shadow origin (`shadow_origin_id`)**: the shadow a character's home world is
  set to — should always be visible to that character's player as a known world.
- **Current shadow (`current_shadow_id`)**: the shadow a character is presently
  located in, as placed by the DM; shown to the player as a "Current Location"
  card regardless of spoiler flag, since the DM placed them there intentionally.
- **Spoiler flag (`is_spoiler`)**: a per-shadow/per-NPC boolean the DM toggles to
  blur that entity from players behind a "Reveal" overlay until the DM lifts it
  (or the player clicks reveal, depending on the current UI).
- **Primal pattern**: a campaign-specific character-power system layered on top
  of the base character sheet (see `src/routes/primal-patterns.js`).
- **Familiar**: a DM-bonded companion creature that scales with its bonded
  character's level (see `src/utils/familiars.js`).
- **Claim**: an attribute-claim mechanic from the Amber-diceless side of the
  ruleset (see `ATTRIBUTE_CLAIMS_SYSTEM.md` at the repo root and
  `src/routes/claims.js`).
- **DM vs Admin vs Super Admin**: `is_dm` grants campaign-management access;
  `isAdmin` (currently hardcoded to the `admin` username) and `is_super_admin`
  grant separate account/system-administration access and are not currently
  treated as DM-equivalent by the `requireDM` middleware (see
  `docs/ARCHITECTURE.md` and TASK-004 in `tasks/proposed/`).
