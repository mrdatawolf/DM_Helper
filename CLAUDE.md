# DM Helper — Project Handoff Notes

## What this is
A campaign management tool for a tabletop RPG (Amber/D&D 5e hybrid — "The Shattering of the Liminal"). Split into a DM dashboard and a player dashboard. Backend: Node.js + Express + SQLite (better-sqlite3). Frontend: static HTML + vanilla JS served from `/public`. Auth: JWT, `is_dm` flag on users table.

## Tech stack
- `src/server.js` — entry point, mounts all routes
- `src/routes/` — one file per resource (shadows, npcs, characters, sessions, etc.)
- `src/database/migrations/` — numbered migration files run automatically on startup
- `public/js/dm/` — DM dashboard JS modules
- `public/js/player/` — Player dashboard JS modules
- `public/player-dashboard.html` / `public/dm-dashboard.html` — main views

## Recent work (just completed)

### Spoiler system (migration 005)
- Added `is_spoiler BOOLEAN DEFAULT 0` to `shadows` and `npcs` tables
- DMs can toggle a spoiler flag per shadow card (clickable badge in `dm-lists.js`)
- Players see spoiler-flagged shadows blurred with a "Reveal" overlay
- "Show Spoilers" toggle button on the Known Shadows tab (stored in `localStorage`)
- API: `shadows` PUT `allowedFields` now includes `is_spoiler`; `npcs` route has a new DM-authed `PUT /:id`

### Current shadow visibility
- Players whose character has `current_shadow_id` set now always see that shadow's full details as a blue "Current Location" card — no spoiler restriction, since the DM placed them there intentionally
- Fetched in parallel with origin shadow in `loadVisitedShadows()`, deduped from visited list

---

## Known bugs / next work items

### Bug: Players can't reach their Known Worlds
Players are unable to navigate to their known/visited shadows. Also, a character's home world (`shadow_origin_id`) is **not** automatically appearing as a known world — it should be visible to the player without needing a session visit entry.

Check: `loadVisitedShadows()` in `public/js/player/player-shadows.js`, the `/api/shadows/character/:id/visited` route in `src/routes/shadows.js`, and how `shadow_origin_id` is handled vs. `current_shadow_id`.

---

## Lore / character notes to potentially build out

### Leluna
- Animal companion character
- Small dog-sized at base
- Grows with the character over time
- The wizard who takes her in is the one who helps make the bond happen (mechanically and narratively)

### Xan-Time
- (Concept/character/location — needs fleshing out)

---

## Key files to know
- `public/js/player/player-shadows.js` — all Known Shadows rendering and fetch logic
- `public/js/dm/dm-lists.js` — DM shadow/session/character list rendering
- `src/routes/shadows.js` — shadow API including visited query
- `src/database/migrations/` — add new `.js` files here for schema changes; they run automatically on server start
- `src/middleware/auth.js` — `authenticate`, `requireDM`, `optionalAuth`
