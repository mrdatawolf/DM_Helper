# TASK-039: Add the Shelvar beasts to the Creature Index and database

Owner role: Implementer
Assigned agent: Claude
Proposed by: Claude
Proposed date: 2026-09-21
Approved by: Patrick (approved in chat: "Treat this request as approval")
Approved date: 2026-09-21
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

The six creatures in `Samples/Shorven_Beasts.md` exist as D&D 5e / Amber
creatures: a `Creature Index/Shelvar.md` file following `TEMPLATE.md`, and NPC
rows seeded into campaign 1 by a new migration, matching how the Billabong's
Veil and Soul Realm creatures were done.

## Scope

### Included
- `Creature Index/Shelvar.md` (six stat blocks).
- Migration `016-shelvar-beasts.js` seeding the same six as `npcs`.
- A test for the migration.

### Excluded
- Creating a "Shelvar" shadow (rows link to one only if it already exists).
- UI changes; new role values.

## Plan
1. Convert each creature: fill missing ability scores, CR, senses, languages;
   rewrite shorthand attacks into full 5e attack lines; pick Order/Chaos and
   Influence from each creature's flavor.
2. Write the index file, then the migration mirroring 006, setting
   `campaign_id = 1` (required since migration 013).
3. Test idempotency and field values.

## Acceptance criteria

- [x] Six creatures in `Creature Index/Shelvar.md` per TEMPLATE.md.
- [x] Migration seeds them once, into campaign 1, with JSON stats.
- [x] Tests pass.

## Validation requirements
`npm test`.

## Risks and assumptions
- Source has no Order/Chaos, Influence, CR, senses or languages; values are
  Claude's proposals for the DM to adjust.

## Blocker (resolved 2026-09-29)

`better-sqlite3` (and `bcrypt`) install scripts were blocked by npm's
`allowScripts` policy. Patrick approved both (`npm install-scripts approve`)
and the bindings were rebuilt; tests now run.

## Implementation handoff

Added `Creature Index/Shelvar.md`, `src/database/migrations/016-shelvar-beasts.js`
(seeds six NPCs into campaign 1, idempotent, links to a "Shelvar" shadow only if
one exists) and `tests/shelvar-beasts.test.js`.

Conversion notes / deviations from the source:
- Added missing ability scores, CR, senses, languages, skills, and attack bonuses
  (proficiency by CR; ability mods per stat block). Source save DCs kept as written.
- Verdant Crown Serpent HP 135 -> 133 so it matches 14d12 + 42 (CON +3).
- Grove Guardian (Serpent) and Echo-Howl / Amber Pulse / Sapheart Roar were made
  explicit actions with recharge/area/save details the source left open.
- Sap Burst's "1/day" dropped (it triggers once, on death). Wisp-Moth kept Small
  size per its stat line, though the flavor text says "large moth".
- Roles use the existing UI list: apex beasts = Predator, corrupted = Monster.
- Order/Chaos and Influence are proposals (Influence None for all).

Validated (2026-09-29):
- `npm test`: 125 pass, 0 fail (includes the 3 tests in
  `tests/shelvar-beasts.test.js`).
- Ran all migrations twice against a scratch copy of the prod DB
  (`Samples/dm_helper.db`): npcs 8 -> 14, second run added nothing,
  `foreign_key_check` clean. Prod has a "Shelvar" shadow (id 24), so all six
  rows linked to it, in campaign 1.
