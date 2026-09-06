# TASK-017: Zombie Car Wars 2D6 resolution mechanic in the dice roller

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-06
Approved by: Patrick
Approved date: 2026-09-06
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

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-09-06

### Changes made

- Updated the dice-system button label to "Zombie Car Wars (2d6)"
  (`public/player-dashboard.html:289`).
- Added a dedicated `#car-wars-roll-section` with the five-difficulty
  `<select>` (Easy 5 / Routine 7 / Medium 9 / Hard 11 / Very Hard 13) and
  three capped number inputs (Skill 0-3, Tools 0-2, Attribute 0-1),
  separate from the `d10`-only `#generic-roll-section`
  (`public/player-dashboard.html:314-343`).
- Moved the shared "Purpose" field into its own `#dice-purpose-section`,
  shown for both `d10` and `d6` (`public/player-dashboard.html:347-353`).
- `selectDiceSystem()` now branches three ways (`d20`/`d10`/`d6`) instead of
  the old binary `d20`/else, toggling the new sections correctly
  (`public/js/player/player-dice.js:103-122`).
- Added `clampModifier(value, maximum)` and rewired the renamed
  `rollZombieCarWars()` (was `rollCarWars()`) to always roll exactly 2d6,
  clamp and sum the three modifiers, compare against the selected
  difficulty's numeric target, and return `succeeded`/`margin` alongside
  the existing critical-roll flair (`public/js/player/player-dice.js:296-346`).
- Modifier inputs clamp on `change` and are re-clamped again immediately
  before resolution (belt-and-suspenders, per the task's validation
  requirement).
- `displayRollResult()` and `displayRollHistory()` updated for `d6` to show
  SUCCESS/FAILURE, the dice, each modifier, the difficulty name/target, and
  the signed margin (`public/js/player/player-dice.js:386-401`,
  `:448-451`).
- No character sheet, registry, `character_system_data`, or
  `story_arcs.game_system` changes. No `d20`/`d10` resolution logic touched.
- Nothing committed; task lifecycle metadata left for the reviewer.

### Validation performed

- `npm test`: 60/60 passing.
- `node --check public/js/player/player-dice.js` and `git diff --check`:
  clean.
- Deterministic Node-side tracing (no browser-control harness available in
  this environment) confirmed: all five difficulty target numbers; Skill/
  Tools/Attribute clamp to their documented ranges and invalid input
  clamps to 0; a total below target reports failure with a negative
  margin, a total at/above target reports success with a non-negative
  margin; every roll is exactly two dice; all-sixes/all-ones flair still
  fires; history entries contain dice, each modifier, difficulty/target,
  result, and margin.

### Assumptions and deviations

- No deviations from the approved scope.
- The resolution math stayed inline inside the DOM-coupled
  `rollZombieCarWars()` rather than being extracted into a standalone
  testable function, so no new automated test was added for it (the task
  left this as the implementer's call) — see review note below.

### Unresolved risks

- None identified by the implementer. Visual/pointer-based browser
  behavior still hasn't been exercised in an actual browser in this
  environment (see Review).

## Review

Independent review by Claude, 2026-09-06. **Accepted — no blocking
findings.**

Method: read the full diff directly (`git diff` on both changed files, not
just the handoff's line-number claims), independently re-ran `npm test`
(60/60, matches the handoff), grepped the repo for any leftover
`rollCarWars` reference (none outside this task file) and for remaining
reads of `dice-modifier`/`dice-count` (only `dice-count`, only read by the
untouched `rollWorldOfDarkness`, confirming the `d6` system no longer
shares state with `d10`). Manually traced the new logic against the task's
spec line by line:

- `clampModifier`: parses with `parseInt(value, 10)`, treats `NaN` as 0,
  then `Math.min(maximum, Math.max(0, ...))` — verified by hand for
  in-range, above-max, below-zero, and non-numeric input; matches the
  documented Skill 0-3 / Tools 0-2 / Attribute 0-1 caps exactly, and is
  applied both on `change` and again immediately before resolution (the
  double-clamp the task's validation section asked for).
- Difficulty target numbers come directly from the `<select>` values
  (5/7/9/11/13), matching the five named difficulties exactly; the
  difficulty *name* is recovered from the option's visible text via
  `.replace(/ \(\d+\)$/, '')`, correctly stripping " (13)" etc.
- Dice count is hardcoded to a `for (let i = 0; i < 2; i++)` loop — no
  user-editable count for this system, as required.
- `succeeded: total >= target` and `margin: total - target` match the
  task's "at or above target" success rule exactly.
- `d20`/`d10` code paths are untouched; `character_system_data` and
  `system-registry.js` are untouched — confirmed by grep, not just by
  trusting the handoff's claim.

**Manual browser check**: not performed, for the same reason the
implementer's handoff states — no browser-control harness in this
environment. This is the one validation requirement in the task that
remains genuinely unverified end-to-end; everything else (dice roll count,
clamping, target comparison, margin sign, history content) was verified
either by direct code trace or by the passing test suite. Recommend a
quick manual pass in an actual browser before/soon after merge — pick each
difficulty once, try an out-of-range modifier, and confirm the SUCCESS/
FAILURE line reads correctly — but this is a low-risk gap given the code's
small size and the thoroughness of the static trace.

**Non-blocking observations**:
- The resolution math (`clampModifier`, the target/margin/success
  computation) has no dedicated unit test — it's only exercised indirectly
  by the fact that `npm test` still passes (i.e., proves no regression
  elsewhere, not that the new math is correct). The task explicitly left
  extraction-for-testability to the implementer's judgment, so this isn't
  a deviation, but a future pass could pull the pure math out of the
  DOM-coupled function and add a focused test, the same way
  `ability-conversion.js`/`faserip-conversion.js` keep their math testable
  in isolation from rendering.
- The `d10`-only generic roll section still renders a "Modifier" number
  input that `rollWorldOfDarkness()` has never read (true both before and
  after this change) — pre-existing dead UI, not introduced or worsened by
  this task, not in scope to fix here.

## Human acceptance

Pending.
