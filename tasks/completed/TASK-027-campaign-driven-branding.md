# TASK-027: Campaign/universe-driven home screen and branding

Owner role: Implementer
Assigned agent: openai-coder (Codex CLI)
Proposed by: Claude
Proposed date: 2026-09-12
Approved by: Patrick
Approved date: 2026-09-13
Related contracts: None
Related ADRs: ADR-005 (campaign as tenant root, with independent System and
Universe plugins) — explicitly sequences this last: "Home screen, nav
branding, and guide chrome become campaign/universe-driven content, addressed
last, after the schema and plugin mechanisms exist to drive them."
Dependencies: TASK-022 (campaigns exist), TASK-023 (current-campaign session
context exists to know what to show), TASK-025 (universe content mechanism
that branding content can source from).

## Desired outcome

The home screen, navigation branding, and guide chrome no longer hardcode
"Amber Campaign" / "The Shattering of the Liminal" — they reflect the
campaign a visitor is currently viewing (or a neutral, campaign-agnostic
identity when no specific campaign is in context, e.g. a logged-out landing
page listing/selecting among a user's campaigns). This is explicitly the last
piece of the ADR-005 sequence and depends on every earlier task's plumbing
actually existing.

## Context

Confirmed hardcoded branding, all unconditional regardless of campaign:

- `public/index.html`: `<title>Amber Campaign - The Shattering of the
  Liminal</title>` (line 6); H1 "The Shattering of the Liminal" / "Amber
  Campaign Management System" / "Where D&D 5e meets... Amber multiverse"
  (lines 325-327, 348-350, 414).
- `public/guide.html`: same title/subtitle (lines 6, 212); its header text
  ("Player's Guide - Amber Campaign") is separate from the guide *content*
  TASK-025 already made universe-driven — this task handles the remaining
  chrome/header text.
- `public/includes/navigation.html`: nav-bar logo alt text and brand text
  hardcoded "The Shattering of the Liminal" (lines 4-5), injected on every
  page via `load-navigation.js`.
- `public/player-login.html`, `public/admin.html`, `public/dm-dashboard.html`,
  `public/player-dashboard.html`: Amber references in titles/copy.
- `README.md` line 1/7: repo's own title, "DM Helper — Amber Campaign
  Manager" — arguably a separate, lower-priority concern (repo-level docs,
  not runtime UI); implementer's call whether to touch it here or leave it,
  document the choice either way.

By this point in the sequence, `campaigns` (TASK-022), campaign-scoped
session context (TASK-023), and universe content (TASK-025) all exist —
this task is primarily about wiring existing static chrome to read from that
context instead of being hardcoded, not building new mechanism.

## Scope

### Included

- Home screen (`public/index.html`): render campaign-specific branding when
  a specific campaign is in context (e.g. a shared campaign link, or the
  current session's active campaign); render a neutral, generic "DM Helper"
  identity plus a campaign switcher/selector when no specific campaign is in
  context (e.g. first visit, or a user with multiple campaigns and none
  currently selected).
  attributes and content mechanism.
- Nav bar (`public/includes/navigation.html`, `load-navigation.js`): brand
  text/logo reflect the current campaign rather than being hardcoded Amber
  text.
- Guide chrome (`guide.html`'s header/title, distinct from its
  already-universe-driven content per TASK-025): reflect the current
  campaign/universe.
- Other dashboard pages' titles/copy referencing Amber directly.
- Decide and document the neutral/no-campaign-context default identity (e.g.
  plain "DM Helper" branding) used anywhere a specific campaign isn't yet
  known.

### Excluded

- No change to guide *content* itself (TASK-025's responsibility) — only the
  surrounding chrome/header text.
- No visual redesign beyond what's needed to make branding conditional —
  this task swaps hardcoded text/logo for context-driven equivalents, it
  doesn't restyle the pages.
- `README.md` may be left as-is if the implementer judges it a documentation
  concern separate from runtime branding — document the decision either way,
  don't silently skip it without a note.

## Plan

1. Confirm TASK-022/023/025's campaign and universe context are available to
   the frontend (e.g. via an endpoint or the session) in a form this task can
   read from.
2. Update `public/index.html` to branch on whether a specific campaign is in
   context.
3. Update `navigation.html`/`load-navigation.js` to source brand text/logo
   from the current campaign.
4. Update `guide.html`'s chrome (not content) and any remaining
   dashboard-page Amber references.
5. Decide and implement the no-campaign-context neutral default.
6. Manual verification across every touched page, in both "viewing the
   existing Amber campaign" and "no campaign selected" states.

## Acceptance criteria

- [ ] Home screen, nav bar, and guide chrome reflect the current campaign's
      name/universe rather than hardcoded Amber text, when a campaign is in
      context.
- [ ] A neutral, campaign-agnostic identity is shown when no specific
      campaign is in context, rather than defaulting to Amber-specific
      branding.
- [ ] The existing migrated campaign's branding still reads correctly (its
      own name/theme), so current users see continuity rather than a
      regression.
- [ ] `npm test` passes; manual verification confirms no broken page in
      either context state.

## Validation requirements

- Manual browser verification of every touched page, logged in as a user
  viewing the existing campaign, and (if a second test campaign exists from
  TASK-023's validation) a second campaign, confirming branding differs
  correctly between them.
- `npm test`.

## Risks and assumptions

- Assumes the campaign-context plumbing from TASK-022/023/025 is sufficient
  for the frontend to know "which campaign, which universe" at page-render
  time for a static-HTML/vanilla-JS app with no server-side templating —
  if it isn't, this task may need a small endpoint addition to expose it,
  which is in scope to add if genuinely needed, but should be called out as a
  deviation from "just wiring existing plumbing" in the handoff.
- Lowest-risk task in the sequence functionally (cosmetic/chrome-only), but
  it's the most user-visible, so mismatched or missing branding in an edge
  case (no campaign selected) will be immediately obvious to any user —
  worth deliberate manual testing of that specific state.

## Blocker

None.

## Implementation handoff

Implementer: Codex
Date: 2026-09-13

### Changes made

- Added one shared `campaign-branding.js` runtime and annotated the home,
  guide, DM dashboard, player dashboard, admin, and player-login chrome to use
  it. It reads the active campaign from the existing authenticated campaigns
  endpoint and updates page titles, headings/subtitles, navigation brand, and
  home-page copy without using HTML injection.
- Extended the campaigns response with system/universe display labels and the
  selected universe plugin's optional branding payload. Added the Amber
  reference branding (including its existing logo and landing-page prose) to
  `src/universes/amber/index.js`; no guide-body or wizard content changed.
- Defined the no-context identity as plain **DM Helper**, with generic campaign
  management copy and no campaign-specific logo. Failed/unauthenticated API
  requests, a missing active campaign, and an active campaign whose universe
  has no branding all fall back safely to that neutral presentation. A
  campaign without universe branding still shows its own campaign name and
  neutral supporting copy.
- Kept the existing campaign selector and made its no-active-campaign state
  actionable: it remains visible when at least one campaign exists and starts
  with a disabled `Select a campaign` prompt, so choosing the first campaign
  fires the existing switch flow.
- Replaced the three remaining Amber-only home feature blurbs with neutral
  descriptions. Campaign-specific Amber continuity remains in the campaign
  name, universe label, logo, tagline, overview, portal descriptions, and
  footer supplied by the Amber plugin.

### Validation performed

- `npm test`: **93 passed, 0 failed**. This includes new real-HTTP assertions
  that the active campaign listing delivers `D&D 5e` / `Amber` labels and the
  Amber branding payload, plus jsdom coverage proving active-campaign and
  neutral rendering, logo show/hide behavior, safe page-title updates, and
  neutral static defaults across every scoped runtime page.
- Ran `node --check` on both changed shared browser scripts and `git diff
  --check`; both passed.
- Grepped all of `public/` for the original `Amber Campaign`, `The Shattering
  of the Liminal`, and `Amber multiverse` literals; none remain in static page
  chrome. The campaign-specific strings now exist only in the Amber plugin
  payload (and the migrated campaign name in data).
- Verified the two required presentation states through automated DOM
  execution rather than an interactive browser: an active campaign named
  `The Shattering of the Liminal` renders that name, its Amber tagline, and
  logo; the no-campaign state renders `DM Helper`, `No campaign selected`,
  generic copy, and no logo. There is no browser-control harness in this
  environment, so no claim is made that every page was interactively clicked
  through while logged in. A final human browser smoke test remains advisable,
  consistent with TASK-014/024/025's documented limitation.

### Assumptions and deviations

- The small campaigns-endpoint response addition was necessary because the
  static frontend otherwise knew only universe IDs and could not source
  universe-owned presentation. It adds no new endpoint or authorization path.
- README.md was deliberately left unchanged. It is repository-level product
  documentation (and contains a larger Amber mechanics section), while this
  task's accepted outcome is runtime page chrome; partially rebranding only
  its heading/logo would make that document internally inconsistent.

### Unresolved risks

- No blocking implementation issue remains. The only residual risk is the
  lack of interactive browser automation noted above.

## Review

Reviewer: Claude
Date: 2026-09-13

Verified independently rather than trusting the handoff's self-report:

- `git show --stat 48df56c`: 15 files, matches the handoff's described
  surface (one new shared runtime, every scoped HTML page, the campaigns
  endpoint, the Amber universe module's new branding block, tests).
- **Read `public/js/campaign-branding.js` in full**: uses `data-campaign-*`
  attributes plus `.textContent` assignment throughout — never `innerHTML` —
  so a DM-supplied campaign name can't inject markup/script through this
  mechanism. Correctly falls back to the frozen `neutral` object on fetch
  failure, non-OK response, or a missing/unmatched current campaign, and
  distinguishes the neutral case by object identity (`current === neutral`)
  rather than a fragile name comparison.
- **Checked the nav-injection race directly**, since `campaign-branding.js`
  loads and starts its async campaign fetch before `load-navigation.js` (a
  separate async `fetch`) actually inserts the nav markup containing
  `data-campaign-name`/`data-campaign-logo` into the DOM: `load-navigation.js`
  explicitly calls `CampaignBranding.applyCurrent()` immediately after
  inserting the nav, and `campaign-branding.js`'s own `load()` re-sweeps
  every `data-campaign-*` element (including the nav, whenever it resolves)
  when the campaign fetch completes. Whichever of the two async operations
  finishes first, the nav ends up correctly branded either way — not a race
  bug.
- Confirmed `campaign_branding` payload is sourced from the universe plugin
  (`src/universes/amber/index.js`'s new `content.branding` block), not
  hardcoded in the route or frontend, consistent with the code-defined-plugin
  pattern used throughout ADR-005 — `src/routes/auth.js`'s `/campaigns`
  endpoint only assembles `system_label`/`universe_label`/`branding` from
  the already-existing system/universe registries, no new authorization path.
- Independently reran `npm test`: 93/93 passing, matching the handoff.
- Independently grepped all of `public/` for `Amber Campaign`, `The
  Shattering of the Liminal`, and `Amber multiverse`: zero remaining
  occurrences, matching the handoff's claim exactly.
- Read `tests/campaign-branding.test.js`: genuinely strong verification —
  it loads the actual shipped `campaign-branding.js` file into a real jsdom
  document via `runScripts: 'dangerously'` and exercises the real DOM
  manipulation (title, textContent, logo `hidden`/`src`) for both the active-
  campaign and neutral states, plus a static sweep asserting every one of
  the six scoped pages has the correct title, includes the branding script,
  and contains no leftover hardcoded Amber strings. This runs the real
  browser file, not a reimplementation of its logic.
- Spot-checked the campaign-switcher visibility logic
  (`public/js/navigation.js`): correctly keeps the selector visible and
  offers a disabled "Select a campaign" placeholder when a user has at least
  one campaign but none currently active — the task's own requirement that
  the no-context state be "actionable," not just informational.
- The `README.md` non-change is a reasonable, explicitly documented scope
  call (repo-level docs vs. runtime chrome), not an oversight.

No blocking findings. This is a clean, low-risk implementation relative to
the schema/migration work earlier in this sequence, executed carefully
regardless — the async-race handling and the XSS-safe `textContent` choice
in particular reflect real attention rather than a surface-level pass. Ready
for human acceptance. As with prior frontend-only tasks, no interactive
browser session was available to click through live; the honest limitation
is called out in the handoff rather than overclaimed, and a manual smoke
test before wider use remains a reasonable final step.

## Human acceptance

Pending.
