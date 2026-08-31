# ADR-003: Store universal core attributes as percentiles

Status: Proposed
Date: 2026-08-31
Decision owners: Patrick
Related tasks and contracts: TASK-014 (implementation); TASK-015 (D&D 5e
character sheet, dependent follow-up); no related contracts

## Context

The six core character abilities (`strength`, `dexterity`, `constitution`,
`intelligence`, `wisdom`, and `charisma`) were stored directly as D&D's 1–30
scores. That made the character record itself D&D-specific even though the
application already gestures toward other game systems in its dice roller.
Adding another system-specific copy of the same underlying capabilities would
create competing sources of truth and make moving a character between systems
ambiguous.

The application already has live character data and existing D&D displays and
gameplay math. Changing the stored meaning therefore requires an in-place,
idempotent migration and a shared conversion boundary that preserves the
familiar D&D experience.

## Decision

The six columns on `characters` store integer percentiles from 0 through 100 as
the system-neutral ground truth. D&D scores are derived only at D&D-facing
display, input, and gameplay boundaries.

The bidirectional conversion is:

```text
percentile = round((score - 1) / 29 * 100)
score      = round(percentile / 100 * 29) + 1
```

The D&D modifier is derived from the converted score:

```text
modifier = floor((scoreFromPercentile(percentile) - 10) / 2)
```

These calculations live in one shared module used by both server and browser
call sites. Existing D&D forms continue to display and accept scores from 1
through 30, converting at their storage boundary. A durable data-migration
marker prevents migrated rows from being converted a second time.

`character_system_data` stores future system-specific JSON that does not
generalize to the six core attributes. `story_arcs.game_system`, defaulting to
`dnd5e`, provides a future system-selection point. Neither schema addition has
runtime behavior as part of TASK-014.

## Alternatives considered

- Keep D&D scores as ground truth and add a computed percentile. Rejected
  because every future system would still derive from a D&D-owned value rather
  than a neutral character capability.
- Store both D&D scores and percentiles. Rejected because the values could
  diverge and require synchronization rules, creating two sources of truth.
- Add independent ability columns per game system. Rejected because shared
  character capability would be duplicated and cross-system movement would
  have no authoritative basis.

## Consequences

### Benefits

- One system-neutral value can drive D&D and future game-system projections.
- D&D users retain the existing 1–30 input and display experience.
- One tested conversion implementation governs browser display, writes, and
  server-side gameplay modifiers.
- Future non-generalizable character data and arc system selection have an
  explicit schema home.

### Costs and risks

- The migration rewrites live character data in place and therefore requires a
  backup or copied-database validation before production use.
- Stored database values are no longer directly recognizable as D&D scores;
  maintenance code must respect the conversion boundary.
- Integer rounding is inherent in projecting between 30 score values and 101
  percentile values. Percentiles created from every integer D&D score round-trip
  to that score, while arbitrary percentiles project to the nearest D&D score.

## Follow-up work

- TASK-015 builds the D&D 5e character sheet on this conversion boundary.
- Later system-specific tasks may use `character_system_data` and
  `story_arcs.game_system`; TASK-014 intentionally adds no routes or UI for
  either.
- Claims ranking integration remains deferred and is not changed by this
  decision beyond preserving its existing D&D ability modifier calculation.
