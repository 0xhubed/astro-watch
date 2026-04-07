# Next-Level Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features that elevate AstroWatch: guided tour for onboarding, approach timeline charts, and physics-based impact simulation.

**Architecture:** Three independent features. Guided Tour is a React overlay component. Approach Timeline is a Recharts component with a shared compact/full mode. Impact Simulation combines a physics library with a globe visualization and AI narrative.

**Tech Stack:** React, Recharts (already installed), react-globe.gl (already installed), framer-motion (already installed), Zustand.

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/tour/GuidedTour.tsx` | Spotlight-style 3-step onboarding overlay |
| Create | `lib/approach-curve.ts` | Hyperbolic flyby distance computation |
| Create | `components/visualization/charts/ApproachTimeline.tsx` | Sparkline + full timeline chart |
| Create | `lib/impact-physics.ts` | Crater, fireball, blast wave calculations |
| Create | `components/simulation/ImpactSimulation.tsx` | Full-screen impact modal with globe + stats |
| Modify | `app/dashboard/page.tsx` | Mount GuidedTour |
| Modify | `components/visualization/3d/EnhancedSolarSystem.tsx` | Add "Simulate Impact" button + sparkline to AsteroidInfoPanel |
| Modify | `components/visualization/charts/RiskDashboard.tsx` | Add expanded timeline section |

---

### Task 1: Guided Tour

**Files:**
- Create: `astro-watch/components/tour/GuidedTour.tsx`
- Modify: `astro-watch/app/dashboard/page.tsx`

- [ ] **Step 1: Create GuidedTour.tsx**

Create `astro-watch/components/tour/GuidedTour.tsx`:

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

const STORAGE_KEY = 'astrowatch-tour-dismissed';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: TourStep[] = [
  {
    target: 'canvas',
    title: 'Solar System View',
    description: 'This is a real-time view of near-Earth asteroids from NASA. Drag to rotate, scroll to zoom.',
    position: 'top',
  },
  {
    target: '[class*="Nearby Asteroids"], [class*="AsteroidInfoPanel"]',
    title: 'Asteroid Data',
    description: 'Click any asteroid to see its details — size, speed, miss distance, and risk level.',
    position: 'left',
  },
  {
    target: '[class*="MessageCircle"], button[class*="purple"]',
    title: 'AI Assistant',
    description: 'Ask the AI anything — it can search data, explain risks, and control the visualization.',
    position: 'top',
  },
];

export function GuidedTour() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [activeTour, setActiveTour] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    setActiveTour(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const startTour = useCallback(() => {
    setShowPrompt(false);
    setActiveTour(true);
    setStep(0);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Replay button (always visible in header area)
  const ReplayButton = (
    <button
      onClick={() => { setActiveTour(true); setStep(0); }}
      className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      title="Take a tour"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );

  return (
    <>
      {ReplayButton}

      {/* Initial prompt */}
      <AnimatePresence>
        {showPrompt && !activeTour && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl px-5 py-3 flex items-center gap-4 shadow-lg shadow-purple-500/10"
          >
            <span className="text-sm text-gray-300">First time here?</span>
            <button
              onClick={startTour}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              Take a tour
            </button>
            <button onClick={dismiss} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour overlay */}
      <AnimatePresence>
        {activeTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={dismiss} />

            {/* Tooltip */}
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-xl p-5 max-w-sm shadow-2xl"
            >
              <div className="text-xs text-purple-400 font-medium mb-1">
                Step {step + 1} of {STEPS.length}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{STEPS[step].title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{STEPS[step].description}</p>

              <div className="flex items-center justify-between">
                <button
                  onClick={dismiss}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Skip
                </button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-3 h-3" /> Back
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                  >
                    {step < STEPS.length - 1 ? <>Next <ChevronRight className="w-3 h-3" /></> : 'Done'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Mount in dashboard**

In `astro-watch/app/dashboard/page.tsx`, add import:
```tsx
import { GuidedTour } from '@/components/tour/GuidedTour';
```

Add `<GuidedTour />` after `<ChatPanel />` near the end of the component.

- [ ] **Step 3: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck
git add astro-watch/components/tour/ astro-watch/app/dashboard/page.tsx
git commit -m "Add guided tour for first-time visitors with 3-step onboarding"
```

---

### Task 2: Approach Curve Library

**Files:**
- Create: `astro-watch/lib/approach-curve.ts`

- [ ] **Step 1: Create approach-curve.ts**

Create `astro-watch/lib/approach-curve.ts`:

```ts
import { EnhancedAsteroid } from './nasa-api';

export interface ApproachDataPoint {
  date: string;        // ISO date string
  distance: number;    // AU
  daysFromClosest: number;
}

/**
 * Compute a synthetic approach curve for an asteroid modeled as a hyperbolic flyby.
 * distance(t) = sqrt(d_min² + (v_au * Δt)²)
 * 
 * @param asteroid - EnhancedAsteroid with missDistance, velocity, close_approach_data
 * @param windowDays - Total window in days (default 14, centered on closest approach)
 * @param points - Number of data points to generate (default 50)
 */
export function computeApproachCurve(
  asteroid: EnhancedAsteroid,
  windowDays = 14,
  points = 50,
): ApproachDataPoint[] {
  const dMin = asteroid.missDistance; // AU
  const vKmS = asteroid.velocity;    // km/s
  
  // Convert velocity to AU/day (1 AU = 149,597,870.7 km)
  const vAuDay = (vKmS * 86400) / 149597870.7;
  
  // Parse closest approach date
  const closestDateStr = asteroid.close_approach_data[0]?.close_approach_date;
  const closestDate = closestDateStr ? new Date(closestDateStr) : new Date();
  
  const halfWindow = windowDays / 2;
  const result: ApproachDataPoint[] = [];
  
  for (let i = 0; i < points; i++) {
    const daysFromClosest = -halfWindow + (i / (points - 1)) * windowDays;
    const distance = Math.sqrt(dMin * dMin + Math.pow(vAuDay * daysFromClosest, 2));
    
    const date = new Date(closestDate);
    date.setDate(date.getDate() + daysFromClosest);
    
    result.push({
      date: date.toISOString().split('T')[0],
      distance: Math.round(distance * 10000) / 10000, // 4 decimal places
      daysFromClosest: Math.round(daysFromClosest * 10) / 10,
    });
  }
  
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/approach-curve.ts
git commit -m "Add approach curve computation for hyperbolic flyby model"
```

---

### Task 3: Approach Timeline Component

**Files:**
- Create: `astro-watch/components/visualization/charts/ApproachTimeline.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (add sparkline to AsteroidInfoPanel)
- Modify: `astro-watch/components/visualization/charts/RiskDashboard.tsx` (add expanded view)

- [ ] **Step 1: Create ApproachTimeline.tsx**

Create `astro-watch/components/visualization/charts/ApproachTimeline.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { computeApproachCurve } from '@/lib/approach-curve';
import { getRarity3DColor } from '@/components/ui/RiskLegend';

interface Props {
  asteroids: EnhancedAsteroid[];
  compact?: boolean;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

export function ApproachTimeline({ asteroids, compact = false }: Props) {
  const today = new Date().toISOString().split('T')[0];

  if (compact && asteroids.length === 1) {
    return <SparklineView asteroid={asteroids[0]} today={today} />;
  }

  return <FullView asteroids={asteroids} today={today} />;
}

function SparklineView({ asteroid, today }: { asteroid: EnhancedAsteroid; today: string }) {
  const data = useMemo(() => computeApproachCurve(asteroid), [asteroid]);
  const color = getRarity3DColor(asteroid.rarity);

  return (
    <div className="w-full h-[60px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`grad-${asteroid.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="distance"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${asteroid.id})`}
            animationDuration={1000}
          />
          <ReferenceLine x={today} stroke="#ffffff30" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#f3f4f6',
            }}
            formatter={(value: number) => [`${value.toFixed(4)} AU`, 'Distance']}
            labelFormatter={(label: string) => label}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FullView({ asteroids, today }: { asteroids: EnhancedAsteroid[]; today: string }) {
  // Top 5 closest approaches
  const topAsteroids = useMemo(() =>
    [...asteroids].sort((a, b) => a.missDistance - b.missDistance).slice(0, 5),
    [asteroids]
  );

  // Compute curves and merge into unified timeline
  const { mergedData, asteroidNames } = useMemo(() => {
    const curves = topAsteroids.map(a => ({
      name: a.name,
      data: computeApproachCurve(a),
    }));

    // Collect all unique dates
    const allDates = new Set<string>();
    curves.forEach(c => c.data.forEach(d => allDates.add(d.date)));
    const sortedDates = [...allDates].sort();

    // Build merged data with one distance column per asteroid
    const merged = sortedDates.map(date => {
      const row: Record<string, unknown> = { date };
      curves.forEach(c => {
        const point = c.data.find(d => d.date === date);
        row[c.name] = point?.distance ?? null;
      });
      return row;
    });

    return { mergedData: merged, asteroidNames: curves.map(c => c.name) };
  }, [topAsteroids]);

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-1">Close Approach Timelines</h3>
      <p className="text-xs text-gray-500 mb-4">Miss distance over 14-day approach window (top 5 closest)</p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={mergedData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={(d: string) => d.slice(5)} // MM-DD
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickFormatter={(v: number) => `${v.toFixed(2)}`}
            label={{ value: 'AU', position: 'insideTopLeft', fill: '#6b7280', fontSize: 10 }}
          />
          <ReferenceLine x={today} stroke="#ffffff20" strokeDasharray="3 3" label={{ value: 'Today', fill: '#6b7280', fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f3f4f6',
            }}
            formatter={(value: number) => [`${value?.toFixed(4)} AU`]}
          />
          {asteroidNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              animationDuration={1500}
              animationBegin={i * 200}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3">
        {asteroidNames.map((name, i) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add sparkline to AsteroidInfoPanel**

In `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx`, find the `AsteroidInfoPanel` function (line 1537). Add import at the top of the file:

```tsx
import { ApproachTimeline } from '@/components/visualization/charts/ApproachTimeline';
```

Inside `AsteroidInfoPanel`, after the "Next Approach" section (after the `</div>` around line 1609) and before the "View Detailed Information" button, add:

```tsx
        <div className="pt-2 border-t border-white/10">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Approach Timeline</div>
          <ApproachTimeline asteroids={[asteroid]} compact />
        </div>
```

- [ ] **Step 3: Add expanded timeline to RiskDashboard**

In `astro-watch/components/visualization/charts/RiskDashboard.tsx`, add import:

```tsx
import { ApproachTimeline } from './ApproachTimeline';
```

Find the end of the dashboard content (before the closing `</div>` and `<style>` block, around line 474). Add:

```tsx
      {/* Approach Timelines */}
      <ApproachTimeline asteroids={asteroids} />
```

- [ ] **Step 4: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck
git add astro-watch/lib/approach-curve.ts astro-watch/components/visualization/charts/ApproachTimeline.tsx astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx astro-watch/components/visualization/charts/RiskDashboard.tsx
git commit -m "Add approach timeline: sparkline in info panel + full chart in dashboard"
```

---

### Task 4: Impact Physics Library

**Files:**
- Create: `astro-watch/lib/impact-physics.ts`

- [ ] **Step 1: Create impact-physics.ts**

Create `astro-watch/lib/impact-physics.ts`:

```ts
export interface ImpactResult {
  // Input
  asteroidName: string;
  diameterM: number;
  velocityKmS: number;
  densityKgM3: number;
  asteroidType: string;

  // Energy
  massKg: number;
  kineticEnergyJ: number;
  kineticEnergyMt: number;    // megatons TNT
  hiroshimaMultiple: number;

  // Crater
  craterDiameterM: number;
  craterDepthM: number;

  // Blast
  fireballRadiusM: number;
  thermalRadiusM: number;     // severe burns
  overpressure10psiM: number; // severe structural damage
  overpressure5psiM: number;  // moderate damage
  overpressure1psiM: number;  // window breakage

  // Area
  affectedAreaKm2: number;    // 1 psi radius area

  // Comparison
  comparison: string;
}

const HIROSHIMA_J = 6.3e13;   // 63 TJ
const MT_TO_J = 4.184e15;     // 1 megaton TNT in joules
const G = 9.81;               // m/s²
const TARGET_DENSITY = 2500;  // kg/m³ (rock)

/**
 * Estimate asteroid density from observable properties.
 */
function estimateDensity(sizeM: number, isPHA: boolean): { density: number; type: string } {
  if (isPHA && sizeM > 200) return { density: 5300, type: 'M-type (metallic)' };
  if (sizeM > 100) return { density: 2700, type: 'S-type (siliceous)' };
  if (sizeM < 50) return { density: 1300, type: 'C-type (carbonaceous)' };
  return { density: 2000, type: 'Unknown type' };
}

/**
 * Compute impact effects using established scaling laws.
 * Crater: Pi-scaling (Collins et al. 2005)
 * Blast: standard nuclear test scaling
 */
export function computeImpact(
  asteroidName: string,
  diameterM: number,
  velocityKmS: number,
  isPHA: boolean,
): ImpactResult {
  const { density, type } = estimateDensity(diameterM, isPHA);
  const radius = diameterM / 2;
  const velocityMS = velocityKmS * 1000;

  // Mass (spherical body)
  const mass = (4 / 3) * Math.PI * Math.pow(radius, 3) * density;

  // Kinetic energy
  const ke = 0.5 * mass * Math.pow(velocityMS, 2);
  const keMt = ke / MT_TO_J;
  const hiroshima = ke / HIROSHIMA_J;

  // Crater diameter — Pi-scaling (Collins et al. 2005)
  // D = 1.161 * (ρ_proj/ρ_target)^(1/3) * L^0.78 * v^0.44 * g^-0.22 * sin(45°)^(1/3)
  const sin45 = Math.sin(Math.PI / 4);
  const craterD = 1.161
    * Math.pow(density / TARGET_DENSITY, 1 / 3)
    * Math.pow(diameterM, 0.78)
    * Math.pow(velocityMS, 0.44)
    * Math.pow(G, -0.22)
    * Math.pow(sin45, 1 / 3);
  const craterDepth = craterD * 0.2; // typical depth/diameter ratio

  // Fireball radius (scaled from nuclear test data)
  const fireballR = 0.002 * Math.pow(ke, 0.33);

  // Thermal radiation radius (severe burns ~10x fireball)
  const thermalR = fireballR * 10;

  // Overpressure radii (blast wave scaling from energy)
  // Using Glasstone & Dolan scaling: R ∝ E^(1/3) / P^(1/3)
  const energyKt = keMt * 1000; // kilotons
  const scaleFactor = Math.pow(energyKt, 1 / 3);
  const overpressure10 = scaleFactor * 200;  // meters, severe damage
  const overpressure5 = scaleFactor * 350;   // moderate damage
  const overpressure1 = scaleFactor * 1200;  // window breakage

  // Affected area (1 psi radius)
  const affectedArea = Math.PI * Math.pow(overpressure1 / 1000, 2); // km²

  // Comparison
  let comparison: string;
  if (ke < 4.4e14) comparison = 'Smaller than Chelyabinsk 2013';
  else if (ke < 1e16) comparison = 'Comparable to Tunguska 1908';
  else if (ke < 1e20) comparison = `${Math.round(hiroshima).toLocaleString()}x Hiroshima`;
  else if (ke < 1e23) comparison = 'Regional extinction-level event';
  else comparison = 'Global extinction-level event (Chicxulub-class)';

  return {
    asteroidName,
    diameterM,
    velocityKmS,
    densityKgM3: density,
    asteroidType: type,
    massKg: mass,
    kineticEnergyJ: ke,
    kineticEnergyMt: keMt,
    hiroshimaMultiple: hiroshima,
    craterDiameterM: craterD,
    craterDepthM: craterDepth,
    fireballRadiusM: fireballR,
    thermalRadiusM: thermalR,
    overpressure10psiM: overpressure10,
    overpressure5psiM: overpressure5,
    overpressure1psiM: overpressure1,
    affectedAreaKm2: affectedArea,
    comparison,
  };
}

/** Format large numbers readably */
export function formatEnergy(joules: number): string {
  if (joules >= 1e18) return `${(joules / 1e18).toFixed(1)} EJ`;
  if (joules >= 1e15) return `${(joules / 1e15).toFixed(1)} PJ`;
  if (joules >= 1e12) return `${(joules / 1e12).toFixed(1)} TJ`;
  if (joules >= 1e9) return `${(joules / 1e9).toFixed(1)} GJ`;
  return `${joules.toExponential(2)} J`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
```

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/impact-physics.ts
git commit -m "Add impact physics library: crater scaling, blast waves, energy calculations"
```

---

### Task 5: Impact Simulation Modal

**Files:**
- Create: `astro-watch/components/simulation/ImpactSimulation.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (add "Simulate Impact" button)

- [ ] **Step 1: Create ImpactSimulation.tsx**

Create `astro-watch/components/simulation/ImpactSimulation.tsx`:

```tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Zap, Circle, Radio } from 'lucide-react';
import dynamic from 'next/dynamic';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { computeImpact, formatEnergy, formatDistance, ImpactResult } from '@/lib/impact-physics';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Land-weighted random locations
const IMPACT_LOCATIONS = [
  { lat: 48.8, lng: 2.3, label: 'Central Europe' },
  { lat: 35.7, lng: 139.7, label: 'East Asia' },
  { lat: 40.7, lng: -74.0, label: 'North America (East)' },
  { lat: 34.0, lng: -118.2, label: 'North America (West)' },
  { lat: -23.5, lng: -46.6, label: 'South America' },
  { lat: 28.6, lng: 77.2, label: 'South Asia' },
  { lat: -33.9, lng: 18.4, label: 'Southern Africa' },
  { lat: 55.7, lng: 37.6, label: 'Eastern Europe' },
];

interface Props {
  asteroid: EnhancedAsteroid;
  onClose: () => void;
}

export function ImpactSimulation({ asteroid, onClose }: Props) {
  const [location, setLocation] = useState(() =>
    IMPACT_LOCATIONS[Math.floor(Math.random() * IMPACT_LOCATIONS.length)]
  );

  const impact = useMemo(() =>
    computeImpact(
      asteroid.name,
      asteroid.size,
      asteroid.velocity,
      asteroid.is_potentially_hazardous_asteroid,
    ),
    [asteroid]
  );

  const [narrative, setNarrative] = useState<string>('');
  const [loadingNarrative, setLoadingNarrative] = useState(false);

  const fetchNarrative = useCallback(async () => {
    setLoadingNarrative(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Describe what would happen if asteroid ${asteroid.name} (${asteroid.size.toFixed(0)}m diameter, ${asteroid.velocity.toFixed(1)} km/s) hit Earth near ${location.label}. Impact energy: ${formatEnergy(impact.kineticEnergyJ)} (${Math.round(impact.hiroshimaMultiple).toLocaleString()}x Hiroshima). Crater: ${formatDistance(impact.craterDiameterM)}. Be vivid but scientifically grounded. 3-4 sentences. Do NOT use any tools.`,
          }],
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              text += data.content;
              setNarrative(text);
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setNarrative('Unable to generate impact narrative.');
    } finally {
      setLoadingNarrative(false);
    }
  }, [asteroid, location, impact]);

  // Fetch on mount
  useState(() => { fetchNarrative(); });

  // Rings for globe
  const ringsData = useMemo(() => [
    { lat: location.lat, lng: location.lng, maxR: Math.min(impact.craterDiameterM / 2000, 50), propagationSpeed: 2, repeatPeriod: 800, color: 'rgba(239, 68, 68, 0.6)' },
    { lat: location.lat, lng: location.lng, maxR: Math.min(impact.fireballRadiusM / 2000, 100), propagationSpeed: 3, repeatPeriod: 1000, color: 'rgba(249, 115, 22, 0.4)' },
    { lat: location.lat, lng: location.lng, maxR: Math.min(impact.overpressure1psiM / 5000, 200), propagationSpeed: 4, repeatPeriod: 1200, color: 'rgba(59, 130, 246, 0.2)' },
  ], [location, impact]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex"
    >
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white">
        <X className="w-6 h-6" />
      </button>

      {/* Globe */}
      <div className="flex-1 relative">
        <Globe
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          ringsData={ringsData}
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor="color"
          pointOfView={{ lat: location.lat, lng: location.lng, altitude: 2.5 }}
          onGlobeClick={({ lat, lng }: { lat: number; lng: number }) => {
            setLocation({ lat, lng, label: `${lat.toFixed(1)}°, ${lng.toFixed(1)}°` });
          }}
          width={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
          height={typeof window !== 'undefined' ? window.innerHeight : 600}
        />
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
          <MapPin className="w-3 h-3 inline mr-1" />
          Click globe to change impact location
        </div>
      </div>

      {/* Stats panel */}
      <div className="w-[400px] bg-gray-900/95 border-l border-white/10 overflow-y-auto p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-white">Impact Simulation</h2>
          <p className="text-sm text-gray-400 mt-1">{asteroid.name} → {location.label}</p>
        </div>

        {/* Energy */}
        <StatSection icon={<Zap className="w-4 h-4 text-yellow-400" />} title="Impact Energy">
          <StatRow label="Kinetic Energy" value={formatEnergy(impact.kineticEnergyJ)} />
          <StatRow label="TNT Equivalent" value={`${impact.kineticEnergyMt.toFixed(2)} Mt`} />
          <StatRow label="Hiroshima Multiple" value={`${Math.round(impact.hiroshimaMultiple).toLocaleString()}x`} highlight />
        </StatSection>

        {/* Crater */}
        <StatSection icon={<Circle className="w-4 h-4 text-red-400" />} title="Crater">
          <StatRow label="Diameter" value={formatDistance(impact.craterDiameterM)} />
          <StatRow label="Depth" value={formatDistance(impact.craterDepthM)} />
        </StatSection>

        {/* Blast */}
        <StatSection icon={<Radio className="w-4 h-4 text-blue-400" />} title="Blast Radii">
          <StatRow label="Fireball" value={formatDistance(impact.fireballRadiusM)} />
          <StatRow label="Severe Damage (10 psi)" value={formatDistance(impact.overpressure10psiM)} />
          <StatRow label="Moderate Damage (5 psi)" value={formatDistance(impact.overpressure5psiM)} />
          <StatRow label="Window Breakage (1 psi)" value={formatDistance(impact.overpressure1psiM)} />
          <StatRow label="Affected Area" value={`${Math.round(impact.affectedAreaKm2).toLocaleString()} km²`} />
        </StatSection>

        {/* Comparison */}
        <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 font-medium">
          {impact.comparison}
        </div>

        {/* Asteroid properties */}
        <StatSection icon={null} title="Asteroid Properties">
          <StatRow label="Diameter" value={`${impact.diameterM.toFixed(0)} m`} />
          <StatRow label="Velocity" value={`${impact.velocityKmS.toFixed(1)} km/s`} />
          <StatRow label="Type" value={impact.asteroidType} />
          <StatRow label="Mass" value={`${impact.massKg.toExponential(2)} kg`} />
        </StatSection>

        {/* AI Narrative */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">AI Impact Analysis</h4>
          <p className="text-sm text-gray-300 leading-relaxed">
            {loadingNarrative ? 'Generating analysis...' : narrative || 'No narrative available.'}
          </p>
        </div>

        <div className="text-[10px] text-gray-600 mt-auto">
          Physics: Collins et al. 2005 (crater scaling), Glasstone &amp; Dolan (blast waves). For educational purposes only.
        </div>
      </div>
    </motion.div>
  );
}

function StatSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'font-semibold text-amber-300' : 'text-gray-200 font-mono'}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Add "Simulate Impact" button to AsteroidInfoPanel**

In `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx`:

First add the import at the top:
```tsx
import { ImpactSimulation } from '@/components/simulation/ImpactSimulation';
```

In the main `EnhancedSolarSystem` component, add state:
```tsx
const [showImpactSim, setShowImpactSim] = useState(false);
```

In `AsteroidInfoPanel`, add an `onSimulateImpact` prop and a button after the "View Detailed Information" button:
```tsx
<button
  onClick={onSimulateImpact}
  className="w-full mt-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium"
>
  Simulate Impact
</button>
```

Render the modal conditionally in the main component (outside Canvas, alongside DetailedAsteroidView):
```tsx
<AnimatePresence>
  {showImpactSim && selectedAsteroid && (
    <ImpactSimulation
      asteroid={selectedAsteroid}
      onClose={() => setShowImpactSim(false)}
    />
  )}
</AnimatePresence>
```

Wire up the prop passing from `EnhancedSolarSystem` → `AsteroidInfoPanel`.

- [ ] **Step 3: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck
git add astro-watch/components/simulation/ astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx
git commit -m "Add impact simulation: physics engine, globe visualization, AI narrative"
```

---

### Task 6: Build Verification

- [ ] **Step 1: Typecheck and build**

```bash
cd astro-watch/astro-watch && npm run typecheck && npm run build
```

Expected: All routes present, no errors.

- [ ] **Step 2: Commit any fixes**

```bash
git add -A && git commit -m "Fix build issues from next-level features"
```
