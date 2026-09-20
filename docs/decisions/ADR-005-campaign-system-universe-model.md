# ADR-005: Campaign as tenant root, with independent System and Universe plugins

Status: Accepted
Date: 2026-09-12
Decision owners: Patrick
Related tasks and contracts: none yet — this ADR precedes task creation; see
Follow-up work for the planned decomposition.

## Context

The application is currently built around exactly one implicit campaign: the
whole `dm_helper.db` file. `docs/PROJECT.md` states this outright ("a small,
single-campaign tool, not a multi-tenant product") and explicitly excludes
multi-campaign/multi-tenant support from scope. Campaign identity, one game
system (D&D 5e), and one setting (the Amber multiverse, "The Shattering of the
Liminal") are hardwired at every layer:

- **Schema**: `characters` mixes universal fields with a D&D-5e-shaped sheet
  (skills, saves, spell slots) and an "Amber-Specific Attributes" block
  (`blood_purity`, `pattern_imprint`, `logrus_imprint`, ...) in the same table;
  `shadows.pattern_influence` has an Amber-only `CHECK` constraint.
- **Content**: the character-creation wizard (`player-wizard-data.js`), the
  player guide (`PLAYER_GUIDE.md`), and the home screen/nav copy are all
  hardcoded Amber narrative text, not DM-authored or configurable data.
- **Auth**: JWTs bake `isDM`/`isAdmin` in at issuance with no re-check and no
  notion of "which campaign, with what role" — there is exactly one DM.

The goal is for other DMs to run their own games in this same tool, each
picking their own ruleset ("system") and setting ("universe"), while multiple
campaigns/DMs coexist. Two things make this tractable rather than speculative:

- **ADR-003** already converted ability scores to a system-neutral 0–100
  percentile with D&D's score derived only at display/input boundaries, and
  added (unused) `character_system_data` and `story_arcs.game_system` as
  future extension points.
- **TASK-016** added a small `{id, label, render}` system registry for "View
  As..." alternate-system rendering — a working precedent for a code-defined
  plugin pattern in this codebase.

Both were built incrementally, in small reviewed tasks, against a live,
working application — not as a rewrite. The team explicitly considered
starting a new project instead and rejected it: a rewrite would still require
migrating the existing real campaign data, would lose the working reference
implementation as a safety net while restructuring, and would reimplement
everything that already works in addition to the new tenancy/plugin work. It
would relocate the risk of this change, not reduce it.

The intended deployment remains a personal, self-hosted tool for a small,
known group of DMs and players — not a public multi-tenant SaaS product. This
matters for scope: correctness of per-campaign data separation is required,
but production-grade tenant-isolation hardening (rate limiting, public
sign-up abuse prevention, billing) is not.

## Decision

Introduce **Campaign** as the top-level tenant object, with **System** and
**Universe** as two independent, code-defined plugin axes a campaign selects.

- **Campaign**: the actual game being run — its players, sessions, journal,
  story arcs. Backed by a new `campaigns` table (`id`, `name`,
  `owner_user_id`, `system_id`, `universe_id`, timestamps) and a new
  `campaign_members` table (`campaign_id`, `user_id`, `role`) so a user's
  role (DM vs. player) is evaluated per campaign, not globally. Genuinely
  campaign-owned tables (`npcs`, `shadows`, `campaign_sessions`,
  `journal_entries`, `story_arcs`, claims, etc.) gain a `campaign_id` foreign
  key.
- **Character-to-campaign linkage**: characters are not owned by a single
  campaign. A character can be played concurrently across multiple
  campaigns (e.g. the same person shadow-walking between two different DMs'
  games), so `characters` relates to `campaigns` many-to-many through a new
  `campaign_characters` join table (`campaign_id`, `character_id`, plus
  per-link fields such as the character's current shadow/location in that
  campaign's story). A character's sheet — universal core attributes and
  system/universe extension data alike — remains one shared source of truth;
  there is no per-campaign forking or copying of stats. Running a character
  in more than one campaign at once is an advanced, opt-in choice the DM and
  player take responsibility for, not a scenario the tool arbitrates (see
  Costs and risks).
- **System**: a rules-engine plugin (e.g. `dnd5e`, `faserip`) supplying
  character-sheet shape, dice mechanics, derived-stat math, PDF export, and
  system-conversion rendering. Independent of Universe — any system can pair
  with any universe.
- **Universe**: a lore/setting plugin (e.g. `amber`, or none for a homebrew
  campaign with no canned setting) supplying setting-specific character
  attributes, guide content, wizard flavor text, and seed lore entities.
  Independent of System for the same reason.
- Both axes are **code-defined**, following the TASK-016 registry pattern: a
  new system or universe is added as a manifest module under
  `src/systems/<id>/` or `src/universes/<id>/` and requires a code change and
  deploy. There is no runtime "install a pack" mechanism, no DM-facing
  plugin manager, and no sandboxing — this keeps scope proportionate to a
  small, trusted, self-hosted deployment.
- System-specific and universe-specific character data both live in one
  generalized, namespaced extension mechanism (superseding the unused
  `character_system_data` from ADR-003), keyed by a namespace such as
  `system:dnd5e` or `universe:amber`, rather than two separate hand-rolled
  tables. D&D 5e's hardcoded sheet columns and Amber's hardcoded lore columns
  are migrated into this mechanism as the reference implementations proving
  it actually works, not left as special-cased "core" columns.
- Authorization moves from JWT-baked global role claims to a per-request
  check against `campaign_members` for the campaign in context (a
  `current_campaign_id` carried in the session, changeable via a campaign
  switcher in the UI, e.g. header/footer). This is the highest-blast-radius
  change in this decision, since it touches all existing route files.
- The existing database becomes **campaign #1**: system `dnd5e`, universe
  `amber`, campaign name "The Shattering of the Liminal," owned by the
  current DM account. It is migrated in place as the reference
  implementation, not discarded.
- Home screen, nav branding, and guide chrome become campaign/universe-driven
  content, addressed last, after the schema and plugin mechanisms exist to
  drive them.

This decision supersedes `docs/PROJECT.md`'s current scope statement
("Excluded: Multi-campaign or multi-tenant support"); that document needs a
follow-up edit once this ADR is accepted (see Follow-up work).

## Alternatives considered

- **Start a new project**, using this repository as a design/content
  reference. Rejected: does not avoid migrating real campaign data, discards
  a working reference implementation and the incremental-task safety net
  that let ADR-003/TASK-016 ship safely, and adds "reimplement everything
  that already works" on top of the new tenancy/plugin work.
- **Single-DM, multi-campaign without per-campaign authorization** (one
  operator switches between their own campaigns; no cross-DM isolation).
  Rejected in favor of true multi-tenancy so multiple DMs in the group can
  each own and run their own campaigns independently.
- **Bundle Universe with a default System** (a universe pack implies its
  ruleset unless overridden). Rejected in favor of fully independent axes,
  matching the intended flexibility, at the cost of needing the shared
  namespaced extension mechanism to support arbitrary system×universe
  combinations from the start rather than growing into it later.
- **Runtime-installable system/universe packs** (a DM adds a new
  system/universe without a code change). Rejected as disproportionate
  engineering cost (manifest format, content storage, validation/review
  layer) for a small, trusted, self-hosted deployment where the people
  adding new systems/universes are the same people who can make a code
  change.
- **One database file per campaign** (physical rather than logical
  isolation). Rejected: the group wants characters to be playable
  concurrently across separate campaigns, which a hard per-campaign file
  boundary would make difficult to express or query.
- **One owning campaign per character** (`characters.campaign_id`,
  one-to-many). Rejected: cannot express a character played concurrently in
  more than one campaign, which the group explicitly wants to allow.
- **Fork an independent copy of a character's stats per campaign** it is
  linked to, rather than one shared sheet. Rejected in favor of a single
  shared source of truth: simpler (no duplication or reconciliation logic
  to build), and matches the group's preference that concurrent play is an
  advanced, opt-in choice rather than something the tool needs to safeguard
  against.

## Consequences

### Benefits

- Multiple DMs can each run their own campaign, in their own system and
  universe, in one deployment, without one DM's content or data being
  hardcoded into the app for everyone.
- Reuses and extends two patterns already proven in this codebase (ADR-003's
  neutral-core/derived-boundary split, TASK-016's plugin registry) instead of
  inventing an unrelated mechanism.
- Scope stays proportionate: code-defined plugins avoid building a runtime
  plugin/marketplace system; a small trusted group avoids needing
  production-grade tenant-isolation hardening.
- The existing Amber/D&D-5e campaign continues to work throughout, serving as
  the live proof that the system/universe separation is real rather than
  theoretical.

### Costs and risks

- Adding `campaign_id` scoping and per-request authorization checks touches
  every existing route file (16 routers) — this is a wide, mechanical, but
  high-blast-radius change that needs careful sequencing and test coverage
  rather than a single large task.
- Migrating D&D 5e's and Amber's hardcoded columns into the namespaced
  extension mechanism must preserve exact current gameplay behavior; this is
  a live-data migration on top of a schema change, similar in kind to
  ADR-003's but larger in surface area.
- Composing the character-creation wizard from independent system and
  universe step contributions is the least-precedented design in this
  decision (nothing in the codebase does this today) and will likely need a
  design spike or contract of its own before implementation, rather than
  following an existing pattern.
- This is a multi-phase, multi-month effort by task-lifecycle standards and
  must be decomposed into a sequence of small, independently reviewable
  tasks rather than attempted as one change.
- Fully shared character stats mean two campaigns (potentially run by
  different DMs, potentially using different systems) can affect the same
  character's state at once; the tool does not detect or resolve this
  conflict, and it is an accepted risk for experienced DMs/players rather
  than a novice-friendly default. If this proves problematic in practice,
  the documented fallback is a uniqueness constraint on
  `campaign_characters` limiting a character to one active campaign
  membership at a time — a tightening of the existing join-table model, not
  a schema redesign.

## Follow-up work

Planned task decomposition, in dependency order (each to go through
`tasks/proposed/` individually rather than as one task):

1. Update `docs/PROJECT.md` scope/users section and `docs/ARCHITECTURE.md` to
   describe campaign-based multi-tenancy, replacing the current
   single-campaign statement.
2. Add `campaigns`, `campaign_members`, and `campaign_characters` tables;
   backfill `campaign_id` onto genuinely campaign-owned tables and populate
   `campaign_characters` for existing characters; migrate the existing
   database in place as campaign #1 (`dnd5e` / `amber` / "The Shattering of
   the Liminal").
3. Make authorization campaign-role-aware (per-request `campaign_members`
   check replacing baked JWT claims); add `current_campaign_id` to the
   session and a campaign switcher in the UI.
4. Generalize `character_system_data` into the namespaced extension
   mechanism; migrate D&D 5e's hardcoded sheet columns into `system:dnd5e` as
   the reference system plugin; make `story_arcs.game_system` (or its
   replacement on `campaigns`) live rather than inert.
5. Extract Amber-specific schema/content into a `universe:amber` reference
   universe plugin (lore attributes, guide content, seed shadows/NPCs);
   generalize guide delivery to be universe-driven instead of a static file.
6. Design and build the composable character-creation wizard (system steps +
   universe steps); likely needs its own contract given the lack of an
   existing pattern to follow.
7. Make home screen, navigation branding, and remaining chrome
   campaign/universe-driven (last, per explicit sequencing decision).
