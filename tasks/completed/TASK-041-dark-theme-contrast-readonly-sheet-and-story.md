# TASK-041: Unreadable text on the D&D summary card, Story modal, and DM character details

Owner role: Implementer
Assigned agent: Claude
Proposed by: Claude
Proposed date: 2026-09-29
Approved by: Patrick
Approved date: 2026-09-29
Related contracts: None.
Related ADRs: None.
Dependencies: TASK-040 (spellcasting ability lookup), only if item 4 is
included.

## Desired outcome

Text on the read-only D&D summary card, the character Story modal, and the
DM's character "View Details" modal is readable under the dark theme.

## Context

Found by Patrick while checking TASK-040 (2026-09-29):

- **D&D summary card** ("View As..." → D&D 5e, `public/js/dnd-readonly-sheet.js`):
  the big ability score in each box (8, 10, 14…) is nearly invisible. The box
  has an inline light background (`#eaf2fb`); its label and modifier lines set
  their own dark colors, but the score `<div>` (line 28) sets none, so it
  inherits `body { color: #dde1e7 }` from `public/css/dark-theme.css`.
- **Story modal** (DM character list → "Story", `public/js/dm/dm-character-story.js`):
  grey text on white. `.story-modal` has `background: white` in
  `public/css/style.css` (and a duplicate in `public/css/player-dashboard.css`)
  but no text color. `dark-theme.css` darkens `.modal` and `.modal-content`
  but has no rule for `.story-modal`, so the box stays white while the text
  inherits the theme's light grey. The player dashboard's Story modal uses the
  same classes and is expected to have the same problem.

- **DM character "View Details" modal** (DM character list → "View Details",
  `viewCharacter()` in `public/js/dm/dm-character-editor.js`): the Gear and
  Powers & Abilities tables (and Recent Progress, same markup) have header
  rows with an inline parchment background (`#f5efe0`) and no text color, so
  the headers are light grey on near-white. The reverse also happens in the
  same modal: Notes text and a familiar's "Abilities:" line are inline
  `color:#555`, dark grey on the dark-theme modal background.

Common cause: a component with a hardcoded light background that relies on
inherited text color, which the dark theme changes.

The summary card also has no spellcasting section at all (abilities, AC,
initiative, speed, HP, proficiency, passive perception only). That is why it
did not show the DC 10 / +2 bug TASK-040 fixed.

## Scope

### Included

1. D&D summary card: give the ability score an explicit dark color matching
   the card's own palette (e.g. the label's `#1c3f66`).
2. Story modal: add `.story-modal` to `dark-theme.css` the same way `.modal`
   is handled (dark background, light text, header/border colors, and
   readable textarea / empty-state text), so it matches other modals. Covers
   both dashboards.
3. DM "View Details" modal: make the Gear, Powers & Abilities, and Recent
   Progress table headers readable (give them a dark-theme-appropriate
   background and text color), and replace the `#555` Notes / familiar
   abilities color with one readable on the dark modal.
4. Add a Spellcasting row to the summary card (ability,
   save DC, attack bonus from `computedCharacter()`), shown only when the
   character has a spellcasting ability.

### Excluded

- A general audit of every `background: white` component in `style.css`
  (there are ~20). Worth doing, but as its own task.
- Changing the summary card's overall light styling to a dark one.
- Removing the duplicated story-modal CSS between `style.css` and
  `player-dashboard.css`.

## Plan

1. Set the score color in `renderAbility()`.
2. Add `.story-modal` overrides in `dark-theme.css` next to the existing
   `.modal` block.
3. Fix the header and `#555` colors in `viewCharacter()`.
4. If approved, add the spellcasting row to `renderDndReadOnlySheet()`.
5. Test and check all three views in the browser, DM and player dashboards.

## Acceptance criteria

- [ ] Ability scores on the D&D summary card are clearly readable.
- [ ] The Story modal (view and edit mode) is readable on the DM and player
      dashboards, and looks like the other dark-theme modals.
- [ ] In the DM "View Details" modal, the Gear, Powers & Abilities, and
      Recent Progress table headers, the Notes text, and familiar abilities
      are readable.
- [ ] If item 4 is approved: Lilly Lemondrop's card shows Charisma / DC 13 /
      +5; a character with no spellcasting ability shows no row.
- [ ] `npm test` passes.

## Validation requirements

`npm test`, plus a browser check of all three views. The contrast issues
can't be covered by unit tests; a renderer test can cover item 4.

## Risks and assumptions

- Assumes the dark theme is always on (it's linked unconditionally on both
  dashboards).

## Blocker

None.

## Implementation handoff

Changed:
- `public/js/dnd-readonly-sheet.js`: ability score text set to `#1c3f66`;
  new Spellcasting row (ability name, Save DC, Attack) after the stat tiles,
  in the card's light-blue box style, rendered only when the spellcasting
  ability resolves.
- `public/js/dnd-computed-character.js`: `computedCharacter()` also returns
  `spellAbility` (resolved ability key, or `null`) so the card knows whether
  to show the row and what to call it. Additive; no existing value changed.
- `public/css/dark-theme.css`: `.story-modal` rules next to the `.modal`
  block (dark box, light text, header border and title, empty-state text,
  textarea). Applies to both dashboards, since both load `dark-theme.css`
  last.
- `public/js/dm/dm-character-editor.js` (`viewCharacter()`): Gear, Powers &
  Abilities, and Recent Progress header rows now use a translucent white
  background with `#ecf0f1` text instead of `#f5efe0`; Notes text and
  familiar "Abilities:" line use `#b8c2cf` instead of `#555`.
- `tests/frontend-modules.test.js`: new test for the spellcasting row
  (`CHA` → Charisma / DC 13 / +5; no row for null, empty, or unknown).

Validated (2026-09-29):
- `npm test`: 127 pass, 0 fail.
- NOT validated: browser check. No headless browser is installed in this
  environment. To check: DM dashboard → Lilly Lemondrop → View As D&D 5e
  (scores visible, Spellcasting row shows Charisma / DC 13 / +5); DM
  character list → Story and View Details; player dashboard → Story.

Notes:
- The familiar rows in View Details still use a `#eee` bottom border; on the
  dark modal it reads as a faint light line, which looks fine, so it was left.
