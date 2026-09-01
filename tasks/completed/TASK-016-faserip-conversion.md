# TASK-016: FASERIP conversion (stats, Health, Karma) and a "View As..." picker

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-08-31
Approved by: Patrick
Approved date: 2026-08-31
Related contracts: None
Related ADRs: ADR-003 (universal core attributes) — this task builds
directly on the percentile ground truth it established; no new ADR is
required unless implementation surfaces a decision worth recording.
Dependencies: TASK-014 (universal core attributes) — completed. TASK-015
(D&D 5e character sheet) — completed; not a hard technical dependency (this
task reads the same percentile columns TASK-014 established directly, not
anything TASK-015 built), but it's the precedent for module conventions
this task follows.

## Desired outcome

Any character can be viewed as a FASERIP (Marvel Super Heroes RPG) stat
block — Fighting/Agility/Strength/Endurance/Reason/Intuition/Psyche, Health,
and Karma — derived from their existing D&D-percentile ability scores, with
no new data entry required. Reachable as a read-only modal from a new
"View As..." button on every character card, for both players (their own
characters) and the DM (any character).

## Context

The universal percentile foundation (TASK-014) means every character's six
ability scores are already stored as a 0–100 system-neutral percentile
(`characters.strength`/`dexterity`/etc.), with D&D's own 1–30 score derived
from it via `public/js/ability-conversion.js` (see ADR-003). This task adds
the first other system on top of that foundation: FASERIP, using
`Samples/Classic_MSH_(FASERIP)_Character_sheet.pdf` as the reference for
what a converted character should show (confirmed via `pypdf`: a genuine
AcroForm PDF, but all 481 fields are unnamed — `untitled1`...`untitled481`
— unlike the D&D PDF's descriptive names, which is why PDF export is
explicitly excluded from this task; reliable field-filling would need
manual coordinate-by-coordinate mapping, a separate and much larger effort).

Two design problems were resolved with the human before this task was
written, and the resolution is authoritative — do not redesign these,
implement them as specified:

**1. FASERIP has 7 stats, D&D has 6.** Endurance←CON, Reason←INT,
Intuition←WIS, Psyche←CHA, Agility←DEX, Strength←STR are 1:1. Fighting has
no D&D equivalent and must be computed as the **average of the Strength and
Agility percentiles** (`(strength + dexterity) / 2`, using the raw
percentile values, not D&D scores).

**2. The percentile→FASERIP-rank-number curve must not be linear**, or
ordinary D&D characters convert into absurdly overpowered FASERIP heroes
(verified by calculation during planning: a linear mapping puts a plain
D&D score 14 inside FASERIP's "Amazing" band, which is wrong — Amazing is
solidly superhuman). Use this piecewise-linear anchor table, interpolating
linearly between consecutive anchors (percentile → FASERIP rank number):

| Percentile | Rank number |
|---|---|
| 0 | 1 |
| 24 | 5 |
| 33 | 6 |
| 45 | 9 |
| 52 | 14 |
| 59 | 22 |
| 66 | 30 |
| 79 | 40 |
| 90 | 60 |
| 100 | 100 |

Percentile 33 → rank 6 (Typical) is the load-bearing anchor: it's what
makes an average D&D character (all scores ~10-11) convert into an
ordinary, unpowered FASERIP civilian (all Typical, Health 24, Karma 18) —
matching classic MSH's own convention for ordinary people. This was
validated by hand for three sample characters during planning (see the
Acceptance criteria below for the exact expected numbers) — implementation
must reproduce these exact figures, not just "something reasonable."

**FASERIP rank bands**, for naming a rank number (e.g. "Excellent (18)"):

| Name | Abbreviation | Range |
|---|---|---|
| Shift 0 | Sh0 | 0 |
| Feeble | Fe | 1–2 |
| Poor | Pr | 3–4 |
| Typical | Ty | 5–6 |
| Good | Gd | 7–10 |
| Excellent | Ex | 11–20 |
| Remarkable | Rm | 21–30 |
| Incredible | In | 31–40 |
| Amazing | Am | 41–50 |
| Monstrous | Mn | 51–75 |
| Unearthly | Un | 76–100 |

**Health = Fighting + Agility + Strength + Endurance** (sum of rank
numbers). **Karma = Reason + Intuition + Psyche** (sum of rank numbers).
These are real FASERIP mechanics (confirmed against a published
Fantasy-FASERIP conversion document during planning), not something to
redesign.

Existing patterns to reuse, confirmed present in the repo:
- `public/js/ability-conversion.js`: the UMD dual-format pattern (works as
  both `require()` for server code and a browser global
  `window.AbilityConversion`) — mirror this exactly for the new FASERIP
  module so both server and browser share one implementation.
- `public/js/dm/dm-modal-utils.js`: `showModal(title, content)` /
  `closeModal()` — a generic modal shell already used throughout the DM
  side. Reuse directly; do not build new DM-side modal code.
- The player side has no equivalent generic modal (only a one-off
  `#claim-modal` div in `player-claims.js`) — add one.
- `public/js/player/player-characters.js`'s character card markup
  (`.character-card-actions`, next to the existing `Edit` button) and
  `public/js/dm/dm-lists.js`'s card action row (next to `View
  Details`/`Edit`/`Delete`) are where the new button goes on each side.

## Scope

### Included

- **New module** `public/js/faserip-conversion.js`, mirroring
  `ability-conversion.js`'s UMD shape, exporting:
  - `FASERIP_RANKS`: the band table above, as data.
  - `percentileToRank(percentile)`: piecewise-linear interpolation through
    the anchor table above.
  - `rankName(number)`: returns `{ name, abbreviation }` for a rank number
    by band lookup.
  - `computeFaseripCharacter(character)`: takes a character row (reading
    its six percentile columns directly), returns `{ fighting, agility,
    strength, endurance, reason, intuition, psyche }` (each `{ number,
    name, abbreviation }`) plus `health` and `karma`.
- **Tests** `tests/faserip-conversion.test.js`: assert `percentileToRank`
  hits every anchor point exactly; assert `rankName` boundaries (e.g. 6 →
  Typical, 7 → Good, 100 → Unearthly); assert the three sample characters
  below produce their documented Health/Karma exactly.
- **Read-only render function**, e.g. `public/js/faserip-sheet.js`: takes a
  character object, returns an HTML string rendering a compact FASE/RIP
  stat block plus Health and Karma, styled distinctly from the D&D sheet
  (different accent color, clearly labeled "FASERIP (converted)" or
  similar) — no inline editing, no inputs.
- **`player-modal-utils.js`**: new file, `public/js/player/`, mirroring
  `dm-modal-utils.js`'s `showModal`/`closeModal` shape exactly.
- **A small system registry** (id, label, render function) with exactly one
  entry today (`faserip`), structured so adding a future system is "add an
  entry," not a rewrite. D&D is deliberately not in this registry — it has
  its own dedicated editable view already (TASK-015) reached the normal
  way.
- **"View As..." button** on player character cards
  (`player-characters.js`) and DM character cards (`dm-lists.js`), opening
  a modal that first lists the registry, then (on selection) shows that
  system's rendered read-only sheet for the character. DM side reuses
  `dm-modal-utils.js`; player side uses the new `player-modal-utils.js`.

### Excluded

- PDF export for FASERIP (unnamed form fields make this a separate, larger
  effort — see Context).
- Any percentile-dice resolution mechanic — this is display/analysis only,
  it does not change how anyone rolls.
- Popularity and Resources conversion (no D&D source data for these
  genre-specific stats) — leave them out of the rendered sheet entirely for
  this pass, don't fabricate placeholder values.
- Editing of the FASERIP view — read-only only; all underlying values are
  still edited through the existing D&D sheet/edit forms.
- D&D 5e in the "View As..." registry (see above).
- Any change to `dm-modal-utils.js`, `ability-conversion.js`, or anything
  TASK-014/015 already built, beyond importing/reusing them as-is.

## Plan

1. Write `faserip-conversion.js` and its tests first, in isolation —
   verify the three sample characters below before building anything that
   depends on it.
2. Write the read-only render function against the conversion module's
   output.
3. Add `player-modal-utils.js`.
4. Wire the registry + picker + button into `player-characters.js`.
5. Wire the same registry + picker + button into `dm-lists.js` (and
   wherever else the DM character card action row is rendered, if it
   turns out to differ from what's referenced above — verify against the
   live code rather than assuming).
6. Run the full test suite.

## Acceptance criteria

- [x] `computeFaseripCharacter` on an all-percentile-31 character (D&D
      score 10 on every ability) returns Fighting/Agility/Strength/Endurance
      all at rank 6 (Typical), Health 24, Reason/Intuition/Psyche all at
      rank 6, Karma 18.
- [x] `computeFaseripCharacter` on a character with percentiles for
      STR15/DEX14/CON13/INT12/WIS10/CHA8 (i.e.
      `percentileFromScore(15/14/13/12/10/8)`) produces Health 38, Karma 18
      (corrected from an initial 17 during implementation — see Blocker).
- [x] `computeFaseripCharacter` on a character with percentiles for
      STR18/DEX16/CON15/INT10/WIS12/CHA14 produces Health 65, Karma 22.
- [x] `percentileToRank(0)` = 1, `percentileToRank(100)` = 100.
- [x] `rankName` correctly names every band boundary (5/6 = Typical, 7 =
      Good, 10/11 = Good/Excellent boundary, etc., per the table above).
- [x] A "View As..." button appears on every player character card and
      every DM character card.
- [x] Clicking it opens a modal listing available systems (currently just
      FASERIP); selecting FASERIP shows that character's converted stat
      block, correctly computed.
- [x] The FASERIP view has no editable fields.
- [x] `npm test` passes, including the new FASERIP conversion tests.

## Validation requirements

- `npm test`.
- Independently re-derive at least one of the three sample-character
  calculations by hand (not just trust the test) during review.
- Manual browser check on both player and DM sides: open "View As...",
  select FASERIP, confirm the modal renders correctly and the numbers
  match what `computeFaseripCharacter` would produce for that character.

## Risks and assumptions

- The anchor table and rank bands are a best-effort reconstruction from
  cross-referenced public sources during planning, not a verified rulebook
  transcription — acceptable given the human's explicit "doesn't need to
  be perfect" framing for this whole effort, but worth a final check
  against an actual rulebook if one is available later.
- DM-side character card rendering may exist in more than one place
  (`dm-lists.js` was identified during planning, but verify there isn't a
  second card-rendering path elsewhere in the DM UI before considering the
  DM-side wiring complete).

## Blocker

Resolved. First implementation attempt (2026-08-31, openai-coder) correctly
found that the pinned acceptance criteria were internally inconsistent: the
second sample character's expected Karma (17) was not reachable under the
mandated anchor table and rounding rule, given that the same percentile
(31, from D&D score 10) is independently pinned to rank 6 by the
all-percentile-31 sample and by the third sample's Intuition value. Rather
than guess or silently change a pinned number, the implementer stopped and
asked. Verified independently (Claude): the anchor-table interpolation at
percentile 31 (between anchors (24,5) and (33,6)) rounds to 6, not 5 — the
17 was an arithmetic slip made during planning (inconsistent rounding at
that boundary between two hand-calculated samples), not a flaw in the
anchor table itself. Corrected the second sample's Karma to 18 above;
Health (38) and everything else in that sample were already correct. No
other acceptance criteria are affected. Cleared to proceed.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-31

### Changes made

- Added `public/js/faserip-conversion.js` as a shared UMD module containing
  the pinned rank bands, piecewise-linear percentile conversion, rank lookup,
  seven-stat mapping, and Health/Karma totals.
- Added a compact, read-only FASERIP renderer and a one-entry character-system
  registry. The converted view labels all seven FASE/RIP stats plus Health and
  Karma, uses a distinct red/gold presentation, and omits editing, PDF, dice,
  Popularity, Resources, and D&D registry behavior.
- Added the player generic modal shell and utility module, mirroring the DM
  modal utility's `showModal`/`closeModal` shape. The existing DM modal utility
  was reused without modification.
- Added "View As..." to both character-card renderers and wired the shared
  picker and FASERIP renderer on the player and DM dashboards. Repository-wide
  tracing confirmed these are the only player and DM character-card renderers.
- Added conversion tests covering every interpolation anchor, every rank-band
  boundary, and all three pinned sample characters.

### Validation performed

- Ran `npm test`; all 58 tests passed (58 passed, 0 failed), including the five
  new FASERIP conversion tests.
- Independently recomputed the corrected second sample: D&D scores
  15/14/13/12/10/8 map to percentiles 48/45/41/38/31/24 and FASERIP ranks
  F10/A9/S11/E8/R7/I6/P5, yielding Health 38 and Karma 18. Also recomputed the
  third sample as F18/A14/S22/E11/R6/I7/P9, yielding Health 65 and Karma 22.
- Loaded the conversion, renderer, and registry through Node to confirm the
  registry has exactly the `faserip` entry, character names are HTML-escaped,
  the ordinary-character sheet renders Health 24/Karma 18, and the sheet
  contains no input, select, textarea, or contenteditable controls.
- Re-grepped all DM and player JavaScript for character-card render paths and
  confirmed `dm-lists.js` and `player-characters.js` are the sole renderers.
- Ran `git diff --check`; it reported no whitespace errors.
- An interactive browser-control harness was not available, so the requested
  pointer-based manual browser check was not performed. Script load order,
  modal IDs, global handlers, registry selection, and render output were
  instead verified by direct code tracing and Node execution.

### Assumptions and deviations

- The piecewise interpolation result is rounded with `Math.round`, consistent
  with the corrected blocker explanation and all pinned samples.
- Shared renderer and registry files use the same browser-global/CommonJS UMD
  compatibility approach as the mandated conversion module. This preserves
  dashboard load order while allowing direct Node validation under the root
  package's CommonJS setting.
- No behavioral deviations from the approved scope. The manual-validation
  limitation is recorded above rather than represented as an interactive check.

### Unresolved risks

- Visual layout and pointer interaction on both dashboards remain for
  independent manual review because this environment has no browser-control
  harness.

### Documentation updated

- Updated this task's acceptance checklist and implementation handoff. No ADR,
  contract, architecture, or development-guide changes were required because
  the implementation follows the approved task and existing module patterns.

## Review

Independent review by Claude, 2026-08-31. **Accepted — no defects found.**

Method: read every new/changed file directly (`faserip-conversion.js`,
`faserip-sheet.js`, `system-registry.js`, `player-modal-utils.js`, and the
diffs to `dm-lists.js`, `player-characters.js`, both dashboard HTML files),
independently re-ran `npm test` (58/58, matches the handoff), and — since
this environment has no browser control here either — went one step
further than reading the source: loaded the actual shipped UMD scripts
(`ability-conversion.js`, `faserip-conversion.js`, `faserip-sheet.js`,
`system-registry.js`) into a real `jsdom` window in their real load order
and executed the actual picker → modal → sheet render flow end to end, the
same way TASK-015's review caught a real bug by executing shipped code
instead of trusting a read-through.

**Calculation correctness** — re-verified independently against the
*shipped* module (not a reimplementation): all three pinned sample
characters, including the corrected second sample (Karma 18), plus the
boundary anchors (`percentileToRank(0)=1`, `percentileToRank(100)=100`) and
rank-name lookups all match exactly. Also hand-traced a fourth,
review-only character (percentiles 59/45/41/38/31/24) through the anchor
table by hand and confirmed it against the module's actual output
(Health 53, Karma 18) — not just re-running the pinned samples, an
independent data point.

**The escalation itself was the right call.** The first implementation
attempt found a genuine internal contradiction in the acceptance
criteria (my own arithmetic error during planning: inconsistent rounding
of percentile 31 at the (24,5)–(33,6) anchor boundary between two
hand-calculated samples) and stopped to ask rather than silently picking a
number or guessing at intent — exactly the behavior
`docs/AI_DEVELOPMENT_SYSTEM.md` and `AGENTS.md` ask for ("escalate material
ambiguity... to the human," implementer "should avoid making architectural
decisions unless necessary"). I verified the correction (Karma 17→18) was
right before authorizing the second attempt; this review reconfirms it
independently again from the finished code, and it holds.

**End-to-end render flow** (via the `jsdom` harness described above,
using the real registry and render function, not stubs):
- The picker's `renderSystemPicker` output contains exactly one button
  (`FASERIP`) wired to `selectCharacterSystem(id, 'faserip')` — D&D is
  correctly absent from the registry, per the Excluded section.
- The rendered sheet correctly HTML-escapes the character name (tested
  with a deliberately hostile name containing `&`/`<`/`>` — confirmed
  `Test &amp; &lt;Hero&gt;` in the output, not the raw string).
- Confirmed via regex that the rendered sheet contains no `<input>`,
  `<select>`, `<textarea>`, or `contenteditable` — genuinely read-only, not
  just visually styled to look that way.
- The Health/Karma numbers embedded in the rendered HTML exactly match
  `computeFaseripCharacter`'s direct return value for the same character —
  the display path and the computation path haven't drifted apart from
  each other (this is precisely the class of bug TASK-015 had; confirmed
  absent here).

**Scope discipline**: `git status` confirms `ability-conversion.js` and
`dm-modal-utils.js` are unmodified — both correctly reused as-is, per the
Excluded section's explicit prohibition on touching them. No PDF, no dice
mechanic, no Popularity/Resources, no D&D registry entry — all absent, as
required. `player-modal-utils.js` is a faithful mirror of
`dm-modal-utils.js`'s shape, and `player-dashboard.html` gained the
matching `#modal-overlay`/`#modal-title`/`#modal-body` DOM it needs (the DM
dashboard already had the equivalent, confirmed present and unchanged).

**DM/player card-renderer uniqueness claim** (flagged as an open risk in
the task): independently grepped the whole `public/js` tree for character
card markup — `dm-lists.js` and `player-characters.js` are genuinely the
only two card renderers on their respective sides. The handoff's claim
checks out; the "View As..." button is not missing from some third render
path.

**Script load order**: `faserip-conversion.js` → `faserip-sheet.js` →
`system-registry.js` load as plain classic scripts, in dependency order,
before any `type="module"` script on both dashboards — correct, since
`system-registry.js` reads `root.FaseripSheet` and `faserip-sheet.js` reads
the global `FaseripConversion` at call time (not at parse time), so the
UMD IIFE ordering works the same way `ability-conversion.js` already
proved out.

No findings, blocking or otherwise. All nine acceptance criteria are
genuinely satisfied, independently re-verified against the shipped code
rather than taken on the implementer's word — including the one that
required fixing a mistake in the task file itself before implementation
could even proceed correctly.

## Human acceptance

Pending.
