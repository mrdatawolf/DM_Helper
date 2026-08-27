# ADR-001: Migrate the frontend to native ES modules with an explicit shared-state module

Status: Accepted (2026-08-27, Patrick)
Date: 2026-08-27
Decision owners: Patrick
Related tasks and contracts: TASK-008 (this ADR is its first deliverable);
TASK-007 (completed — `public/js/api.js`, `public/js/dom-utils.js` are the
first two real, self-contained modules this migration converts); TASK-009
(file-splitting — sequencing addressed under Decision below)

## Context

`public/js/dm/dm-core.js` declares shared mutable state at top level —
`characters`, `shadows`, `sessions`, `progress`, `journalEntries`,
`primalPatterns`, `activePatternId`, `openSections`, `sectionGrantsCache`,
`storyArcs`, `activeArcId`, `beats`, `npcs`, `grandNarrative`,
`shadowActiveFilter`, `shadowSearchQuery`, `creatureActiveFilter`,
`currentUser` — 18 pieces of state in total. Every other `dm-*.js` file
(10 files) reads and mutates these directly as implicit globals; correctness
depends on `<script>` tag order in `public/dm-dashboard.html` matching each
file's unstated assumption about what has already run. `public/js/player/
player-core.js` has the same pattern on a smaller scale: `currentUser`,
`currentCharacter`, `userCharacters`, `playerAllShadows`, read by the other
18 `player-*.js` files.

Two concrete failures of this pattern were already found and worked around
in TASK-007: `player-shadows.js` defined `escHtmlP`, a function used by 10
*other* player files that only worked because those files happen to be
*invoked* after `player-shadows.js` loads — not because they're *parsed*
after it. The same was true of `dm-primal-patterns.js`'s `escHtml` for 8
other DM files. Both were fragile by luck, not by design, and indistinguishable from a real bug until traced by hand.

This is flagged as the largest, highest-risk item in the original review
batch: it's the reason no frontend render/logic function can currently be
exercised in isolation (e.g. under Node + jsdom) without first reconstructing
the entire global-state web a full page load would have built.

**A second, non-obvious problem surfaced while researching this ADR**:
across `public/js/dm/*.js` and `public/js/player/*.js`, generated HTML
strings reference **128 distinct function names** via inline event
attributes (`onclick="deleteCharacter(5)"`, `onchange="updateArcStatus(...)"`,
`onsubmit="handleCreateArc()"`, etc.). Inline HTML event handlers always
execute in the global scope, regardless of module boundaries — a function
that only exists as a module-scoped export is invisible to them. Converting
`dm-*.js`/`player-*.js` to ES modules without addressing this would silently
break every one of those 128 call sites (buttons that do nothing, with no
console error more specific than a generic `ReferenceError`, and zero test
coverage to catch it). This is not a hypothetical risk — it is the single
most consequential detail this ADR has to get right.

## Decision

1. **Native ES modules, no bundler.** Use `<script type="module">` directly;
   do not introduce a bundler or build step. Native module support is
   universal across the browsers this app's users run (the app is a small,
   trusted-user campaign tool per `docs/PROJECT.md`, not a public product
   with a legacy-browser tail), and this project has an explicit
   no-bundler preference today. Revisit only if a real need for
   dependency-bundling, tree-shaking, or TypeScript emerges later — none of
   which exist now.

2. **One explicit shared-state module per dashboard, not a full
   per-domain rewrite.** Replace `dm-core.js`'s 18 top-level `let`
   declarations with a single `dm-state.js` exporting one mutable object,
   e.g.:

   ```js
   // dm-state.js
   export const state = {
       currentUser: null, characters: [], shadows: [], sessions: [],
       progress: [], journalEntries: [], primalPatterns: [],
       activePatternId: null, openSections: new Set(), sectionGrantsCache: {},
       storyArcs: [], activeArcId: null, beats: [], npcs: [], grandNarrative: {},
       shadowActiveFilter: 'All', shadowSearchQuery: '', creatureActiveFilter: 'All',
   };
   ```

   Every other module does `import { state } from './dm-state.js'` and
   reads/writes `state.characters` instead of the bare `characters` global.
   The mirror module `player-state.js` does the same for `player-core.js`'s
   4 fields. This is a mechanical, near-1:1 rename at each call site (`characters`
   → `state.characters`), not a redesign of who owns what state — it converts
   an *implicit* shared mutable bag into an *explicit* one. That directly
   solves the load-order problem (imports are resolved by the module graph,
   not script-tag position) without redesigning state ownership boundaries,
   which is deliberately out of scope (see Alternatives). Splitting this one
   state module into smaller per-domain stores is a reasonable *later* step
   once TASK-009 has split the files that consume each piece of state along
   the same boundaries — noted under Follow-up work, not required here.

3. **Every function referenced from inline HTML event attributes must be
   explicitly exposed on `window` at its module's point of definition.**
   Do not rewrite the 128 existing `onclick=`/`onchange=`/`onsubmit=`/etc.
   call sites to `addEventListener` — that would be a far larger, riskier
   diff than this task's stated goal requires, and the task is explicitly
   scoped as internal restructuring, not a redesign. Instead, each module
   that defines a function invoked from generated HTML ends with an explicit
   bridge, e.g. `window.deleteCharacter = deleteCharacter;` (or a small
   `exposeGlobally(...)` helper that does this for a list of names, to keep
   the bridge itself auditable in one place per file rather than scattered).
   Building the authoritative list of which 128 names need this treatment,
   per file, is real, first-class implementation work — not a mechanical
   side effect — and should be planned and checked off explicitly during
   implementation, since there is no test coverage that would catch a missed
   one short of manually clicking every button in both dashboards.

4. **Atomic cutover per dashboard, no interim compatibility shim.**
   Because every `dm-*.js` file is mutually coupled through the same shared
   state today, a partial migration (some files converted, some not) breaks
   immediately — a converted module's top-level `let` is module-scoped, not
   global, so an unconverted classic script can no longer see it without an
   explicit `window.x = x` shim, which is itself extra code that later has
   to be removed. Given this is a small (11 DM files, 19 player files)
   codebase, not a large one where incremental de-risking pays for itself,
   convert all of one dashboard's files together in a single pass rather
   than introducing a shim that would need its own follow-up removal.
   **Sequence: DM dashboard first, player dashboard second** — DM has fewer
   files (11 vs. 19) and less state (18 fields vs. 4, but concentrated in
   one already-understood file), making it the smaller, faster proof of the
   pattern before applying it at player-side scale. The two dashboards don't
   share any script files, so this sequencing carries no cross-dashboard risk.

5. **TASK-008 (this migration) before TASK-009 (file-splitting).**
   Splitting a file that is already a real ES module (explicit imports/
   exports) into two modules is a well-understood, low-risk operation — you
   already know exactly what it exports and what it needs, because the
   module system requires stating both. Splitting a classic global script
   first means redoing that "what does this actually depend on" analysis
   twice: once for the split, once for the later module conversion. This
   also matches what TASK-009's own plan already defaults to ("if TASK-008
   has landed, split as real ES modules directly"), so this recommendation
   requires no change to that task, just confirms its default.

6. **Testability demonstration**: add `jsdom` as a dev dependency and
   pick 2-3 genuinely pure data-shaping functions (not full HTML-templating
   functions) as the representative examples required by TASK-008's
   acceptance criteria — e.g. a function that turns a raw `/api/arcs`
   response into the grouped-by-character shape `renderArcRows` currently
   builds inline. Demonstrating the *separation* (shaping vs. templating) is
   the point; comprehensive coverage is an explicit non-goal of TASK-008
   itself and can follow incrementally.

## Alternatives considered

- **Per-domain state modules instead of one shared-state object per
  dashboard** (e.g. `charactersStore.js`, `shadowsStore.js`, each owning
  getters/setters for its own slice): more "properly" modular, but requires
  redesigning cross-cutting ownership before the file boundaries that would
  naturally host each domain exist — several pieces of state (e.g.
  `storyArcs`) are already read from files outside their "obvious" owner
  (`dm-core.js`'s own `buildChapterPicker` reads `storyArcs`, which
  conceptually belongs to `dm-story-arcs.js`). Doing this well depends on
  TASK-009 having already drawn real file boundaries — attempting it first
  would mean guessing at boundaries this ADR has no basis to fix yet.
  Rejected for now, viable as a follow-up once TASK-009 lands.
- **Rewrite inline `onclick=` handlers to `addEventListener`**: removes the
  `window`-bridging requirement entirely and is the more "modern" pattern,
  but touches all 128 call sites' HTML-generating template strings — a much
  larger, higher-risk diff than this task's own scope allows ("any visual
  or behavioral change... this is an internal restructuring, not a
  redesign"). Rejected for this task; noted as a plausible independent
  future improvement, unrelated to whether modules are adopted.
- **A bundler (esbuild/Vite/webpack) instead of native modules**: would
  allow bundling, minification, and easier interop patterns, but
  contradicts this project's stated no-bundler preference and adds a build
  step and toolchain dependency this single-DM, low-traffic app doesn't
  need. Rejected; revisit only if a concrete need appears (e.g. wanting
  TypeScript, or so many modules that unbundled network waterfall load
  time becomes noticeable — neither is true today).
- **File-by-file migration with a compatibility shim** (converted files
  also assign their exports to `window` so not-yet-converted classic
  scripts keep working): avoids an atomic big-bang per dashboard, but adds
  a temporary code path (the shim) that must itself be tracked and removed
  once migration completes, for a codebase small enough that the atomic
  cutover is achievable in one sitting per dashboard. Rejected as
  unnecessary overhead at this scale.

## Consequences

### Benefits

- Cross-file dependencies become explicit (`import`) instead of implicit
  (script-tag order + hope) — the exact problem that caused the `escHtmlP`/
  `escHtml` fragility TASK-007 had to trace and fix by hand.
- Data-shaping logic becomes unit-testable in isolation (Node + jsdom)
  without a full page load, directly enabling the kind of test coverage
  TASK-009 and future frontend work depend on.
- No build tooling added; the project's static-file-serving deployment
  model (`express.static`) is unchanged.

### Costs and risks

- **The 128-function `window`-bridging list is the primary implementation
  risk.** Missing even one means a button silently does nothing in
  production, with no automated test to catch it — validation for TASK-008
  must include manually exercising every interactive element across both
  dashboards, not just a spot check, as TASK-008's own Validation
  requirements already state.
- Converting ~30 files (11 DM + 19 player) in two atomic passes is a large
  diff even though each individual file's change is mechanical; review and
  manual verification should be budgeted accordingly.
- `state.js`'s single shared mutable object is an explicit version of
  today's implicit pattern, not a redesign of it — it does not, by itself,
  make individual pieces of state independently testable or prevent one
  module from mutating state another module didn't expect changed. That
  remains a known limitation, intentionally deferred to a possible
  per-domain-store follow-up rather than solved here.

## Follow-up work

- Once TASK-009 has split the oversized files along resource boundaries,
  reconsider whether `dm-state.js`/`player-state.js` should be broken into
  smaller per-domain store modules that align with those new boundaries.
- Consider replacing inline `onclick=`-style handlers with
  `addEventListener` as an independent future improvement, once the
  `window`-bridging list this ADR requires demonstrates the pattern is
  stable — not a prerequisite for this migration.
