# CONTRACT-003: Universal character capability profile

Status: Proposed
Proposed by: Codex with Patrick
Proposed date: 2026-10-08
Approved by: Patrick
Approved date: 2026-10-08
Related task: TASK-045
Related ADRs: ADR-003 (superseded for canonical stat storage by ADR-006),
ADR-005, ADR-006.

## Purpose

This contract defines the canonical, system-neutral statistic source for a
character or NPC. It replaces the D&D-named percentile columns as runtime
truth with a fixed profile of twelve 0–100 capabilities. A selected game
system projects its own attributes from this profile, but cannot persist a
competing base-stat block.

The contract preserves the existing D&D 5e user experience and saved data.
It establishes no native FASERIP, World of Darkness, or Zombie Car Wars sheet,
character-creation rules, abilities, powers, equipment, or resolution system.

## Capability vocabulary

Every complete profile has exactly these keys, each with an integer value in
the inclusive range 0–100:

| Key | Meaning |
| --- | --- |
| `might` | Raw physical force and lifting power. |
| `mobility` | Gross-body speed, balance, and movement. |
| `coordination` | Fine motor control, manual precision, and aiming. |
| `endurance` | Physical resilience, stamina, and resistance to fatigue. |
| `fighting` | Direct combat aptitude and practiced fighting ability. |
| `perception` | Sensory awareness and noticing relevant detail. |
| `intellect` | Learning, analysis, recall, and technical reasoning. |
| `instinct` | Fast judgment, reactions, and practical wit. |
| `resolve` | Will, self-control, and resistance to mental pressure. |
| `presence` | Force of personality, leadership, and social impact. |
| `influence` | Deliberate persuasion, deception, and social leverage. |
| `appearance` | Presentation and conventional physical appeal. |

The scale is a relative capability scale, not a percentage chance of success.
`31` is the proposed ordinary-adult baseline: it is the existing stored
percentile for a D&D score of 10 and maps to Typical in the current FASERIP
conversion. `0` and `100` remain the scale endpoints. System-owned dice and
resolution rules decide whether a capability succeeds in play.

## Actors

- **Character/NPC**: owns exactly one complete canonical capability profile.
- **Capability service**: the only shared code permitted to validate, read,
  create, and mutate canonical capability values.
- **System module**: deterministically projects its named attributes from a
  canonical profile and defines how its own sheet input becomes a canonical
  mutation.
- **D&D 5e module**: the reference projection preserving all existing D&D
  score-facing behavior during TASK-045.
- **Future system module**: may project FASERIP, World of Darkness, or Zombie
  Car Wars statistics under a separately approved contract; it may not add a
  second canonical profile.

## Inputs and outputs

### Canonical profile

The capability service reads a complete profile as an immutable object keyed
by the twelve vocabulary keys. It rejects incomplete, duplicate, unknown,
non-integer, or out-of-range data. Its write operations are transactional:
a caller either persists a complete valid profile or no capability change.

### Storage

The migration creates `character_capabilities` with at least:

```text
id               INTEGER primary key
character_id     INTEGER not null, foreign key to characters(id)
capability_key   TEXT not null, limited to the twelve contract keys
value            INTEGER not null, check 0 <= value <= 100
created_at       DATETIME not null
updated_at       DATETIME not null
unique(character_id, capability_key)
```

The database constraint and shared capability-key list enforce the same fixed
vocabulary. The implementation must not rely on client validation alone.

### D&D 5e projection

The D&D module owns both conversions already used at its UI/API boundary:

```text
percentile = round((dndScore - 1) / 29 * 100)
dndScore   = round(percentile / 100 * 29) + 1
```

It projects a profile to the six legacy D&D percentiles as follows:

```text
strength     = might
dexterity    = round(mean(mobility, coordination))
constitution = endurance
intelligence = intellect
wisdom       = round(mean(perception, instinct, resolve))
charisma     = round(mean(presence, influence))
```

The existing D&D score conversion then produces displayed/input scores and
derived modifiers. For a profile seeded by the migration, all values in each
aggregate group are equal, so the displayed D&D result is exactly unchanged.

The D&D module exposes a named projection API rather than allowing route,
browser, PDF, claim, or sheet code to calculate these mappings ad hoc.

## Required behavior

### Profile creation and completeness

- Every new character receives one complete profile in the same transaction
  that creates the character.
- Every complete profile contains exactly twelve rows, one for each contract
  key. No duplicate or extra key is valid.
- Existing legacy D&D columns are compatibility data only after cutover;
  runtime reads and writes for ability behavior must use the profile.
- A missing or malformed profile is a data-integrity error. It must surface
  clearly and must not silently fall back to stale legacy columns.

### Migration

Migration `019` (or the next available numeric migration when implemented)
must be idempotent. For each character without a complete profile, it creates
the twelve rows from the existing stored D&D percentiles:

```text
might                         ← strength
mobility, coordination        ← dexterity
endurance                     ← constitution
intellect                     ← intelligence
perception, instinct, resolve ← wisdom
presence, influence           ← charisma
fighting, appearance          ← 31 (ordinary-adult baseline)
```

The migration must not modify the six legacy values. It must verify that an
existing complete profile is valid before treating it as already migrated;
an incomplete or malformed partial profile is an error requiring repair, not
a signal to overwrite rows blindly.

Migration validation against a copy of the live database must prove every
character's projected post-migration D&D percentiles and displayed scores are
identical to its pre-migration values.

### D&D creation and edits

D&D continues to accept and display ability scores from 1 through 30. The
server converts them at the D&D boundary and applies the resulting canonical
mutation in the creation/update transaction.

For a character created through D&D, initial values are seeded as follows:

```text
STR → might
DEX → mobility and coordination
CON → endurance
INT → intellect
WIS → perception, instinct, and resolve
CHA → presence and influence
fighting and appearance → 31 unless a future approved input supplies them
```

For subsequent D&D edits to an aggregate attribute, the implementation must
preserve differences that a richer system may have established:

- It changes every member of the mapped capability group by a common integer
  adjustment where possible, rather than overwriting all members with one
  value.
- The resulting projected D&D percentile must equal the requested converted
  percentile.
- If several integral distributions satisfy that result, choose the one that
  minimizes total absolute change; use capability-key order as the stable
  tie-breaker.
- If no in-range distribution can meet the requested value, reject the edit
  with a clear validation error and leave the profile unchanged.

This rule means a D&D edit can affect canonical cross-system capability, but
does not unnecessarily erase an existing Mobility/Coordination,
Perception/Instinct/Resolve, or Presence/Influence distinction.

### System ownership and compatibility

- A system module may read the complete profile and expose a deterministic
  projection, including ruleset-specific rank curves, labels, or caps.
- System-specific concepts with no approved canonical equivalent—including
  D&D class/spells, FASERIP powers/Resources/Popularity/Karma, World of
  Darkness skills/Advantages/Disciplines, and Zombie Car Wars skills/tools—
  belong in that system's extension document or dedicated system-owned
  storage.
- No system may write a duplicate base-stat document and later treat it as
  canonical truth.
- The existing FASERIP conversion remains a read-only legacy D&D conversion
  until its native-system task replaces or supplements it deliberately.

## Invariants

- One character has one and only one complete canonical profile.
- All canonical capability values are integers in `[0, 100]`.
- The profile is system-neutral; neither its table, keys, nor service imports
  D&D, FASERIP, World of Darkness, or Zombie Car Wars rules.
- Every system projection is deterministic for the same profile and declared
  system-mapping version.
- A migrated D&D character's projected D&D values equal its legacy values.
- The application never silently uses legacy D&D columns when a profile is
  missing or invalid.
- Story, campaign, universe, authorization, and non-stat system data remain
  outside this contract.

## Failure behavior

- Unknown capability keys, duplicate keys, non-integers, and values outside
  the inclusive range are rejected before persistence.
- Profile integrity errors return a clear server error and are logged with the
  character ID; they do not return a partially hydrated character.
- A D&D input outside its existing accepted range retains its existing
  validation behavior.
- An edit that cannot preserve all values within the canonical range fails
  atomically with a message explaining that the requested D&D score cannot be
  represented without exceeding the shared capability range.
- Migration detects partial rows or invalid values and halts rather than
  inventing a repair silently.

## Interfaces and UX expectations

- Existing D&D API response and request shapes remain stable for callers;
  capability data is an internal foundation in TASK-045, not a new player
  sheet or a public generic stat editor.
- Existing D&D sheet, wizard, PDF export, claims, saves, skills, combat HP,
  and other derived-stat behavior retain their current labels and results.
- A future system sheet may display its own projection and eventually a
  read-only universal profile explanation, but TASK-045 adds no such UI.

## Validation requirements

- Unit tests cover key/range/completeness validation and D&D direct and
  aggregate projection mappings.
- Tests cover D&D aggregate edits with equal seeded values, unequal richer
  values, tie-breaking, boundary conditions, and atomic rejection.
- Migration tests cover a fresh database, an existing legacy character,
  repeated runs, and malformed partial data.
- API and browser tests prove D&D response shapes and visible values are
  unchanged while runtime truth comes from the profile.
- The full test suite passes, followed by a migration rehearsal on a copy of
  the live database and manual D&D sheet/PDF verification.

## Open approval point

This proposed contract chooses `31` as the migration and creation default for
`fighting` and `appearance`. It is the least-invented value: the repository's
existing canonical percentile for an ordinary D&D score of 10 and a Typical
FASERIP conversion result. Patrick must approve this default, or specify a
different default, before the contract is accepted and TASK-045 implementation
begins.
