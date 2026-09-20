# TASK-021: Update project scope docs for campaign-based multi-tenancy

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-12
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins) — this task carries out the doc update ADR-005 itself calls
for.
Dependencies: None

## Desired outcome

`docs/PROJECT.md` and `docs/ARCHITECTURE.md` accurately describe the
now-accepted direction: a campaign-based, multi-tenant tool where multiple
DMs each run their own campaign, choosing an independent game system and
universe/setting, rather than the single hardcoded Amber/D&D-5e campaign the
docs currently describe as the whole product. This is a documentation-only
task — no code, schema, or route changes.

## Context

`docs/PROJECT.md` currently states outright: "This is a small,
single-campaign tool, not a multi-tenant product. There is one DM and a
handful of players" (line 21-22), and explicitly lists "Multi-campaign or
multi-tenant support" under Excluded scope (line 52). ADR-005 (accepted
2026-09-12) supersedes this: the project is moving to Campaign as the
top-level tenant object, with System and Universe as independent, code-defined
plugin axes, and true multi-tenancy among a small, trusted, self-hosted group
of DMs.

`docs/PROJECT.md`'s Purpose, Users and stakeholders, Desired outcomes, and
Domain language sections are all currently written in terms of the single
Amber/D&D-5e/"Shattering of the Liminal" campaign and will need updating
alongside the Scope section, not just the one "Excluded" bullet, so the
document reads as one coherent description rather than a patched contradiction.
`docs/ARCHITECTURE.md` should be checked for the same single-campaign framing
(read it in full before editing — it was not included in this task's research
pass, so confirm what it currently claims rather than assuming its exact
wording).

This task exists specifically because ADR-005's Decision section states: "This
decision supersedes `docs/PROJECT.md`'s current scope statement... that
document needs a follow-up edit once this ADR is accepted."

## Scope

### Included

- Update `docs/PROJECT.md`:
  - Purpose: describe the tool as supporting multiple campaigns, each with
    its own DM-chosen system and universe, rather than one named campaign.
  - Users and stakeholders: remove "runs the single campaign this tool
    currently serves" framing; describe a DM as running one or more of their
    own campaigns.
  - Desired outcomes: keep the existing per-campaign outcomes (DM dashboard,
    player visibility, spoiler flagging) but state they apply per-campaign,
    not globally.
  - Scope → Excluded: remove "Multi-campaign or multi-tenant support" and
    replace with an accurate statement of what's still excluded per ADR-005
    (e.g., no runtime-installable system/universe packs, no public
    self-signup, no production-grade tenant-isolation hardening — see ADR-005
    Costs and risks / Alternatives considered).
  - Domain language: keep existing Amber-specific terms (Shadow, Primal
    pattern, Claim, etc.) but note they belong to the `amber` universe
    specifically, not the tool as a whole, since other universes may define
    their own terms.
  - Constraints: keep the existing technical/operational constraints
    (Node/Express/better-sqlite3, single SQLite file) — ADR-005 does not
    change these, it changes what the schema/routes model, not the stack.
- Read and update `docs/ARCHITECTURE.md` for the same single-campaign framing
  wherever it appears, consistent with ADR-005.
- Do not invent new architectural detail beyond what ADR-005 already
  decided — this task documents the accepted decision, it does not make new
  design choices. If something in `docs/PROJECT.md` or `docs/ARCHITECTURE.md`
  raises a question ADR-005 doesn't answer, note it in the handoff rather than
  deciding it unilaterally.

### Excluded

- Any code, schema, or route change — this is docs only.
- Rewriting sections of either document that aren't affected by the
  single-campaign → multi-campaign shift (e.g., unrelated technical
  constraints, existing role definitions that still hold).
- Editing any ADR file itself (ADR-005 stays as accepted; this task only
  updates the two project-level docs it references).

## Plan

1. Read `docs/PROJECT.md` and `docs/ARCHITECTURE.md` in full.
2. Cross-reference every place either document asserts single-campaign /
   non-multi-tenant scope against ADR-005's Decision and Alternatives
   considered sections.
3. Edit both documents to reflect the accepted direction, preserving their
   existing structure and tone.
4. Re-read both documents afterward to confirm they no longer contradict
   ADR-005 or each other.

## Acceptance criteria

- [x] `docs/PROJECT.md` no longer states the tool is single-campaign/non-multi-tenant;
      it accurately reflects ADR-005's campaign/system/universe model.
- [x] `docs/PROJECT.md`'s Excluded scope list reflects what ADR-005 actually
      excludes (runtime-installable packs, production-grade tenant isolation),
      not the old blanket "no multi-campaign" statement.
- [x] `docs/ARCHITECTURE.md` is checked and updated for the same framing if it
      contained it.
- [x] No code, schema, route, or test file is changed.
- [x] `npm test` still passes (should be a no-op given no code changes, but
      confirms nothing was accidentally touched).

## Validation requirements

- Manual read-through of both updated documents for internal consistency and
  consistency with ADR-005.
- `npm test` (no behavior change expected).

## Risks and assumptions

- Assumes `docs/ARCHITECTURE.md`'s exact current wording was not fully
  surveyed before writing this task — the implementer should treat "check
  ARCHITECTURE.md for the same framing" as a real research step, not a
  formality.
- Low risk overall since this is documentation-only.

## Blocker

None.

## Implementation handoff

Task: TASK-021 — Update project scope docs for campaign-based multi-tenancy
Implementer: openai-coder (Codex CLI)
Date: 2026-09-12

### Changes made

- Updated `docs/PROJECT.md` so its purpose, users, desired outcomes, and scope
  describe multiple DMs running multiple campaigns, with an independently
  selected code-defined System and Universe for each campaign.
- Reframed "The Shattering of the Liminal" as the first campaign and the
  Amber/D&D 5e reference implementation rather than the product's entire
  identity.
- Replaced the obsolete multi-campaign exclusion with ADR-005's actual scope
  boundaries: no runtime-installable packs/plugin manager/sandboxing, public
  self-signup, or production-grade SaaS tenant hardening.
- Clarified that the existing domain terms describe the `amber` reference
  universe and that other universes may define their own language.
- Updated `docs/ARCHITECTURE.md` to distinguish the current implicit
  single-campaign implementation from the accepted campaign-based architecture
  while preserving the existing single-process and single-SQLite-file system
  boundaries.

### Validation performed

- Manually read both updated documents in full and searched them for remaining
  single-campaign/non-multi-tenant framing; no statement contradicting ADR-005
  remains.
- Cross-checked the new campaign, System, Universe, character linkage, plugin,
  and deployment-scope wording against ADR-005's Decision, Alternatives
  considered, and Costs and risks sections.
- `npm test` — passed (74/74).

### Acceptance criteria evidence

- `docs/PROJECT.md` now consistently describes campaign-based multi-tenancy
  across Purpose, Users and stakeholders, Desired outcomes, Scope, and Domain
  language.
- Its Excluded scope now names the runtime plugin-management and
  production-grade tenant-hardening features ADR-005 rejects instead of
  excluding multi-campaign support itself.
- `docs/ARCHITECTURE.md` no longer says the product is designed for one operator
  and one campaign; it records Campaign as the tenant root and System and
  Universe as independent code-defined axes.
- Only the two scoped project documents and this task handoff were changed; no
  code, schema, route, or test file was changed.

### Assumptions and deviations

- Treated `docs/ARCHITECTURE.md`'s opening statement that it describes the
  current implementation as still authoritative. Its update therefore states
  both that one implicit campaign is the current implementation and that
  campaign-based multi-tenancy is the accepted incremental direction, rather
  than implying ADR-005's follow-up implementation work is already complete.
- No deviations from the approved scope.

### Unresolved risks

- None identified within scope.

### Documentation updated

- Updated `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, and this implementation
  handoff. No ADR was edited.

## Review

Reviewer: Claude
Date: 2026-09-12

Verified independently rather than trusting the handoff's self-report:

- `git show --stat fe9c745`: confirms only `docs/ARCHITECTURE.md`,
  `docs/PROJECT.md`, and this task file changed — no code, schema, route, or
  test file was touched, matching the acceptance criteria and the task's
  Excluded scope.
- Read the full diff for both documents directly. `docs/PROJECT.md` no longer
  asserts single-campaign/non-multi-tenant scope anywhere (Purpose, Users and
  stakeholders, Desired outcomes, Scope, Domain language all updated
  consistently); its Excluded list now names ADR-005's actual exclusions
  (runtime-installable packs/plugin manager/sandboxing, public self-signup,
  production-grade tenant hardening) rather than the blanket statement this
  ADR superseded. `docs/ARCHITECTURE.md` correctly distinguishes "currently
  implemented around one implicit campaign" from "accepted direction is
  multi-tenant," rather than overclaiming the ADR-005 follow-up work is
  already done — this is the right level of honesty for a docs-only task that
  precedes the actual schema/code changes.
- Cross-checked the new wording against ADR-005's Decision, Alternatives
  considered, and Costs and risks sections by hand; found no contradiction
  and no invented detail beyond what ADR-005 actually decided.
- Independently ran `npm test`: 74/74 passing, matching the handoff's claim.
- Domain language section's new framing ("other universes may define
  different domain language") is a reasonable, minimal addition — doesn't
  overreach into defining what a non-Amber universe's terms would look like.

No blocking findings. Acceptance criteria are genuinely satisfied, not just
checked off. Ready for human acceptance.

## Human acceptance

Pending.
