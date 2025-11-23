# Attribute Claims System - Implementation Complete ✓

## What Was Added

A full Amber-style attribute ranking system with the twist that **characters see perceived rankings, not actual rankings** - capturing the Corwin/Eric dynamic from the books.

## Core Features

### 1. Claim Point Pools
- Each character starts with **10 claim points**
- Can allocate points whenever they can justify it narratively
- DM can grant additional points for major milestones
- Points auto-track as spent/available

### 2. Flexible Allocation
- Not limited to character creation
- Allocate points at any time with justification
- System logs full history of changes
- Links to sessions when appropriate

### 3. Actual vs Perceived Rankings

**Actual (DM Sees):**
- Character A: 4 points in Warfare
- Character B: 5 points in Warfare
- Character C: 3 points in Warfare

**Character A Perceives:**
- Self: 4 points (knows their own score)
- Character B: 6 points (overestimates based on reputation)
- Character C: 2 points (underestimates based on appearance)

This creates dramatic irony and character revelation opportunities!

### 4. Beat to Lead Rule
- To become #1, you must **exceed** current leader's points
- Leader has 4 → You need 5 to surpass
- Ties are possible (great for rivalries)

## Database Tables Added

1. **attribute_claims** - Actual point allocations
2. **perceived_rankings** - What characters think about each other
3. **claim_point_pools** - Available/spent points tracking
4. **claim_history** - Audit trail of all changes

## API Endpoints

All available at `/api/claims/`:

- `GET /pool/:character_id` - Check available points
- `GET /character/:character_id` - Get all claims
- `GET /rankings/actual/:attribute_name` - True rankings (DM)
- `GET /rankings/perceived/:character_id/:attribute_name` - What character thinks
- `GET /rankings/all` - All attributes overview (DM)
- `POST /allocate` - Spend claim points
- `POST /perception` - Set perceived ranking
- `POST /grant-points` - DM grants more points
- `GET /history/:character_id` - Audit trail

## Current State

The system is fully functional and tested:

### Aelindra's Current Claims
- **Sorcery (Order Manipulation)**: 4 points
  - Justification: "Years of study under her master in the Soul Realm..."
- **Scholarship**: 3 points
  - Justification: "Extensive study of Shadow Realm lore..."
- **Available**: 3 points remaining

## Example Usage

### Player Allocates Points
```bash
POST /api/claims/allocate
{
  "character_id": 1,
  "attribute_name": "Pattern Mastery",
  "points_to_add": 3,
  "justification": "Walked Corwin's Pattern and survived the ordeal"
}
```

### DM Sets Perception
```bash
POST /api/claims/perception
{
  "observer_character_id": 1,
  "target_character_id": 2,
  "attribute_name": "Warfare",
  "perceived_points": 7,
  "perception_notes": "Saw them defeat three knights effortlessly"
}
```

### DM Grants Bonus Points
```bash
POST /api/claims/grant-points
{
  "character_id": 1,
  "points": 5,
  "reason": "Merged Order and Chaos magic, transcending traditional limits"
}
```

## Suggested Attributes

Feel free to use any attribute names, but here are categories that work well:

### Powers
- Pattern Mastery
- Logrus Mastery
- Trump Artistry
- Shadow Walking
- Shape Shifting

### Combat
- Warfare
- Strength
- Endurance
- Strategy & Tactics

### Mental/Social
- Scholarship
- Psyche
- Diplomacy
- Subterfuge

### Campaign-Specific Magic
- Sorcery (Order Manipulation)
- Chaos Magic
- Blood Magic
- Resonant Translocation

## Integration Ideas

### With Feat System
- Spend 1 feat → Gain 1 claim point
- Or: specific feats grant automatic claim increases

### With Progress Tracking
- Link claim increases to sessions in history
- Justifications reference story events
- Shows character growth narratively

## Next Steps for UI

When ready for Phase 2, we could add:
- Visual ranking displays
- Comparison charts
- Claim allocation interface
- Perception management UI
- Historical timeline of claim changes

## Philosophy

This system captures three key Amber concepts:

1. **Comparative Power** - You're not "strong", you're "stronger than Benedict" (or not)
2. **Incomplete Information** - Like Corwin, characters learn about each other over time
3. **Reputation vs Reality** - Eric was feared more than his actual ability warranted

The asynchronous nature means the "auction" unfolds organically as characters are created and develop, rather than requiring everyone present at once.

## Documentation

See [ATTRIBUTE_CLAIMS_SYSTEM.md](ATTRIBUTE_CLAIMS_SYSTEM.md) for complete API documentation, usage examples, and design philosophy.

---

**The system is live and ready to use!** 🎲

Test it at: `http://localhost:3002/api/claims/`
