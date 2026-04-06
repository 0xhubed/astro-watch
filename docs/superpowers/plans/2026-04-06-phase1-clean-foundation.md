# Phase 1: Clean Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove TensorFlow.js and all ML code, clean up referencing components, reduce bundle size, and verify the app works without the ML layer.

**Architecture:** Surgical removal of ML pipeline (lib/ml/, hooks, components, scripts, packages) while preserving the rule-based risk scoring in `lib/nasa-api.ts`. Simplify `calculateAdvancedRisk` to call the rule-based function directly. Delete ML-only components (MLIndicator, MLModelStats), remove their usage from dashboard and charts.

**Tech Stack:** Next.js 15, React 19, TypeScript — no new dependencies, only removals.

---

### File Map

| Action | File | Reason |
|--------|------|--------|
| Delete | `lib/ml/risk-predictor.ts` | TF.js model loading/prediction |
| Delete | `lib/ml/feature-engineering.ts` | ML feature extraction |
| Delete | `lib/ml/browser-trainer.ts` | In-browser training |
| Delete | `lib/ml/data-generator.ts` | Synthetic data generation |
| Delete | `lib/ml/model-trainer.ts` | Training pipelines |
| Delete | `lib/advanced-ml.ts` | Unused advanced ML draft |
| Delete | `hooks/useMLPredictions.ts` | ML enhancement hook |
| Delete | `components/visualization/MLIndicator.tsx` | ML status indicator |
| Delete | `components/visualization/charts/MLModelStats.tsx` | ML stats dashboard |
| Delete | `app/test-ml/page.tsx` | ML test page |
| Delete | `scripts/train-model.js` | Node.js model training |
| Delete | `tsconfig.build.json` | ML-specific TS config |
| Delete | `public/models/` | TF.js model weights directory |
| Delete | `public/workers/` | ML web workers directory |
| Modify | `app/dashboard/page.tsx` | Remove ML imports, hooks, MLIndicator usage |
| Modify | `components/visualization/charts/RiskDashboard.tsx` | Remove MLModelStats import and usage |
| Modify | `components/landing/LandingPage.tsx` | Remove ML feature card and ML description paragraph |
| Modify | `lib/nasa-api.ts` | Inline rule-based call, remove wrapper function |
| Modify | `package.json` | Remove ML scripts and dependencies |
| Modify | `.env.example` | Remove ML_MODEL_CACHE_TIMEOUT |

---

### Task 1: Delete ML Pipeline Files

**Files:**
- Delete: `astro-watch/lib/ml/risk-predictor.ts`
- Delete: `astro-watch/lib/ml/feature-engineering.ts`
- Delete: `astro-watch/lib/ml/browser-trainer.ts`
- Delete: `astro-watch/lib/ml/data-generator.ts`
- Delete: `astro-watch/lib/ml/model-trainer.ts`
- Delete: `astro-watch/lib/advanced-ml.ts`
- Delete: `astro-watch/hooks/useMLPredictions.ts`
- Delete: `astro-watch/scripts/train-model.js`
- Delete: `astro-watch/tsconfig.build.json`

- [ ] **Step 1: Delete ML library directory and files**

```bash
cd astro-watch
rm -rf lib/ml/
rm lib/advanced-ml.ts
rm hooks/useMLPredictions.ts
rm scripts/train-model.js
rm tsconfig.build.json
```

- [ ] **Step 2: Delete ML model weights and workers**

```bash
cd astro-watch
rm -rf public/models/
rm -rf public/workers/
```

- [ ] **Step 3: Delete ML test page**

```bash
cd astro-watch
rm -rf app/test-ml/
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove TensorFlow.js ML pipeline, models, and training scripts"
```

---

### Task 2: Delete ML-Only Components

**Files:**
- Delete: `astro-watch/components/visualization/MLIndicator.tsx`
- Delete: `astro-watch/components/visualization/charts/MLModelStats.tsx`

- [ ] **Step 1: Delete MLIndicator and MLModelStats**

```bash
cd astro-watch
rm components/visualization/MLIndicator.tsx
rm components/visualization/charts/MLModelStats.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Remove MLIndicator and MLModelStats components"
```

---

### Task 3: Clean Up Dashboard Page

**Files:**
- Modify: `astro-watch/app/dashboard/page.tsx`

- [ ] **Step 1: Remove ML imports (lines 12-13)**

In `astro-watch/app/dashboard/page.tsx`, remove these two import lines:

```typescript
// DELETE these lines:
import { useMLPredictions } from '@/hooks/useMLPredictions';
import { MLIndicator } from '@/components/visualization/MLIndicator';
```

- [ ] **Step 2: Remove ML prediction hook call (line 48)**

Remove this line:

```typescript
// DELETE this line:
const { asteroids: mlEnhancedAsteroids, isMLReady, mlStats } = useMLPredictions(data?.asteroids || []);
```

- [ ] **Step 3: Remove ML effect hook (lines 50-55)**

Remove this entire block:

```typescript
// DELETE this block:
  // Update asteroids with ML predictions when ready (without blocking initial render)
  useEffect(() => {
    if (mlEnhancedAsteroids.length > 0 && isMLReady) {
      setAsteroids(mlEnhancedAsteroids);
    }
  }, [mlEnhancedAsteroids, isMLReady, setAsteroids]);
```

- [ ] **Step 4: Remove MLIndicator component usage (line 92)**

Remove this line from the JSX:

```tsx
// DELETE this line:
      <MLIndicator isMLReady={isMLReady} mlStats={mlStats} />
```

Also remove the comment above it:

```tsx
// DELETE this comment:
      {/* ML Indicator */}
```

- [ ] **Step 5: Verify the file compiles**

```bash
cd astro-watch
npx tsc --noEmit app/dashboard/page.tsx 2>&1 | head -20
```

Expected: No errors related to ML imports.

- [ ] **Step 6: Commit**

```bash
git add astro-watch/app/dashboard/page.tsx
git commit -m "Remove ML references from dashboard page"
```

---

### Task 4: Clean Up RiskDashboard

**Files:**
- Modify: `astro-watch/components/visualization/charts/RiskDashboard.tsx`

- [ ] **Step 1: Remove MLModelStats import (line 12)**

In `astro-watch/components/visualization/charts/RiskDashboard.tsx`, remove:

```typescript
// DELETE this line:
import { MLModelStats } from './MLModelStats';
```

- [ ] **Step 2: Remove MLModelStats usage (line 449)**

Find and remove:

```tsx
// DELETE this line:
      <MLModelStats />
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/components/visualization/charts/RiskDashboard.tsx
git commit -m "Remove MLModelStats from RiskDashboard"
```

---

### Task 5: Clean Up Landing Page

**Files:**
- Modify: `astro-watch/components/landing/LandingPage.tsx`

- [ ] **Step 1: Replace ML feature card with AI Assistant card**

In `astro-watch/components/landing/LandingPage.tsx`, find the ML feature card (around lines 33-37):

```typescript
// REPLACE this:
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "ML Predictions",
      description: "Experimental machine learning models that attempt to enhance trajectory predictions."
    },
```

With:

```typescript
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Assistant",
      description: "Ask questions about asteroids, control the 3D view, and get AI-powered risk analysis."
    },
```

- [ ] **Step 2: Replace ML description paragraph**

Find the ML paragraph (around lines 244-249):

```tsx
// REPLACE this:
            <p className="text-base md:text-lg px-4 md:px-0">
              The app includes experimental, browser-based machine learning models that
              attempt to supplement NASA's data with additional predictions. These are
              purely exploratory and not suitable for scientific use — always defer to
              official NASA sources.
            </p>
```

With:

```tsx
            <p className="text-base md:text-lg px-4 md:px-0">
              An AI assistant can answer your questions about asteroids, explain risk
              assessments, and control the 3D visualization. An autonomous monitoring
              agent watches for notable approaches and publishes briefings.
            </p>
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/components/landing/LandingPage.tsx
git commit -m "Update landing page: replace ML references with AI assistant messaging"
```

---

### Task 6: Simplify Risk Calculation in nasa-api.ts

**Files:**
- Modify: `astro-watch/lib/nasa-api.ts`

- [ ] **Step 1: Replace the ML wrapper function call**

In `astro-watch/lib/nasa-api.ts`, find lines 157-158:

```typescript
// REPLACE this:
  // Use ML model for risk assessment
  const { risk, confidence } = await calculateAdvancedRisk(asteroid);
```

With:

```typescript
  const { risk, confidence } = calculateRiskScore(asteroid);
```

- [ ] **Step 2: Remove the async wrapper function**

Find and delete lines 261-265:

```typescript
// DELETE this function:
async function calculateAdvancedRisk(asteroid: Asteroid): Promise<{ risk: number; confidence: number }> {
  // Always use rule-based calculation on server-side
  // ML prediction will be done client-side
  return calculateAdvancedRiskRuleBased(asteroid);
}
```

- [ ] **Step 3: Rename the rule-based function**

Rename `calculateAdvancedRiskRuleBased` to `calculateRiskScore` (lines 267-268):

```typescript
// REPLACE this:
// Keep original rule-based calculation as fallback
function calculateAdvancedRiskRuleBased(asteroid: Asteroid): { risk: number; confidence: number } {
```

With:

```typescript
function calculateRiskScore(asteroid: Asteroid): { risk: number; confidence: number } {
```

- [ ] **Step 4: Since the caller no longer awaits, update the calling function signature if it was only async for this call**

Check if `enhanceAsteroidData` (the function containing line 158) is async only because of `calculateAdvancedRisk`. It also uses `await import('./rarity')` on line 161, so it stays async. No change needed.

- [ ] **Step 5: Verify the file compiles**

```bash
cd astro-watch
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to calculateAdvancedRisk or ML imports.

- [ ] **Step 6: Commit**

```bash
git add astro-watch/lib/nasa-api.ts
git commit -m "Simplify risk calculation: remove ML wrapper, rename to calculateRiskScore"
```

---

### Task 7: Remove ML Dependencies from package.json

**Files:**
- Modify: `astro-watch/package.json`
- Modify: `astro-watch/.env.example`

- [ ] **Step 1: Remove ML npm scripts from package.json**

In `astro-watch/package.json`, remove these two lines from the `"scripts"` section:

```json
// DELETE these lines:
    "ml:build": "tsc -p tsconfig.build.json",
    "ml:train": "npm run ml:build && node scripts/train-model.js",
```

- [ ] **Step 2: Remove ML dependencies from package.json**

Remove from `"dependencies"`:

```json
// DELETE these lines:
    "@tensorflow/tfjs": "^4.22.0",
    "ml-matrix": "^6.12.1",
    "simple-statistics": "^7.8.8",
```

Remove from `"devDependencies"`:

```json
// DELETE this line:
    "@tensorflow/tfjs-node": "^4.22.0",
```

- [ ] **Step 3: Remove ML env var from .env.example**

In `astro-watch/.env.example`, remove this line:

```
// DELETE this line:
NEXT_PUBLIC_ML_MODEL_CACHE_TIMEOUT=86400000
```

- [ ] **Step 4: Reinstall dependencies**

```bash
cd astro-watch
npm install
```

Expected: Lock file regenerates without TensorFlow.js tree. Should significantly reduce `node_modules` size.

- [ ] **Step 5: Commit**

```bash
git add astro-watch/package.json astro-watch/package-lock.json astro-watch/.env.example
git commit -m "Remove TensorFlow.js, ml-matrix, simple-statistics dependencies and ML scripts"
```

---

### Task 8: Full Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript type check**

```bash
cd astro-watch
npm run typecheck
```

Expected: No type errors. If errors appear, they'll be about missing ML imports that were missed — fix any remaining references.

- [ ] **Step 2: Run ESLint**

```bash
cd astro-watch
npm run lint
```

Expected: No new lint errors from the removal.

- [ ] **Step 3: Run production build**

```bash
cd astro-watch
npm run build
```

Expected: Build succeeds. Note the bundle size — should be significantly smaller without TensorFlow.js (~3-5 MB reduction in JS bundle).

- [ ] **Step 4: Start dev server and verify manually**

```bash
cd astro-watch
npm run dev
```

Verify:
- Landing page loads, feature cards show "AI Assistant" instead of "ML Predictions"
- Dashboard loads, 3D solar system renders
- No console errors about missing ML modules
- Asteroids still show risk scores (rule-based)
- Dashboard charts view works without MLModelStats section
- No "Loading ML Model..." indicator in top-right corner

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "Fix any remaining ML references found during verification"
```

Skip this step if no fixes were needed.
