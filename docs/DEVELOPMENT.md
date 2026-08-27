# Development Guide

## Technology stack

- **Runtime**: Node.js, CommonJS modules (`"type": "commonjs"` in `package.json`).
- **Backend framework**: Express 5.
- **Database**: SQLite via `better-sqlite3` (synchronous driver), a single file
  (`dm_helper.db`) at the repo root.
- **Auth**: JSON Web Tokens (`jsonwebtoken`), password hashing via `bcrypt`,
  token delivered via cookie (`cookie-parser`) or `Authorization: Bearer` header.
- **Frontend**: static HTML + vanilla JS served from `public/`. No framework, no
  bundler, no `type="module"` — scripts are plain global `<script>` tags whose
  correctness depends on load order (see `docs/ARCHITECTURE.md`).
- **Config**: `dotenv`, loaded from a root `.env` file (see `.env.example` for
  the expected keys — currently `JWT_SECRET` and any DB/port overrides).
- **Dev tooling**: `nodemon` for auto-restart in development.
- **Tests**: Node's built-in test runner (`node --test`), files under `tests/`.

## Repository layout

```
src/
  server.js              Entry point; mounts all routes and middleware
  routes/                One file per resource (16 files), mounted in server.js:
                          admin, arcs, auth, beats, characters, claims, combats,
                          journal, npcs, primal-patterns, progress, scenes,
                          session-notes, sessions, shadows, tracker-shared
  middleware/auth.js      JWT auth: authenticate, optionalAuth, requireDM,
                          requireAdmin
  database/
    connection.js         Opens the SQLite connection
    init-db.js             Creates a fresh DB from schema.sql (npm run init-db)
    migrate.js              Runs pending migrations/ files in order, tracked in
                             a schema_migrations table (npm run migrate; also
                             runs automatically at server startup)
    schema.sql               Base schema for a fresh database
    migrations/               Numbered .js files (001, 002, ...), each exporting
                                an up(db) function; auto-run on startup
    legacy/                    One-off scripts that built the schema before the
                                 migration runner existed. Kept for historical
                                 reference only — not run, not referenced by any
                                 code path. See legacy/README.md.
  controllers/            Currently empty — abandoned scaffolding, not wired
                          into any route. See TASK-002 in tasks/proposed/.
  models/                 Currently empty — same as above.
  utils/familiars.js      The one example of business logic properly extracted
                          out of a route file; a reference pattern for future
                          extraction work.

public/
  dm-dashboard.html        Main DM view
  player-dashboard.html    Main player view
  js/dm/*.js                DM dashboard modules (global scripts, not ES modules)
  js/player/*.js             Player dashboard modules (same)
  js/admin.js, toast.js, navigation.js, load-navigation.js
                              Shared/cross-cutting frontend scripts

tests/                    node --test suites (migration, tracker, gear-powers,
                           api, familiars)

docs/                     Process and project documentation (this DbC scaffold)
tasks/                    Task lifecycle directories (proposed/approved/
                           in-progress/review/completed)
```

## Setup and commands

```
npm install          # install dependencies
npm run init-db       # create a fresh dm_helper.db from src/database/schema.sql
npm run migrate        # apply any pending migrations (also runs on server start)
npm start               # node src/server.js
npm run dev               # nodemon src/server.js (auto-restart in development)
npm test                   # node --test (runs everything under tests/)
```

Configuration lives in a root `.env` file (see `.env.example`). At minimum
`JWT_SECRET` must be set — `src/middleware/auth.js` exits at startup if it is
missing, and prints a freshly generated one to copy in.

## Coding conventions

- **Backend**: CommonJS (`require`/`module.exports`), one route file per
  resource under `src/routes/`, mounted explicitly in `src/server.js`. Follow
  existing patterns in a file before introducing a new one (e.g., match how
  `src/utils/familiars.js` extracts serialization logic before inventing a new
  extraction style).
- **Frontend**: plain global scripts loaded via `<script>` tags in
  `dm-dashboard.html` / `player-dashboard.html`, in a load-order-dependent
  sequence. `public/js/dm/dm-core.js` declares the shared mutable globals
  (`characters`, `shadows`, `storyArcs`, `sessions`, `progress`, ...) that other
  `dm-*.js` files read and mutate directly — there is no import/export
  mechanism yet (see `docs/ARCHITECTURE.md` and TASK-008 in `tasks/proposed/`
  for the planned ES-module migration).
- **Cross-platform**: keep all tooling and scripts Windows/Linux portable — no
  OS-specific path separators or shell assumptions. `start.ps1` and `start.sh`
  are maintained in parallel for the two platforms.
- **Secrets**: never hardcode credentials, keys, hosts, or ports. Use `.env`,
  documented in `.env.example`.

## Error handling

Route handlers don't catch their own errors — `src/middleware/errorHandler.js`
does it centrally. Wrap a handler in `asyncHandler` (or let Express 5 forward
it automatically, which it does natively for both thrown errors and rejected
promises) and just `throw`; the centralized `errorHandler` middleware, mounted
last in `src/server.js`, turns it into the JSON response.

**Status-code policy (decided 2026-08-26, TASK-010): trust upstream status
codes as-is.** `errorHandler` responds with `err.status || err.statusCode ||
500`. Any error object — from `express.json()`'s body-parser on a malformed
request, a route that explicitly sets `err.status`, a future `http-errors`-style
library, or anything else — gets to pick its own status code by setting that
property; anything that doesn't collapses to `500`. This was chosen over
maintaining an allowlist of "which sources may set a non-500 status" or
forcing everything to `500` by default, on the reasoning that it's the
simplest option, matches the wider Express/Connect ecosystem's own convention
for how middleware communicates a status code, and the two error sources that
currently exist in this codebase (body-parser's own 400s, and the deliberate
`clientMessage`-carrying errors in `auth.js`/`journal.js`) already rely on it.
The tradeoff, accepted as low-risk for this app's size: a future dependency
that sets `.status` on a thrown error would silently change a route's response
code without an explicit per-route decision. If that ever causes a real
problem, revisit this policy rather than special-casing it quietly.

A malformed JSON request body is the concrete example this policy was decided
against: `express.json()` rejects it with `err.status = 400` before any route
runs, so the response is `400 { error: '<parse error>' }` — not the `500`
that a naive centralized handler might default to. See
`tests/error-handling.test.js` for the regression test.

## Testing philosophy

- Tests run via Node's built-in test runner (`node --test`), no separate test
  framework dependency.
- Existing suites (`tests/*.test.js`) cover migrations, the session tracker,
  gear/powers, general API behavior, and familiars — favor adding to an
  existing suite over creating a parallel one when the behavior fits.
- Prefer exercising real SQLite (via `better-sqlite3`, file-based or in-memory)
  over mocking the database, consistent with how the existing tests work.
- Frontend logic is currently difficult to unit test in isolation because it
  depends on global state and DOM/script load order (see TASK-008,
  TASK-009 in `tasks/proposed/`); until that's addressed, prefer testing
  backend routes and shared utility functions where new logic is added.

## Security and privacy

- JWT secret and any other credentials belong in `.env`, never committed;
  `.env.example` documents required keys without real values.
- Auth roles: `is_dm` (campaign DM), `isAdmin` (currently hardcoded to the
  `admin` username in `src/middleware/auth.js`'s `generateToken`), and
  `is_super_admin`. `requireDM` and `requireAdmin` are separate middleware and
  are not currently interchangeable — see TASK-004 in `tasks/proposed/` for
  known duplication/consolidation work around permission checks.
- Passwords are hashed with `bcrypt` before storage; never log or persist plain
  passwords.
- This is a small, trusted-user campaign tool (DM + a handful of players), not
  a public-facing multi-tenant product — threat modeling should stay
  proportionate to that scope, but secrets handling and auth correctness still
  matter since character/session data is personal to each player.
