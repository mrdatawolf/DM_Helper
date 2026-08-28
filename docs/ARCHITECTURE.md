# Architecture

This describes the current system as implemented. Proposed changes belong in
`tasks/` and `docs/contracts/` until accepted; durable decisions belong in
`docs/decisions/` as ADRs.

## System boundaries

DM Helper is a single Node.js process (`src/server.js`) serving both a JSON API
and static frontend assets over HTTP, backed by a single local SQLite file
(`dm_helper.db`). There is no separate backend service, no external database
server, and no third-party integrations beyond the npm dependencies. It is
designed to be run by one operator (the DM) for one campaign at a time.

## Major components

- **`src/server.js`**: entry point. Loads `.env`, opens the database connection,
  runs pending migrations, mounts middleware (CORS, cookie parsing, JSON body
  parsing, static file serving from `public/`), mounts each resource router
  under its API path, and starts listening.
- **`src/routes/*.js`**: one Express router per resource (16 files — admin,
  arcs, auth, beats, characters, claims, combats, journal, npcs,
  primal-patterns, progress, scenes, session-notes, sessions, shadows,
  tracker-shared). Each file currently combines SQL access, business/validation
  logic, and HTTP request/response handling inline — there is no separate
  data-access or service layer wired in (see below).
- **`src/middleware/auth.js`**: JWT issuance and verification.
  `authenticate` requires a valid token (cookie or `Authorization: Bearer`
  header) and populates `req.user`; `optionalAuth` does the same but does not
  reject missing/invalid tokens; `requireDM` and `requireAdmin` are separate
  role gates (DM-flag vs. admin/super-admin) applied after `authenticate`.
- **`src/database/`**: `connection.js` opens the SQLite handle; `init-db.js`
  creates a fresh database from `schema.sql`; `migrate.js` scans
  `migrations/*.js` in filename order, applies any not yet recorded in the
  `schema_migrations` table, and runs automatically at server startup;
  `legacy/*.js` are historical one-off scripts, confirmed to have zero
  references from `src/` or `package.json` — dead code kept only for reference
  (see `src/database/legacy/README.md`).
- **No data-access/model layer, by deliberate decision**: `src/controllers/`
  and `src/models/` — empty scaffolding from an earlier, unrealized intent —
  were removed per `docs/decisions/ADR-002-data-access-layer.md`. Routes
  remain the data-access layer; extract shared logic into `src/utils/` on a
  per-case basis (see below) rather than through a model/controller layer.
- **`src/utils/familiars.js`, `src/utils/buildUpdateQuery.js`**: the
  established pattern for extracting domain/data-access logic that's
  genuinely duplicated or complex enough to warrant its own reusable,
  independently testable module — a plain function, not a class or a new
  architectural layer. Reach for this per-case rather than building a
  general model layer (see ADR-002).
- **`public/dm-dashboard.html`, `public/player-dashboard.html`**: the two main
  views, each loading a sequence of plain `<script>` tags (no bundler, no
  `type="module"`).
- **`public/js/dm/*.js`, `public/js/player/*.js`**: per-dashboard frontend
  logic, loaded via `<script type="module">` (`TASK-008`, `ADR-001`). Each
  dashboard has one `*-state.js` module exporting a single mutable `state`
  object (`dm-state.js`, `player-state.js`); every other file `import`s what
  it needs explicitly instead of reading implicit globals. Functions invoked
  from generated inline HTML (`onclick=` etc., which always run in the
  global scope regardless of module boundaries) are explicitly bridged onto
  `window` at their definition site.

## Data flow

1. Browser requests `dm-dashboard.html` or `player-dashboard.html` (static
   file, served directly by Express).
2. The page loads its script sequence; `dm-auth-guard.js` / equivalent player
   check verifies a valid session (calling an auth API route) before rendering
   protected content.
3. Frontend scripts call JSON API routes under `/api/...` (mounted per resource
   in `server.js`) via the shared `apiFetch` wrapper (`public/js/api.js`,
   `TASK-007`), which handles JSON parsing and error surfacing consistently
   (a small number of call sites deliberately keep raw `fetch()` where they
   need a behavior `apiFetch` doesn't provide — documented inline at each).
4. Route handlers in `src/routes/*.js` (or `src/routes/characters/*.js` for
   character sub-resources) authenticate/authorize the request via
   `src/middleware/auth.js`, run SQL directly against the `better-sqlite3`
   connection (no data-access layer — see `ADR-002`), and either return JSON
   or `throw`/reject; `src/middleware/errorHandler.js`'s `asyncHandler` +
   centralized `errorHandler` middleware turn any error into the JSON error
   response (`TASK-001`; status-code policy documented in
   `docs/DEVELOPMENT.md`, decided in `TASK-010`).
5. On success, frontend code updates the relevant dashboard's `state` object
   and re-renders the affected DOM sections via HTML-string templating
   functions.

## Trust boundaries

- The browser is untrusted; all authorization decisions are enforced
  server-side in `src/middleware/auth.js` and within each route handler — the
  frontend hiding UI for a role is a convenience, not a security boundary.
- The JWT is the sole session credential; it is signed with `JWT_SECRET` from
  `.env` and carries `userId`, `username`, `isDM`, `isAdmin`, `isSuperAdmin`
  claims baked in at issuance (`generateToken`), not re-checked against the
  database per request.
- The SQLite file is trusted local storage; there is no separate database
  network boundary to secure.

## Known architectural gaps

`TASK-001`, `TASK-003` through `TASK-008`, and `TASK-010` (see
`tasks/completed/`) have resolved the gaps originally listed here —
centralized error handling, the data-access-layer question, duplicated
partial-update SQL, duplicated permission checks, the oversized
`characters.js` route file, dead legacy scripts, shared frontend
fetch/escaping utilities, the frontend ES-module migration, and the
error-handler status-code policy, respectively.

Remaining, tracked in `tasks/approved/`:

- Several oversized, multi-concern frontend files (`TASK-009`).
- Five `buildUpdateQuery`-pattern call sites found during `TASK-003` but left
  out of its scope — gear/powers/familiars sub-routes and `combats.js`
  (`TASK-011`).

## Related decisions

- `docs/decisions/ADR-001-frontend-module-migration.md` (Accepted,
  2026-08-27): native ES modules for the frontend, no bundler; see
  `TASK-008`.
- `docs/decisions/ADR-002-data-access-layer.md` (Accepted, 2026-08-27): no
  general model/controller layer; routes remain the data-access layer,
  shared logic extracted into `src/utils/` per case. See `TASK-002`.
