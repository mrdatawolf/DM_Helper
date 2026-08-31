# TASK-015: D&D 5e character sheet for players

Owner role: Implementer
Assigned agent: TBD
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

- [ ] Viewing a character shows the full sheet: abilities, saves, all 18
      skills, combat box, attacks, spellcasting, equipment, personality/
      appearance — all pre-filled from existing data where it exists.
- [ ] All computed values (modifiers, save bonuses, skill bonuses, AC-linked
      initiative, passive perception, spell save DC/attack bonus) match
      hand-calculated D&D 5e results for a real test character.
- [ ] Every field on the sheet is editable inline and persists after page
      reload.
- [ ] Weapons and spells can be added, edited, and removed from the sheet,
      and ownership is enforced (a player cannot edit another player's
      character's weapons/spells — verified the same way TASK-013's
      predecessor tasks verify ownership, e.g. the existing "claim
      allocation respects character ownership" test pattern in
      `tests/api.test.js`).
- [ ] "Download PDF" produces a filled copy of the real sample PDF whose
      values match the on-screen sheet.
- [ ] `npm test` passes, including new ownership tests for the weapons/
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

Not started.

## Review

Not reviewed.

## Human acceptance

Pending.
