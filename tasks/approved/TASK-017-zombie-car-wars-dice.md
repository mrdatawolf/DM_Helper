# TASK-017: Zombie Car Wars 2D6 resolution mechanic in the dice roller

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-06
Approved by: Pending
Approved date: Pending
Related contracts: None
Related ADRs: None. `character_system_data` (created by ADR-003/TASK-014)
is not used by this task — see Excluded.
Dependencies: None (no hard technical dependency; nothing in this task reads
or writes character data).

## Desired outcome

The dice roller gains a working **Zombie Car Wars** resolution mechanic: roll
2D6, add capped modifiers from up to three sources (Skill, Tools, Attribute),
and compare the total against a named difficulty's target number to get a
clear success/fail (and margin) result — something the roller cannot do
today for any system.

## Context

The human provided this ruleset fragment (verbatim), and confirmed (via
planning questions) that it's everything available right now — no skill
list, attribute list, or tools list exists yet, and none is needed for this
task:

> 2D6 System
> Difficulties: Easy 5 / Routine 7 / Medium 9 / Hard 11 / Very hard 13
> Changing the difficulties: Skill level up to +3 / Tools +0 to +2 /
> Attributes +0 to +1

`public/js/player/player-dice.js` already has a `d6` dice-system option
labeled "Car Wars (2d6)" (`rollCarWars()`, wired to the shared
`generic-roll-section` UI also used by the `d10` World of Darkness option:
a "Number of Dice" count, a single flat "Modifier" number input, and a
"Purpose" text field — see `public/player-dashboard.html` lines ~282-317).
That implementation just sums N d6 and adds one flat modifier; it has no
target number and no success/fail concept, so it does not actually
implement Car Wars' or Zombie Car Wars' real mechanic today.

The human confirmed, when asked during planning:

1. **Scope**: this task is the dice mechanic only. No Zombie Car Wars
   character sheet, no stored per-character skills/tools/attributes, no use
   of `character_system_data`. Modifier values are entered ad hoc at roll
   time via plain number inputs, the same way the existing generic roll
   section already works for World of Darkness.
2. **Ruleset completeness**: nothing beyond the fragment above exists yet.
   Do not invent a skill list, attribute list, or tools list — the three
   modifier inputs are generic, capped number fields, not pickers backed by
   fixed data.
3. **The existing "Car Wars (2d6)" option is replaced**, not kept alongside
   this one — it's a strict upgrade (real target numbers and capped
   modifiers vs. an uncapped flat modifier and no success/fail), and having
   both would be confusing with no way to distinguish them for a user.

## Scope

### Included

- Replace the `d6` dice-system button's label from "Car Wars (2d6)" to
  "Zombie Car Wars (2d6)" (`public/player-dashboard.html`).
- New roll UI for the `d6` system only (the `d10`/World of Darkness generic
  section is unaffected and keeps its current dice-count/modifier/purpose
  inputs):
  - A difficulty selector with the five named difficulties and their target
    numbers (Easy 5, Routine 7, Medium 9, Hard 11, Very Hard 13) — value
    displayed alongside the name (e.g. "Routine (7)").
  - Three separate modifier number inputs, each clamped to its documented
    range: Skill (0 to +3), Tools (0 to +2), Attribute (0 to +1). Clamp
    invalid/out-of-range entries rather than silently accepting them.
  - The existing "Purpose" free-text field, reused as-is.
  - Dice count is fixed at 2 (not user-editable) — this system is always
    2D6, unlike the generic count-based roller it replaces.
- `rollCarWars()` in `player-dice.js` (rename to reflect Zombie Car Wars,
  implementer's call on the exact name) reworked to: roll exactly 2d6, sum
  the three clamped modifiers, compare `2d6 + modifiers` against the
  selected difficulty's target number, and return a result object carrying
  enough detail to render success/fail and margin (e.g. total, target,
  succeeded, margin = total - target).
- Result display (`displayRollResult`) and history line
  (`displayRollHistory`) updated for the `d6` system to show: the two dice,
  each modifier's contribution, the difficulty name/target, and a clear
  success/fail indicator with margin — mirroring how the `d20` result
  already shows a breakdown, not just a bare number.
- Keep the existing critical-success/critical-failure flair (all-6s /
  all-1s on the two dice) if it still reads sensibly alongside the new
  success/fail result; implementer's call on exact wording.

### Excluded

- Any Zombie Car Wars character sheet, stat block, or "View As" entry in
  `system-registry.js` — no character data is read or written by this task.
- Any use of `character_system_data` or `story_arcs.game_system`.
- A fixed skill/attribute/tools list or any picker backed by character data
  — modifier inputs are generic, ad hoc numbers entered per roll.
- Vehicle rules, combat rules, or any other Zombie Car Wars mechanic beyond
  the 2D6-vs-target-number resolution described above.
- Changes to the `d20` or `d10` dice systems.

## Plan

1. Update the dice-system button label and add the difficulty-selector +
   three-modifier-input markup for the `d6` system in
   `public/player-dashboard.html`, gated the same way the existing
   `generic-roll-section` is gated by `selectDiceSystem()`.
2. Rework `rollCarWars()` (or its renamed equivalent) in `player-dice.js` to
   the new 2d6 + clamped-modifiers vs. target-number logic.
3. Update `displayRollResult()` and `displayRollHistory()` for the `d6`
   case to show the new breakdown and success/fail/margin.
4. Manually exercise the roller in a browser: each difficulty, modifier
   values at and outside their caps (confirm clamping), a success, a
   failure, and both critical cases.
5. Run the full test suite (`npm test`) to confirm nothing else regressed —
   add a focused test if the resolution math is extracted into a testable
   function rather than left inline in the DOM handler (implementer's call,
   but prefer testable over inline if it's not significantly more work).

## Acceptance criteria

- [ ] Dice roller shows "Zombie Car Wars (2d6)" (or equivalent updated
      label) in place of the old "Car Wars (2d6)" option.
- [ ] Selecting it shows a difficulty selector (Easy 5 / Routine 7 /
      Medium 9 / Hard 11 / Very Hard 13) and three modifier inputs (Skill,
      Tools, Attribute), not the old count/flat-modifier inputs.
- [ ] Modifier inputs clamp to their documented ranges (Skill 0-3, Tools
      0-2, Attribute 0-1) — entering a value outside the range does not
      produce an out-of-range contribution to the roll.
- [ ] Rolling produces exactly 2 dice, sums them with the three modifiers,
      and correctly reports success/fail against the selected difficulty's
      target number, with the margin shown.
- [ ] Roll history for this system shows enough detail to reconstruct the
      result (dice, modifiers, difficulty, success/fail).
- [ ] `npm test` passes.

## Validation requirements

- `npm test`.
- Manual browser check covering: each of the five difficulties, a
  below-target (fail) and at-or-above-target (success) roll, an
  out-of-range modifier entry (confirm it clamps), and the critical
  success/failure display.

## Risks and assumptions

- The three modifier inputs are unlabeled generic numbers with no backing
  data model — a deliberate, human-confirmed scope limit given no fuller
  ruleset exists yet, not an oversight. A future task can turn these into
  character-backed pickers once skills/attributes/tools are defined,
  likely via `character_system_data`.
- "Margin" (total - target) is not something the human explicitly
  requested, but is added here as the natural minimum extra context needed
  to make a bare success/fail result legible, consistent with how the
  existing `d20` result already shows a full breakdown rather than a bare
  pass/fail. Flag during review if this is unwanted.

## Blocker

None.
