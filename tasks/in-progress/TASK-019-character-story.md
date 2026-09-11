# TASK-019: Character story (free-text blob, view/edit per character)

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-11
Approved by: Patrick
Approved date: 2026-09-11
Related contracts: None
Related ADRs: None — this adds no new dependency and no new storage paradigm.
A nullable `TEXT` column on `characters` is the same shape as the existing
`backstory`/`character_notes` columns (`src/routes/characters/fields.js`
lines 37-41), so `docs/AI_DEVELOPMENT_SYSTEM.md`'s "major technical
decisions get recorded" guidance doesn't apply here the way it did for
TASK-018's new dependency + new storage location.
Dependencies: None.

## Desired outcome

Each character can have a free-text "story" — an arbitrary blob of prose.
Every character card (DM dashboard and player dashboard) gets a "Story"
button that opens the text in a full-screen, easy-to-read modal. A
character's owner (or a DM/admin) additionally gets an "Edit Story" button
that opens a focused edit modal with a textarea and an immediate Save,
independent of the character's other edit forms.

## Context

Three design questions were resolved with the human before this task was
written; the resolution is authoritative — implement as specified, don't
redesign:

**1. Editing is a dedicated, immediately-saving modal — not a field on the
existing edit forms.** Mirrors TASK-018's image upload/remove pattern
(`src/routes/characters/image.js`): the Edit Story action is its own
`PUT` to a dedicated endpoint, independent of `handleEditCharacter`'s
whole-form JSON submit (`public/js/player/player-edit-actions.js`) and the
DM's `editCharacter` form submit (`public/js/dm/dm-character-editor.js`
lines 273-386). It is not added to either existing edit form.

**2. Buttons live only in the card action row on both dashboards** — not
also inside the player's full character sheet
(`displayCharacterSheet()`, `public/js/player/player-characters.js` lines
120-176) or the DM's character-detail modal (`viewCharacter()`,
`public/js/dm/dm-character-editor.js` lines 8-111). Both dashboards
already have a card action-button row to extend:
- Player: `public/js/player/player-characters.js` lines 61-64, inside
  `loadCharacters()` — currently `View As...` and `Edit` buttons.
- DM: `public/js/dm/dm-lists.js` lines 71-76, inside `renderCharacters()`
  — currently `View Details`, `View As...`, `Edit`, `Delete` buttons.

**3. A new, dedicated full-screen modal — not the existing generic
modal.** Neither dashboard has a full-screen modal today: the DM's
generic `#modal-overlay`/`showModal()` (`public/js/dm/dm-modal-utils.js`,
`public/css/style.css` lines 337-403) caps at 600px; the player's
equivalent generic modal (`public/js/player/player-modal-utils.js`,
`public/css/player-dashboard.css` lines 391-423) caps around 1100px, and
both are single-instance overlays already used for other things (e.g.
`viewCharacterAs`), so they can't be reused here without fighting for the
same DOM element. Build new modal markup + CSS on each dashboard,
following the existing overlay/close-button conventions but sized and
styled for reading prose (generous max-width, comfortable line-length,
`white-space: pre-wrap` for the raw text). Match the existing pattern of
per-dashboard CSS/markup duplication rather than introducing a new shared
component (the generic modal is already duplicated this way between the
two dashboards — this task follows that precedent, not a new one).

### Where the relevant existing code lives (verified by reading, not assumed)

- `src/routes/characters/shared.js`: `canModifyCharacter(reqUser,
  character)` (lines 4-6) — owner or DM/admin. Reuse as-is for the story's
  edit endpoint, same as every other character-mutation route.
- `src/routes/characters/image.js` lines 67-75: the `authorizeCharacter`
  middleware pattern (loads the character, 404s if missing, 403s via
  `canModifyCharacter`, attaches `req.character`, calls `next()`) — the
  template to copy for the new story route's auth guard.
- `src/routes/characters/index.js` lines 196-206: sub-router mount point
  (`router.use(require('./image'))` is the most recent addition); a new
  `router.use(require('./story'))` goes on the next line.
- `src/routes/characters/index.js`'s `GET /:id` (lines 30-79) and the main
  characters list route already do `SELECT c.*` / equivalent, so a new
  plain column rides along on both the list and detail responses with
  zero route changes — no new GET endpoint is needed for the View button.
  This mirrors how `backstory`/`character_notes` already ride along today.
- `src/routes/characters/fields.js` lines 37-41:
  `CHARACTER_UPDATE_FIELDS` — the generic JSON `PUT
  /api/characters/:id` allow-list. The new `character_story` column must
  NOT be added here (same reasoning as TASK-018's `image_url` exclusion):
  it's set only via the dedicated story endpoint below.
- `src/database/migrations/011-character-image.js` (11 lines) — the
  exact template for a single guarded `ALTER TABLE characters ADD
  COLUMN` migration; the next migration is `012-character-story.js`.
- `src/database/schema.sql` lines 19-74 (the `characters` table):
  already has an unrelated `current_story_timestamp` column (line 64,
  async session tracking) — the new column must be named distinctly
  (`character_story`) to avoid any confusion with it.
- `src/middleware/auth.js` lines 65-71 and 113-115: `req.user`'s
  `{userId, isDM, isAdmin, isSuperAdmin}` shape and `isDMOrAdmin(user)` —
  not directly needed here since `canModifyCharacter` already composes
  this, but confirms there's no separate "can view" concept to build:
  every dashboard surface that will show these buttons only ever renders
  a viewer's own characters (player dashboard's `state.userCharacters`)
  or a DM/admin's full-access view (DM dashboard) — there is currently no
  code path where a non-owning, non-DM user sees another player's
  character card. The View button therefore needs no client-side
  permission check (server-side, the underlying character GET is already
  unrestricted, same as today). The Edit Story button can be rendered
  unconditionally in both of today's card contexts for the same reason;
  the server-side `canModifyCharacter` check on the `PUT` route is what
  actually enforces the permission, exactly like every other
  character-mutation endpoint.

## Scope

### Included

- **Migration** `src/database/migrations/012-character-story.js`: adds
  `characters.character_story TEXT` (nullable, no default), guarded the
  same way as `011-character-image.js`.
- **New route file** `src/routes/characters/story.js`, mounted the same
  way `image.js` is:
  - `PUT /api/characters/:id/story` — `authenticate` +
    `canModifyCharacter` guard (mirroring `authorizeCharacter` from
    `image.js`). Body: `{ story: "<text>" }`. Validate it's a string (an
    empty string is allowed, and clears the story to an effectively-blank
    value); reject with 400 if it's missing/not a string, or if it
    exceeds a length cap (20,000 characters is a reasonable default —
    implementer's call on the exact number, call it out in the handoff).
    On success, update `characters.character_story` and return the
    updated character row (matching the existing `PUT` response shape).
  - No new GET endpoint (see Context — the existing character list/detail
    responses already include the column).
- **Player character card** (`player-characters.js`'s `loadCharacters()`,
  near lines 61-64): add "Story" and "Edit Story" buttons to the action
  row, each with `event.stopPropagation()` (the card body already has its
  own `onclick` for `viewCharacter`).
- **DM character card** (`dm-lists.js`'s `renderCharacters()`, near lines
  71-76): add the same two buttons to that action row.
- **New full-screen story modal, one per dashboard**: new modal markup
  (new `<div>`, not the existing `#modal-overlay`) and matching CSS in
  each dashboard's own CSS file (`public/css/style.css` for DM,
  `public/css/player-dashboard.css` for player), plus the JS to open it
  in either read-only mode (View) or edit mode (a textarea plus
  Save/Cancel, pre-filled with the current story) when opened via Edit
  Story. Save calls the new `PUT` endpoint, then re-renders the modal in
  read-only mode (or closes it — implementer's call, note it in the
  handoff). Follow this app's existing `apiFetch` + `showToast`
  conventions for the request and error feedback, and the existing
  `Object.assign(window, {...})` convention for exposing new functions to
  inline `onclick` handlers (`player-characters.js` lines 272-276 is the
  model).
- Implementer's call whether the new player-side JS lives in
  `player-characters.js` or a new small file (e.g.
  `player-character-story.js`) — TASK-009 already established a
  precedent in this codebase for splitting out focused frontend files
  rather than growing existing ones indefinitely; note the choice in the
  handoff either way.

### Excluded

- Adding the story to the player's full character sheet or the DM's
  character-detail modal (see Context, decision 2) — card row only.
- Reusing or modifying the existing generic modal component on either
  dashboard (see Context, decision 3) — new, separate modal markup.
- Adding `character_story` to `CHARACTER_UPDATE_FIELDS` / the generic
  JSON `PUT` path (same reasoning as TASK-018's `image_url` exclusion).
- Any rich text, formatting, images, or markdown rendering inside the
  story — plain text only, preserving whitespace/line breaks as typed.
- Any new "can this viewer see this character" permission model. Every
  current surface that will show these buttons already only shows a
  viewer's own characters or is DM/admin, so none is needed now; if a
  future feature (e.g. a party roster showing other players' characters)
  changes that, the View button will keep working unmodified since it has
  no ownership restriction — only Edit is gated. Not this task's problem
  to solve pre-emptively.
- A separate DELETE endpoint — saving an empty string via the same `PUT`
  endpoint covers clearing a story.

## Plan

1. Add the migration (`character_story` column) and confirm it's
   idempotent.
2. Write `src/routes/characters/story.js` (the `PUT` route) and mount it;
   keep `character_story` out of `CHARACTER_UPDATE_FIELDS`.
3. Build the new full-screen story modal (markup + CSS) on the player
   dashboard, wire View/Edit Story buttons on the player character card.
4. Do the same on the DM dashboard.
5. Run the full test suite; add focused tests for the new route (valid
   update, rejects a non-string/oversized body, non-owner gets 403,
   generic `PUT /api/characters/:id` still can't set `character_story`).

## Acceptance criteria

- [ ] `characters.character_story` column exists (nullable, default
      NULL).
- [ ] "Story" and "Edit Story" buttons appear in the character card
      action row on both the DM and player dashboards; "Edit Story" only
      does anything meaningful for a character the viewer can modify (the
      server enforces this regardless of what the button shows).
- [ ] Clicking "Story" opens a full-screen, readable modal showing the
      character's current story text (or a sensible empty state when
      there isn't one).
- [ ] Clicking "Edit Story" opens an editable version with a textarea
      pre-filled with the current text; Save immediately persists via the
      new endpoint and updates what "Story" subsequently shows.
- [ ] A non-owner (and non-DM/admin) `PUT` to the story endpoint is
      rejected with 403.
- [ ] A story body that isn't a string, or exceeds the configured length
      cap, is rejected with a 4xx error and doesn't touch the database.
- [ ] `character_story` is not present in `CHARACTER_UPDATE_FIELDS` /
      cannot be set via the generic `PUT /api/characters/:id`.
- [ ] `npm test` passes, including new tests for the story route.

## Validation requirements

- `npm test`.
- Manual browser check on both dashboards: open a character's story
  (empty state), edit it, save, reopen and confirm the saved text shows;
  confirm the modal is genuinely full-screen and comfortable to read for
  a long paragraph; attempt an edit as a different player's character
  (via direct API call, since the UI won't offer the button) and confirm
  403.

## Risks and assumptions

- The 20,000-character cap is an implementer's-call default, flagged here
  for visibility — call it out explicitly in the implementation handoff
  so it's easy to revise if the human wants a different limit.
- Free text riding along on every character list/detail response matches
  the existing behavior of `backstory`/`character_notes` — not a new
  cost being introduced by this task, but worth naming since a very long
  story compounds that existing cost. Not considered a blocker.

## Blocker

None.

## Implementation handoff

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
