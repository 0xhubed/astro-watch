# Review Fixes Implementation Plan (from docs/review-2026-07-03.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the High/Medium findings from the 2026-07-03 full-app review — security, correctness, performance, and visual coherence — in priority order.

**Architecture:** No structural rewrite. Fixes are applied at the seams the review identified: one shared rarity-color module, schema-corrected agent annotations, hardened API routes, memoized/instanced-adjacent 3D hot paths, and honest labels. Work happens on branch `claude/review-fixes`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Three.js 0.178 + R3F, Recharts, Zustand, TanStack Query, Vercel KV, Resend.

## Global Constraints

- All app code lives in `astro-watch/` (repo subdir). All paths below are relative to `astro-watch/` unless prefixed `repo:`. Run all npm commands from `astro-watch/`.
- Branch: create/use `claude/review-fixes` off `main`. Commit after each task (imperative mood, atomic). Do NOT push, do NOT merge to main.
- **No test framework exists in this repo.** Verification per task = `npm run typecheck` && `npm run lint`. Tasks touching runtime behavior also state a manual/dev-server check. Run `npm run build` at the end of each wave (Tasks 2, 8, 15).
- Do NOT add new runtime dependencies. Do NOT install `@upstash/redis` (CLAUDE.md). Do NOT re-enable `@react-three/postprocessing` EffectComposer (incompatible with Three 0.178).
- Copy tone: humble/honest; avoid "platform", "engine", "autonomous", marketing language (CLAUDE.md).
- `@/*` path alias maps to `astro-watch/` root.
- Finding numbers (`#N`) reference `repo:docs/review-2026-07-03.md`. That file carries file:line evidence verified against `main @ ab47046` — re-verify line numbers when editing; content may have shifted slightly.
- Line numbers in this plan are anchors, not gospel: always locate the referenced code by content.

---

## Wave 1 — security, dead code, visual coherence, live chart bugs

### Task 1: Dependency security upgrades (#18, #40)

**Files:**
- Modify: `package.json`, `package-lock.json`

**Interfaces:** none (version bumps only).

- [ ] **Step 1: Upgrade Next.js within v15 and the Anthropic SDK; remove unused deps**

```bash
cd astro-watch
npm install next@15
npm install @anthropic-ai/sdk@latest
npm rm d3 @types/d3 leva react-spring @react-spring/three
npm audit fix   # NOT --force; review what remains
npm audit --omit=dev || true   # record remaining advisories in the commit message
```

If `npm audit fix` leaves high-severity issues that require semver-major bumps (e.g. inside `react-use` or `react-globe.gl`), do not force them — note them as residual in the commit body.

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all pass. If the Next upgrade changed behavior (e.g. new lint rules), fix forward minimally.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Upgrade Next.js and Anthropic SDK, drop unused deps (review #18, #40)"
```

### Task 2: Delete dead code and the open NASA proxy (#60, #24, part of #30)

**Files:**
- Delete: `components/visualization/maps/ImpactRiskMap.tsx`, `components/visualization/maps/ImpactHeatmap.tsx`, `components/visualization/controls/Controls.tsx`, `components/visualization/3d/InteractiveGlobe.tsx.backup`
- Modify: `components/visualization/3d/EnhancedSolarSystem.tsx` (line ~13: remove the unused `PostProcessingEffects` import; keep the commented usage at ~2026 and keep the component file itself), `vercel.json` (remove the `/api/nasa/(.*)` rewrite), `components/visualization/charts/RiskDashboard.tsx` (line ~21: delete unused `selectedEducationalTab` state, #70)

**Interfaces:** none consumed later; confirm with grep that nothing imports the deleted files before deleting (`grep -rn "ImpactRiskMap\|ImpactHeatmap\|visualization/controls/Controls" --include="*.tsx" --include="*.ts" .`).

- [ ] **Step 1: Grep for importers, delete files, strip dead import + rewrite**
- [ ] **Step 2: Verify** `npm run typecheck && npm run lint && npm run build` — build also proves the postprocessing libs left the bundle.
- [ ] **Step 3: Commit** `git commit -m "Remove dead components, backup file, unused postprocessing import, open NASA proxy rewrite (review #60, #24, #30)"`

### Task 3: Single source of truth for rarity colors (#42, #59-partial)

**Files:**
- Create: `lib/rarity-colors.ts`
- Modify: `components/ui/RiskLegend.tsx` (replace the three local mappings at ~14-71, ~191-204, ~207-217), `components/visualization/charts/RiskDashboard.tsx` (~102-106, ~338-342, ~353-361), `components/visualization/analysis/TrajectoryAnalysis.tsx` (~133-137), `components/visualization/3d/DetailedAsteroidView.tsx` (~13-19)

**Interfaces:**
- Produces (later tasks import these exact names from `@/lib/rarity-colors`):

```typescript
export interface RarityLevelStyle {
  level: number;          // 0..7
  label: string;          // 'Routine', 'Common', 'Uncommon', 'Notable', 'Rare', 'Very Rare', 'Exceptional', 'Historic'
  hex: string;            // canonical color, used by 3D emissive, chart cells, map/legend swatches
  textClass: string;      // tailwind text-* class
  bgClass: string;        // tailwind bg-* class for chips
}
export const RARITY_COLORS: RarityLevelStyle[];
export function rarityStyle(level: number): RarityLevelStyle; // clamps to [0,7]
```

- [ ] **Step 1: Create `lib/rarity-colors.ts`**

Cold→hot ramp, no magenta (#42). Keep existing labels if the current `RiskLegend.tsx:14-71` labels differ — reuse the labels already shown to users; only unify the colors:

```typescript
export interface RarityLevelStyle {
  level: number;
  label: string;
  hex: string;
  textClass: string;
  bgClass: string;
}

export const RARITY_COLORS: RarityLevelStyle[] = [
  { level: 0, label: 'Routine',     hex: '#60a5fa', textClass: 'text-blue-400',    bgClass: 'bg-blue-500/20' },
  { level: 1, label: 'Common',      hex: '#34d399', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  { level: 2, label: 'Uncommon',    hex: '#a3e635', textClass: 'text-lime-400',    bgClass: 'bg-lime-500/20' },
  { level: 3, label: 'Notable',     hex: '#facc15', textClass: 'text-yellow-400',  bgClass: 'bg-yellow-500/20' },
  { level: 4, label: 'Rare',        hex: '#fb923c', textClass: 'text-orange-400',  bgClass: 'bg-orange-500/20' },
  { level: 5, label: 'Very Rare',   hex: '#f87171', textClass: 'text-red-400',     bgClass: 'bg-red-500/20' },
  { level: 6, label: 'Exceptional', hex: '#dc2626', textClass: 'text-red-600',     bgClass: 'bg-red-600/20' },
  { level: 7, label: 'Historic',    hex: '#991b1b', textClass: 'text-red-800',     bgClass: 'bg-red-800/20' },
];

export function rarityStyle(level: number): RarityLevelStyle {
  const idx = Math.min(Math.max(Math.round(level ?? 0), 0), RARITY_COLORS.length - 1);
  return RARITY_COLORS[idx];
}
```

- [ ] **Step 2: Replace every local mapping** in the five files listed above with imports of `rarityStyle`/`RARITY_COLORS`. The 3D emissive/ring color and list chips in `EnhancedSolarSystem.tsx` should also use `rarityStyle(a.rarity).hex` if they currently call the deleted `RiskLegend` helpers — grep `getRarityColor\|getRarity3DColor\|getRarityLevelInfo` and update all call sites.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint`; then `npm run dev` and confirm in the browser: legend chips, pie slices, scatter dots, and 3D ring for the same object share one hue family.
- [ ] **Step 4: Commit** `git commit -m "Unify rarity colors behind lib/rarity-colors (review #42)"`

### Task 4: Chart correctness + legibility (#45, #50, #51, #67, #68, #56-partial)

**Files:**
- Create: `lib/format.ts`
- Modify: `components/visualization/charts/RiskDashboard.tsx`, `components/visualization/analysis/TrajectoryAnalysis.tsx`, `components/visualization/analysis/MonitoringDashboard.tsx` (~220)

**Interfaces:**
- Produces from `@/lib/format`:

```typescript
export function formatMeters(m: number): string;      // "467 m" / "1.2 km" (>=1000 → km, 1 decimal)
export function formatNumber(n: number, digits?: number): string; // thousands separators, default 0-1 decimals
export function formatDateShort(iso: string): string; // "Jul 4"
```

- [ ] **Step 1: Create `lib/format.ts`**

```typescript
export function formatMeters(m: number): string {
  if (!Number.isFinite(m)) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
```

- [ ] **Step 2: Fix the three km/m unit labels (#45)** — `RiskDashboard.tsx` ~199 ("Average size") and ~321/~332 (scatter axis + tooltip), `MonitoringDashboard.tsx` ~220: values are meters; use `formatMeters`.
- [ ] **Step 3: Sort the time series chronologically (#50)** — in `RiskDashboard.tsx` `processTimeSeriesData` (~ line 21+), sort the aggregated array by date ascending before returning, and apply `tickFormatter={formatDateShort}` on the XAxis.
- [ ] **Step 4: Numeric scatter axes (#51)** — in `RiskDashboard.tsx` (~321) and `TrajectoryAnalysis.tsx` velocity-vs-distance chart: `<XAxis type="number" dataKey="missDistance" domain={['auto','auto']} tickFormatter={(v)=>v.toFixed(2)} />` (adjust dataKey names to actual ones in file). Both scatters.
- [ ] **Step 5: Legends + named series + one dark tooltip (#67, #68)** — stacked area chart: add `<Legend />` and `name="Rare (R4+)"` / `"Notable (R2-3)"` / `"Routine (R0-1)"` per `<Area>` (match the actual bucketing in the file); remove the unreferenced `riskGradient` def; rarity pie: add `<Legend />` with `RARITY_COLORS` labels and the same dark `contentStyle` used by the styled tooltips elsewhere in the file. Extract that shared style object as `const DARK_TOOLTIP = { backgroundColor: 'rgba(9,9,20,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff' }` at top of `RiskDashboard.tsx` and use it in every `<Tooltip contentStyle=...>` in both dashboard files.
- [ ] **Step 6: Verify** `npm run typecheck && npm run lint`; dev-server check: dashboard dates in order, axis values 2-decimal, donut has a legend, "Average size" shows meters.
- [ ] **Step 7: Commit** `git commit -m "Fix chart units, date ordering, numeric axes; add legends and shared dark tooltip (review #45, #50, #51, #67, #68)"`

### Task 5: Fix agent scene annotations end-to-end (#1, #2)

**Files:**
- Modify: `components/visualization/3d/AgentAnnotations.tssx` → correct path `components/visualization/3d/AgentAnnotations.tsx` (rewrite), `lib/nasa-api.ts` (delete `calculatePosition`, ~260-274, and its call site in enrichment — keep the `position` field only if something else consumes it; grep `\.position` in components first: the review says AgentAnnotations was the only consumer, but `EnhancedSolarSystem` may reference it — verify)

**Interfaces:**
- Consumes: `SceneAnnotation` from `@/lib/agent/memory` — shape `{ asteroidId: string; label: string; color: string; notes?: string; createdAt: ... }` (verify exact optionality in `lib/agent/memory.ts:29-35` before writing).
- Consumes: asteroid render placement math from `EnhancedSolarSystem.tsx` ~1210-1217: `x = Math.cos(orbit.phase) * orbit.radius`, `z = Math.sin(orbit.phase) * orbit.radius`, `y = Math.sin(orbit.phase * 0.2) * orbit.inclination * 0.15` (copy the *exact* current expressions from the file, including the Earth-group offset noted in #2/D2 — if asteroids render inside a group positioned at Earth, annotations must render inside that same group or add the group's world offset).

- [ ] **Step 1: Rewrite `AgentAnnotations.tsx`** to type props/fetch payload as `SceneAnnotation[]`, match on `ann.asteroidId === asteroid.id`, use `ann.color` for the marker, `ann.label` as the visible text (≥12px, `bg-black/80`), `ann.notes` in a second line (not `title`-attr only). Compute position with the exact same math as the asteroid mesh placement, and render the component inside the same parent group as the asteroid field so the coordinate space matches (move its mount point in `EnhancedSolarSystem.tsx` if needed).
- [ ] **Step 2: Delete `calculatePosition`** from `lib/nasa-api.ts` and the `position` field if grep confirms no remaining consumers; update the `EnhancedAsteroid` type accordingly.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint`. Runtime: `npm run dev`, temporarily hardcode one annotation object in the component's data path matching a rendered asteroid id, confirm the label tracks the asteroid, then remove the hardcode. (`/api/agent-data` may legitimately return `[]` locally.)
- [ ] **Step 4: Commit** `git commit -m "Fix agent annotations: consume SceneAnnotation schema and render in scene coordinates (review #1, #2)"`

### Task 6: Deprecate the email alert path (supersedes #19, #20, #21; keeps #15) — USER DECISION 2026-07-03

The user decided to remove email alerts instead of hardening them.

**Files:**
- Delete: `lib/email.ts`
- Modify: `lib/agent/tools.ts` (remove the `send_alert` tool definition ~154-183 AND its `executeAgentTool` case ~280-284; grep `send_alert\|sendAlert\|email` in `lib/agent/` and remove all references), `lib/agent/run.ts` (~78: remove prompt text instructing the agent about alerts/ALERT_TO_EMAIL; if the advisor-consultation criteria mention alerts as a high-stakes decision, drop that mention), `lib/agent/memory.ts` (~173-175: add TTL to `saveThreat`, 30 days = `{ ex: 60 * 60 * 24 * 30 }` matching the option style of the other saves — #15 still applies), `repo:astro-watch/.env.example` (remove the entire alert/email var block incl. the `0xFriday@pm.me` address and `RESEND_API_KEY`), `repo:CLAUDE.md` (remove the "Alerts: Resend email service" stack line and the `RESEND_API_KEY`/`ALERT_TO_EMAIL`/`ALERT_FROM_EMAIL` env-var sentence)
- Check: `package.json` — if `resend` is a direct dependency and now unused, `npm rm resend`

- [ ] **Step 1:** grep the codebase for `resend\|send_alert\|ALERT_TO_EMAIL\|ALERT_FROM_EMAIL\|lib/email` to build the removal list; delete `lib/email.ts` and every reference (tool schema, executor case, prompt text, imports).
- [ ] **Step 2:** add the `saveThreat` TTL (#15).
- [ ] **Step 3:** clean `.env.example` and `repo:CLAUDE.md` as above; `npm rm resend` if present.
- [ ] **Step 4: Verify** `npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** `git commit -m "Remove email alert path, add threat TTL (user decision; supersedes review #19-#21, fixes #15)"`

### Task 7: API robustness (#4, #5, #6, #7, #22, #10, #23)

**Files:**
- Modify: `lib/nasa-api.ts`, `app/api/monitoring/route.ts`, `app/api/apod/route.ts`, `app/api/chat/route.ts`

- [ ] **Step 1 (#4):** in the enrichment entry (`lib/nasa-api.ts` ~146), filter before `Promise.all`: `asteroids.filter(a => a.close_approach_data?.length > 0)`.
- [ ] **Step 2 (#5):** `app/api/monitoring/route.ts:4` → `export const maxDuration = 300;` (Vercel Pro, CLAUDE.md).
- [ ] **Step 3 (#6 + #14):** in `getAPOD` (`lib/nasa-api.ts` ~106-122): only fall back to the previous day when the caller did NOT pass an explicit date; parse with `'T00:00:00Z'`. In `app/api/apod/route.ts` (#23): reject `date` params failing `/^\d{4}-\d{2}-\d{2}$/` with a 400 before calling NASA.
- [ ] **Step 4 (#7):** in the chat tool loop (`app/api/chat/route.ts` ~195-306): when the loop budget is exhausted and the last model turn contained tool calls, make one final upstream call with `tool_choice: 'none'` and stream that text.
- [ ] **Step 5 (#22, #10):** validate **every** message: each `m.content` must be a string (else 400); apply the length cap and `filterMessage` to every user-role message, not just the last; strip `tool_calls`/`tool_call_id` from client-supplied messages during sanitization (~163-167); cap total serialized payload (e.g. 50 KB → 400).
- [ ] **Step 6: Verify** `npm run typecheck && npm run lint`. Runtime: `npm run dev`; `curl -s -X POST localhost:3000/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":123}]}'` → expect 400 JSON, not 500; `curl -s 'localhost:3000/api/apod?date=bogus'` → 400.
- [ ] **Step 7: Commit** `git commit -m "Harden API routes: feed guard, agent timeout, APOD validation, chat message validation and final answer (review #4-#7, #10, #22, #23)"`

### Task 8: Agent memory race + rate limiter atomicity (#3, #9) — end of Wave 1/2 boundary

**Files:**
- Modify: `lib/agent/run.ts` (~200-214), `lib/rate-limit.ts` (~41-49)

- [ ] **Step 1 (#3):** replace the `Promise.all` over tool_use blocks with a sequential `for...of` + `await`. Order-preserving; keeps read-modify-write KV safe.
- [ ] **Step 2 (#9):** after `incr`, if `count === 1` set expire as today; additionally fetch `ttl` and if `ttl < 0` (key exists with no TTL) call `expire` again to heal stuck keys.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint && npm run build` (wave boundary).
- [ ] **Step 4: Commit** `git commit -m "Serialize agent tool execution; heal TTL-less rate-limit keys (review #3, #9)"`

---

## Wave 2 — render performance & determinism

### Task 9: Kill the hover re-render storm (#26, #27, #41)

**Files:**
- Modify: `app/dashboard/page.tsx` (~28, 48, 112-118), `lib/store.ts` (~53-66), `components/visualization/3d/EnhancedSolarSystem.tsx` (asteroid field ~1195-1274, list panels ~2078-2137), `components/visualization/3d/ProceduralAsteroid.tsx` (~63-68, 84), `components/visualization/charts/RiskDashboard.tsx`

**Interfaces:**
- Produces in `lib/store.ts`: `hoveredAsteroidId: string | null` + `setHoveredAsteroidId(id: string | null)` (store hover by **id**, not object, so components can subscribe narrowly).

- [ ] **Step 1:** move hover state into the Zustand store as `hoveredAsteroidId`; delete the page-level `useState` and prop-drilling; 3D asteroid and list-row components read it via narrow selectors (`useStore(s => s.hoveredAsteroidId === asteroid.id)`).
- [ ] **Step 2:** make filtering referentially stable: in `page.tsx`, `const filteredAsteroids = useMemo(() => filterFn(asteroids, riskFilter), [asteroids, riskFilter])` instead of calling the unmemoized store getter per render.
- [ ] **Step 3:** `React.memo` on `ProceduralAsteroid` and on the list-row component; fix `ProceduralAsteroid` geometry: compute **all** LOD geometries in one `useMemo` keyed only by `seed`, swap by reference on hover/selection, and `.dispose()` in the memo cleanup / unmount effect.
- [ ] **Step 4 (#41):** wrap `RiskDashboard`'s derived chart datasets in `useMemo` keyed on the (now stable) asteroids array.
- [ ] **Step 5: Verify** `npm run typecheck && npm run lint`. Runtime: dev server, sweep the cursor across the asteroid field — no visible hitching; React DevTools highlight-updates shows only the hovered row/mesh re-rendering.
- [ ] **Step 6: Commit** `git commit -m "Move hover to store, stabilize filtered array, memoize asteroids and LOD geometries (review #26, #27, #41)"`

### Task 10: Deterministic enrichment + inclination units (#33, #8)

**Files:**
- Modify: `lib/nasa-api.ts` (~230-262)

**Interfaces:**
- Produces (internal to file): `hashSeed(id: string): number` returning [0,1) — deterministic per asteroid.

- [ ] **Step 1: Add a tiny string hash** (mulberry32-style) at top of `lib/nasa-api.ts`:

```typescript
function hashSeed(id: string): number {
  let h = 1779033703 ^ id.length;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}
```

- [ ] **Step 2:** replace every `Math.random()` in `calculateOrbitParameters` with values derived from `hashSeed(asteroid.id)` (use `hashSeed(id)`, `hashSeed(id + ':phase')`, `hashSeed(id + ':speed')` etc. for independent values). Same scene for every visitor; no reshuffle on refetch.
- [ ] **Step 3 (#8):** normalize inclination to radians at ingest: when `orbital_data.inclination` (degrees) is present, store `deg * Math.PI / 180`; fallback stays ±0.1 rad. Give `calculateOrbitParameters` a real return type (no `any`): `{ radius: number; speed: number; phase: number; inclination: number; eccentricity: number }` (match actual fields in file).
- [ ] **Step 4: Verify** `npm run typecheck && npm run lint`. Runtime: reload dashboard twice — asteroid positions identical across reloads; real-data asteroids no longer bob wildly versus others.
- [ ] **Step 5: Commit** `git commit -m "Seed orbital params from asteroid id; normalize inclination to radians (review #33, #8)"`

### Task 11: Bundle splitting + server layout (#30, #31)

**Files:**
- Create: `components/Providers.tsx`
- Modify: `app/layout.tsx`, `app/dashboard/page.tsx` (~6-15)

**Interfaces:**
- Produces: `components/Providers.tsx` default-exports `Providers({ children }: { children: React.ReactNode })` — a `'use client'` component wrapping `QueryClientProvider` + `<Analytics />` (move whatever client-only providers currently live in `app/layout.tsx`).

- [ ] **Step 1: `Providers.tsx`** (`'use client'`; instantiate `QueryClient` in `useState` initializer to survive re-renders).
- [ ] **Step 2: `app/layout.tsx`** → server component: remove `'use client'`, export `const metadata: Metadata = { title: 'AstroWatch — explore near-Earth asteroids', description: <reuse the existing head description text>, metadataBase: new URL('https://www.astro-watch.com') }`, delete hand-written `<head>` tags Next now owns, wrap `{children}` in `<Providers>`. Keep the existing font setup (Inter) — move `className` usage as-is. Also fix `globals.css` (~27, 41): point `--font-sans` at the Inter variable actually created in layout and delete the `font-family: Arial` body rule (#59-partial).
- [ ] **Step 3: dynamic imports in `app/dashboard/page.tsx`:**

```tsx
const EnhancedSolarSystem = dynamic(() => import('@/components/visualization/3d/EnhancedSolarSystem').then(m => m.EnhancedSolarSystem), { ssr: false, loading: () => <SceneLoading /> });
const RiskDashboard = dynamic(() => import('@/components/visualization/charts/RiskDashboard').then(m => m.RiskDashboard), { ssr: false });
const AsteroidAnalysisHub = dynamic(() => import('@/components/visualization/analysis/AsteroidAnalysisHub').then(m => m.AsteroidAnalysisHub), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/chat/ChatPanel').then(m => m.ChatPanel), { ssr: false });
const GuidedTour = dynamic(() => import('@/components/tour/GuidedTour').then(m => m.GuidedTour), { ssr: false });
```

(Adjust named/default exports to match the actual files; `SceneLoading` = a minimal centered spinner div defined inline in the page.)
- [ ] **Step 4: Verify** `npm run typecheck && npm run lint && npm run build`; check build output — dashboard route's first-load JS should drop substantially; landing route should render as server HTML (`curl -s localhost:3000 | grep -c "Explore Near-Earth"` ≥ 1 with dev server running).
- [ ] **Step 5: Commit** `git commit -m "Server-render root layout with metadata; code-split heavy views (review #30, #31)"`

### Task 12: 3D scene polish — Sun, labels, cheap wins (#49, #52, #29-lite, #62)

**Files:**
- Modify: `components/visualization/3d/EnhancedSolarSystem.tsx`, `components/visualization/3d/ProceduralAsteroid.tsx` (~84, ~106-116)

- [ ] **Step 1 (#49): Sun glow.** Around the existing Sun mesh add two additive-blended sprite billboards (no postprocessing): generate a radial-gradient canvas texture once (`useMemo`), white-hot core → transparent, e.g. 256px canvas, `THREE.SpriteMaterial({ map, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })`, one sprite ~2.5× sun radius warm white `#fff7d6`, one ~5× faint orange `#ffb347`. Reduce the flat yellow: give the sun material an emissive/texture treatment consistent with what exists (there are already corona uniforms memoized per the review — reuse them if present).
- [ ] **Step 2 (#52): label decluttering.** Hide the Moon label unless the camera is within a threshold distance of Earth (compute in `useFrame` against `camera.position`, store in a ref + state with hysteresis, or simply `visible={cameraDistance < 40}` via drei `Html` occlude/visible prop pattern used in file). Also unify the duplicated label markup into one `SceneLabel({ children })` component within the file (#64).
- [ ] **Step 3 (#29-lite): shader or reduced twinkle.** Cheapest compliant fix: drop per-frame CPU twinkle loop; replace with a `ShaderMaterial` vertex twinkle driven by a `time` uniform and the existing per-star phase attribute. If that balloons, acceptable fallback: update sizes only every 4th frame and halve star count — but prefer the shader.
- [ ] **Step 4 (#62): selection affordance.** Remove the ×2 selected / ×1.5 hovered mesh scale in `ProceduralAsteroid.tsx:84`; instead brighten the existing rarity ring (opacity + slight ring scale) and raise emissive intensity on select/hover. Size stays truthful to data.
- [ ] **Step 5: Verify** `npm run typecheck && npm run lint`. Runtime: sun has a soft glow from all camera presets; Moon label appears only near Earth; hover no longer resizes rocks.
- [ ] **Step 6: Commit** `git commit -m "Add sun glow sprites, declutter labels, shader twinkle, non-scaling selection affordance (review #49, #52, #29, #62)"`

---

## Wave 3 — honesty, impact sim, UX/a11y

### Task 13: Data-honesty pass (#43, #44, #46, #47, #55)

**Files:**
- Modify: `components/visualization/3d/DetailedAsteroidView.tsx` (~229-258, ~358), `components/visualization/analysis/MonitoringDashboard.tsx` (~78-136, ~228-229), `components/visualization/charts/RiskDashboard.tsx` (~398-444), `app/dashboard/page.tsx` (~83-96 nav, ~184 footer), `components/visualization/analysis/TrajectoryAnalysis.tsx` (~20-34)

- [ ] **Step 1 (#43):** rename the "Risk" percentage block to **"Severity index"** rendered as a 0-10 bar (`(risk*10).toFixed(1)`), tooltip: "Heuristic score combining size, velocity and proximity. Not an impact probability." Same treatment for "Confidence" (or delete that block if it has no data source — check what feeds it; if it's a constant, delete). Remove the "machine learning" sentence at ~358.
- [ ] **Step 2 (#44):** in `MonitoringDashboard`: delete the fake observatory network card and fake "new this week"; keep only blocks derivable from real feed data (upcoming approaches, R≥3 objects) and add a visible badge line under the tab title: `Illustrative view — derived from today's feed, not live telemetry.` Replace "System Status: OPERATIONAL" with data freshness from TanStack Query (see Step 3).
- [ ] **Step 3 (#46):** delete the hardcoded "NASA API Status" card in `RiskDashboard.tsx` ~398-444 OR rewire: the dashboard page passes `dataUpdatedAt`/`isError` from its `useQuery` result down (add props). Footer "Last Updated" (`page.tsx` ~184) must show `new Date(dataUpdatedAt).toLocaleTimeString()`.
- [ ] **Step 4 (#47):** `TrajectoryAnalysis.tsx` classification: if `orbital_data.semi_major_axis`/`perihelion_distance` exist on the enriched objects use them (Apollo: a>1 AU & q<1.017; Aten: a<1 AU; Amor: 1.017<q<1.3) with mutually exclusive buckets; otherwise label the card "Approximate classification (visualization data)".
- [ ] **Step 5 (#55):** in the dashboard nav, remove the duplicate "Trajectories" item (or wire it to a distinct default tab of `AsteroidAnalysisHub` via prop — pick removal if no tab distinction exists; two buttons must not render identical content).
- [ ] **Step 6: Verify** typecheck+lint; dev-server: detail modal shows Severity index 0-10 with honest tooltip; monitoring tab has the badge and no fake observatories; footer time updates only on refetch.
- [ ] **Step 7: Commit** `git commit -m "Honesty pass: severity index labeling, remove fabricated telemetry, real freshness status, fix orbital classification, dedupe nav (review #43, #44, #46, #47, #55)"`

### Task 14: Impact simulation polish (#53, #54, #56, #73)

**Files:**
- Modify: `components/simulation/ImpactSimulation.tsx` (~151-223 narrative fetch; globe setup; stats panel; legend position)

- [ ] **Step 1 (#53):** after computing blast radii, call the globe's `pointOfView({ lat, lng, altitude }, 1000)` where `altitude` is derived from the largest ring radius (e.g. `Math.min(2.5, Math.max(0.3, windowBreakageKm / 800))`), and feed `ringsData` with the fireball/severe/moderate/1-psi rings using their km radii (`ringMaxRadius` in degrees ≈ `km / 111`), colored to match the existing legend. Verify prop names against the `react-globe.gl` version in package.json.
- [ ] **Step 2 (#56):** format all stats with `formatNumber` from `@/lib/format` (Task 4): "807,548 PJ", "508 Mt", "×33,764". Merge the duplicate energy rows: keep "Kinetic energy — 508.4 Mt TNT (…PJ)" as one row, drop the redundant "Megatons TNT" row.
- [ ] **Step 3 (#54):** move the map legend from bottom-left to top-left under the title block (the "?" FAB owns bottom-left).
- [ ] **Step 4 (#73):** debounce location clicks (ignore clicks while a narrative request is in flight); on 429 from `/api/chat`, show a static fallback line ("Narrative unavailable right now — chat quota reached.") instead of rendering the error as narrative.
- [ ] **Step 5: Verify** typecheck+lint; dev-server: run a simulation — globe flies to the site, rings visible and labeled by color legend, numbers have separators, double-click doesn't double-spend quota.
- [ ] **Step 6: Commit** `git commit -m "Impact sim: auto-zoom with blast rings, formatted stats, legend relocation, narrative debounce (review #53, #54, #56, #73)"`

### Task 15: Accessibility + UX states baseline (#71, #72, #74, #57-lite)

**Files:**
- Modify: `components/chat/ChatPanel.tsx` (~65-66, 144-169, 173-186), `components/chat/ChatMessage.tsx` (~59-63), `components/visualization/3d/EnhancedSolarSystem.tsx` (icon buttons, modals), `components/visualization/3d/DetailedAsteroidView.tsx` (~21-40, 85-91), `components/tour/GuidedTour.tsx` (~88-94), `components/simulation/ImpactSimulation.tsx`, `app/globals.css`, `app/dashboard/page.tsx` (~74)

- [ ] **Step 1: aria-labels** on every icon-only button listed in finding #71 (chat FAB "Open chat", close "Close chat", camera collapse "Collapse camera views", mobile list "Toggle asteroid list", drawer/modal `×` "Close", tour `?` "Open guided tour").
- [ ] **Step 2: dialog semantics:** on the four modal containers (`DetailedAsteroidView`, `ImpactSimulation`, `GuidedTour`, alert modal): `role="dialog" aria-modal="true" aria-label=<title>`, Escape-to-close via a `useEffect` keydown listener tied to open state. (Full focus trap is out of scope; Escape + semantics is the baseline.)
- [ ] **Step 3: reduced motion:** in `globals.css` add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4 (#72):** chat: render a three-dot pulse in the empty assistant bubble while streaming with no content yet (`isStreaming && !content`); render **all** accumulated `toolCalls`, not `toolCalls[0]`.
- [ ] **Step 5 (#74):** dashboard error state: user-friendly copy ("Couldn't load asteroid data. NASA's API may be briefly unavailable.") + a Retry button calling `refetch()`; remove the "check your NASA API key" copy.
- [ ] **Step 6 (#57-lite):** in the asteroid list rows, when an object's rarity is 0, tint the chip by size bucket instead of always blue — reuse `formatMeters` for the secondary text. Keep it subtle; don't fight the rarity scale (skip if it visually conflicts — reviewer's call).
- [ ] **Step 7: Verify** `npm run typecheck && npm run lint && npm run build` (final wave boundary). Dev-server: Escape closes each modal; chat shows typing indicator; keyboard Tab reaches labeled buttons.
- [ ] **Step 8: Commit** `git commit -m "A11y baseline: labels, dialog semantics, reduced motion; chat pending state; friendly error states (review #71, #72, #74)"`

---

## Self-review notes

- Spec coverage: Wave 1 items #18,#40,#60,#24,#42,#45,#50,#51,#67,#68,#1,#2,#19,#20,#21,#15,#4,#5,#6,#7,#10,#22,#23,#3,#9 → Tasks 1-8. Wave 2 #26,#27,#41,#33,#8,#30,#31,#49,#52,#29,#62 → Tasks 9-12. Wave 3 #43,#44,#46,#47,#55,#53,#54,#56,#73,#71,#72,#74 → Tasks 13-15. Deliberately deferred (large refactors, lower ROI now): #28 instancing, #35 God-component split, #34 DTO/CDN caching, #36/#37 mobile drawer state, #38 Earth tessellation, #63 right-rail layout, #66 footers, #17 helper dedupe. These stay in the review doc for a later pass.
- Known risk: plan line numbers drift as earlier tasks edit shared files (`EnhancedSolarSystem.tsx`, `RiskDashboard.tsx`, `nasa-api.ts`). Implementers must locate anchors by content, not line number. Tasks touching the same file (2→3→9→12) are ordered sequentially — do not parallelize within that chain.
- Type consistency: `rarityStyle`/`RARITY_COLORS` (Task 3) consumed in Tasks 4, 15; `formatMeters`/`formatNumber` (Task 4) consumed in Tasks 14, 15; `hoveredAsteroidId` naming fixed in Task 9.
