# TASK-018: Character image upload, thumbnail, and full view

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-06
Approved by: Patrick
Approved date: 2026-09-06
Related contracts: None
Related ADRs: ADR-004 (character image storage) — to be written as part of
this task; no ADR exists yet, and this introduces a new dependency
(`multer`) plus a new storage location outside the database, which the
project's own "major technical decisions get recorded" guidance
(`docs/AI_DEVELOPMENT_SYSTEM.md`) covers.
Dependencies: None.

## Desired outcome

A player can attach an image to their own character: a small thumbnail
shows on that character's card, and a larger version of the same image
shows on the character's full view. Full CRUD: upload an image, replace
it, and remove it — all from the existing player character edit flow.

## Context

This repo has no image/upload infrastructure today (confirmed by grep: no
`multer`/`sharp`/`image_url`/`avatar` anywhere in `src` or `public`, no
`uploads` directory, `express.static` just serves the static `public/`
tree as-is — `src/server.js:39`). Three design questions were resolved
with the human before this task was written, and the resolution is
authoritative — do not redesign these, implement them as specified:

**1. Storage: filesystem + a URL column, not base64-in-the-database.**
`multer` (new dependency) writes uploaded files to
`public/uploads/characters/` (new directory, gitignored — user-uploaded
content shouldn't be committed); `characters` gets a new nullable
`image_url TEXT` column holding the served path (e.g.
`/uploads/characters/<file>`). This keeps `GET /api/characters` cheap —
it already does `SELECT c.*` for every character on every dashboard load
(`src/routes/characters/index.js:15`), and a short URL string riding along
in that response is fine; full image bytes on every list-load would not
be.

**2. Thumbnail: one stored image, sized with CSS — no second generated
file, no `sharp`.** The character card shows the same `image_url` at a
small size (e.g. `max-width`/`max-height` around 80px); the full view
shows it larger. Matches this app's existing no-build-step, no
image-processing-dependency style.

**3. Scope: players only, for their own characters.** No DM-side upload
UI in this task. The DM already has no general character-edit form
(`public/js/dm/dm-character-editor.js`'s `viewCharacter` is read-mostly,
with only gear/power/familiar sub-resource CRUD layered on top) — adding
DM-side image management would mean building new UI there, not reusing
something that exists. The route-level authorization still uses the
existing `canModifyCharacter` helper (`src/routes/characters/shared.js`),
which already permits the DM too, for consistency with every other
character-mutation endpoint in this app — but this task adds no DM-facing
button or form that calls it.

### Where the relevant existing code lives (verified by reading, not assumed)

- `src/routes/characters/index.js`: the main character CRUD router;
  mounts sub-routers for gear/powers/familiars/weapons/spells with no path
  prefix (line ~201-205) — the established pattern for adding a focused
  sub-resource file.
- `src/routes/characters/gear.js`: the pattern to mirror for a new
  `image.js` sub-router — `authenticate` + `canModifyCharacter` guard on
  every mutating route, `:id`-scoped paths.
- `src/routes/characters/shared.js`: `canModifyCharacter(reqUser,
  character)` — owner or DM/admin. Reuse as-is, don't modify.
- `src/database/migrations/010-character-sheet-details.js`: most recent
  migration; the next one for this task is `011-character-image.js`.
- `public/js/player/player-characters.js`: `loadCharacters()` (card
  markup, lines ~34-65) and `displayCharacterSheet()` (full view, lines
  ~119-174) — both need the image added.
- `public/js/player/player-edit-form.js` /
  `public/js/player/player-edit-basic-tabs.js`: the edit form and its
  Basic Info tab — where the upload/replace/remove control belongs.
- `public/js/player/player-edit-actions.js`: `handleEditCharacter` posts
  the whole form as one JSON `PUT` via `apiFetch`. A file upload cannot
  ride inside that JSON body — this task's upload/remove actions must be
  their own immediate `multipart/form-data` request(s), independent of the
  main "Save Changes" submit, matching how `viewCharacterAs`/`editCharacter`
  buttons already act immediately rather than waiting for a form submit.
- `src/routes/characters/fields.js`: `CHARACTER_UPDATE_FIELDS` — the
  plain-JSON `PUT /api/characters/:id` allow-list. `image_url` must NOT be
  added here (it's never set via the generic JSON update path, only via
  the dedicated upload/delete endpoints below) — this prevents a client
  from setting an arbitrary `image_url` string that was never actually
  uploaded through multer.
- `src/server.js:39`: `express.static` already serves `public/`, so
  anything written under `public/uploads/` is servable immediately with no
  new static-serving code — the same way every other file under `public/`
  is unauthenticated today (consistent with this app's existing "small,
  trusted-user tool" posture per `docs/DEVELOPMENT.md`; not a new
  precedent).

## Scope

### Included

- **New dependency**: `multer` (`npm install multer`), configured for
  disk storage under `public/uploads/characters/` (create the directory
  at startup if missing).
- **Migration** `src/database/migrations/011-character-image.js`: adds
  `characters.image_url TEXT` (nullable, no default). Follow the guarded
  style of prior migrations (safe to run more than once).
- **`.gitignore`**: add `public/uploads/` so uploaded files are never
  committed.
- **New route file** `src/routes/characters/image.js`, mounted the same
  way `gear.js` etc. are (`router.use(require('./image'))` in
  `index.js`):
  - `POST /api/characters/:id/image` — `authenticate` +
    `canModifyCharacter` guard, single-file `multer` upload (field name
    `image`). Validate the file is an image by MIME type (accept
    `image/jpeg`, `image/png`, `image/webp`, `image/gif`; reject anything
    else with a 400, and make sure multer's own file-filter rejection
    surfaces as a normal error-handler response rather than an unhandled
    exception). Cap file size (5MB is a reasonable default — implementer's
    call on the exact number, but pick one and enforce it via multer's
    `limits`). On success: delete the character's previous uploaded file
    from disk if one exists (avoid orphaned files on replace), store the
    new file, update `characters.image_url`, return the updated character
    row (matching the existing `PUT` response shape).
  - `DELETE /api/characters/:id/image` — same auth guard; deletes the
    file from disk (if present) and sets `characters.image_url` back to
    `NULL`; returns the updated character row.
  - Generate a filename that changes on every upload (e.g. include a
    timestamp or random suffix) rather than a fixed
    `<characterId>.<ext>`, so a replaced image isn't served stale from a
    browser cache under the same URL.
- **Player character card** (`player-characters.js`'s `loadCharacters()`):
  render a thumbnail (CSS-sized, e.g. ~80px) from `char.image_url` when
  present; some sensible placeholder/fallback (e.g. omit the image
  entirely, or a generic silhouette — implementer's call) when absent.
- **Player character full view**
  (`player-characters.js`'s `displayCharacterSheet()`): render a larger
  version of the same `character.image_url` when present, near the top of
  the sheet.
- **Upload/replace/remove control**, reachable from the existing edit flow
  (`player-edit-basic-tabs.js`'s Basic Info tab is the natural home): a
  file input plus an immediate upload action (posts to the new endpoint
  right away, not gated behind the form's "Save Changes" button) with a
  live preview of the current image, and a "Remove Image" button wired to
  the `DELETE` endpoint. Follow this app's existing `apiFetch` +
  `showToast` conventions for request handling and error feedback.

### Excluded

- Any DM-side upload/replace/remove UI (see Context, decision 3). The
  authorization helper permits it at the route level for consistency, but
  no DM-facing button or form is built.
- Server-side thumbnail generation, image resizing, or any new
  image-processing dependency (`sharp` or otherwise) — one stored image,
  sized with CSS (see Context, decision 2).
- Base64/BLOB-in-database storage of any kind (see Context, decision 1).
- Adding `image_url` to `CHARACTER_UPDATE_FIELDS` / the generic JSON `PUT`
  path (see above — it must only ever be set by the upload/delete
  endpoints).
- Cropping, rotation, filters, galleries, or multiple images per
  character — a single current image only.
- Any change to the DM's read-mostly character view
  (`dm-character-editor.js`'s `viewCharacter`) beyond what's naturally
  inherited for free if it happens to already interpolate character
  fields generically (it doesn't today — no DM-side display change is
  required or expected by this task, but if one is trivially free, note
  it in the handoff rather than skipping a genuinely free improvement).

## Plan

1. Add the migration (`image_url` column) and confirm it's idempotent.
2. Add `multer`, the new `public/uploads/characters/` directory handling,
   and `.gitignore` entry.
3. Write `src/routes/characters/image.js` (upload + delete routes) and
   mount it; keep `image_url` out of `CHARACTER_UPDATE_FIELDS`.
4. Update the player card and full-view renderers to display
   `image_url` when present.
5. Add the upload/preview/remove control to the Basic Info edit tab, wired
   to the two new endpoints independently of the main form submit.
6. Write ADR-004 documenting the three decisions above (storage,
   thumbnail approach, player-only scope) using
   `docs/decisions/ADR-TEMPLATE.md`, matching ADR-003's style.
7. Run the full test suite; add focused tests for the new route (upload
   accepts a valid image, rejects a non-image/oversized file, replace
   deletes the old file, delete clears `image_url` and removes the file).

## Acceptance criteria

- [ ] `characters.image_url` column exists (nullable, default NULL).
- [ ] A player can upload an image for their own character; it's written
      under `public/uploads/characters/`, `image_url` is set, and the
      response reflects the updated character.
- [ ] Uploading a non-image file, or a file over the size limit, is
      rejected with a clear 4xx error and no partial/orphaned file left
      behind.
- [ ] Uploading a second image for the same character replaces the first:
      the old file is deleted from disk, `image_url` points at the new
      file, and the new URL differs from the old one (no stale-cache
      collision).
- [ ] Removing a character's image deletes the file from disk and sets
      `image_url` back to `NULL`.
- [ ] A player attempting to upload/remove an image on a character they
      don't own (and isn't a DM/admin) is rejected with 403, consistent
      with every other character-mutation endpoint.
- [ ] The character card shows a small thumbnail when `image_url` is set,
      and nothing broken (no missing-image icon, no layout shift) when it
      isn't.
- [ ] The character's full view shows a larger version of the same image
      when set.
- [ ] `image_url` is not present in `CHARACTER_UPDATE_FIELDS` / cannot be
      set via the generic `PUT /api/characters/:id`.
- [ ] ADR-004 exists and accurately describes the three decisions.
- [ ] `npm test` passes, including new tests for the image routes.

## Validation requirements

- `npm test`.
- Manual browser check: upload an image for a test character, confirm the
  card thumbnail and full-view image both appear; replace it and confirm
  the old file is gone from `public/uploads/characters/` and the new
  image displays; remove it and confirm both the DB column and the file
  are cleared; attempt an upload as a different player's character (via
  direct API call, since the UI won't offer the button) and confirm 403.
- Confirm `public/uploads/` is excluded from `git status` after an upload
  (i.e., the `.gitignore` entry actually works).

## Risks and assumptions

- Publicly-servable upload URLs (no auth on the static file itself, only
  on who can set it) match this app's existing posture for every other
  static asset — flagged here for visibility, not something this task
  needs to solve differently.
- Exact file-size cap and accepted MIME list are implementer's-call
  defaults (5MB; JPEG/PNG/WebP/GIF) unless the human wants different
  limits — call this out explicitly in the implementation handoff so it's
  easy to revise later.
- If `public/uploads/characters/` doesn't exist at server startup, the
  implementer must create it (or confirm multer's configured storage
  engine does) — don't let this be a silent runtime crash on first
  upload.

## Blocker

None.
