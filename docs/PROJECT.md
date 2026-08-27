# Project Definition

## Purpose

DM Helper is a campaign management tool for a tabletop RPG campaign: "The
Shattering of the Liminal," an Amber Diceless / D&D 5e hybrid. It replaces ad hoc
notes and spreadsheets with a shared web app where the DM manages campaign state
(characters, shadows/worlds, NPCs, sessions, story arcs) and players view and
manage their own characters.

## Users and stakeholders

- **DM (game master)**: the primary operator. Creates and edits shadows, NPCs,
  sessions, story arcs, and campaign progress; controls what is visible to
  players; runs the single campaign this tool currently serves.
- **Players**: view and manage their own character sheets, gear, powers, familiars,
  and the shadows (worlds) their character has visited or knows about.
- Both roles authenticate against the same app; a user's `is_dm` flag (and a
  separate admin flag) determines which dashboard and permissions apply.

This is a small, single-campaign tool, not a multi-tenant product. There is one
DM and a handful of players.

## Desired outcomes

- The DM can manage all campaign entities (characters, shadows, NPCs, sessions,
  story arcs, combats, progress) from one dashboard without leaving the browser.
- Players can see their own character's full state and the subset of campaign
  knowledge (shadows/worlds, NPCs, lore) their character has legitimately
  discovered in-fiction.
- Spoiler-sensitive content (e.g., a shadow's true nature) can be flagged by the
  DM and hidden from players until revealed.
- The tool stays simple enough for one DM to operate and extend without a build
  pipeline or hosting complexity beyond a single Node.js process and a SQLite
  file.

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

### Excluded

- Multi-campaign or multi-tenant support.
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
