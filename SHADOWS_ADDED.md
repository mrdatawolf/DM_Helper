# New Shadows Added

## Summary

Added 5 new shadows to the DM Helper system, creating mirror/reflection cities for both the First Pattern and Corwin's Pattern.

## New Shadows

### 1. Deidre (Corwin's First Shadow)
- **Order**: 95/100 | **Chaos**: 5/100
- **Pattern**: Corwin Pattern
- **Description**: A noir-tinged reflection of Amber with eternal twilight, art deco architecture, jazz music, and neon-lit streets. Order maintained through intrigue and shadowy alliances.
- **Theme**: Film noir meets eternal city

### 2. Rebma (First Pattern Mirror)
- **Order**: 98/100 | **Chaos**: 2/100
- **Pattern**: First Pattern
- **Description**: The underwater mirror of Amber beneath the waves. Everything reversed, Pattern runs backward. Ruled by Queen Moire.
- **Access**: Descend the grand staircase of Faiella-bionin
- **Theme**: Classical Amber reflection

### 3. Tir-na Nog'th (First Pattern Ghost)
- **Order**: 92/100 | **Chaos**: 8/100
- **Pattern**: First Pattern
- **Description**: The ghost city in the sky, appearing only on full moon nights. Silver and shadow, showing possible futures through a reversed Pattern.
- **Access**: Climb invisible stairway to the clouds
- **Corruption**: Temporal instability - prophetic visions may bleed between timelines
- **Theme**: Prophecy and memory

### 4. The Depths (Corwin Pattern Mirror)
- **Order**: 90/100 | **Chaos**: 10/100
- **Pattern**: Corwin Pattern
- **Description**: Deidre's dark reflection submerged in liquid shadow. Where Rebma is crystalline bright, The Depths are obsidian secretive. Reveals hidden truths.
- **Access**: Through mirrors when rain falls in Deidre
- **Theme**: Secrets and revelation in darkness

### 5. The Neon Spire (Corwin Pattern Ghost)
- **Order**: 88/100 | **Chaos**: 12/100
- **Pattern**: Corwin Pattern
- **Description**: Deidre's ghost twin manifesting during new moons in rain puddle reflections. Electric and vivid where Tir-na Nog'th is ethereal. Pattern runs in neon colors showing choices rather than prophecies.
- **Access**: New moon reflections in Deidre's rain
- **Corruption**: Choice-flux - decisions made here ripple backward through probability
- **Theme**: Possibility and choice

## Pattern Comparison

### First Pattern Cities
- **Prime**: Amber (Kolvir) - 100 Order
- **Mirror**: Rebma - Underwater, reversed Pattern
- **Ghost**: Tir-na Nog'th - Sky city (full moon), shows futures
- **Aesthetic**: Classical, silver, crystalline
- **Vision Type**: Deterministic prophecy (what will be)

### Corwin Pattern Cities
- **Prime**: Deidre - 95 Order
- **Mirror**: The Depths - Liquid shadow, reveals truths
- **Ghost**: The Neon Spire - Rain reflection (new moon), shows choices
- **Aesthetic**: Noir, neon, electric, modern
- **Vision Type**: Probabilistic choices (what could be)

## Moon Symbolism

- **Full Moon**: Tir-na Nog'th appears (First Pattern, destiny)
- **New Moon**: The Neon Spire appears (Corwin Pattern, choice)
- **Opposition**: Represents the philosophical difference between the Patterns

## Current Shadow Count

The database now contains **10 shadows**:

1. Amber (Kolvir) - First Pattern
2. The Courts of Chaos - Logrus
3. Rebma - First Pattern mirror
4. Tir-na Nog'th - First Pattern ghost
5. Deidre - Corwin Pattern prime
6. The Depths - Corwin Pattern mirror
7. The Neon Spire - Corwin Pattern ghost
8. The Soul Realm - Mixed corruption (starting shadow)
9. Billabong's Veil - Corwin Pattern (starting shadow)
10. Shadow Earth - First Pattern

## How to View

Visit the Shadows tab in the DM Dashboard: `http://localhost:3002`

All shadows are visible with their Order/Chaos levels, Pattern influences, and descriptions.

## Database Changes

- Updated `src/database/init-db.js` to include all 10 shadows in seed data
- Added corruption_status field to shadow creation
- Future database resets will include these shadows automatically

## Campaign Notes

See [Shadow Reflections.md](Background%20Information/General%20Info/Shadow%20Reflections.md) for detailed campaign implications and story hooks about the reflection cities.
