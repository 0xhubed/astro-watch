# AstroWatch Next-Level Features: Impact Simulation, Approach Timeline, Guided Tour

**Date:** 2026-04-07
**Status:** Approved
**Goal:** Add three features that elevate AstroWatch from a technical demo to a compelling, interactive experience: a physics-based impact simulation, animated approach timelines, and a guided tour for first-time visitors.

## Feature 1: Guided Tour

Non-intrusive onboarding for first-time visitors to the dashboard.

### Trigger

On first visit to `/dashboard`, a floating banner appears at bottom-center: "First time here? Take a quick tour" with a "Start Tour" button and dismiss X. Dismissal stored in `localStorage` key `astrowatch-tour-dismissed`. A "?" icon in the header allows replaying anytime.

### Steps

1. **Solar System** — spotlights the 3D canvas. "This is a real-time view of near-Earth asteroids from NASA. Drag to rotate, scroll to zoom."
2. **Asteroid List** — spotlights the right info panel. "Click any asteroid to see its details — size, speed, miss distance, and risk level."
3. **Chat Button** — spotlights the purple FAB. "Ask the AI assistant anything — it can search data, explain risks, and control the visualization."

### UI

Each step dims the background with a semi-transparent overlay and spotlights the target area (CSS clip-path or box-shadow cutout). A tooltip card with step text, step indicator (1/3), and Back/Next/Skip buttons. No external library — pure React component with absolute positioning.

### Files

| Action | File |
|--------|------|
| Create | `components/tour/GuidedTour.tsx` |
| Modify | `app/dashboard/page.tsx` (mount tour, add replay button) |

---

## Feature 2: Impact Simulation

A "Simulate Impact" experience showing what would happen if a selected asteroid hit Earth.

### Trigger

A "Simulate Impact" button in the asteroid info panel (appears when an asteroid is selected). Opens a full-screen modal overlay.

### Physics Engine

File: `lib/impact-physics.ts`

All calculations are deterministic and run client-side.

**Input:** asteroid diameter (meters), velocity (km/s), density (derived from spectral type approximation based on asteroid properties).

**Density mapping:**
- S-type (siliceous): 2,700 kg/m³ — assigned when `size > 100m && velocity < 20 km/s`
- C-type (carbonaceous): 1,300 kg/m³ — assigned when `size < 100m`
- M-type (metallic): 5,300 kg/m³ — assigned when `is_potentially_hazardous_asteroid && size > 200m`
- Default: 2,000 kg/m³

**Calculations:**
- **Mass:** `M = (4/3) * π * (d/2)³ * ρ` (spherical body)
- **Kinetic energy:** `KE = 0.5 * M * v²`
- **Crater diameter:** Pi-scaling (Collins et al. 2005): `D = 1.161 * (ρ_proj/ρ_target)^(1/3) * d^0.78 * v^0.44 * g^-0.22 * (sin(45°))^(1/3)` where ρ_target = 2,500 kg/m³ (rock), g = 9.81 m/s², θ = 45° (most probable impact angle)
- **Fireball radius:** `R = 0.002 * KE^0.33` (meters, scaled from nuclear test data)
- **Thermal radiation radius:** `R_thermal = 10 * R_fireball` (approximate)
- **Overpressure radii:** 10 psi (severe damage), 5 psi (moderate), 1 psi (window breakage) — scaled from KE using standard blast wave formulas
- **Affected area:** `π * R²` for each radius

**Comparisons:**
- Hiroshima: 63 TJ (terajoules)
- Chelyabinsk 2013: 440 TJ
- Tunguska 1908: 10-15 PJ (petajoules)
- Chicxulub (dinosaur extinction): ~4.2 × 10²³ J

**Output:** `ImpactResult` object with all computed values + comparison strings.

### UI Layout

File: `components/simulation/ImpactSimulation.tsx`

Full-screen modal overlay (z-50, backdrop blur):

- **Left (60%):** Globe visualization using existing `react-globe.gl`. Shows impact point with concentric rings: crater (red), fireball (orange), thermal (yellow), overpressure zones (blue rings). Default impact location: random land-mass-weighted point. User can click globe to relocate.
- **Right (40%):** Stats panel:
  - Asteroid name and properties
  - Impact energy (joules + Hiroshima multiples)
  - Crater diameter (meters/km)
  - Fireball radius
  - Affected area (km²)
  - Comparison badge ("Similar to Tunguska" or "1000x Hiroshima")
- **Bottom:** AI-generated impact narrative. Fetched via `/api/chat` with a purpose-built message: "Describe what would happen if asteroid [name] ([size]m, [velocity] km/s) hit Earth at [location]. Include effects on the surrounding area. Be vivid but scientifically grounded. 3-4 sentences."

### Mobile

On mobile, stack vertically: globe on top, stats below, narrative at bottom. Globe takes 50vh.

### Files

| Action | File |
|--------|------|
| Create | `lib/impact-physics.ts` |
| Create | `components/simulation/ImpactSimulation.tsx` |
| Modify | `components/visualization/3d/EnhancedSolarSystem.tsx` (add "Simulate Impact" button to info panel) |

---

## Feature 3: Approach Timeline

Animated chart showing how an asteroid's miss distance changes over its close approach window.

### Data Model

File: `lib/approach-curve.ts`

For each asteroid, compute a synthetic approach curve modeled as a hyperbolic flyby:

```
distance(t) = sqrt(d_min² + (v * Δt)²)
```

Where:
- `d_min` = closest approach distance (AU)
- `v` = relative velocity (AU/day, converted from km/s)
- `Δt` = time offset from closest approach (days)

Generates 50 data points over a 14-day window centered on the closest approach date. Returns `Array<{ date: string; distance: number }>`.

### Sparkline (Asteroid Info Panel)

Compact 200x60px `AreaChart` (Recharts):
- X-axis: dates (hidden labels, just ticks)
- Y-axis: distance in AU (hidden labels)
- Gradient fill: risk color at bottom fading to transparent
- Dot marker at minimum point
- Vertical dashed line at current date
- Tooltip on hover showing date + distance

### Expanded View (Dashboard)

Full-width section in RiskDashboard, after existing charts:
- Title: "Close Approach Timelines"
- Shows top 5 closest-approaching asteroids as overlaid `Line` series
- Each asteroid a different color with legend
- Full axis labels (date, AU)
- Interactive tooltip showing all asteroid distances at the hovered date
- Animated entrance: curves draw left-to-right using Recharts `animationDuration`

### Shared Component

File: `components/visualization/charts/ApproachTimeline.tsx`

Props: `{ asteroids: EnhancedAsteroid[]; compact?: boolean }`
- `compact=true`: sparkline for single asteroid (used in info panel)
- `compact=false`: full multi-asteroid chart (used in dashboard)

### Files

| Action | File |
|--------|------|
| Create | `lib/approach-curve.ts` |
| Create | `components/visualization/charts/ApproachTimeline.tsx` |
| Modify | `components/visualization/3d/EnhancedSolarSystem.tsx` (add sparkline to asteroid info panel) |
| Modify | `components/visualization/charts/RiskDashboard.tsx` (add expanded timeline section) |

---

## Delivery Order

1. **Guided Tour** — quick win, immediately improves first impression
2. **Approach Timeline** — data component, no external dependencies
3. **Impact Simulation** — largest feature, depends on globe component already in codebase

Each feature is independently demoable.
