# Review Fixes — Status (session ended 2026-07-03)

Execution state of `docs/superpowers/plans/2026-07-03-review-fixes.md`
(fixes from `docs/review-2026-07-03.md`). Branch: **`claude/review-fixes`**
(base `ab47046` = main). Not pushed, not merged. `main` untouched.

## Done (implemented + committed + review-approved)

| Task | Commit | Summary |
|---|---|---|
| 1. Dependency upgrades | `fe39a53` | next 15.3.6→15.5.20, @anthropic-ai/sdk 0.82→0.110, removed d3/@types/d3/leva/react-spring/@react-spring/three. Audit: 18 vulns → 2 moderate (postcss, vendored inside next — not fixable without --force). |
| 2. Dead code removal | `42ea2cf` | Deleted ImpactRiskMap/ImpactHeatmap/Controls/InteractiveGlobe.tsx.backup, unused PostProcessingEffects import, open `/api/nasa` proxy rewrite in vercel.json, unused selectedEducationalTab state. |
| 3. Unified rarity colors | `136a0cf` | New `lib/rarity-colors.ts` (RARITY_COLORS + rarityStyle), all 6 consumer files migrated incl. ApproachTimeline.tsx (caught by grep). Cold→hot ramp, no magenta. Existing UI labels kept. |

Also on the branch: `253f04a` (review + plan docs), `5d4d510` (plan rescope, see below).

Verification at every commit: `npm run typecheck` + `npm run build` pass.
`npm run lint` has ~49 **pre-existing** failures on main — the working bar
is "no NEW lint errors" (Task 3 A/B-verified 48 vs 49).

## Immediate follow-up on resume (5 minutes)

- **NaN guard in `lib/rarity-colors.ts` `rarityStyle()`** (~line 29-32):
  `level ?? 0` doesn't catch `NaN`; `RARITY_COLORS[NaN]` → undefined → caller
  throws on `.hex`. Fix: `const n = Number.isFinite(level) ? Math.round(level) : 0;`
  then clamp. (Task 3 review, Important, accepted-not-yet-applied.)
- Minor, optional: `RiskLegend.tsx` `getRarityInfo()` re-implements the clamp —
  could reuse `rarityStyle(rarity).level`.

## Not done — Tasks 4–15 (in plan order)

- **Task 4:** Chart fixes — `lib/format.ts`, km/m unit labels, chronological
  date sorting, numeric scatter axes, legends, shared dark tooltip (#45, #50,
  #51, #67, #68). Brief already extracted: `.superpowers/sdd/task-4-brief.md`.
- **Task 5:** Agent annotations — consume `SceneAnnotation` schema, fix
  coordinate space, delete `calculatePosition` (#1, #2).
- **Task 6:** **RESCOPED BY USER (2026-07-03): remove the email alert path
  entirely** instead of hardening it — delete `lib/email.ts`, `send_alert`
  tool + prompt refs, alert env vars, CLAUDE.md mentions, `npm rm resend`
  if unused; KEEP the `saveThreat` TTL fix (#15). Plan already updated
  (commit `5d4d510`).
- **Task 7:** API robustness — feed guard on empty `close_approach_data`,
  monitoring `maxDuration` 300, APOD date validation + fallback restriction,
  chat: validate ALL user messages + final `tool_choice:'none'` answer
  (#4–#7, #10, #22, #23).
- **Task 8:** Agent memory race (sequential tool execution) + rate-limiter
  TTL healing (#3, #9). Wave-1 build checkpoint.
- **Task 9:** Hover re-render storm — hover state by id in Zustand, stable
  filtered array, React.memo, LOD geometry precompute + dispose (#26, #27, #41).
- **Task 10:** Deterministic enrichment — seeded hash replaces Math.random,
  inclination degrees→radians, typed return (#33, #8).
- **Task 11:** Bundle splitting + server layout — Providers.tsx, metadata
  export, next/dynamic per view (#30, #31).
- **Task 12:** 3D polish — Sun glow sprites, Moon-label decluttering, shader
  twinkle, non-scaling selection affordance (#49, #52, #29, #62).
- **Task 13:** Honesty pass — "Severity index" instead of fake AI-probability-%,
  remove fabricated telemetry, real freshness status, orbital classification
  from real orbital_data, dedupe Trajectories/Analysis-Hub nav (#43–#47, #55).
- **Task 14:** Impact sim — auto-zoom + labeled blast rings, formatted stats,
  legend relocation, narrative debounce (#53, #54, #56, #73).
- **Task 15:** A11y/UX baseline — aria-labels, dialog semantics + Escape,
  prefers-reduced-motion, chat pending indicator, friendly error states
  (#71, #72, #74). Final build checkpoint.

Deliberately deferred beyond the plan (still listed in the review doc):
instancing (#28), God-component split (#35), API DTO/CDN caching (#34),
mobile drawer state fix (#36/#37), Earth tessellation (#38).

## How to resume

1. `git checkout claude/review-fixes`
2. Apply the NaN guard above, commit.
3. Continue the plan with the superpowers subagent-driven-development skill:
   - Plan: `docs/superpowers/plans/2026-07-03-review-fixes.md` (Task 6 already rescoped)
   - Ledger: `.superpowers/sdd/progress.md` (Tasks 1–3 marked complete — do not re-dispatch)
   - Per-task briefs/reports so far: `.superpowers/sdd/task-{1..4}-brief.md`, `task-{1..3}-report.md`
   - Pattern used: implementer subagent (sonnet; haiku for mechanical) → review-package script → reviewer subagent (sonnet) → fix loop → ledger entry. Tasks sharing files (RiskDashboard: 4, 13; EnhancedSolarSystem: 5, 9, 12) must run sequentially.
4. After Task 15: final whole-branch review (most capable model), then decide
   merge/PR (superpowers:finishing-a-development-branch).

## Context that won't be obvious later

- Verification bar: typecheck + build must pass; lint only "no new errors"
  (pre-existing debt ~49 errors).
- `.superpowers/sdd/` is git-ignored scratch — briefs/reports/ledger live
  only on this machine; this STATUS file and the plan are the durable record.
- The live-site inspection screenshots/findings that seeded the review were
  taken 2026-07-03 on production (www.astro-watch.com), desktop 1440px.
