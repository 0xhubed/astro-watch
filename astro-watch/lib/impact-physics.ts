// Impact Physics Library for AstroWatch
// Implements crater scaling, blast wave, and energy calculations based on
// Collins et al. (2005) Pi-scaling and standard impact mechanics.

// ── Constants ────────────────────────────────────────────────────────────────

const HIROSHIMA_J = 6.3e13;        // Joules (Little Boy bomb yield)
const MT_TNT_J = 4.184e15;         // Joules per megaton TNT
const CHELYABINSK_J = 4.4e14;      // Joules (2013 Chelyabinsk event)
const TUNGUSKA_J = 1e16;           // Joules (1908 Tunguska event)
const EXTINCTION_J = 4.2e23;       // Joules (Chicxulub ~10 km impactor estimate)

const SURFACE_GRAVITY = 9.81;      // m/s² (Earth surface)
const TARGET_DENSITY = 2500;       // kg/m³ (average crustal rock)

// Asteroid density by spectral/compositional type (kg/m³)
const DENSITIES: Record<string, number> = {
  S: 2700,   // Silicaceous (stony): olivine, pyroxene
  C: 1300,   // Carbonaceous: carbon-rich, porous
  M: 5300,   // Metallic: iron-nickel
  DEFAULT: 2000,
};

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface ImpactResult {
  asteroidName: string;
  diameterM: number;
  velocityKmS: number;
  densityKgM3: number;
  asteroidType: string;
  massKg: number;
  kineticEnergyJ: number;
  kineticEnergyMt: number;
  hiroshimaMultiple: number;
  craterDiameterM: number;
  craterDepthM: number;
  fireballRadiusM: number;
  thermalRadiusM: number;
  overpressure10psiM: number;
  overpressure5psiM: number;
  overpressure1psiM: number;
  affectedAreaKm2: number;
  comparison: string;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Infer asteroid compositional type and density from diameter and PHA status.
 * PHAs tend to be stony; very large objects are more often S or C type.
 * This is a heuristic — real classification requires spectroscopy.
 */
function inferAsteroidType(diameterM: number, isPHA: boolean): { type: string; density: number } {
  if (isPHA) {
    // PHAs are predominantly S-type (stony) near-Earth asteroids
    return { type: 'S', density: DENSITIES.S };
  }
  if (diameterM > 1000) {
    // Large objects statistically more likely to be C-type
    return { type: 'C', density: DENSITIES.C };
  }
  if (diameterM < 50) {
    // Small, compact objects favour metallic composition
    return { type: 'M', density: DENSITIES.M };
  }
  return { type: 'S', density: DENSITIES.DEFAULT };
}

/**
 * Spherical volume → mass from diameter (metres) and density (kg/m³).
 */
function computeMass(diameterM: number, densityKgM3: number): number {
  const radius = diameterM / 2;
  const volume = (4 / 3) * Math.PI * radius ** 3;
  return densityKgM3 * volume;
}

/**
 * Kinetic energy: ½ m v²
 * diameterM in metres, velocityKmS in km/s → Joules.
 */
function computeKineticEnergy(massKg: number, velocityKmS: number): number {
  const velocityMs = velocityKmS * 1000;
  return 0.5 * massKg * velocityMs ** 2;
}

/**
 * Crater diameter — Pi-scaling (Collins et al. 2005):
 *
 *   D = 1.161 * (ρ_proj / ρ_target)^(1/3)
 *         * L^0.78 * v^0.44 * g^-0.22 * sin(θ)^(1/3)
 *
 * where:
 *   L        — projectile diameter (m)
 *   v        — impact velocity (m/s)
 *   g        — surface gravity (m/s²)
 *   θ        — impact angle (45° canonical)
 *   ρ_proj   — projectile density (kg/m³)
 *   ρ_target — target density (kg/m³)
 *
 * Returns transient crater diameter in metres.
 */
function computeCraterDiameter(
  diameterM: number,
  velocityKmS: number,
  projDensity: number,
): number {
  const L = diameterM;
  const v = velocityKmS * 1000;
  const g = SURFACE_GRAVITY;
  const sinTheta = Math.sin(Math.PI / 4); // sin(45°)

  const densityRatio = Math.pow(projDensity / TARGET_DENSITY, 1 / 3);
  const craterD =
    1.161 *
    densityRatio *
    Math.pow(L, 0.78) *
    Math.pow(v, 0.44) *
    Math.pow(g, -0.22) *
    Math.pow(sinTheta, 1 / 3);

  return craterD;
}

/**
 * Fireball radius (metres): scales with cube-root of kinetic energy.
 * Empirical coefficient from impact physics literature.
 */
function computeFireballRadius(energyJ: number): number {
  return 0.002 * Math.pow(energyJ, 1 / 3);
}

/**
 * Overpressure blast-wave radii in metres.
 * Energy in kilotons TNT (1 kt = 4.184e12 J).
 * Coefficients from Glasstone & Dolan blast-wave scaling adapted for impacts.
 */
function computeOverpressureRadii(energyJ: number): {
  r10psi: number;
  r5psi: number;
  r1psi: number;
} {
  const energyKt = energyJ / 4.184e12; // convert J → kt TNT
  const cbrtE = Math.pow(energyKt, 1 / 3);
  return {
    r10psi: 200 * cbrtE,    // metres — structural damage threshold
    r5psi: 350 * cbrtE,     // metres — moderate building damage
    r1psi: 1200 * cbrtE,    // metres — window breakage / 1psi overpressure
  };
}

/**
 * Build a human-readable comparison string against known events.
 */
function buildComparison(energyJ: number): string {
  const hiroshimas = energyJ / HIROSHIMA_J;
  const Mt = energyJ / MT_TNT_J;

  if (energyJ >= EXTINCTION_J * 0.01) {
    const extinctionFraction = energyJ / EXTINCTION_J;
    return `${extinctionFraction.toFixed(2)}× a Chicxulub-scale extinction event (${Mt.toFixed(0)} Mt TNT)`;
  }

  if (energyJ >= TUNGUSKA_J * 10) {
    const tungskakas = energyJ / TUNGUSKA_J;
    return `${tungskakas.toFixed(1)}× Tunguska 1908 (${Mt.toFixed(1)} Mt TNT, ${hiroshimas.toFixed(0)} Hiroshima bombs)`;
  }

  if (energyJ >= TUNGUSKA_J) {
    return `~${(energyJ / TUNGUSKA_J).toFixed(2)}× Tunguska 1908 (${Mt.toFixed(2)} Mt TNT)`;
  }

  if (energyJ >= CHELYABINSK_J * 10) {
    const chely = energyJ / CHELYABINSK_J;
    return `${chely.toFixed(1)}× Chelyabinsk 2013 (${Mt.toFixed(3)} Mt TNT, ${hiroshimas.toFixed(0)} Hiroshima bombs)`;
  }

  if (energyJ >= CHELYABINSK_J) {
    return `~${(energyJ / CHELYABINSK_J).toFixed(2)}× Chelyabinsk 2013 (${(Mt * 1000).toFixed(1)} kt TNT)`;
  }

  if (hiroshimas >= 1000) {
    return `${(hiroshimas / 1000).toFixed(1)}k Hiroshima bombs (${Mt.toFixed(3)} Mt TNT)`;
  }

  if (hiroshimas >= 1) {
    return `${hiroshimas.toFixed(1)} Hiroshima bomb${hiroshimas >= 2 ? 's' : ''} (${(Mt * 1000).toFixed(2)} kt TNT)`;
  }

  const kt = (energyJ / 4.184e12);
  return `${kt.toFixed(4)} kt TNT (${(hiroshimas * 1000).toFixed(0)} milliHiroshima)`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute all impact physics values for an asteroid.
 *
 * @param asteroidName  Display name / designation
 * @param diameterM     Mean diameter in metres
 * @param velocityKmS   Relative velocity in km/s
 * @param isPHA         Whether NASA classifies it as potentially hazardous
 */
export function computeImpact(
  asteroidName: string,
  diameterM: number,
  velocityKmS: number,
  isPHA: boolean,
): ImpactResult {
  const { type, density } = inferAsteroidType(diameterM, isPHA);
  const massKg = computeMass(diameterM, density);
  const kineticEnergyJ = computeKineticEnergy(massKg, velocityKmS);
  const kineticEnergyMt = kineticEnergyJ / MT_TNT_J;
  const hiroshimaMultiple = kineticEnergyJ / HIROSHIMA_J;

  const craterDiameterM = computeCraterDiameter(diameterM, velocityKmS, density);
  const craterDepthM = 0.2 * craterDiameterM;

  const fireballRadiusM = computeFireballRadius(kineticEnergyJ);
  const thermalRadiusM = 10 * fireballRadiusM;

  const { r10psi, r5psi, r1psi } = computeOverpressureRadii(kineticEnergyJ);
  const affectedAreaKm2 = Math.PI * (r1psi / 1000) ** 2;

  const comparison = buildComparison(kineticEnergyJ);

  return {
    asteroidName,
    diameterM,
    velocityKmS,
    densityKgM3: density,
    asteroidType: type,
    massKg,
    kineticEnergyJ,
    kineticEnergyMt,
    hiroshimaMultiple,
    craterDiameterM,
    craterDepthM,
    fireballRadiusM,
    thermalRadiusM,
    overpressure10psiM: r10psi,
    overpressure5psiM: r5psi,
    overpressure1psiM: r1psi,
    affectedAreaKm2,
    comparison,
  };
}

/**
 * Format an energy value (Joules) as a human-readable string.
 * Automatically picks the most appropriate unit.
 */
export function formatEnergy(joules: number): string {
  if (joules >= MT_TNT_J * 1e6) {
    return `${(joules / (MT_TNT_J * 1e6)).toFixed(2)} Tt TNT`;
  }
  if (joules >= MT_TNT_J * 1e3) {
    return `${(joules / (MT_TNT_J * 1e3)).toFixed(2)} Gt TNT`;
  }
  if (joules >= MT_TNT_J) {
    return `${(joules / MT_TNT_J).toFixed(3)} Mt TNT`;
  }
  if (joules >= 4.184e12) {
    return `${(joules / 4.184e12).toFixed(3)} kt TNT`;
  }
  if (joules >= 1e9) {
    return `${(joules / 1e9).toFixed(2)} GJ`;
  }
  if (joules >= 1e6) {
    return `${(joules / 1e6).toFixed(2)} MJ`;
  }
  return `${joules.toExponential(2)} J`;
}

/**
 * Format a distance in metres as a human-readable string.
 * Uses km for ≥1000 m, otherwise metres.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1e6) {
    return `${(meters / 1e3).toFixed(0)} km`;
  }
  if (meters >= 1e3) {
    return `${(meters / 1e3).toFixed(2)} km`;
  }
  if (meters >= 1) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters * 100).toFixed(1)} cm`;
}
