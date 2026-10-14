# TASK-046: The Bridge of the Gods shadow content

Owner role: Implementer
Assigned agent:
Proposed by: Claude Opus 5.5 with Patrick
Proposed date: 2026-10-13
Approved by:
Approved date:
Related contracts: None.
Related ADRs: ADR-005 (campaign/system/universe model).
Dependencies: A copy of the production database, for the migration step only.

## Desired outcome

"The Shattering of the Liminal" has a new shadow, The Bridge of the Gods, with
player-facing lore, DM notes, its creatures, and a planned first visit, all
stored in the repository. Once a production database copy is available, a
rehearsed migration loads the shadow, its creatures, and its story arc into the
campaign.

## Context

Planned in conversation on 2026-10-13. Patrick is away from the production
database, so content is being written into the repository first and migrated
later. This is the first of several planned content additions.

### Where the content lives

- `Shadow Lore/The Bridge of the Gods.md` — player-facing lore, drafted.
- `Shadow Lore/DM Notes/The Bridge of the Gods.md` — DM-only notes, drafted.
  This is the working document; read it first when picking this up.
- `Creature Index/The Bridge of the Gods.md` — not yet written.

Both drafted files are uncommitted as of 2026-10-13.

### How the project stores this kind of content

- A location is a row in `shadows` (name, description, order/chaos/dream
  levels, pattern influence, corruption status, starting and spoiler flags,
  campaign id).
- `GET /api/shadows/:id/lore` serves `Shadow Lore/<shadow name>.md` when the
  filename matches the shadow name exactly (`src/routes/shadows.js`).
- Creatures are written to `Creature Index/TEMPLATE.md` format and loaded into
  `npcs`, with the stat block in the `stats` JSON column.
- Story structure uses `story_arcs`, `chapters`, and `beats`.
- Earlier content was loaded by numbered migrations that insert rows matched by
  name: `006-district-5.js` (shadow and arc) and `016-shelvar-beasts.js`
  (creatures).

### Two findings that shaped the layout

1. The lore route checks campaign membership only, not DM role. Anything in
   `Shadow Lore/<name>.md` is readable by every player in the campaign. That is
   why DM material is in a `DM Notes` subfolder, which the route cannot reach.
   This subfolder is new; older lore files such as `District 5.md` mix DM
   material into the served file.
2. `Shadow Lore` and `Creature Index` are both in `.dockerignore`. If
   production runs from the Docker image, lore files are not in it unless they
   are mounted. Unverified; check on the production host.

### Decisions made

Premise and frame:

- The shadow is the world of Roger Zelazny's *Lord of Light*. The book does not
  name the planet. "The Bridge of the Gods" is a working name taken from the
  golden band in its sky; Patrick asked for the book's planet name and has not
  yet confirmed this substitute.
- The book's story is the default, not a fixed script. Events happen as written
  if the players do nothing and can change if they act.
- The players are never the main characters. They arrive, do roughly one job
  that moves part of the story, and leave. Time runs faster there than in other
  shadows, so each return lands later in the story.
- The shadow must stand on its own; the book is a backdrop so the world does
  not have to be built from scratch.
- The players may see through the false gods quickly. What stays hidden is the
  gods' intent. Tone is mythic and seductive, covering moral corruption.
- If the players commit to the Accelerationists, this becomes a long campaign
  and is fleshed out from there.
- Body transfer depends on the band around the planet, so it does not work
  elsewhere. Exporting it is allowed as a player side goal, in the way Corwin
  got gunpowder working in Amber.
- The mind-probe works on Pattern and Refrain initiates, but the result looks
  like dreams, so the Masters of Karma assume the machine failed.

Visit one:

- Lily Lemondrop and Shorven of Shelvar (player characters, level 1, barely in
  control of their powers) are pulled out of the Liminal by a psychic cry.
- Set in Mahartha during Sam's time as Prince Siddhartha, just after the
  Masters of Karma take over body transfer. The gods are strong and the job
  appears good.
- The cry comes from a Rakasha bound into an unlicensed body merchant's
  apparatus.
- The job giver is an ordinary Master of Karma using the two characters to
  curry favor with the First.
- The Rakasha asks for help freeing a second Rakasha. It speaks of love and
  need; the real reason is a gambling debt to one of the still-free Rakasha.
- The second Rakasha is held in a trap built by Yama that the Masters are
  testing. Freeing it makes the trap look like a failure when Yama hears of the
  escape.
- The Rakasha's payment is a strengthening of the characters' flames: one extra
  level and a spiritual brand marking them as the demon's. The brand may be
  used later if a branded character dies.
- On the return, the players learn the gods had bad intentions and that their
  help moved an evil plan forward. On later visits they may work for the gods
  one time and the Accelerationists the next.

Details added by Claude during drafting and not yet confirmed by Patrick:

- Proposed stats: Order 80 / Chaos 12 / Dream 8, pattern influence Pattern,
  not a starting shadow.
- The Master of Karma is sincere and does not know what the closure of the
  body merchants will be used for.
- Yama's devices may react to the brand; the mind-probe does not show it.
- Freeing the second Rakasha requires breaking into the Hall of Karma without
  the Master learning who did it.
- Prince Siddhartha appears only in passing and notices the characters.
- Tak and Yama as the recurring faces across time skips.
- Outsiders are useful to both sides because they have no karmic record.

## Scope

### Included

- Finish the player-facing lore and DM notes for the shadow.
- Write the creature and NPC entries for visit one.
- Plan visit one fully and outline the return visit.
- After a production database copy is available: a migration adding the shadow,
  its creatures, and its story arc to the campaign, rehearsed against the copy.

### Excluded

- Changing the lore route's authorization or the Docker packaging of lore
  files. Each is a separate task if wanted.
- A sub-location table or any schema change.
- Planning visits beyond the return.
- Other new locations; each gets its own task.

## Plan

1. Confirm or replace the shadow name, then confirm the proposed stats and the
   unconfirmed details listed above.
2. Settle the open questions:
   - What the brand does when a branded character dies, and what the Rakasha
     charges for it.
   - Whether the extra level stays if the brand is removed.
   - Names for the Master of Karma, the body merchant, both Rakasha, and the
     free Rakasha who holds the debt.
   - What substitute for the band exists in the Dreaming, and its cost.
   - How much time passes between visit one and the return (decide when
     planning visit two).
   - Who bound the first Rakasha into the merchant's apparatus, and how.
3. Check the book details in the DM notes against the text. They were written
   from memory.
4. Write `Creature Index/The Bridge of the Gods.md` from the template: lesser
   Rakasha, a Rakasha lord, a Temple guard, the Master of Karma, the body
   merchant, and a way to represent a god's Attribute.
5. Decide what goes in the database for visit one: the shadow row, NPC rows,
   and a story arc with chapters and beats, and which characters the arc
   attaches to.
6. On the production host, check whether lore files are present in the running
   deployment.
7. With a production database copy: confirm the campaign id and that the shadow
   name is unused, write the migration with rows matched by name, and rehearse
   it against the copy before applying it.

## Acceptance criteria

- [ ] Shadow name and stats confirmed by Patrick.
- [ ] Player-facing lore contains no DM-only material.
- [ ] DM notes cover the truth of the setting, visit one, and the return, with
      no open questions that block running visit one.
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

- The setting and several characters come from a published novel. The lore is
  written in original wording for private campaign use; if the repository is
  public, Patrick should decide how much derived detail belongs in it.
- Book details may be misremembered until checked.
- An extra level for level 1 characters doubles their level; confirm this is
  the intended size of reward.
- The production campaign id is assumed to be 1, as in earlier content
  migrations. Unverified against production.

## Blocker

Migration work is blocked until a production database copy is available.
Content work is not blocked.

## Implementation handoff

Not started.
