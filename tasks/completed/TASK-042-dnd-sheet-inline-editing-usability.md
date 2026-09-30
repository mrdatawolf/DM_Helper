# TASK-042: D&D sheet inline-editing usability fixes

Owner role: Implementer
Assigned agent: Claude
Proposed by: Claude
Proposed date: 2026-09-29
Approved by: Patrick
Approved date: 2026-09-29
Related contracts: None.
Related ADRs: None.
Dependencies: TASK-040 (`computedCharacter()` must accept `CHA` as well as
`charisma`, since the dropdown in item 1 stores abbreviations).

## Desired outcome

The player's editable D&D 5e sheet (`public/js/player/player-character-sheet.js`)
is easier to edit correctly: the spellcasting ability can't be mistyped, skill
numbers stay visible while editing, the Player field can't hold names that
drift from who actually owns the character, and the Backstory is readable.

## Context

Reported by Patrick on 2026-09-29 while fixing his own character, Sandee
Zemlya, on the live sheet.

1. **Spellcasting ability is free text.** The Spellcasting panel's "Ability"
   is `slot('spellcasting_ability')`, a plain text input. Anything is
   accepted; a typo silently gives a +0 modifier (DC 8 + prof, attack +prof),
   the same symptom as the TASK-040 bug. The edit form's Spells tab already
   uses a dropdown (`INT` / `WIS` / `CHA`).
2. **Skill numbers are hidden while editing.** `.sheet-skill` is a grid with
   a fixed `34px` first column (`public/css/player-dashboard.css`). When a
   skill's rank is clicked, the `<input type="number">` is squeezed into that
   column; the browser's up/down spinner covers the value, so the player can't
   see the number they're changing.
3. **Player is free text, separate from the real owner.** `slot('player_name')`
   in the sheet header accepts any text, but the system already knows who
   owns each character (`characters.user_id`). The sheet is on the owner's
   own player dashboard, so the owner's username is the Player. Prod data
   today (`Samples/dm_helper.db`) shows the two drift apart:

   | Character | `player_name` | Owner (`user_id` → username) |
   |---|---|---|
   | Aelindra Moonshadow | Player 1 | none |
   | Maximum Black | (empty) | lucas.norman@gmail.com |
   | Lilly Lemondrop | (empty) | Leluna |
   | Sandee Zemlya | MrDataWolf | mrdatawolf |
   | Shorven of Shelvar | Shorven | Shorven |
   | Leif Slipstream | Terry | Val |

   `player_name` is a display label only; ownership and authorization use
   `characters.user_id`. It is shown as "Player" in several places:
   the sheet header and PDF export (`player-character-sheet.js`), the full
   sheet (`dnd-full-sheet.js`), the DM character list (`dm-lists.js`), DM
   character details (`dm-character-editor.js`), the session modals
   (`dm-session-modals.js`, `dm-session-editor.js`), and the primal pattern
   list (`dm-primal-pattern-actions.js`). It is typed in by the DM's create /
   edit forms (`dm-character-modals.js`, `dm-character-editor.js`) and may be
   collected by the character wizard (`player-wizard-integration.js`
   allow-lists it).
4. **Backstory is squeezed into one narrow column.** In "Personality &
   Appearance", `.detail-grid` is `repeat(auto-fit, minmax(180px, 1fr))` and
   holds seven textareas (Appearance, Personality, Desires, Fears, Allies &
   Organizations, Treasure, Backstory). Backstory gets one ~1/6-width cell
   like the others, leaving most of its row empty and long text hard to read.

## Scope

### Included

1. **Spellcasting ability dropdown.** Add a `select` inline-edit type to
   `activateInlineEditing()` and use it for `spellcasting_ability`, with the
   same options and stored values as the edit form (None / `INT` / `WIS` /
   `CHA`). An existing full-name value (e.g. `Charisma`) preselects the
   matching option; saving writes the abbreviation. The display shows the
   full ability name.
2. **Skill rank input width.** Make the skill rank column / number input wide
   enough that the value stays visible next to the spinner while editing
   (e.g. give number inputs in `.sheet-skill` a minimum width in `em`, and
   widen the column to fit). Check the ability score and other number slots
   for the same problem and fix them the same way if affected.
3. **Player shows the owner's username (decided by Patrick, 2026-09-29).**
   "Player" is display only and comes from the character's owner:
   `users.username` for `characters.user_id`. If there is no owner (e.g.
   Aelindra Moonshadow), Player is blank. It never affects ownership or
   authorization.
   - Server: include the owner's username (e.g. `owner_username`, joined
     from `users`) wherever character data that feeds a "Player" display is
     returned.
   - Every "Player" display listed in Context shows that username instead
     of `player_name`.
   - Remove the ways to type a Player name: the sheet's inline slot, the DM
     create / edit form inputs, and the wizard field if it has one.
   - `player_name` stays in the database, unused. No migration, no
     rewriting of existing values.
4. **Backstory full width.** Make Backstory span the full width of the
   `.detail-grid` (`grid-column: 1 / -1`), with its editing textarea filling
   that width and tall enough for several paragraphs. The other six fields
   keep the current grid.

### Excluded

- The edit form (Spells tab etc.). Its spellcasting dropdown is already
  correct.
- Changing character ownership (`user_id`), or any way to reassign it.
- Dropping or rewriting the `player_name` column.
- Other layout changes to the sheet.

## Plan

1. Add a `select` type to the inline editor (options passed via the slot)
   and use it for `spellcasting_ability`.
2. Return the owner's username with character data; switch every "Player"
   display to it; remove the Player inputs.
3. CSS: skill rank / number input widths; Backstory full-width.
4. Tests: inline select saves the abbreviation; full-name value preselects;
   character responses include the owner's username (blank when unowned).
5. Browser check on the player dashboard.

## Acceptance criteria

- [ ] Spellcasting Ability can only be set to None / Intelligence / Wisdom /
      Charisma, and choosing Charisma on a level 1 character with CHA 15
      shows DC 12 / +4.
- [ ] While editing a skill rank, the number being changed is visible.
- [ ] Every "Player" display shows the owner's username (Sandee Zemlya →
      mrdatawolf, Leif Slipstream → Val), blank when unowned; there is no
      way left to type a Player name.
- [ ] Backstory spans the full width of the section, as text and while
      editing.
- [ ] `npm test` passes.

## Validation requirements

`npm test`, plus a browser check of all four items on the player dashboard.

## Risks and assumptions

- Characters with a stored `player_name` that differs from the owner (e.g.
  Leif Slipstream: "Terry", owned by Val) will change what they display.
  That is intended (confirmed by Patrick, 2026-09-29).

## Blocker

None.

## Implementation handoff

Changed:
- `public/js/player/player-character-sheet.js`:
  - New `select` inline-edit type driven by a `SELECT_FIELDS` table (options
    plus a `normalize` function). Used for `spellcasting_ability` with the
    edit form's options (None / INT / WIS / CHA). The display shows the
    option label; a stored full name ("Charisma") preselects `CHA`; saving
    writes the abbreviation. Saves on change or blur. An unrecognised
    stored value displays as-is and preselects None.
  - Player is read-only text from `owner_username` ("—" when unowned); the
    `player_name` slot is gone. The PDF "Player Name" uses `owner_username`.
  - Backstory's label carries `detail-wide`.
- `public/css/player-dashboard.css`: number inputs inside `.sheet-editable`
  are `4.5em` wide (covers skills, ability scores, spell slots, combat
  numbers); the skill rank column went from `34px` to `4.5em`; selects get
  the same styling as inputs; `.detail-wide` spans the full `.detail-grid`
  row with a full-width, 240px-tall editing textarea; `.sheet-readonly` for
  the Player text.
- `src/routes/characters/index.js`: `GET /api/characters` and
  `GET /api/characters/:id` add `u.username AS owner_username`
  (`LEFT JOIN users`). All the Player displays read from these two.
- Player displays switched to `owner_username`: `dnd-full-sheet.js`,
  `dm-lists.js` (still "NPC" when unowned), `dm-character-editor.js` detail
  view, `dm-session-modals.js`, `dm-session-editor.js`,
  `dm-primal-pattern-actions.js`.
- Removed the "Player Name" inputs from the DM create form
  (`dm-character-modals.js`) and DM edit form (`dm-character-editor.js`).
- Tests: `tests/api.test.js` (single and list reads return the owner's
  username even when `player_name` differs); `tests/frontend-modules.test.js`
  (dropdown options, full-name preselect, saves `WIS`, Player shows owner
  and is not editable).

Deviations / notes:
- The wizard never asked for a Player name (`player_name` is only in
  `player-wizard-integration.js`'s allow-list), so nothing was removed
  there.
- The server still accepts and stores `player_name` on create/update, and
  `sessions.js` / `shadows.js` still select it; nothing displays it. Left
  as is per "stays in the database, unused".
- Create/update/story/image responses don't include `owner_username`
  (they `SELECT *`). The sheet refetches `GET /:id` after every save, so
  this doesn't show; noted in case something reads those responses for
  display later.

Validated (2026-09-29):
- `npm test`: 129 pass, 0 fail.
- NOT validated: browser check (no browser in this environment). To check
  on the player dashboard: Spellcasting Ability dropdown (choose Charisma
  on Sandee → DC 12 / +4); click a skill rank and use the spinner; Player
  shows your username; Backstory spans the section. DM dashboard:
  character list and session lists show owner usernames; Leif Slipstream
  shows Val.
