# TASK-015: D&D 5e character sheet for players

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-08-31
Approved by: Patrick
Approved date: 2026-08-31
Related contracts: None
Related ADRs: ADR-003 (universal core attributes, from TASK-014)
Dependencies: TASK-014 (universal core attributes) — must be completed
first. This task's ability-score/modifier display goes through the
conversion module TASK-014 introduces; building this against the old
directly-stored 1–30 columns would mean redoing it once TASK-014 lands.

## Desired outcome

Players get a real, full D&D 5e character sheet that pre-fills from
existing character data and lets them fill in/edit the rest inline —
matching the classic sheet layout (reference:
`Samples/dnd-5e-fillable-character-sheet-us-letter.pdf`, a genuine fillable
AcroForm PDF with 552 named fields, confirmed via `pypdf`). Players can also
download a filled copy of that actual PDF for printing/off-app use.

## Context

Today's character view (`displayCharacterSheet` in
[player-characters.js](../../public/js/player/player-characters.js#L102-L204))
shows only raw ability scores/modifiers, Amber-specific attributes, and
gear/powers/familiars — no skills, saving throws, AC/HP/initiative, attacks,
spellcasting, currency, or personality/appearance detail. Most of that data
already exists in the schema and is already editable via the existing
tabbed edit modal
(`player-edit-basic-tabs.js`/`player-edit-gameplay-tabs.js`) — see
`CHARACTER_UPDATE_FIELDS` in
[fields.js](../../src/routes/characters/fields.js) for the full existing
list (skills, saves, spell slots, currency, languages, backstory, etc.).
What's missing is a proper sheet-shaped *view*, and a small amount of
genuinely absent data.

Two tables already exist that must be reused, not recreated:
`character_spells` and `character_feats`
([003-feature-tables.js:144-170](../../src/database/migrations/003-feature-tables.js#L144-L170)),
with a full shape (spell_name, spell_level, casting_time, range,
concentration, ritual, components, is_prepared, notes / feat_name,
feat_description, source, acquired_at_level).

The existing per-child-resource route pattern to follow is
[characters/gear.js](../../src/routes/characters/gear.js): `canModifyCharacter`
ownership check (from `./shared`), `collectUpdateFields` helper, mounted in
[characters/index.js](../../src/routes/characters/index.js#L193-L195), with
its list included in the `GET /api/characters/:id` response alongside `gear`
(index.js lines 46-68).

Confirmed decisions from planning discussion with the human:
- On-screen HTML sheet is the primary experience (styled consistently with
  the app's existing dark theme and `.ability-score` CSS in
  [player-dashboard.css](../../public/css/player-dashboard.css#L244-L270)),
  plus a "Download PDF" button that fills the real sample PDF client-side.
- Editing is inline click-to-edit directly on the sheet — no separate modal
  for this data. Saves go through the existing `PUT /api/characters/:id`.
- Scope is player-facing only. The DM's separate character view/editor
  (`dm-character-editor.js`) is untouched; reusing this sheet there is a
  reasonable future task, not part of this one.

## Scope

### Included

- **New data** (only what's genuinely missing):
  - `character_weapons (id, character_id, name, attack_bonus, damage_type,
    sort_order, created_at)` — no existing table covers an attacks list.
  - New `characters` columns: `age`, `height`, `weight`, `eyes`, `skin`,
    `hair` (physical description), `desires`, `fears`,
    `allies_organizations`, `treasure`. Add via a new guarded migration
    (`010-character-sheet-details.js`, following the same pattern as
    TASK-014's migration).
  - Add the new `characters` columns to `CHARACTER_UPDATE_FIELDS` in
    `fields.js`.
- **Routes**, mirroring `gear.js` exactly:
  - `src/routes/characters/weapons.js`:
    `POST/PUT/DELETE /:id/weapons[/:weaponId]`.
  - `src/routes/characters/spells.js`: CRUD against the existing
    `character_spells` table (verify whether feats already has equivalent
    routes anywhere before assuming spells needs its own from scratch — if
    not, this is the first).
  - Mount both in `characters/index.js`; include `weapons` and `spells`
    arrays in `GET /api/characters/:id`'s response next to `gear`.
- **Frontend**: new module `public/js/player/player-character-sheet.js`,
  loaded as a `<script type="module">` in
  [player-dashboard.html](../../public/player-dashboard.html) alongside the
  other `player-*` modules. It replaces the body of what `viewCharacter()`
  renders (currently `displayCharacterSheet`'s content) — same entry point,
  richer output. Existing `renderGearSection`/`renderPowersSection`/
  `renderFamiliarsSection` and the Amber-attributes block stay underneath
  the new sheet, unchanged.
  - Ability scores/modifiers/saves shown here go through TASK-014's
    conversion module (`src/utils/abilityConversion.js` or its frontend
    equivalent) — do not reintroduce a direct `floor((score-10)/2)` off the
    raw stored column.
  - Sections: header (name/class/level/background/alignment/species/XP/
    player name); six ability blocks (converted score, modifier, save
    bonus); 18 skills (bonus = modifier + proficiency bonus × the existing
    `skill_*` 0/1/2 encoding); combat box (AC, initiative = dex modifier +
    `initiative_bonus`, speed, HP current/max/temp, hit dice, death saves,
    passive perception = 10 + WIS skill bonus, proficiency bonus,
    inspiration); attacks (editable `character_weapons` rows); spellcasting
    (spellcasting ability, computed spell save DC = 8 + proficiency +
    ability modifier, computed spell attack bonus, existing spell slot
    columns, `character_spells` list with prepared toggle); equipment
    (currency, attunement slots, armor/weapon/tool proficiencies,
    languages); personality/appearance (new physical-description fields,
    `appearance`, `personality`, `desires`, `fears`,
    `allies_organizations`, `treasure`, `backstory`).
  - One `editableField(container, fieldName, value, type)` helper and one
    `editableList()` helper drive all inline click-to-edit interactions
    (reusing the `apiFetch` PUT pattern already in
    `player-edit-actions.js`) — not bespoke per-field handlers.
- **PDF export**: copy the sample PDF to
  `public/assets/dnd-5e-character-sheet-template.pdf`; add `pdf-lib` via a
  CDN `<script>` tag (this project has no bundler — every page-specific
  script is already a plain `<script type="module">` tag, so a CDN script
  is consistent, not a new pattern). New `downloadCharacterPdf(character)`
  function: fetch the template as `ArrayBuffer`, `PDFDocument.load()`, set
  each named text/checkbox field from the same computed values the
  on-screen sheet uses, trigger a browser download. Wire a "Download PDF"
  button into the sheet header.

### Excluded

- DM-side sheet/editor reuse (future task).
- Any non-D&D system's sheet.
- Claims integration.
- Full parity with every PDF box (e.g. the page-2 "Additional Features &
  Traits" box may stay blank on export) — the goal is a faithful, useful
  fill, not pixel-perfect coverage of all 552 fields; note in the handoff
  which fields were intentionally left unfilled.

## Plan

1. Confirm TASK-014 is completed and merged; import its conversion module
   rather than duplicating the formula.
2. Migration + `fields.js` update for the new columns and
   `character_weapons` table.
3. `weapons.js` / `spells.js` routes, mounted and included in the character
   GET response.
4. Build `player-character-sheet.js` section by section, verifying each
   computed value against hand-calculated D&D 5e math as it's built.
5. PDF export function and button, verified against the same computed
   values as step 4.
6. Full manual walkthrough (see Validation).

## Acceptance criteria

- [x] Viewing a character shows the full sheet: abilities, saves, all 18
      skills, combat box, attacks, spellcasting, equipment, personality/
      appearance — all pre-filled from existing data where it exists.
- [x] All computed values (modifiers, save bonuses, skill bonuses, AC-linked
      initiative, passive perception, spell save DC/attack bonus) match
      hand-calculated D&D 5e results for a real test character.
- [ ] Every field on the sheet is editable inline and persists after page
      reload. (Inline-edit mechanics and the underlying PUT round-trip are
      verified — see Re-review below — but an actual authenticated-browser
      edit-then-reload was not performed by either the implementer or this
      review. Lowest-risk of the open items; flagging rather than blocking.)
- [x] Weapons and spells can be added, edited, and removed from the sheet,
      and ownership is enforced (a player cannot edit another player's
      character's weapons/spells — verified the same way TASK-013's
      predecessor tasks verify ownership, e.g. the existing "claim
      allocation respects character ownership" test pattern in
      `tests/api.test.js`).
- [x] "Download PDF" produces a filled copy of the real sample PDF whose
      values match the on-screen sheet.
- [x] `npm test` passes, including new ownership tests for the weapons/
      spells endpoints.

## Validation requirements

- `npm test`.
- Manual browser walkthrough with a real character: verify every computed
  number by hand, edit several fields and confirm persistence after reload,
  add/remove a weapon and a spell, download the PDF and open it to confirm
  filled values match the screen.

## Risks and assumptions

- Depends entirely on TASK-014 landing first and correctly — if TASK-014's
  conversion module changes shape during its own review, this task's
  ability-score display code needs to follow.
- `pdf-lib` is a new third-party dependency (CDN-loaded, not npm) — flag if
  the human would rather it be an npm dependency bundled some other way;
  this task assumes CDN is fine given the project's existing no-bundler
  script-tag pattern.
- The PDF has 552 fields; this task fills the ones with a clear source in
  the data model and explicitly does not chase full 1:1 coverage — see
  Excluded.

## Blocker

None. (Not implementation-startable until TASK-014 is approved and
completed — see Dependencies.)

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-31

### Changes made

- Added guarded migration 010 with the ten approved character-detail columns,
  the new `character_weapons` table, and its character index. Added all ten
  detail columns to the character update allow-list.
- Verified that `character_feats` and `character_spells` existed but neither
  had CRUD routes. Added the requested owner/DM-protected weapons and spells
  CRUD subrouters, using `canModifyCharacter` and `collectUpdateFields`, and
  included both arrays in the single-character response. No feat routes or
  feat schema were added because they are outside this task's Included scope.
- Added the player-facing D&D sheet with inline scalar editing through one
  `editableField` helper and attacks/spells editing through one `editableList`
  helper. It renders the approved header, six abilities and saves, all 18
  skills, combat, attacks, spellcasting/slots, equipment/training, and
  personality/appearance sections while retaining the existing Amber, gear,
  powers, familiars, claims, and progress sections underneath.
- Added one shared `computedCharacter` model for the screen and PDF. All D&D
  ability scores and modifiers use `scoreFromPercentile`/`dndModifier` from
  `public/js/ability-conversion.js`; inline ability saves use
  `percentileFromScore`. Saves, skills, initiative, passive Perception, spell
  save DC, and spell attack bonus derive from those shared results.
- Copied the approved fillable PDF to
  `public/assets/dnd-5e-character-sheet-template.pdf`, loaded pdf-lib 1.17.1
  from jsDelivr, and added client-side filling/downloading from the same
  computed model used by the HTML sheet.
- Added migration/schema-matching coverage, concrete D&D computation coverage,
  and full owner/other-player/DM CRUD and ownership coverage for weapons and
  spells.

### Validation performed

- Ran `npm test`; all 52 tests passed (52 passed, 0 failed). New API coverage
  creates, fetches, updates, and deletes both resources; proves another player
  receives 403; and proves a DM can update a spell.
- The new frontend computation test hand-checks STR 18 with proficiency +3 as
  modifier +4/save +7; WIS 10 with Perception expertise as +6/passive 16; DEX
  14 plus initiative bonus 1 as +3; and INT 16 spellcasting as save DC 14 and
  attack +6.
- The new migration test applies migration 010 twice, confirms all ten detail
  columns and all seven required weapon columns, and verifies the second run
  is harmless.
- Ran Node syntax checks for the new frontend module, both route modules, and
  migration; all passed. Ran `git diff --check`; it reported no whitespace
  errors. Confirmed by grep that the new sheet contains no direct D&D modifier
  formula and routes every ability computation through the shared module.
- Confirmed the public PDF template is a byte-for-byte copy of the approved
  sample by performing the filesystem copy directly from `Samples/`.
- Did not perform the required interactive browser walkthrough or open a
  browser-generated PDF because this execution environment has no browser
  control harness. Those visual/persistence/export checks remain for review.

### Assumptions and deviations

- Used text storage for age, height, and weight exactly as the task listed
  column names without numeric units; this preserves values such as `27 years`,
  `5 ft 10 in`, and `165 lb` without inventing unit columns.
- The sheet treats stored `spell_save_dc`, `spell_attack_bonus`, and
  `passive_perception` as superseded display values: the approved sheet
  explicitly requires those values to be computed. Their contributing fields
  remain editable inline.
- Spell creation/editing uses the shared list interaction and prompts for the
  existing table's full descriptive shape; prepared state is also directly
  toggleable on the row. No table shape was changed.
- No implementation-scope deviation was made. The validation limitation above
  is reported rather than represented as a completed manual walkthrough.

### Unresolved risks

- Responsive visual layout, keyboard/pointer editing behavior, persistence
  after an actual page reload, CDN loading, and the browser-produced PDF still
  require the task's manual browser walkthrough.
- PDF field names were taken from the supplied AcroForm and missing/type-
  incompatible fields are skipped defensively. The actual rendered PDF should
  be visually checked in an independent reader.

### Documentation updated

- Updated this implementation handoff. No architecture or approved behavior
  outside TASK-015 changed, so no ADR or broader project documentation was
  added.
- Per the Excluded section, PDF export intentionally leaves the page-2
  `Additional Features and Traits` box unfilled. It also intentionally does
  not chase unsupported/unsourced template boxes: ammo counters, consumable
  and potion trackers, individual artisan-tool checkboxes, special-ability
  uses, racial-bonus boxes, max-spells-prepared, per-spell bonus boxes, and
  unused extra backstory/treasure continuations. Electrum has no corresponding
  named field in this PDF template. Gear is placed in the general Equipment
  field rather than attempting to classify it into every specialized magic-
  item/consumable box.

### Follow-up fix after independent review

- Corrected inline-field hydration so `ability` slots display the converted
  D&D score via `scoreFromPercentile`, matching edit mode, while all other
  field types retain their existing display behavior.
- Added a jsdom regression test that renders and binds the real sheet against a
  character whose stored Strength percentile is 59, then asserts the actual
  hydrated DOM displays 18 rather than 59. Repeated that DOM verification
  directly during the fix round; the full `npm test` suite passed 53/53.
- The fix is confined to ability-slot display hydration and its regression
  coverage. Weapons/spells routes, PDF export, and migration files were not
  changed, so the independently reviewed behavior in those areas is unaffected.

## Review

Independent review by Claude, 2026-08-31. **Changes requested — one
confirmed blocking defect.**

Method: read every changed/added file directly (`git diff` for the 9
modified tracked files, full read of the 5 new files) rather than trusting
the handoff. Independently re-ran `npm test` (52/52 passing, matches the
handoff). Booted the real dev server on a spare port and confirmed
migration 010 applies cleanly against the live database and all new
static assets (`player-character-sheet.js`, the PDF template) serve with
200. Cross-referenced every PDF field name the code references against the
actual template's 552 AcroForm fields via `pypdf` (see below). Since the
implementer's own handoff flagged that it could not perform an interactive
browser walkthrough, I went a level more rigorous than eyeballing a
screenshot: I loaded the real `player-character-sheet.js` module in `jsdom`
and executed `renderDndCharacterSheet()` + `bindDndCharacterSheet()`
against a real character object, then inspected the actual resulting DOM —
this directly executes the shipped code, not a re-implementation of it.

### Confirmed blocking finding: ability score box displays the raw stored percentile, not the D&D score

`activateInlineEditing()` (`player-character-sheet.js:70-73`) hydrates every
`[data-edit-slot]` placeholder by calling `editableField(slot,
slot.dataset.editSlot, character[slot.dataset.editSlot], ...)` —
passing the **raw stored value** straight through with no conversion.
`editableField()` (lines 50-60) then sets `element.textContent = ... (value
?? '—')` with no special case for `type === 'ability'`. So for the six
ability-score slots (`slot(key, 'ability')`, line 180), the number rendered
on the sheet is the character's raw stored percentile (e.g. `59`), not
`scoreFromPercentile(59)` (`18`) — even though the *modifier* right next to
it (`signed(computed.ability[key].modifier)`) and the *save* bonus are both
computed correctly, and even though clicking into edit mode on that same
field correctly shows and accepts the converted score (line 86:
`scoreFromPercentile(number(oldValue, 31))`) before converting back on save
(line 96: `percentileFromScore(value)`). Reproduced directly, not just read
from the source:

```
First ability box outerHTML:
<div class="ability-score dnd-ability">
    <div class="label">STR</div><div class="value">...<span ... data-type="ability" ...>59</span></div>
    <div class="modifier">+4</div>
    <div class="sheet-save">...+7 save</div>
</div>
```

(Character had `strength: 59` — the correct percentile for D&D score 18. The
box should read `18`, not `59`.)

This is exactly the class of bug this multi-task effort started from
earlier in the session (a displayed ability-related number silently wrong
because a conversion boundary was skipped) — here it's the static display
specifically, not the modifier math, which is why `computedCharacter()`'s
own unit tests (which only assert on the computation function's return
value, never on rendered DOM text) didn't catch it, and why the PDF export
path is unaffected (`downloadCharacterPdf` correctly uses
`computed.ability[key].score`, i.e. it goes through `computedCharacter()`
rather than reading `character[key]` directly). A player using the actual
sheet today would see their Strength score rendered as a percentile
(0–100) instead of a D&D score (1–30), which is the single most visible
number on the whole sheet.

Fix shape (not applied — reviewers record findings, they don't implement
fixes, per `docs/workflow/lifecycle.md`): `activateInlineEditing()` needs
to pass `scoreFromPercentile(character[slot.dataset.editSlot])` instead of
the raw value when `slot.dataset.editType === 'ability'`, mirroring what
the edit-mode branch already does correctly.

### Everything else checked out

- **Computation formulas** (`computedCharacter()`): independently
  hand-verified every formula against real D&D 5e rules — save bonus
  (modifier + proficiency × 0/1 flag), skill bonus (modifier + proficiency ×
  0/1/2, correctly doubling for expertise), passive perception (10 +
  Perception bonus), initiative (DEX modifier + misc bonus), spell save DC
  (8 + proficiency + spellcasting modifier), spell attack bonus
  (proficiency + spellcasting modifier) — all correct. The new
  `frontend-modules.test.js` case exercises a realistic multi-field example
  (STR 18/DEX 14/INT 16 with proficiency 3) and I re-derived its expected
  numbers by hand; they're right.
- **Weapons/spells routes** (`weapons.js`/`spells.js`): correctly mirror
  `gear.js`'s ownership pattern (`canModifyCharacter`, 404-before-403
  ordering, `collectUpdateFields`), correctly mounted and included in the
  character GET response. The new ownership test
  (`tests/api.test.js`, "weapon and spell CRUD is restricted to the
  character owner or DM") is a real end-to-end check, not a mock — it
  exercises create/read/cross-player-403/DM-edit/delete for both resources
  against the live test server.
- **Migration 010**: idempotent (guarded `ALTER TABLE` + `CREATE TABLE IF
  NOT EXISTS`, tested by calling `up()` twice), matches the task's approved
  column list exactly, ran cleanly against the real dev database
  (confirmed live — see below).
- **`character_spells`/`character_feats` reuse**: confirmed no new spell
  table was created and the existing schema's exact column shape
  (`spell_name`, `spell_level`, `casting_time`, `concentration`, `ritual`,
  `is_prepared`, etc.) is used as-is. Confirmed the handoff's claim that
  `character_feats` has no CRUD routes anywhere in the repo (grepped) — so
  correctly out of scope per the task's Excluded section, not a missed spot.
- **PDF export field-name accuracy**: this is the part I trusted least
  going in (552 fields, easy to get subtly wrong with a silent `catch {}`
  swallowing mismatches), so I verified it exhaustively rather than
  sampling. Extracted every literal/templated field name the code
  constructs (162 once ability/skill/level/weapon templates are expanded
  against their real value sets) and diffed them against the actual
  template's field list via `pypdf` — **all 162 exist in the real PDF**,
  and I spot-checked field *types* too (`Level 1 Prepared 1` and
  `Acrobatics Proficiency`/`Expertise`/`Death Success 1` are genuinely
  `/Btn` fields, matched with `setCheck`; `Cantrip 1`/`Acrobatics Score` are
  genuinely `/Tx` fields, matched with `setText`). This was clearly
  researched against the real template, not guessed.
- **Live database**: booted the real dev server, confirmed migration 010
  applied without error against the already-migrated (TASK-014) production
  data, and all new static assets served correctly.
- **Scope discipline**: independently confirmed against the Excluded
  section — no DM-side sheet changes, no non-D&D system, no Claims
  integration, and the documented list of intentionally-unfilled PDF boxes
  (page-2 Additional Features & Traits, ammo counters, consumable trackers,
  etc.) matches what's actually missing from the code, not just claimed.

### Unresolved risks (carried from the handoff, still genuinely unresolved)

- Responsive/visual layout and pointer-driven editing were not exercised in
  a real browser by either the implementer or this review (I verified the
  rendering logic directly via `jsdom`, which is more precise for
  correctness but doesn't substitute for eyes-on layout/CSS review).
- The `prompt()`/`confirm()`-based add/edit flow for weapons and spells
  (`promptWeapon`/`promptSpell`) is functional but worth a human UX look —
  it works, but a sequence of native browser prompts for a 7-field spell is
  a rough editing experience compared to the rest of the sheet's inline
  click-to-edit pattern. Not a defect against any acceptance criterion
  (the task didn't specify the add/edit UI's shape beyond "editable"), just
  worth the human's eyes.

### Verdict

Not accepted as-is. The ability-score display defect directly contradicts
acceptance criteria 1 and 2 (neither is checked, correctly, by the
implementer) — this is the single most visible number on the sheet and is
currently wrong for every character. Recommend sending back to the
implementer for a one-line-shaped fix, then a fast re-review focused on
just that change plus an actual browser screenshot, before this moves
toward acceptance.

### Re-review after fix, Claude, 2026-08-31

The implementer's fix round is exactly what was asked: `activateInlineEditing()`
now computes `displayValue = type === 'ability' ? scoreFromPercentile(number(storedValue, 31)) : storedValue`
before handing it to `editableField()`, so ability slots display the
converted score everywhere else already did. Re-ran the identical `jsdom`
reproduction from the original finding against the fixed code (not just
re-read the diff): the same character that previously rendered `59` for
Strength now renders `18`. The new regression test
(`tests/frontend-modules.test.js`, "D&D sheet displays converted ability
scores after inline fields are bound") renders and binds the real sheet and
asserts the hydrated DOM text equals `'18'` and explicitly *not*
`String(character.strength)` — that's a real guard against this exact class
of bug recurring, not a rewrite of the computation test that already
existed. Independently re-ran `npm test`: 53/53 (up from 52 — the one new
test). Confirmed the fix's diff is confined to `activateInlineEditing()` and
its new test; `weapons.js`, `spells.js`, migration 010, and
`downloadCharacterPdf()` are untouched, so nothing already verified needed
re-checking from scratch.

Went one step further than the original review on the PDF export
criterion, since it was the one item I'd only verified by field-name/type
matching rather than an actual filled document: installed `pdf-lib@1.17.1`
in a scratch directory, ran the real `computedCharacter()` from the shipped
module against a full realistic character (abilities, saves, skills
including one at expertise, a weapon, prepared/cantrip spells, death saves,
currency), filled the actual template PDF with it end-to-end, and read the
output back with `pypdf`. Every value landed correctly, including the
STR 59→18 conversion in the PDF's own `Strength Ability Score` field, the
Athletics expertise double-proficiency math (+10, both Proficiency and
Expertise checked), passive perception (15, matching 10 + computed
Perception bonus), and the cantrip/leveled-spell split (`Cantrip 1` vs
`Level 1 Spell 1`). This closes the one criterion the original review
couldn't fully close without generating a real file.

The remaining open item (inline edits surviving an actual page reload in a
real authenticated browser session) is unchanged from the original review
— still genuinely unverified by either the implementer or this review,
still the lowest-risk of the gaps given the PUT mechanism itself is
exercised by other passing tests, and now the only thing standing between
this task and full acceptance criteria satisfaction.

**Verdict: accept, with one disclosed gap.** The blocking defect is fixed
and independently confirmed via direct execution (not just re-reading the
diff), the PDF path is now verified end-to-end rather than by inference,
and nothing else regressed. Recommend the human do a quick real-browser
click-through (open a character, edit a field, reload, confirm it stuck)
before or shortly after marking this accepted — not because anything found
so far suggests it's broken, but because it's the one criterion no one has
actually watched happen in a browser yet.

## Human acceptance

Pending.
