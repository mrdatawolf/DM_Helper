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
- **`src/controllers/`, `src/models/`**: present as empty directories.
  Abandoned scaffolding from an earlier, unrealized intent to add a
  controller/model layer between routes and the database. Not currently part
  of the request path.
- **`src/utils/familiars.js`**: the one existing example of domain logic
  (familiar serialization) extracted out of a route file into a reusable,
  independently testable module — treated as the reference pattern for future
  extraction work (see `tasks/proposed/TASK-002-*`, `TASK-003-*`, `TASK-005-*`).
- **`public/dm-dashboard.html`, `public/player-dashboard.html`**: the two main
  views, each loading a sequence of plain `<script>` tags (no bundler, no
  `type="module"`).
- **`public/js/dm/*.js`, `public/js/player/*.js`**: per-dashboard frontend
  logic. `dm-core.js` declares shared mutable state (`characters`, `shadows`,
  `storyArcs`, `sessions`, `progress`, etc.) at global scope; every other
  `dm-*.js` file reads and mutates these globals directly. Correctness depends
  on `<script>` tag order in `dm-dashboard.html` matching each file's implicit
  expectations about what has already run. There is no explicit
  import/export/dependency graph (see `tasks/proposed/TASK-008-*`).

## Data flow

1. Browser requests `dm-dashboard.html` or `player-dashboard.html` (static
   file, served directly by Express).
2. The page loads its script sequence; `dm-auth-guard.js` / equivalent player
   check verifies a valid session (calling an auth API route) before rendering
   protected content.
3. Frontend scripts call JSON API routes under `/api/...` (mounted per resource
   in `server.js`) using hand-rolled `fetch()` calls (no shared HTTP client
   module yet — see `tasks/proposed/TASK-007-*`).
4. Route handlers in `src/routes/*.js` authenticate/authorize the request via
   `src/middleware/auth.js`, run SQL directly against the `better-sqlite3`
   connection, and return JSON. Errors are handled per-route via near-identical
   repeated `try/catch` blocks (see `tasks/proposed/TASK-001-*`).
5. On success, frontend code mutates the relevant global state in `dm-core.js`
   (or a player-side equivalent) and re-renders the affected DOM sections via
   HTML-string templating functions.

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

These are documented in detail as tasks in `tasks/proposed/` rather than here,
since they represent proposed future states, not the current one:

- No centralized error handling (`TASK-001`).
- No data-access/model layer despite the empty scaffolding suggesting one was
  planned (`TASK-002` — flagged as needing an ADR before implementation).
- Duplicated partial-update SQL pattern across seven route files (`TASK-003`).
- Duplicated permission-check logic instead of shared middleware (`TASK-004`).
- An oversized multi-resource route file, `characters.js` (`TASK-005`).
- Dead code in `src/database/legacy/` (`TASK-006`).
- No shared frontend fetch wrapper or DOM/escaping utilities (`TASK-007`).
- Global mutable state and implicit script-load-order coupling on the frontend,
  blocking frontend unit testing (`TASK-008` — flagged as needing an ADR).
- Several oversized, multi-concern frontend files (`TASK-009`).

## Related decisions

No ADRs have been accepted yet. `docs/decisions/` is scaffolded and ready for
use once `TASK-002` and/or `TASK-008` reach the point of an architectural
decision.
