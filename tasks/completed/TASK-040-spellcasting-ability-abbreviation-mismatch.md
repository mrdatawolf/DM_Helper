# TASK-040: Spell save DC / attack ignore abbreviated spellcasting ability

Owner role: Implementer
Assigned agent: Claude
Proposed by: Claude
Proposed date: 2026-09-29
Approved by: Patrick
Approved date: 2026-09-29
Related contracts: None.
Related ADRs: None.
Dependencies: None. Builds on TASK-015's decision that spell save DC and
spell attack bonus are computed, not stored display values.

## Desired outcome

A D&D 5e character's sheet summary shows the correct spell save DC and spell
attack bonus for the spellcasting ability the player selected, and the edit
form no longer offers manual DC / attack inputs that nothing displays.

## Context

Reported by a player (2026-09-29) editing Lilly Lemondrop (character id 8)
in the Amber campaign: the edit form holds Charisma / Save DC 13 / Spell
Attack +5, but after saving, the sheet summary shows Save DC 10 / Attack +2.

Confirmed against a prod DB copy (`Samples/dm_helper.db`):
`character_extension_data` (`system:dnd5e`) `sheet` for character 8 has
`spellcasting_ability = 'CHA'`, `spell_save_dc = 13`,
`spell_attack_bonus = 5`, `proficiency_bonus = 2`; `characters.charisma = 52`
(score 16, modifier +3). Lilly is currently the only character with a
spellcasting ability set.

Root cause: the edit form writes the ability as an abbreviation
(`INT` / `WIS` / `CHA`, `public/js/player/player-edit-gameplay-tabs.js`),
but `computedCharacter()` in `public/js/dnd-computed-character.js` looks the
value up by full lowercase ability name (`charisma`). `cha` matches nothing,
the modifier falls back to 0, and the result is 8 + 2 + 0 = 10 and +2. The
existing unit test passes `'intelligence'`, so the form's actual values were
never exercised.

Separately, the edit form's Spell Save DC and Spell Attack Bonus inputs are
saved but never shown anywhere — TASK-015 made the sheet compute those
values. Keeping the inputs invites exactly this kind of disagreement.

## Scope

### Included

1. `computedCharacter()` resolves `spellcasting_ability` whether stored as a
   full name (`charisma`, any case) or an abbreviation (`CHA`, any case),
   covering all six abilities. With the fix Lilly's summary shows DC 13 /
   +5.
2. Remove the Spell Save DC and Spell Attack Bonus inputs from the player
   edit form (`player-edit-gameplay-tabs.js`) and stop sending
   `spell_save_dc` / `spell_attack_bonus` from `player-edit-actions.js`.
   Also remove the matching static markup in `public/player-dashboard.html`
   and `public/partials/character-edit-tabs.html` (the partial appears
   unreferenced — confirm and note, don't delete the file in this task).
3. Tests: `computedCharacter()` with `'CHA'`, `'cha'`, and `'charisma'`
   produces the same DC / attack; an unset or unknown ability still falls
   back to modifier 0.

### Excluded

- No schema or data migration. The stored `spell_save_dc` /
  `spell_attack_bonus` keys stay in `DND5E_CHARACTER_COLUMNS`,
  `SHEET_DEFAULTS`, and existing documents; they are harmless and removing
  them is a separate cleanup.
- No change to what the edit form stores for `spellcasting_ability`
  (it keeps writing `INT` / `WIS` / `CHA`).
- No change to the spellcasting-ability dropdown's option list.

## Acceptance criteria

- With the prod DB copy, Lilly's sheet summary and full / read-only sheet
  views show Save DC 13 and Attack +5.
- The player edit form's Spells tab shows Spellcasting Ability and spell
  slots, but no Save DC / Attack Bonus inputs; saving it succeeds and
  does not write those two keys.
- `npm test` passes, including the new cases.

