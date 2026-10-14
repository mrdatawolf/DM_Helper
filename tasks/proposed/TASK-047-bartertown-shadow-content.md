# TASK-047: Bartertown shadow content

Owner role: Implementer
Assigned agent:
Proposed by: Claude Opus 5.5 with Patrick
Proposed date: 2026-10-13
Approved by:
Approved date:
Related contracts: None.
Related ADRs: ADR-005 (campaign/system/universe model).
Dependencies: A copy of the production database, for the migration step only.
Follows the file layout established in TASK-046.

## Desired outcome

"The Shattering of the Liminal" has a new shadow, Bartertown, with
player-facing lore, DM notes, its people and creatures, and a planned visit of
a few short missions, all stored in the repository. Once a production database
copy is available, a rehearsed migration loads the shadow, its creatures, and
its story arc into the campaign.

## Context

Planned in conversation on 2026-10-13. The shadow is the world of the film
*Mad Max Beyond Thunderdome*, centered on Bartertown and the desert around it.
The campaign may not reach this shadow for some time, so the content must be
usable without the conversation that produced it.

### Where the content will live

- `Shadow Lore/Bartertown.md` — player-facing lore. Not yet written.
- `Shadow Lore/DM Notes/Bartertown.md` — DM-only notes. Not yet written. This
  becomes the working document.
- `Creature Index/Bartertown.md` — not yet written.

See TASK-046 for how the project stores this kind of content, why DM material
goes in the `DM Notes` subfolder, and the `.dockerignore` finding. Those apply
here unchanged.

### Decisions confirmed by Patrick

Frame:

- Shadow name is "Bartertown".
- Set before the events of the film. The film is the default future, not a
  script; it happens as shown if the players do nothing.
- The players are not the main characters. Film characters stay at the edges
  and none is required, though any may appear.
- Neither Aunty Entity nor Master Blaster asks the players for anything
  directly. Each job comes from a lower-level person on that side.
- Neither side is the villain. Aunty built law out of nothing and Master keeps
  the lights on. The feud is what endangers the town. This is deliberately a
  different lesson from TASK-046.
- Characters are kept out of the Thunderdome. The Wheel is used instead, as a
  random-outcome table. Its "Gulag" result, exile into the desert, can start a
  desert mission after a failure.
- The source is thin compared with a novel, so most of the desert is invented.
  The film still tells us what kinds of people and things belong there.
- One visit made of a few short missions, used to explore the town and the
  desert. This differs from TASK-046's one job per visit with time skips.

Who it is for:

- Not fixed. It may be run twice: once for two characters and once for a
  single character. Every mission must work for one character.
- Other characters likely to come here are weapon users (bow, blades).
- How the characters arrive is not decided and will be explored later.

Magic:

- Magic works here, but only barely. Patrick will work out how this affects a
  magic user. Weapon users are unaffected.

The spine, "The Second Mind":

- Master cannot be touched because only he understands the methane plant.
- Aunty's side wants someone who could replace him. The person who taught
  Master is alive at an old-world gas works in the desert. He exists.
- Master's side needs a part for the plant that cannot be made in Bartertown.
  It is at the same gas works. It exists.
- The players are asked to do both jobs on one trip to the same place.
- There may be reasons that neither the teacher nor the part can ever go to
  Bartertown, unless the players create a way.

Missions:

1. Entry. The characters have nothing to trade, so labor is taken at the gate
   and they are sent below to Underworld. An embargo hits while they are there.
   Patrick expects this mission to carry many problems of its own.
2. The run. One desert trip for two employers.
3. The delivery. Who gets what, and whether anyone learns they took both jobs.

Rewards:

- Some XP, and a debt owed to the characters by whoever they served.
- A failed mission may leave a negative debt: the characters owe, or are owed
  a grudge.

### Further decisions confirmed by Patrick

The askers:

- Both askers are new people, not film characters.
- Neither ruler knows about the job done in their name. On Aunty's side the
  asker thinks she would want it. On Master's side the asker is Underworld crew
  who know the plant is close to a real failure and that Master is too proud to
  admit he needs anything.

The gas works:

- The teacher does not want to return to Bartertown.
- The teacher cannot return: he was exiled by the Wheel years ago. Under "bust
  a deal, face the wheel" his return means death, and Aunty cannot set aside
  her own law without weakening it.
- The part cannot leave: it is in use. It runs the pump or power that keeps
  the gas works livable.
- The settlement at the gas works has dwindled to almost no one.

The run:

- The desert is crossed on foot.
- Either job alone should be very hard. There is no ordinary way to do both.
  Doing both may be where the characters' magic or Liminal power comes in.
- Apart from that, missions are written assuming magic is of very little help.

Running it:

- Missions are written to a stated level of 1 to 2 with scaling notes, not to
  specific characters.
- If it is run for a single character, a guide NPC travels with them.

### Third round, confirmed by Patrick

These replace anything earlier that conflicts with them.

The gas works:

- A small community lives at the gas works, large enough that taking the part
  is a moral choice. This replaces "dwindled to almost no one".
- One of them is being taught by the teacher and can serve as an apprentice.

The teacher's exile:

- The teacher and Master built the plant together. Master feared that Aunty
  and the teacher would throw him out, so he betrayed the teacher and brought
  him before the Wheel.
- Aunty therefore wants the teacher back and Master wants him to stay gone.
  The betrayal is also why the teacher will not return willingly.
- Aunty's own law still bars his return.

What counts as success on Aunty's side:

- Kidnapping the teacher is possible; this is that kind of world.
- For the characters, getting the knowledge from him and bringing back an
  apprentice is enough.

Magic and the way out:

- The Liminal is the one power a magic user can still use here.
- Working out how to use the Liminal in this shadow is how both jobs can be
  done, and it is also how the characters find their way out of the shadow.

### Proposed by Claude and not yet confirmed

- Master's crew, who ask for the part, do not know the teacher is at the gas
  works. Master would know at once where the part came from.
- Ordinary ways around the barriers, each very hard: a new deal or pardon,
  copying the part, or finding a substitute for it.
- Proposed stats: Order 25 / Chaos 50 / Dream 25, not a starting shadow.
  Pattern influence undecided.
- Alternative or additional mission material, held in reserve: a pig and feed
  caravan (the plant runs on pigs), and the lost children at the Crack in the
  Earth. The second pulls toward the film's main plot and is better kept for a
  later visit.

## Scope

### Included

- Player-facing lore and DM notes for the shadow.
- Creature and NPC entries for the visit.
- The visit planned as three missions, each runnable for one or two
  characters, with outcomes for success, failure, and playing both sides.
- A Wheel table.
- An outline of what a later return finds, after the film's events.
- After a production database copy is available: a migration adding the shadow,
  its creatures, and its story arc to the campaign, rehearsed against the copy.

### Excluded

- Rules for how weak magic affects a magic user. Patrick owns this; the DM
  notes record the result once decided.
- How the characters reach the shadow.
- Any schema change, including a place to record debts. Debts are written in
  the DM notes and session notes for now.
- Changing the lore route's authorization or Docker packaging.
- Planning beyond an outline of the return.

## Plan

1. Confirm or replace the unconfirmed items above.
2. Settle the open questions:
   - How the Liminal is used here, what it costs, and how that use both solves
     the two jobs and opens the way out. Patrick owns the mechanic.
   - Whether a party with no magic user can ever do both jobs, and how such a
     party leaves the shadow.
   - Names for both askers, the teacher, and the apprentice.
   - The deal the teacher was made to break.
   - The part: what it is and how heavy, given it is carried out on foot.
   - How many days the walk is and where water is found on it.
   - XP per mission, and the form a debt and a negative debt take.
   - What each outcome changes about the film's events and the return.
3. Check film details against the film. They are written from memory.
4. Write `Shadow Lore/Bartertown.md` and `Shadow Lore/DM Notes/Bartertown.md`.
5. Write `Creature Index/Bartertown.md` from the template: gate guard, Aunty's
   guard, Underworld laborer, trader, scavenger, raider, the pilot-thief, pigs,
   and desert hazards (thirst, heat, bad water, sinking sand, dust storm).
6. Decide what goes in the database: the shadow row, NPC rows, and a story arc
   with chapters and beats. Because the characters are not fixed, decide
   whether the arc attaches to any character at migration time.
7. With a production database copy: confirm the campaign id and that the shadow
   name is unused, write the migration with rows matched by name, and rehearse
   it against the copy before applying it.

## Acceptance criteria

- [ ] Unconfirmed items and stats confirmed or replaced by Patrick.
- [ ] Player-facing lore contains no DM-only material.
- [ ] DM notes cover the truth of the setting, all three missions, the Wheel,
      and the return, with no open questions that block running the visit.
- [ ] Each mission is runnable with one character.
- [ ] Creature entries follow `Creature Index/TEMPLATE.md`.
- [ ] Migration is idempotent, scoped to the correct campaign, and rehearsed
      against a production copy without modifying the live database.
- [ ] After migration, the shadow, its lore, and its creatures appear in the
      campaign for the DM, and players see only what is intended.

## Validation requirements

- Read-through of the player-facing file for spoilers.
- Migration test in the style of `tests/shelvar-beasts.test.js`.
- Rehearsal against a timestamped copy of the production database.
- Full `npm test`.
- Manual check in the browser as a DM and as a player.

## Risks and assumptions

- The setting and several characters come from a film. The lore is written in
  original wording for private campaign use; if the repository is public,
  Patrick should decide how much derived detail belongs in it.
- Film details may be misremembered until checked.
- The weak-magic rules are undecided. A mission that assumes a spell works, or
  assumes it does not, may need rewriting once they are.
- The campaign may not reach this shadow for a long time. Character levels and
  party makeup at that point are unknown, so encounters need a stated intended
  level and notes on scaling.
- The production campaign id is assumed to be 1. Unverified against production.

## Blocker

Migration work is blocked until a production database copy is available.
Content work is not blocked.

## Implementation handoff

Not started.
