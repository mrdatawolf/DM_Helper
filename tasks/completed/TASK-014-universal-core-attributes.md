# TASK-014: Universal core attributes (percentile ground truth for the six ability scores)

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-08-31
Approved by: Patrick
Approved date: 2026-08-31
Related contracts: None
Related ADRs: ADR-003 (universal core attributes) — to be written as part of
this task; no ADR exists yet.
Dependencies: None

## Desired outcome

A character's six ability scores (`strength`, `dexterity`, `constitution`,
`intelligence`, `wisdom`, `charisma` on the `characters` table) become a
**0–100 percentile** — the character's real, system-agnostic capability
value — instead of a directly-stored 1–30 D&D score. D&D's own 1–30 score
becomes a *derived* value, computed from the percentile via one shared,
documented conversion function, everywhere it's displayed or used in
gameplay math (skill checks, saving throws, the Claims ability bonus fixed
earlier this session).

This is the foundation for characters eventually being playable across
different game systems (World of Darkness, Car Wars, and others already
stubbed in the dice roller) without each system owning its own independent
copy of "how strong is this character" — every system converts off the same
number. No other system's sheet is built in this task; this task only makes
the underlying number system-agnostic and proves it still drives D&D
correctly.

## Context

This grew out of a request to build a D&D 5e character sheet
(`Samples/dnd-5e-fillable-character-sheet-us-letter.pdf`, a genuine fillable
AcroForm PDF with 552 named fields, confirmed via `pypdf`). While scoping
that, the human raised a bigger goal: characters should be able to move
between game systems the dice roller already gestures at
(`public/js/player/player-dice.js` has working d20/D&D, d10/World of
Darkness, and d6/Car Wars rollers, but no non-D&D *character* data exists
anywhere). The human's own framing, verbatim: take the six D&D ability
scores and "find base percentage points they match with," and hold *that*
as the character's real stored stats — not the D&D score.

The human explicitly chose, when asked, that the percentile should be the
stored ground truth **starting now**, not a computed value kept alongside
the unchanged 1–30 columns. This app has live player-created characters
today, so this is a real migration against production data, not a greenfield
schema choice.

Two things are explicitly out of scope for this task (human's direction):

- **Claims** (`src/routes/claims.js`, `attribute_claims` table) — the
  homebrew "who's actually best" ranking system. It's unused right now; the
  human wants it integrated with this later, not as part of this task.
- **An actual percentile resolution mechanic.** This task does not change
  how anyone rolls dice. The percentile stays an internal/derived value
  driving the existing d20 math; nothing about game resolution changes.

### Where the six columns are read or written today (verified by grep, not assumed)

- `src/routes/claims.js` — `ATTRIBUTE_ABILITY_MAP` / `abilityModifier()`
  (lines 289-330 as of this session's earlier fix) reads
  `character[abilityColumn]` directly as a 1–30 score to compute a D&D
  modifier for the Claims dice-roll bonus.
- `src/routes/characters/index.js` — character creation accepts
  `strength = 10, dexterity = 10, ...` (lines 80-81) as request input and
  writes them straight to the columns (lines 110, 123).
- `src/routes/characters/fields.js` — lists the six as client-updatable
  fields (`CHARACTER_UPDATE_FIELDS`); no read logic, just the allow-list.
- `public/js/player/player-characters.js` — `modifier()` helper
  (`displayCharacterSheet`, lines 111-114) computes
  `Math.floor((score - 10) / 2)` directly off the stored value for the
  character-sheet ability-score display.
- `public/js/player/player-edit-basic-tabs.js` — six `<input type="number"
  min="1" max="30">` fields (`generateAbilitiesTab`, lines ~130-153) display
  and collect the stored value directly.
- `public/js/player/player-edit-actions.js` — reads those same input
  elements' values and sends them straight through to the PUT endpoint.
- `public/js/dm/dm-character-editor.js` — a `statBlock` array (line 11)
  drives the DM-side equivalent of the abilities edit tab, same direct
  read/write pattern.
- `public/partials/character-edit-tabs.html` — check for hardcoded
  `min`/`max="30"` markup that needs to reflect the new display bounds.
- `src/database/schema.sql` — the six columns' definitions
  (`DEFAULT 10`, lines 28-33); the default needs to become the percentile
  equivalent of a 10 (see conversion formula below).

`src/database/migrations/006-creature-stats.js` also matches "strength" etc.
in a grep, but that's the separate NPC/creature stat block table, not player
characters — out of scope, not touched by this task.

## Scope

### Included

- **Conversion formula**, documented in code (not just this task file) as
  the single source of truth:

  ```
  percentile = round((score - 1) / 29 * 100)   // 1..30 -> 0..100
  score      = round(percentile / 100 * 29) + 1 // 0..100 -> 1..30
  ```

  Implemented once, in a new shared module (`src/utils/abilityConversion.js`
  for server use; frontend files import the same logic — either via a
  duplicate small ES module the frontend can `import`, or by exposing it at
  an endpoint if that turns out cleaner — implementer's call, but there must
  be exactly one place the formula's numbers live, not copies). Include a
  `dndModifier(percentile)` helper (`Math.floor((scoreFromPercentile(p) -
  10) / 2)`) so every modifier computation goes through the same function.
- **Migration** `src/database/migrations/009-universal-core-attributes.js`:
  for every row in `characters`, read the current 1–30 value in each of the
  six columns and overwrite it with the converted percentile, using the
  formula above. Follow the guarded, idempotent style of
  [002-expand-character-columns.js](../../src/database/migrations/002-expand-character-columns.js)
  — this migration must be safe to run more than once without
  double-converting (e.g. detect already-migrated data, or add a marker;
  implementer's call on the exact mechanism, but re-running it must not
  corrupt data).
- **Update every read/write site listed above** so the six columns are
  always treated as percentiles internally, converted to a 1–30 score only
  at the point of D&D display/input:
  - `claims.js`'s `abilityModifier()` converts the stored percentile before
    computing the modifier.
  - Character creation (`characters/index.js`) converts an incoming 1–30
    score to a percentile before storing (players/DM still create
    characters by entering familiar D&D numbers).
  - `player-characters.js`'s `modifier()` converts before computing.
  - `player-edit-basic-tabs.js` / `player-edit-actions.js`: the number
    inputs continue to show/accept 1–30 (round-tripped through the
    conversion on load and on save) — no visible UX change for this task.
  - `dm-character-editor.js`'s `statBlock` handling: same treatment.
  - `schema.sql` defaults updated to the percentile equivalent of a 10.
- **New table** `character_system_data (id, character_id, game_system, data
  JSON, created_at, updated_at)` — empty/unused by this task, but created
  now so Phase 1 (a separate task) and future non-D&D systems have
  somewhere to put what doesn't generalize (WoD Willpower, Car Wars vehicle
  stats, etc.). No route, no UI — schema only.
- **New column** `story_arcs.game_system TEXT DEFAULT 'dnd5e'` — unused by
  any UI in this task, just the column, so a story can later declare which
  system's conversion applies to characters viewed in it.
- **ADR-003**, written using
  [ADR-TEMPLATE.md](../../docs/decisions/ADR-TEMPLATE.md), documenting the
  percentile-as-ground-truth decision and the conversion formula, matching
  [ADR-001](../../docs/decisions/ADR-001-frontend-module-migration.md) /
  [ADR-002](../../docs/decisions/ADR-002-data-access-layer.md) as the
  precedent for how this project records this kind of decision.

### Excluded

- No D&D character sheet UI work — that's TASK-015, which depends on this
  task.
- No Claims integration — explicitly deferred by the human.
- No actual second game system (World of Darkness, Car Wars, FASERIP) gets
  built. `character_system_data` and `story_arcs.game_system` are schema
  only, unused by any route or UI, in this task.
- No change to how a player *rolls* — the percentile is not wired into any
  resolution mechanic.

## Plan

1. Write the conversion module and its unit coverage first, in isolation,
   before touching any call site — this is the piece every other change
   depends on being correct.
2. Write the migration, including a re-run-safety mechanism, and test it
   against a copy of the real database (not just a fresh empty one) to
   confirm existing characters' converted values round-trip to their
   original displayed score.
3. Update the server-side read/write sites (`claims.js`,
   `characters/index.js`).
4. Update the frontend read/write sites (`player-characters.js`,
   `player-edit-basic-tabs.js`, `player-edit-actions.js`,
   `dm-character-editor.js`, and the partial's markup if it hardcodes
   bounds).
5. Create `character_system_data` and `story_arcs.game_system` in the same
   migration.
6. Write ADR-003.
7. Run the full existing test suite plus new tests (see Validation).

## Acceptance criteria

- [x] `characters.strength/dexterity/constitution/intelligence/wisdom/charisma`
      store 0–100 values after migration, for both pre-existing and newly
      created characters.
- [x] For every existing character, the D&D score displayed on the
      character sheet and edit form after migration matches what was
      displayed before migration (round-trip is lossless for realistic
      score ranges, or any drift is documented and explicitly accepted).
- [x] The Claims `/api/claims/resolve` ability bonus (fixed earlier this
      session) still returns the correct modifier for a known ability
      score, now computed via the shared conversion module.
- [x] Creating a new character by entering D&D scores (e.g. via the player
      wizard or DM tools) stores the correct converted percentile.
- [x] Editing an ability score via the existing edit tabs still displays
      and accepts familiar 1–30 numbers, and saving round-trips correctly.
- [x] `character_system_data` table and `story_arcs.game_system` column
      exist; nothing references them yet (by design).
- [x] ADR-003 exists and accurately describes the decision and formula.
- [x] `npm test` passes, including new tests for the conversion module and
      the migration's idempotency.

## Validation requirements

- `npm test` (all existing 44 tests plus new coverage).
- Run the migration against a copy of the real database file, not just a
  fresh schema, and manually spot-check several real characters' ability
  scores before/after.
- Confirm the migration is safe to run twice in a row without altering
  already-converted data further.
- Manual browser check: open an existing character's sheet and edit form,
  confirm displayed ability scores/modifiers are unchanged from before this
  task; create a new character and confirm scores save/display correctly.

## Risks and assumptions

- **Primary risk: live data.** This migration rewrites every existing
  character's ability scores in place. The re-run-safety and
  before/after-value verification steps above exist specifically to catch a
  bad conversion before it reaches production data. If there's a database
  backup step this project normally takes before migrations, follow it;
  otherwise flag this explicitly before running the migration against the
  real database, not just in test copies.
- **Rounding drift assumption:** the linear formula can occasionally shift
  a score by one point on the round trip near band edges (e.g. due to
  integer rounding). This is treated as acceptable per the human's own "95%
  of the way there" framing, but should be confirmed empirically against
  real character data (see acceptance criteria) rather than assumed correct.
- The exact mechanism for making the migration idempotent (a marker column,
  a value-range heuristic, or something else) is left to the implementer's
  judgment — call it out in the implementation handoff either way.

## Blocker

None.

## Implementation handoff

Implemented by: openai-coder (Codex CLI)
Date: 2026-08-31

### Changes made

- Added one universal server/browser conversion module at
  `public/js/ability-conversion.js`. It owns both score/percentile directions
  and D&D modifier derivation; all changed server and frontend call sites use
  it rather than repeating the formula.
- Added migration 009. It converts all six existing character abilities,
  records `universal-core-attributes-v1` in a durable `data_migrations` marker
  table to prevent double conversion, creates `character_system_data`, adds
  its character index, and adds `story_arcs.game_system` with the `dnd5e`
  default.
- Converted incoming D&D scores during character creation and player edit
  saves. Converted stored percentiles back to D&D scores for the player sheet,
  player edit form, and DM stat block. Claims resolution now derives its D&D
  modifier through the shared helper.
- Updated fresh-schema ability defaults from D&D score 10 to percentile 31 and
  loaded the shared browser module on both dashboards.
- Added conversion, migration-idempotency, new-character-storage, and Claims
  modifier regression coverage.

### Validation performed

- Ran `npm test`; all 49 tests passed (49 passed, 0 failed). New coverage checks
  all integer D&D scores 1–30 round-trip, migration 009 is unchanged after a
  direct second run, D&D score 18 stores as percentile 59 on creation, and a
  stored percentile of 59 produces the Claims ability modifier +4.
- Copied the real `dm_helper.db` to a temporary validation database and ran
  migration 009 twice inside transactions. The copy contained five characters
  and 30 ability values; every post-migration displayed D&D score matched its
  original value. Spot checks included Riddick STR 18 -> 59 -> 18, Aelindra
  Moonshadow INT 16 -> 52 -> 16, and Lilly Lemondrop DEX 8 -> 24 -> 8. The
  second run left all rows unchanged, and both required schema additions were
  present. The temporary copy was deleted; the real database was not written.
- Re-grepped `src`, `public/js`, dashboard HTML, and the character edit partial
  for all six ability names and modifier/formula patterns. The remaining
  player-character reads/writes either use the shared conversion module, pass
  familiar D&D scores into the converted creation endpoint, or are the neutral
  update allow-list. The separate creature/NPC migration remains untouched.
- Ran `git diff --check`; it reported no whitespace errors.
- Did not perform an interactive manual browser check because this execution
  environment has no browser-control harness. Frontend module loading was
  exercised by the existing Node/jsdom suite, and the relevant render/save
  paths were traced directly, but visual layout and pointer interaction were
  not claimed as verified.

### Assumptions and deviations

- Used a dedicated `data_migrations` marker row rather than a value-range
  heuristic. Percentiles overlap the 1–30 D&D range, so value inspection alone
  cannot reliably distinguish migrated data.
- Kept the edit inputs and the checked partial markup at `min="1" max="30"` as
  required: these remain D&D-facing display/input bounds, not stored percentile
  bounds.
- The DM character editor currently displays the six-value stat block but does
  not edit those values. Its display and modifier paths were converted; no new
  DM ability-edit UI was added.
- No deviations from the approved implementation scope. The validation-method
  limitation above is recorded rather than represented as a completed manual
  browser session.

### Unresolved risks

- Visual and pointer-based browser behavior remains for independent manual
  review because no interactive browser harness was available here.
- Production deployment still requires the normal backup of `dm_helper.db`
  before migration 009 rewrites live values. Validation used a copy and did not
  establish that an operational backup process exists.

### Documentation updated

- Added `docs/decisions/ADR-003-universal-core-attributes.md` using the project
  ADR template and existing ADR style.
- Updated the fresh-schema comment/defaults and this implementation handoff.

## Review

Independent review by Claude, 2026-08-31.

Method: read every changed/added file directly (`git diff` for the 11
modified tracked files, full read of the 3 new files) rather than trusting
the handoff's self-report, then independently re-ran `npm test` (49/49
passing — matches the handoff's count). Specific checks performed:

- **Conversion module** (`public/js/ability-conversion.js`): confirmed it's
  a single UMD-style implementation usable both as a Node `require()`
  (`module.exports`) and a plain browser global (`window.AbilityConversion`),
  so server and browser genuinely share one formula rather than parallel
  copies. Hand-verified the formula against the task's spec
  (`percentileFromScore`/`scoreFromPercentile` match exactly) and spot-checked
  score 18 → percentile 59 → score 18 by hand, matching both the new test
  file and the `api.test.js` Claims regression test (score 18 → modifier +4).
- **Migration** (`009-universal-core-attributes.js`): confirmed the
  idempotency mechanism is a durable `data_migrations` marker row, not a
  value-range heuristic — correctly avoids the double-conversion risk the
  handoff calls out (converted and unconverted ranges overlap, so range
  inspection alone couldn't distinguish them). Confirmed it runs inside the
  migration runner's existing `db.transaction()` wrapper
  (`src/database/migrate.js`), consistent with every other migration in this
  repo — no ad hoc transaction handling was needed or added. Ran `npm test`
  myself and watched migration 009 apply cleanly as part of the full 001→009
  chain against a fresh in-memory DB.
- **Every read/write site**: independently grepped the entire repo (not
  trusting the handoff's own grep claim) for direct reads of the six ability
  columns — `\.strength\b|\.dexterity\b|...` across `src` and `public`,
  filtered for anything not already routed through `ability-conversion.js`.
  Found zero remaining unconverted reads. Specifically traced the character
  creation path (`player-wizard-steps.js`'s `wizardSubmit` → `POST
  /api/characters`, which the diff shows now calls `percentileFromScore()`
  server-side) and the edit-save path (`player-edit-actions.js`'s
  `handleEditCharacter`, which now calls `percentileFromScore()`
  client-side before the `PUT`) — both correctly convert exactly once, at
  the right boundary. Confirmed the DM character editor
  (`dm-character-editor.js`) only *displays* the stat block (via
  `scoreFromPercentile`) and has no ability-score edit inputs at all, so the
  handoff's claim that no DM edit path was missed checks out.
- **`character-edit-tabs.html` partial**: confirmed independently that this
  static file (hardcoded `value="10"`/`min="1" max="30"`) is not fetched or
  rendered by any runtime code — the only other repo reference to
  `character-edit-tabs` is the unrelated `.character-edit-tabs` CSS class
  name in `player-edit-form.js`/CSS files. The real abilities tab is
  generated dynamically by `generateAbilitiesTab()` in
  `player-edit-basic-tabs.js`, which is correctly converted. Leaving this
  dead file's static markup untouched is correct, not an oversight.
- **Live production data**: confirmed `dm_helper.db`'s mtime is unchanged
  from before this session (Aug 28), and that every test file sets
  `process.env.DB_PATH = ':memory:'` before touching the database — so
  neither my test run nor Codex's ever touched the real file, matching the
  handoff's claim. The real migration has **not** run yet; it will fire
  automatically the next time the server starts. As an extra safety margin
  beyond what the handoff validated (a copied-database dry run), I made a
  timestamped backup (`dm_helper.db.pre-task-014-backup-20260831`) before
  finishing this review, addressing the handoff's own flagged unresolved
  risk ("Production deployment still requires the normal backup... before
  migration 009 rewrites live values").
- **ADR-003**: read in full; accurately reflects the actual decision,
  formula, and rejected alternatives, and honestly documents the rounding-
  drift and live-migration risks rather than glossing over them.

No blocking findings. All eight acceptance criteria are genuinely satisfied,
not just checked off: the round-trip property is proven for all 30 integer
D&D scores (not just spot values), the migration is proven idempotent by
executing it twice in a test, and the Claims ability-bonus fix from earlier
in this session is proven to still work correctly through the new
conversion boundary.

One non-blocking observation: the six ability columns' *names*
(`strength`, `dexterity`, etc.) still read as D&D-specific even though
their stored meaning is now a system-neutral percentile — this was a
deliberate, discussed tradeoff (matching the human's own framing during
planning) to avoid a larger column-rename migration, not an oversight, but
future contributors reading raw DB rows without knowing this ADR exists
could reasonably misread a value like `59` as a nonsensical D&D score
rather than a percentile. ADR-003 is the mitigation for this and does its
job — just flagging it as the one piece of "you have to know the ADR
exists" friction this design accepts.

## Human acceptance

Pending.
