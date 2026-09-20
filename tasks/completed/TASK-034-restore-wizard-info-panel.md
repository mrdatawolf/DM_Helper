# TASK-034: Restore contextual info panel across all wizard steps

Owner role: Implementer
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-19
Approved by: Patrick
Approved date: 2026-09-19
Related contracts: CONTRACT-002. This is a host-level chrome concern (the
info panel is not owned by any one system/universe step), so the design here
likely belongs in `public/js/player/player-wizard-host.js` (TASK-029) or the
wizard bootstrap (`player-wizard.js`, TASK-032) rather than any individual
step file.
Related ADRs: ADR-005.
Dependencies: TASK-029 (host), TASK-032 (cut-over wizard this lands in).
Related tasks: TASK-033 (shadow-specific selection UI — narrower and can
proceed independently; this task is the general fix TASK-033 deferred).

## Desired outcome

Every wizard step shows contextual lore/help content on its right-hand side
again, the way the pre-cutover wizard did, working within the new
step-based/host-owned model rather than the retired global focus-listener
mechanism.

## Context

Confirmed during manual browser testing of TASK-032's cut-over wizard
(2026-09-19, Patrick): "the right side is fully broke on every step now."

Before the cutover, `public/js/player/player-wizard-core.js` drove a
docked info panel (`#wizard-info-panel`, markup still present and unused at
`public/player-dashboard.html` lines 760-778) with four labeled sections —
`Flavor`, `Mechanics`, `Consider`, `In Play` (the `example` key) — populated
two ways: a per-step default (`WIZARD_STEP_INFO[wiz.step]`) shown at rest,
and a per-field override (`FIELD_INFO[el.id]`) shown on focus/blur of a
specific input, via `wizardFocusField`/`wizardBlurField`/`wizardShowInfoPanel`/
`wizardResetInfoPanel`. TASK-032 correctly retired this entire mechanism as
dead code when the old wizard files were deleted — it depended on global
`wiz.step` state and DOM ids (`w-name`, `w-shadow`, etc.) that don't exist in
the new composed step model. No replacement was designed, because
CONTRACT-002 doesn't describe one; this is a real gap that only surfaced
once a human clicked through the real UI, not something any of the automated
tests (which don't assert on this panel at all) could have caught.

The underlying content wasn't deleted — `FIELD_INFO` and `WIZARD_STEP_INFO`
still exist in `src/universes/amber/content/player-wizard-data.js` (and
presumably need a `dnd5e`-owned equivalent for system-owned fields like
identity/ability-scores/class-selection, which never had `FIELD_INFO`
entries under the old system since those fields were previously
universe-agnostic in practice — confirm whether any system-side lore content
existed and was lost, or whether this content was always universe-only).

Also worth a small, related UX note: the class-recommendation advisory step
(TASK-031, step id `universe:amber:class-advisory`) is read-only by design
per CONTRACT-002 — during testing this looked like "no choices" on that
step, which is correct behavior, but nothing currently signals to a player
that a step with no interactive controls is intentional rather than broken.
Consider a small visual cue (e.g. a subtitle) on advisory-only steps as part
of this task or a quick follow-up.

Resolved 2026-09-19 (Patrick): per-step static info only, no per-field
focus-triggered switching — CONTRACT-002 amended accordingly (see its
"Contextual info panel" paragraph and Amendments section). This recovers
most of the lost value with far less new host machinery than replicating
the old focus/blur delegation would need.

## Scope

### Included

- `public/js/player/player-wizard-host.js`: when rendering the current
  step, if it declares `info`, populate the docked panel
  (`#wizard-info-panel` markup already present in `player-dashboard.html`)
  with its `title`/`flavor`/`mechanics`/`consider`/`inPlay` sections (hiding
  any section whose value is absent, matching the old
  `_renderLoreSection`'s hide-if-empty behavior); otherwise show a neutral
  default (e.g. panel hidden or a generic placeholder — implementer's call,
  document it).
- Add `info` to each Amber step that had a `WIZARD_STEP_INFO`/`FIELD_INFO`
  equivalent before the cutover: `amberAttributesStep` (`WIZARD_STEP_INFO[2]`,
  already partially inlined — this task makes it the docked panel content
  instead of/in addition to the inline paragraph, implementer's call on
  whether to keep both or consolidate), `flawsTraitsStep`. `shadowOriginStep`
  is excluded — TASK-033 already gave it a different, card-based info
  display; don't add a competing panel for the same content.
- Confirm whether `dnd5e`'s identity/ability-scores/class-selection steps
  ever had equivalent lore content before the cutover (check
  `FIELD_INFO`/`WIZARD_STEP_INFO` keys against old field ids `w-name`,
  `w-race`, `stat-*`, etc. in `src/universes/amber/content/player-wizard-data.js`
  — if none existed, these steps simply declare no `info` and show the
  neutral default, which is correct, not a gap).
- The small advisory-step UX cue: give `classAdvisoryStep`
  (`universe:amber:class-advisory`) an `info` (or a small in-render subtitle)
  clarifying it's guidance-only, so a player doesn't mistake "no controls"
  for broken.

### Excluded

- Per-field focus-triggered switching within a step — explicitly not in
  scope per the resolved design.
- Content authoring beyond what's needed to populate `info` from existing
  `FIELD_INFO`/`WIZARD_STEP_INFO` content.
- `shadowOriginStep` — already handled by TASK-033's card picker.

## Plan

1. Add `info` rendering to the host's step-display logic, with a defined
   neutral-default behavior.
2. Add `info` to `amberAttributesStep` and `flawsTraitsStep`.
3. Add the advisory-step UX cue to `classAdvisoryStep`.
4. Confirm (don't assume) whether any `dnd5e` step content was lost;
   document the finding either way.
5. Update `tests/player-wizard-host.test.js` (fixture-based `info` rendering
   coverage) and `tests/amber-wizard-steps.test.js`/
   `tests/player-wizard-integration.test.js` as needed.
6. `npm test`; manual browser check that the panel shows real content on
   the Amber attributes and flaws/traits steps, and a neutral default
   elsewhere.

## Acceptance criteria

- [ ] A step declaring `info` populates the docked panel with its sections,
      hiding empty ones; a step without `info` shows a defined neutral
      default, not an error or stale content from a previous step.
- [ ] `amberAttributesStep` and `flawsTraitsStep` declare real `info` content
      sourced from existing `FIELD_INFO`/`WIZARD_STEP_INFO` data.
- [ ] `classAdvisoryStep` clearly signals it's guidance-only, not broken.
- [ ] The finding on whether `dnd5e` steps ever had lore content is
      documented in the handoff, not silently assumed either way.
- [ ] `tests/player-wizard-host.test.js` includes fixture-based coverage of
      both the `info`-present and neutral-default cases.
- [ ] `npm test` passes.

## Validation requirements

- `npm test`, including new panel-rendering coverage — an automated test
  must assert the panel shows real content per step, not rely on manual
  testing alone (this is exactly what was missed the first time).
- Manual browser verification across the Amber attributes, flaws/traits,
  and class-advisory steps, plus at least one `dnd5e`-only step to confirm
  the neutral default doesn't look broken.

## Risks and assumptions

- This is chrome/UX work, not data-correctness work, but it's clearly
  something Patrick relies on when creating a character — worth treating as
  a real defect to fix promptly, not cosmetic polish to defer indefinitely.
- Don't consolidate/duplicate `amberAttributesStep`'s existing inline
  `WIZARD_STEP_INFO[2].flavor` paragraph and the new docked panel without a
  deliberate choice — document whichever way it lands.

## Blocker

None.

## Implementation handoff

### Changes made

- Added optional `infoPanel` chrome handling to `createWizardHost()`. Each
  render now shows the active step's static `info` title and populated
  `flavor`/`mechanics`/`consider`/`inPlay` sections, and hides absent
  sections.
- Wired the existing `#wizard-info-panel` into the real wizard bootstrap.
- Defined the neutral default as an empty `is-default` panel: its decorative
  sigil remains visible, while the title and every lore section are hidden
  and cleared. This prevents stale content from the preceding step without
  inventing generic lore copy.
- Added static info sourced from `WIZARD_STEP_INFO[2]` and
  `WIZARD_STEP_INFO[4]` to `amberAttributesStep` and `flawsTraitsStep`.
  Removed the attributes step's duplicate inline flavor paragraph so that
  content appears only in the restored docked panel.
- Added a static `Guidance Only` info cue to `classAdvisoryStep` explaining
  that the step is read-only and intentionally has no controls.
- Left `shadowOriginStep` without `info`; its TASK-033 card display remains
  the sole contextual presentation for that step.
- Added host fixture coverage for populated, omitted, paragraph-split, and
  neutral-default panel states, plus Amber step coverage for real content,
  advisory messaging, and shadow-origin exclusion.

### Validation performed

- `node --test tests/player-wizard-host.test.js tests/amber-wizard-steps.test.js tests/player-wizard-integration.test.js`
  — passed, 22 tests and 0 failures.
- `npm test` — passed, 118 tests and 0 failures.
- No real browser was available, so the required manual browser verification
  was not performed. Automated JSDOM coverage exercised the panel DOM updates
  and real Amber step declarations, but visual layout remains for review.

### Assumptions and deviations

- Chose the task-authorized empty/hidden-content neutral default rather than
  authoring a generic placeholder.
- Direct inspection found that Amber's legacy `WIZARD_STEP_INFO` has defaults
  for steps 1, 3, and 5, and Amber's `FIELD_INFO` has entries for D&D-owned
  fields including `w-name`, `w-race`, `w-backstory`, all six `stat-*` keys,
  and `w-level`. However, the D&D system content module has never contained
  `FIELD_INFO` or `WIZARD_STEP_INFO`; those old entries are Amber-specific
  lore. Per this task's approved plan, its content-authoring exclusion, and
  CONTRACT-002's system/universe independence, no Amber lore was moved into
  the D&D module and the D&D-owned steps use the neutral default.
- `WIZARD_STEP_INFO`'s legacy `example` property is mapped to the contract's
  `info.inPlay` property at each Amber step declaration.
- No per-field listeners or focus-triggered switching were added.

### Unresolved risks

- Visual behavior has not been manually verified in a real browser because
  one was unavailable in the implementation environment.

### Documentation updated

- Updated this implementation handoff only. No contract, ADR, or general
  project documentation changes were needed because the implementation
  follows the already-amended CONTRACT-002 behavior.

## Review

Reviewer: Claude
Date: 2026-09-19

- Read `renderInfoPanel()` in full: matches the old `_renderLoreSection`'s
  behavior faithfully (splits `flavor`/etc. on `\n\n` into paragraphs, hides
  a section with no content, toggles `.is-default` and clears the title when
  the current step has no `info`) — called once from the single `render()`
  path, so it updates correctly after both `next()` and `back()` with no
  duplicate call sites to drift out of sync.
- Confirmed `player-wizard.js` wires the real `#wizard-info-panel` element
  in; confirmed `amberAttributesStep`/`flawsTraitsStep`/`classAdvisoryStep`
  each declare real `info` sourced from existing `WIZARD_STEP_INFO`
  content, and `shadowOriginStep` correctly declares none (TASK-033 already
  owns its display).
- Caught and independently verified the one judgment call worth surfacing:
  `amberAttributesStep`'s old inline `WIZARD_STEP_INFO[2].flavor` paragraph
  was removed in favor of the same content living only in the docked panel
  — a real behavior change (that paragraph used to always render as page
  content, not just in the side panel) but a reasonable one, and correctly
  flagged in the handoff rather than silently deviating.
- **Independently verified the dnd5e lore-content finding rather than
  trusting the handoff's claim**: grepped
  `src/universes/amber/content/player-wizard-data.js` directly and confirmed
  `FIELD_INFO` does have entries for D&D-owned fields (`w-name`, `w-race`,
  `stat-STR` through `stat-CHA`, `w-level`) and `WIZARD_STEP_INFO` has
  defaults for the identity/ability-score/class-selection steps — all
  Amber-authored, none of it native to a `dnd5e` content module that never
  had `FIELD_INFO`/`WIZARD_STEP_INFO` of its own. The handoff's conclusion
  (no lore was moved into the dnd5e module, since doing so would violate
  CONTRACT-002's system/universe independence — a system step can't import
  universe content) is correct and appropriately conservative. Worth
  flagging as a real, if narrow, residual gap for a future task if wanted:
  this Amber-authored guidance about dnd5e-owned fields (e.g. "your species
  reflects which shadow you came from") has no surface in the new model at
  all, for any dnd5e+amber pairing — not a defect in this task's scope, but
  a genuine content loss worth a deliberate decision rather than silent
  permanence.
- Read the new fixture-based host tests: populated info, omitted info
  (neutral default), multi-paragraph splitting, and the neutral-default
  clearing stale content from a prior step are all covered with real,
  specific assertions (e.g. asserting `display: 'none'` and cleared
  `textContent`), not just presence checks.
- Independently reran `npm test`: 118/118 passing, matching the handoff.

No blocking findings. This correctly stayed within the resolved per-step-only
scope, made a defensible and disclosed judgment call on the duplicate
flavor paragraph, and was honest about a real architectural limit
(dnd5e/Amber content independence) rather than working around it improperly.
Ready for human acceptance — manual visual verification (panel layout,
dark theme, the neutral-default sigil state) is still the one open item.

## Human acceptance

Pending.
