# Attribute Claims System - Amber-Style Rankings

## Overview

The Attribute Claims system implements an Amber Diceless RPG-inspired ranking mechanism adapted for asynchronous character creation. Players allocate **claim points** to establish their character's relative superiority in various attributes, creating a dynamic hierarchy that emerges over time.

## Key Concepts

### 1. The Corwin/Eric Problem

In the Amber books, Corwin *believed* Eric was the best swordsman in the family, but this was Eric's perception management rather than truth. Our system captures this:

- **Actual Rankings**: What's really true (DM sees this)
- **Perceived Rankings**: What each character *thinks* is true (player view)
- Characters may be wrong about each other's abilities

### 2. Flexible Point Pool

Unlike the original Amber auction (one-time bidding), characters have:
- **Initial Pool**: 10 claim points at creation
- **Spending Over Time**: Can allocate points whenever justified narratively
- **DM Grants**: Can earn more points for character growth
- **Justification Required**: Must explain *why* the character improved

### 3. Beat to Lead

To claim superiority, you must **exceed** the current leader's points:
- Current leader has 4 points → You need 5 points to surpass them
- Ties are possible and interesting (creates rivalries)
- Later characters face higher "entry costs" for contested attributes

## Database Schema

### Tables

**attribute_claims**
- Stores actual point allocations
- One row per character per attribute
- Tracks justification and timestamps

**perceived_rankings**
- What Character A thinks about Character B's ability
- Allows for misinformation, reputation, and secrets
- Creates narrative opportunities

**claim_point_pools**
- Tracks available points per character
- Auto-calculates spent vs available
- Starts at 10 total points

**claim_history**
- Audit trail of all claim changes
- Links to sessions when relevant
- Tracks point grants from DM

## API Endpoints

### Get Claim Pool
```http
GET /api/claims/pool/:character_id
```
Returns available and spent points for a character.

### Get Character's Claims
```http
GET /api/claims/character/:character_id
```
Returns all attribute claims for a character.

### Get Actual Rankings (DM View)
```http
GET /api/claims/rankings/actual/:attribute_name
```
Returns **true** rankings for an attribute (all characters).

### Get Perceived Rankings (Player View)
```http
GET /api/claims/rankings/perceived/:character_id/:attribute_name
```
Returns what Character X *thinks* about everyone's rankings in an attribute.

### Allocate Claim Points
```http
POST /api/claims/allocate
```
**Body:**
```json
{
  "character_id": 1,
  "attribute_name": "Warfare",
  "points_to_add": 3,
  "justification": "Trained with legendary swordmaster for years"
}
```

Adds points to an attribute claim. Validates:
- Enough points available in pool
- Justification provided
- Updates pool and history automatically

### Set Perceived Ranking
```http
POST /api/claims/perception
```
**Body:**
```json
{
  "observer_character_id": 1,
  "target_character_id": 2,
  "attribute_name": "Warfare",
  "perceived_points": 6,
  "perception_notes": "Heard rumors of their prowess in the Depths"
}
```

Sets what one character believes about another's abilities.

### Grant Additional Points (DM Only)
```http
POST /api/claims/grant-points
```
**Body:**
```json
{
  "character_id": 1,
  "points": 5,
  "reason": "Walked the Pattern, unlocking deeper potential"
}
```

DM can grant additional claim points for major character milestones.

### View Claim History
```http
GET /api/claims/history/:character_id
```
Returns audit trail of all claim changes for a character.

### View All Rankings
```http
GET /api/claims/rankings/all
```
Returns all attributes with rankings (DM dashboard view).

## Example Attributes

You can use any attribute name, but here are suggested categories:

### Amber Powers
- Pattern Mastery
- Logrus Mastery
- Trump Artistry
- Shadow Walking
- Shape Shifting

### Combat
- Warfare (overall combat skill)
- Strength
- Endurance
- Strategy & Tactics

### Mental/Social
- Scholarship
- Psyche (mental defense/attack)
- Diplomacy
- Subterfuge

### Magic (Custom)
- Sorcery (Order Manipulation)
- Chaos Magic
- Blood Magic
- Shadow Manipulation

## Usage Example

### Character 1: Aelindra (First Character)

**At Creation:**
- Spends 4 points on "Sorcery (Order Manipulation)"
- Spends 3 points on "Scholarship"
- Has 3 points remaining

**Rankings:**
- Sorcery: Aelindra (4 points) - **Leader**
- Scholarship: Aelindra (3 points) - **Leader**

### Character 2: Kael (Later Character)

**At Creation (sees Aelindra's claims):**
- Wants to be top warrior, spends 5 points on "Warfare"
- Wants to challenge Aelindra in magic, spends 5 points on "Sorcery (Order Manipulation)"

**Rankings:**
- Warfare: Kael (5 points) - **Leader**
- Sorcery: Kael (5 points), Aelindra (4 points)
- Scholarship: Aelindra (3 points) - **Leader**

### Perceived vs Actual

**Kael's Perception** (set by DM or player):
- Thinks Aelindra has 3 points in Sorcery (underestimating her)
- Reason: "She seems scholarly but not particularly powerful"

**Aelindra's Perception:**
- Thinks Kael has 7 points in Sorcery (overestimating him)
- Reason: "Witnessed him casting powerful spells in Deidre"

**Reality** (DM knows):
- Kael: 5 points
- Aelindra: 4 points

This creates dramatic irony and potential for character growth.

### Midpoint: Increasing a Claim

**Aelindra after Session 5:**
```json
{
  "character_id": 1,
  "attribute_name": "Sorcery (Order Manipulation)",
  "points_to_add": 2,
  "justification": "Discovered how to draw power from Shadow Eaters, dramatically expanding her understanding of Order/Chaos dynamics"
}
```

**New Rankings:**
- Sorcery: Aelindra (6 points), Kael (5 points) - **Leadership changed!**

## DM Considerations

### When to Grant Points
- Walking the Pattern/Logrus
- Major character revelations
- Completing significant training arcs
- Discovering unique abilities
- Epic feats of "unknown unknown"

### Managing Perceptions
- Let players set their own perceptions (more ownership)
- DM can override when characters learn truth
- Use perception changes as story beats
- Reveal truth through gameplay, not exposition

### Attribute Granularity
- Start broad ("Warfare" not "Longsword vs Rapier")
- Can add specific sub-attributes later
- Balance between meaningful and overwhelming

### Point Inflation
- Start with 10 points total
- Grant sparingly (1-3 points for major milestones)
- Remember: comparative rankings matter more than absolute numbers
- A 1-point difference is significant

## Integration with Existing Systems

### Feat System
- Could spend **1 feat** to gain **1 claim point**
- Or: certain feats grant automatic claim increases
- Links character growth systems

### Progress Tracking
- Link claim increases to session_id in claim_history
- Justifications reference story events
- Creates narrative continuity

### Character Sheets
- Display character's claims prominently
- Show perceived rankings of other characters
- Hide actual rankings from players

## Future Enhancements

### Phase 2+
- Player UI for managing claims
- Visualization of ranking hierarchy
- Comparison tools (see all characters in one attribute)
- Automatic perception generation based on demonstrations
- Integration with dice rolls/conflict resolution

### Advanced Features
- Contested claims (challenge system)
- Public vs secret claims
- Attribute dependencies
- Point trading between characters

## Philosophy

This system embraces the Amber concept that **reputation, perception, and reality** are three different things. Characters operate on incomplete information, creating opportunities for:
- Surprises in conflict
- Character development through revelation
- Strategic use of reputation
- Narrative tension

The asynchronous nature means the "auction" happens over time, with each new character seeing and responding to what came before - much like how Corwin learned about his family's abilities gradually throughout the books.
