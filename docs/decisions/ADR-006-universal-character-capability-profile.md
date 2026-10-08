# ADR-006: Universal character capability profile

Status: Accepted
Date: 2026-10-08
Decision owners: Patrick
Related tasks and contracts: TASK-045 (proposed); a capability-profile contract must be approved before TASK-045 is implemented.

## Context

`ADR-003` made six existing character columns (`strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, and `charisma`) integer percentiles. That preserved existing D&D 5e behavior while creating a useful conversion boundary. It did not, however, make the *meaning* of those fields neutral: their names, cardinality, and D&D projections still cannot represent all of the base attributes of the systems this product intends to support.

The product direction is to let a game runner use the same character or NPC in multiple systems. D&D 5e, FASERIP, World of Darkness, and Zombie Car Wars do not share a dice mechanic or an identical set of attributes, but they do all describe a character's underlying physical, mental, social, and combat capabilities. A system-specific stat block should therefore be an explicit projection of one canonical capability profile, not an independent competing source of truth.

The existing FASERIP conversion (`public/js/faserip-conversion.js`) proves the value of the percentile boundary, but is deliberately a D&D-to-FASERIP, read-only conversion. Its derivation of Fighting from D&D Strength and Dexterity cannot be the authoritative creation model for a native FASERIP character. Similarly, the existing World of Darkness and Zombie Car Wars dice UI is only a roller; it owns no character-stat model.

## Decision

Introduce a canonical, per-character **universal capability profile**. Each capability is an integer from 0 through 100 on a neutral, relative-capability scale. It is not a literal probability of success. Dice, difficulty, success-count, and table-resolution procedures remain the responsibility of the selected system.

The initial fixed vocabulary is:

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

The profile is canonical data, not a system extension document. Its intended storage is one normalized `character_capabilities` row per `(character_id, capability_key)`, with a database range check and a shared fixed key list in application code. This avoids a new wide, ruleset-shaped `characters` table while allowing capability values to be individually read, validated, and migrated. A future capability addition is an architectural change and requires a follow-up ADR; it is not user-defined runtime data.

Systems own named projections from this profile. A projection may read one capability directly or combine several through a versioned, deterministic mapping owned and tested by that system. It must not persist a duplicate base stat as runtime truth.

Initial projection intent:

| System | Projection intent |
| --- | --- |
| D&D 5e | Strength←Might; Dexterity←Mobility/Coordination; Constitution←Endurance; Intelligence←Intellect; Wisdom←Perception/Instinct/Resolve; Charisma←Presence/Influence. |
| FASERIP | Fighting←Fighting; Agility←Mobility/Coordination; Strength←Might; Endurance←Endurance; Reason←Intellect; Intuition←Perception/Instinct; Psyche←Resolve. FASERIP ranks and names use a FASERIP-owned calibration table. |
| World of Darkness | Its physical, social, and mental attributes project from the corresponding capability dimensions; exact edition and mapping rules are owned by the future World of Darkness system contract. |
| Zombie Car Wars | Its attribute contribution selects the relevant capability and projects it to the system's documented +0 to +1 band. Skills and tools remain separate system-owned data. |

When an existing system calls for a concept that cannot faithfully be derived, the system must retain that concept in its own namespaced document and label it as system-specific. It must not silently alter the canonical profile or invent a universal equivalence. A later approved contract may define visible, auditable per-system projection overrides for edge cases; none are introduced by this decision.

The existing D&D-named `characters` columns cease to be canonical once the migration is complete. They may remain as inactive compatibility storage until a separately approved cleanup task removes them. D&D-facing requests and screens must continue to show the same D&D scores for migrated characters.

## Alternatives considered

- **Keep the existing six percentile columns as the universal profile.** Rejected: Fighting, separate Mobility/Coordination, World of Darkness's social attributes, and FASERIP Psyche cannot be represented without misleading derivations or system-specific exceptions in core storage.
- **Create a separate full stat block for every system.** Rejected: it makes a character's cross-system identity ambiguous and recreates competing sources of truth.
- **Use only one generic `competence` percentile.** Rejected: it cannot distinguish a strong, perceptive, socially adept, or technically brilliant character, so every system projection would become arbitrary.
- **Let users define arbitrary capability keys at runtime.** Rejected for now: this would require a user-defined schema, validation, mapping editor, and rule-pack UI. Code-defined systems and a fixed, documented vocabulary match the current product architecture.
- **Store the profile as an opaque JSON blob.** Rejected: normalized rows give direct database range validation, straightforward migration checks, and clearer future querying without committing the `characters` table to more columns.

## Consequences

### Benefits

- A character or NPC gets one inspectable, system-neutral stat authority.
- New system plugins can translate known capabilities instead of beginning from a D&D-shaped six-stat record.
- FASERIP can support native character creation without treating D&D's assumptions as its rules.
- Existing story, campaign, and universe data stays system-independent.

### Costs and risks

- This supersedes the central data-shape decision in ADR-003 and requires a careful, reversible live-data migration plus broad D&D regression coverage.
- Projection mathematics is a rules decision, not a neutral technical fact; every system mapping must be documented, deterministic, and tested.
- No projection can be perfectly lossless across different games. The UI and documentation must present projected values as a system interpretation, not claim exact rules equivalence.
- D&D's present direct reads of six `characters` columns must be traced and redirected through the capability service before those columns can be treated as compatibility-only storage.

## Follow-up work

1. Write and approve a capability-profile contract defining storage, migration, projection ownership, field/API behavior, and invariants.
2. Implement TASK-045 to establish the profile and preserve D&D behavior.
3. Add FASERIP as the first native system plugin using the profile, with its source-book lineage and calibration rules chosen explicitly.
4. Add World of Darkness and Zombie Car Wars system contracts independently; their dice and non-stat data must not be inferred from this ADR alone.
