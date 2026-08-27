# Backlog notes

Informal working notes that don't fit the process docs or the formal task
lifecycle — known bugs not yet turned into tasks, and lore/design ideas that
haven't been scoped into work yet. Promote an item to `tasks/proposed/` (or a
`docs/decisions/` ADR, for lore/design calls with lasting consequences) when
it's ready to be scoped as real work.

## Known bugs

### Players can't reach their Known Worlds

Players are unable to navigate to their known/visited shadows. Also, a
character's home world (`shadow_origin_id`) is **not** automatically appearing
as a known world — it should be visible to the player without needing a
session visit entry.

Check: `loadVisitedShadows()` in `public/js/player/player-shadows.js`, the
`/api/shadows/character/:id/visited` route in `src/routes/shadows.js`, and how
`shadow_origin_id` is handled vs. `current_shadow_id`.

## Lore / character notes to potentially build out

### Leluna

- Animal companion character.
- Small dog-sized at base.
- Grows with the character over time.
- The wizard who takes her in is the one who helps make the bond happen
  (mechanically and narratively).

### Xan-Time

- (Concept/character/location — needs fleshing out.)
