# Creature Stat Block Template

Standard format for every creature entry in the Creature Index. One shadow = one file. Each creature in that file follows this shape, in this order. This mirrors the format already established for the Eggari and Shadow Eater blocks in `Amber notes.md`, plus a couple of fields specific to this campaign.

Fields marked *(DB)* map directly onto the `npcs` table (`creature_type`, `armor_class`, `hit_points`, `stats` JSON) when this index eventually gets loaded into the database — keep names/values consistent so that move is a straight import, not a rewrite.

---

## [Creature Name] *(DB: creature_type)*

*Size type, alignment*

**Native Shadow:** which shadow it's from / found in (usually the file's own shadow, but call out if it turns up elsewhere too)
**Role:** Predator / Ally / Pet / Fae / Monster / etc. — matches the section heading it's filed under
**Order/Chaos Rating:** 0–100 *(0 = pure Chaos, 50 = neutral, 100 = pure Order — same scale as the character sheet's `order_chaos_value`)*
**Influence:** Pattern / Argent Refrain / Logrus / Nexus / Mixed / None *(which named power the creature is a creation or agent of — see Conventions below; not the same axis as the Order/Chaos Rating)*

**Armor Class** X (source, e.g. natural armor) *(DB: armor_class)*
**Hit Points** X (XdY + Z) *(DB: hit_points)*
**Speed** X ft., other movement modes

| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| X (±) | X (±) | X (±) | X (±) | X (±) | X (±) |

**Saving Throws** (only if proficient in any)
**Skills** (only if proficient in any)
**Damage Vulnerabilities/Resistances/Immunities** (as applicable)
**Condition Immunities** (as applicable)
**Senses** darkvision X ft. (etc.), passive Perception X
**Languages** as applicable, or "—"
**Challenge Rating** X (XP)

### Traits
Passive features — the "Special Abilities" the source notes already use (sensing, feeding, movement quirks, symbiosis, etc.). Non-combat or always-on effects go here.

### Actions
What it does on its turn in a fight: attacks with to-hit bonus, reach/range, and damage. Every creature gets at least one action even if it's rarely the one initiating combat — DMs still need a number to run when it's cornered.

### Reactions
(Only if it has any.)

### Lore
DM-facing background: myth, origin, relationship to the Pattern/Logrus/Order-Chaos balance, how locals regard it, hooks for using it in a session. This is where the worldbuilding paragraphs belong — keep crunch above, story here.

---

## Conventions

- **Order/Chaos Rating** is new to this index (not used in the original two source docs). Use it to signal how a creature reacts to Pattern/Logrus-adjacent magic, nexus points, and Order/Chaos-shifting effects — mundane wildlife with no cosmological role should just sit at 50.
- **Influence** reuses the exact vocabulary the DM dashboard already has for shadows (`pattern_influence`: Pattern / Argent Refrain / Logrus / Nexus / Mixed / None — see the shadow filter buttons in `dm-dashboard.html` and the CHECK constraint in `schema.sql`), so creature cards can share the same label/color-coding helpers (`patternInfluenceLabel`/`shadowInfluenceCardStyle` on the DM side, `visitedInfluenceLabel`/`visitedShadowCardStyle` on the player side) instead of inventing new ones. Order/Chaos Rating is a *degree* (how order-aligned vs. chaos-aligned); Influence is a *lineage* (which named cosmic power the creature was made by, serves, or answers to). A creature doesn't automatically inherit its home shadow's Influence — the Shadow Eater is a Soul Realm creature but its Influence is Argent Refrain, because Corwin's Pattern created it and sent it there. Most ordinary wildlife should be **None**.
- Keep the compact inline stat-line style (`STR: 14 (+2) DEX: 18 (+4) ...`) *or* the table above — pick one per file and stay consistent within it. New entries in this project use the table for readability; the table and the inline line are equivalent, table is preferred going forward.
- CR should be eyeballed against existing party level, not calculated to the letter — this is a narrative campaign, not a monster-design exercise. Use the DMG CR/XP chart as a sanity check, not gospel.
- Group creatures under the same role headings the source docs already use (**Predators**, **Allies**, **Pets**, **Fae**, etc.) so each shadow file reads as a quick-reference list, not just a wall of blocks.
- When a creature (or a near-identical cousin) shows up in more than one shadow, note it under **Native Shadow** and cross-reference the other file rather than duplicating the full block — shadows-as-reflections means convergent/parallel creatures are expected, not an error.
