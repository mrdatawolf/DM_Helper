# TASK-025: Extract Amber into the reference Universe plugin

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins).
Dependencies: TASK-022 (campaigns table with `universe_id`); TASK-024 (the
shared namespaced extension-data mechanism this task populates with a
`universe:amber` namespace).

## Desired outcome

Amber-specific lore — currently hardcoded across schema columns, seed data,
and static content files — becomes the **reference Universe plugin**
(`universe:amber`), built on the same namespaced extension-data mechanism
TASK-024 introduced for systems. `campaigns.universe_id` becomes live: a
campaign with `universe_id = 'amber'` gets Amber's lore-specific character
attributes, guide content, and seed shadows/NPCs; a campaign with no universe
(homebrew) gets none of it, rather than Amber content being unconditionally
present for every campaign as it is today.

## Context

Amber-specific content is spread across several layers, all confirmed by
direct inspection (see Explore research from this planning session):

- **Schema**: `characters`' "Amber-Specific Attributes" block
  (`shadow_origin_id`, `blood_purity` with a `CHECK ('Pure','Half','None')`,
  `order_chaos_value`), "Pattern/Logrus Powers" (`pattern_imprint`,
  `logrus_imprint`, `pattern_mastery_level`, `logrus_mastery_level`), "Trump
  Powers", and "Additional Amber Attributes" (`pattern_type`, `amber_flaws`,
  `amber_traits`, `broken_imprint`) — all in `src/database/schema.sql`'s
  `characters` table (~lines 137-160). `shadows.pattern_influence` has an
  Amber-only `CHECK(... IN ('Pattern','Argent Refrain','Logrus','Mixed',
  'None','Nexus'))` (~lines 4-21).
- **Seed/lore data**: the 11 named canonical Amber shadows seeded in
  `src/database/init-db.js` / `src/database/legacy/add-canonical-shadows.js`;
  the Primal Patterns lore system (`src/database/migrations/
  008-primal-pattern-category.js` and its dedicated tables).
- **Content**: `public/PLAYER_GUIDE.md` (571 lines, 100% Amber rules prose —
  Order/Chaos, Shadows, Pattern/Logrus, Argent Refrain, Attribute Claims),
  served as-is by `public/guide.html`; `public/js/player/player-wizard-data.js`
  (368 lines of Amber narrative flavor text driving the character-creation
  wizard's imprint/race/order-chaos choices).
- **Routes/UI specifically shaped for Amber**: `src/routes/primal-patterns.js`,
  `src/routes/claims.js` (`ATTRIBUTE_CLAIMS_SYSTEM.md`),
  `public/js/dm/dm-primal-pattern-lore.js`, `dm-primal-pattern-actions.js`,
  `dm-story-arc-editor.js`.

TASK-024 will have generalized `character_system_data` into a namespaced
`character_extension_data` (or equivalent) mechanism shared by both system and
universe axes. This task is the second real consumer of that mechanism (after
`system:dnd5e`), proving it genuinely works for an axis orthogonal to game
system, per ADR-005's decision that System and Universe are fully independent.

## Scope

### Included

- Migrate Amber's lore-specific `characters` columns (blood purity, pattern/
  logrus imprints and mastery, trump powers, Amber flaws/traits) out of
  `characters` into `universe:amber` extension data, for every existing
  character — live-data migration, same rigor as TASK-024/ADR-003 (backup,
  copy-first validation, idempotency).
- Move `shadows.pattern_influence`'s Amber-only `CHECK` constraint enforcement
  to the universe layer rather than a global schema constraint (exact
  mechanism — application-level validation keyed off the shadow's campaign's
  `universe_id`, versus a less restrictive column plus universe-specific
  validation — is the implementer's design call; document the reasoning).
- A `src/universes/amber/` module (manifest: id, label, lore-specific
  character attribute definitions, seed content) analogous to TASK-024's
  `src/systems/dnd5e/`, built by extracting the scattered Amber-specific
  routes/UI/content listed in Context into one organized place — preserving
  current behavior, not rewriting Amber's rules.
- Move `PLAYER_GUIDE.md`'s content and `player-wizard-data.js`'s flavor text
  from hardcoded static files into the `amber` universe module's content, so
  guide delivery and wizard flavor text become universe-driven: a campaign
  with `universe_id = 'amber'` serves this content, a campaign with no
  universe serves none of it (or a minimal generic default — implementer's
  call, consistent with what a homebrew/no-universe campaign should
  reasonably see).
- Seed the canonical Amber shadows and Primal Patterns lore as `amber`
  universe seed data rather than global `init-db.js` seed data — a fresh
  campaign only gets this content if it selects the `amber` universe.
- Wire `campaigns.universe_id` so it actually gates which universe's
  attributes/content/seed data apply, mirroring TASK-024's system-registry
  work.

### Excluded

- No second real universe is built in this task — only the mechanism plus
  Amber as its one reference implementation (a "no universe / homebrew" case
  should be supported as the absence of a universe, not as a second built-out
  universe).
- No change to `system:dnd5e` extension data or the system registry itself
  (TASK-024's concern) — this task only adds the universe axis alongside it.
- No composable wizard work (TASK-026) — this task moves the wizard's
  *content* to be universe-driven, but the wizard's step *structure*
  (composing system steps + universe steps into one flow) is TASK-026's
  design problem, not this task's.
- No change to home screen or nav branding (TASK-027).

## Plan

1. Confirm TASK-024's extension-data mechanism's shape accommodates
   universe-namespaced data as designed; raise it back to TASK-024/review if
   it doesn't, rather than diverging from it here.
2. Write the migration extracting Amber-specific `characters`/`shadows` data
   into `universe:amber` extension data, with backup/idempotency discipline.
3. Build `src/universes/amber/`, moving `PLAYER_GUIDE.md`'s content,
   `player-wizard-data.js`'s flavor text, and the canonical-shadow/Primal-
   Pattern seed data into it, preserving their actual content and behavior.
4. Wire `campaigns.universe_id` to gate which universe's data/content
   applies.
5. Update `guide.html` and the wizard to source content through the universe
   in context rather than static files.
6. Full regression pass: confirm the existing Amber campaign's guide,
   wizard, character sheets, and shadow/lore data are unchanged from a
   player's/DM's perspective.

## Acceptance criteria

- [x] Amber-specific character attributes live in `universe:amber` extension
      data, correctly migrated for every existing character with no data
      loss.
- [x] The canonical Amber shadows and Primal Patterns lore are seeded as
      `amber` universe content, not unconditional global seed data.
- [x] The player guide's content and the wizard's Amber flavor text are
      served through the `amber` universe module, gated by
      `campaigns.universe_id`.
- [x] A campaign with no universe selected does not receive Amber-specific
      content, attributes, or seed data.
- [x] The existing migrated campaign (`universe_id = 'amber'`)'s guide,
      wizard, character sheets, and shadow/lore data are unchanged from a
      player's/DM's perspective after this task.
- [x] `npm test` passes, with new coverage for the migration and the
      universe-gating behavior.

## Validation requirements

- `npm test`, including new migration and universe-gating tests.
- Migration run against a copy of the real database with before/after
  spot-checks on several real characters' Amber-specific attributes.
- Manual verification: the existing campaign's guide page, character-creation
  wizard, and character sheets display identical Amber content to before this
  task.

## Risks and assumptions

- Same live-data migration risk class as TASK-024/ADR-003 — apply the same
  backup/copy-first/idempotency discipline.
- Moving `PLAYER_GUIDE.md` and wizard flavor text out of static files into a
  module is a bigger content-authoring shift than the schema changes — get
  explicit confirmation of the chosen storage shape (e.g. Markdown files
  within `src/universes/amber/content/` vs. database rows) before committing,
  since it affects how a DM might eventually customize this content, even
  though DM-facing content customization is out of scope for this task.
- Assumes no other code beyond what's listed in Context references Amber
  columns/content directly — grep before removing anything from `characters`/
  `shadows`/static files, following TASK-024's same caution.

## Blocker

Resolved 2026-09-13. The implementer asked for explicit confirmation of the
guide/wizard content storage shape before committing to it, per this task's
own Risks and assumptions section. Confirmed design: `PLAYER_GUIDE.md`'s
canonical Markdown and the wizard flavor-text data move to
`src/universes/amber/content/` (a Markdown file plus a CommonJS data module),
served through universe API endpoints gated by the active campaign's
`universe_id`. No database rows, no DM-facing runtime customization layer —
consistent with ADR-005's code-defined-only plugin model and the same flat-file
pattern TASK-024 already used for `src/systems/dnd5e/`. Implementation may
proceed.

## Implementation handoff

Implementer: Codex
Date: 2026-09-13

### Changes made

- Added migration 015 and the `src/universes/amber/` registry module. All 13
  Amber-specific character columns verified against `schema.sql` are copied
  exactly once into the existing `character_extension_data` table under
  `universe:amber`. Character create/read/update paths now use that document
  as runtime truth. As in TASK-024, the legacy columns remain physically
  present as inactive compatibility/recovery storage.
- Added the universe registry and campaign dispatch. A campaign with no
  universe (stored as an empty string for compatibility with already-created
  databases whose `universe_id` remains `NOT NULL`, exposed as `null` by the
  create API) gets no Amber document, fields, content, or seed rows.
- Moved the canonical guide, wizard data, 11 canonical shadows, 3 Primal
  Pattern records, and all 17 canonical lore sections into
  `src/universes/amber/`. New Amber campaigns receive those seeds; existing
  campaigns with shadows/lore are not modified or duplicated.
- Added authenticated, active-campaign-gated guide and wizard endpoints at
  `/api/universe/content/guide` and `/api/universe/content/wizard`. The guide
  page and wizard facade now load through those endpoints.
- Removed Amber's `pattern_influence` CHECK from the global shadows schema.
  The Amber manifest owns the allowed values and validates create/update
  requests only when the applicable campaign selects Amber. A homebrew
  campaign can use an arbitrary influence. This keeps lore validation in the
  universe layer without adding a hardcoded database trigger. The narrowly
  scoped validation hooks do not change shadow authorization or campaign
  scoping; that remains TASK-028.
- Changed shadow name uniqueness to `(COALESCE(campaign_id, 0), name)` so the
  same canonical seed names can exist in separate campaigns while legacy
  unscoped rows retain name uniqueness.

### Validation performed

- `npm test`: **88 passed, 0 failed**. New tests cover all 13 migrated fields,
  idempotency, absence of the global CHECK, Amber-vs-homebrew influence
  validation, 11 shadow/3 Pattern/17 lore-section seed counts, exact guide API
  delivery, wizard content delivery, and no-universe exclusion of fields,
  extension rows, content, and seeds.
- Ran the normal migration runner against timestamped copy
  `dm_helper.task025-validation-20260913-093556.db`, never the live file. All
  65 values (13 fields across 5 real characters) matched the source columns;
  shadow count remained 21, Pattern count remained 3, lore-section count
  remained 17, and
  `foreign_key_check` returned zero violations. The copy was deleted.
- Live `dm_helper.db` SHA-256 before and after validation remained
  `F9F5B2D73067C34000A19763867D0225B20E29620E861F8D94D992670D5B5244`.
- Confirmed the relocated guide is byte-for-byte identical after line-ending
  normalization. The relocated wizard data differs from the former browser
  module only in its first comment and CommonJS export wrapper; all data is
  unchanged. Frontend module tests exercise the API-loaded data facade.
- No interactive browser automation is available, so no manual browser run is
  claimed. Existing visible behavior is covered by exact content comparisons,
  HTTP integration tests, frontend module tests, and call-site tracing.

### Assumptions and design calls

- Migration 015 is the only non-default migration transaction: SQLite must
  disable foreign keys before rebuilding `shadows`, which cannot happen inside
  the runner's already-open transaction. It therefore opens its own atomic
  transaction with foreign keys disabled, performs `foreign_key_check` before
  commit, and restores the prior setting. The runner opt-out is explicit.
- Existing campaign lore rows are treated as authoritative and are never
  overwritten by code seeds. Seeds apply only when the corresponding campaign
  collection is empty, preserving the current Amber campaign exactly.
- Primal Pattern route authorization/scoping was not changed; TASK-028 owns
  router authorization. This task gates whether universe seeds are created,
  while TASK-028 will enforce cross-campaign row visibility.

### Unresolved risks

- Legacy Amber columns intentionally become stale after runtime edits and must
  not be treated as application truth, matching TASK-024's accepted safety
  model. A later cleanup may physically remove them after the cutover has run
  successfully.
- The wizard facade uses top-level `await` in an ES module so dependent wizard
  modules wait for campaign content. Supported target browsers handle this;
  the Node/jsdom module suite verifies the dependency behavior.

### Documentation updated

- Updated this task's acceptance checklist and implementation handoff. No
  unrelated durable documentation was changed.

## Review

Not reviewed.

## Human acceptance

Pending.
