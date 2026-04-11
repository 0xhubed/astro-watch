import { EnhancedAsteroid } from './nasa-api';

// Moon orbital and physical parameters
const MOON_DATA = {
  orbitalRadius: 384400,          // km from Earth
  radius: 1737,                   // km
  mass: 7.35e22,                  // kg
  orbitalPeriod: 27.3,            // days
  orbitalVelocity: 1.022,         // km/s
  orbitalInclination: 5.14,       // degrees to ecliptic
  escapeVelocity: 2.38,           // km/s
  surfaceGravity: 1.62,           // m/s²
};

// Historical impact data
const MOON_IMPACT_STATISTICS = {
  // Observable impact rate (flashes visible from Earth)
  observableImpactsPerYear: 1,
  
  // Minimum size for observable impact
  minimumObservableSize: 1,       // meters
  
  // Total mass flux to Moon
  massFluxPerSecond: 1e-17,      // kg/s
  
  // Crater formation rate
  newCratersPerYear: 180,        // >10m diameter
  
  // Size distribution follows power law
  sizeDistributionExponent: -2.5,
};

export interface MoonCollisionRisk {
  probability: number;            // 0-1 probability of Moon collision
  confidence: number;             // Confidence in assessment
  impactVelocity: number;         // km/s if collision occurs
  impactEnergy: number;           // Joules
  craterDiameter: number;         // Expected crater size (meters)
  observableFromEarth: boolean;   // Would we see the impact flash?
  closestMoonApproach: number;    // AU - closest approach to Moon
  moonEncounterDate?: string;     // ISO date string
  comparisonToEarth: {
    earthProbability: number;
    moonToEarthRatio: number;
    interpretation: string;
  };
}

/**
 * Calculate the probability of an asteroid colliding with the Moon
 * instead of (or in addition to) Earth
 */
export function calculateMoonCollisionRisk(asteroid: EnhancedAsteroid): MoonCollisionRisk {
  // 1. Basic geometric collision probability
  const geometricProbability = calculateGeometricCollisionProbability(asteroid);
  
  // 2. Orbital mechanics factors
  const orbitalFactors = calculateOrbitalFactors(asteroid);
  
  // 3. Gravitational focusing effects
  const gravitationalFocusing = calculateGravitationalFocusing(asteroid);
  
  // 4. Combined probability, capped at physically realistic values.
  // Even the most favourable geometry yields P << 1e-4 for a single pass.
  const moonCollisionProbability = Math.min(
    geometricProbability * orbitalFactors * gravitationalFocusing,
    1e-4,
  );
  
  // 5. Impact characteristics if collision occurs
  const impactVelocity = calculateImpactVelocity(asteroid);
  const impactEnergy = calculateImpactEnergy(asteroid, impactVelocity);
  const craterDiameter = calculateCraterDiameter(asteroid, impactVelocity);
  
  // 6. Observability from Earth
  const observableFromEarth = isObservableFromEarth(asteroid, impactEnergy);
  
  // 7. Comparison to Earth collision probability
  const earthProbability = asteroid.risk || 0; // Existing Earth risk assessment
  const moonToEarthRatio = earthProbability > 0 ? moonCollisionProbability / earthProbability : moonCollisionProbability * 1e6;
  
  // 8. Additional properties
  const closestMoonApproach = asteroid.missDistance * 0.3; // Approximate Moon approach distance
  const moonEncounterDate = asteroid.close_approach_data[0]?.close_approach_date;
  
  // 9. Interpretation
  let interpretation = '';
  if (moonToEarthRatio > 1) {
    interpretation = 'More likely to hit Moon than Earth';
  } else if (moonToEarthRatio > 0.1) {
    interpretation = 'Significant Moon collision risk';
  } else if (moonToEarthRatio > 0.01) {
    interpretation = 'Low but measurable Moon collision risk';
  } else {
    interpretation = 'Negligible Moon collision risk';
  }
  
  return {
    probability: moonCollisionProbability,
    confidence: calculateConfidence(asteroid),
    impactVelocity,
    impactEnergy,
    craterDiameter,
    observableFromEarth,
    closestMoonApproach,
    moonEncounterDate,
    comparisonToEarth: {
      earthProbability,
      moonToEarthRatio,
      interpretation
    }
  };
}

/**
 * Calculate basic geometric collision probability.
 *
 * For an asteroid crossing the Moon's orbital zone, the probability
 * of collision is approximately the fraction of the Moon's orbital
 * torus that the Moon actually occupies, weighted by the time the
 * asteroid spends in that zone.
 */
function calculateGeometricCollisionProbability(asteroid: EnhancedAsteroid): number {
  const missDistanceKm = asteroid.missDistance * 149597870.7; // AU to km
  const moonOrbitRadiusKm = MOON_DATA.orbitalRadius;         // 384,400 km

  // If asteroid doesn't pass through the Moon's orbital zone, probability ≈ 0
  if (missDistanceKm > moonOrbitRadiusKm * 1.1) {
    return 1e-12; // negligible but non-zero for display purposes
  }

  // Moon's cross-section (physical disk as seen by projectile)
  const moonCrossSection = Math.PI * MOON_DATA.radius ** 2; // km²

  // Moon's orbital circumference — the Moon could be anywhere along it
  const moonOrbitCircumference = 2 * Math.PI * moonOrbitRadiusKm; // km

  // Fraction of orbit occupied by the Moon's diameter
  const positionalFraction = (2 * MOON_DATA.radius) / moonOrbitCircumference;

  // Encounter duration: time the asteroid spends within ±1 Moon-radius
  // of the Moon's orbital shell, at its geocentric velocity
  const vKmS = asteroid.velocity; // km/s
  const crossingTimeS = (2 * MOON_DATA.radius) / Math.max(vKmS, 0.1); // seconds
  const crossingTimeDays = crossingTimeS / 86400;

  // Probability the Moon is at the crossing point during that window
  const timingFraction = crossingTimeDays / MOON_DATA.orbitalPeriod;

  // Base collision probability: positional × timing
  const baseCollisionChance = positionalFraction * timingFraction;

  // Adjust for asteroid approach geometry
  const approachGeometryFactor = calculateApproachGeometry(asteroid);

  return baseCollisionChance * approachGeometryFactor;
}

/**
 * Calculate orbital mechanics factors affecting collision probability
 */
function calculateOrbitalFactors(asteroid: EnhancedAsteroid): number {
  // 1. Orbital inclination factor
  // Asteroids with similar inclination to Moon more likely to intersect
  const inclinationDifference = Math.abs(asteroid.orbit.inclination - MOON_DATA.orbitalInclination);
  const inclinationFactor = Math.exp(-inclinationDifference / 10); // Exponential decay
  
  // 2. Timing factor - Moon moves fast, timing is critical
  const moonOrbitalSpeed = MOON_DATA.orbitalVelocity; // km/s
  const asteroidSpeed = asteroid.velocity; // km/s
  const relativeSpeed = Math.sqrt(asteroidSpeed ** 2 + moonOrbitalSpeed ** 2);
  
  // Higher chance if asteroid's velocity is similar to Moon's orbital velocity
  const velocityRatio = Math.min(asteroidSpeed, moonOrbitalSpeed) / Math.max(asteroidSpeed, moonOrbitalSpeed);
  const timingFactor = 0.5 + 0.5 * velocityRatio; // Range: 0.5 to 1.0
  
  // 3. Orbital eccentricity factor
  // Low eccentricity orbits have more predictable encounters
  const eccentricityFactor = 1 - asteroid.orbit.eccentricity * 0.3;
  
  // 4. Semi-major axis factor - asteroids with similar orbital radius to Earth more likely
  // Use orbital radius if semi_major_axis is not available
  const orbitalRadius = asteroid.orbit.semi_major_axis || (asteroid.orbit.radius / 1.496e8); // Convert km to AU if needed
  const semiMajorAxisDiff = Math.abs(orbitalRadius - 1.0); // AU
  const semiMajorAxisFactor = Math.exp(-semiMajorAxisDiff);
  
  // Ensure no NaN values
  const result = inclinationFactor * timingFactor * eccentricityFactor * semiMajorAxisFactor;
  return isNaN(result) ? 0.5 : result; // Default to 0.5 if calculation fails
}

/**
 * Calculate gravitational focusing effects
 */
function calculateGravitationalFocusing(asteroid: EnhancedAsteroid): number {
  // Earth's gravitational field affects asteroid trajectories
  const earthMass = 5.97e24; // kg
  const gravitationalConstant = 6.67e-11; // N⋅m²/kg²
  
  // Gravitational focusing factor depends on asteroid's approach velocity
  const escapeVelocity = Math.sqrt(2 * gravitationalConstant * earthMass / (asteroid.missDistance * 1.496e11)); // m/s
  const asteroidVelocity = asteroid.velocity * 1000; // m/s
  
  // Öpik's formula for gravitational focusing
  const focusingFactor = 1 + (escapeVelocity / asteroidVelocity) ** 2;
  
  // Moon's own gravity is much weaker but still contributes
  const moonGravityFactor = 1 + (MOON_DATA.escapeVelocity / asteroid.velocity) ** 2;
  
  // Combined focusing effect - Moon benefits from Earth's gravity well
  const combinedFocusing = Math.sqrt(focusingFactor * moonGravityFactor);
  
  // Probability enhancement factor (typically 1.5-3x for slow asteroids)
  return Math.min(combinedFocusing, 5.0); // Cap at 5x enhancement
}

/**
 * Calculate approach geometry factor
 */
function calculateApproachGeometry(asteroid: EnhancedAsteroid): number {
  // Asteroids approaching from different directions have different probabilities
  
  // 1. Radial vs tangential approach
  const radialFactor = Math.cos(asteroid.orbit.phase); // Radial approach more likely
  
  // 2. Prograde vs retrograde motion
  const progradeBonus = asteroid.orbit.inclination < 90 ? 1.2 : 0.8;
  
  // 3. Distance factor - closer approaches to Earth more likely to hit Moon
  // Use a more gradual decay function
  const distanceFactor = 1 / (1 + (asteroid.missDistance / 0.05) ** 2);
  
  // 4. Moon orbital position factor - asteroid must pass through Moon's orbit
  const moonOrbitCrossingFactor = asteroid.missDistance < (MOON_DATA.orbitalRadius / 1.496e8) ? 1.5 : 0.5;
  
  return Math.abs(radialFactor) * progradeBonus * distanceFactor * moonOrbitCrossingFactor;
}

/**
 * Calculate impact velocity on Moon surface
 */
function calculateImpactVelocity(asteroid: EnhancedAsteroid): number {
  // Asteroid's velocity relative to Earth
  const asteroidVelocity = asteroid.velocity; // km/s
  
  // Moon's orbital velocity
  const moonOrbitalVelocity = MOON_DATA.orbitalVelocity; // km/s
  
  // Vector addition of velocities (simplified to scalar for average case)
  const relativeVelocity = Math.sqrt(
    asteroidVelocity ** 2 + 
    moonOrbitalVelocity ** 2 - 
    2 * asteroidVelocity * moonOrbitalVelocity * Math.cos(Math.PI / 3) // Assume 60° angle
  );
  
  // Add Moon's escape velocity for final impact speed
  const impactVelocity = Math.sqrt(relativeVelocity ** 2 + MOON_DATA.escapeVelocity ** 2);
  
  return impactVelocity;
}

/**
 * Calculate impact energy
 */
function calculateImpactEnergy(asteroid: EnhancedAsteroid, impactVelocity: number): number {
  // Estimate asteroid mass from size (assuming rocky composition)
  const density = 2500; // kg/m³ (typical rocky asteroid)
  const volume = (4/3) * Math.PI * (asteroid.size / 2) ** 3; // m³
  const mass = density * volume; // kg
  
  // Kinetic energy: E = ½mv²
  const impactEnergyJoules = 0.5 * mass * (impactVelocity * 1000) ** 2; // Joules
  
  return impactEnergyJoules;
}

/**
 * Calculate expected crater diameter using Collins et al. (2005) Pi-scaling
 * adapted for lunar surface parameters.
 *
 *   D = 1.161 * (ρ_proj/ρ_target)^(1/3) * L^0.78 * v^0.44 * g^-0.22 * sin(θ)^(1/3)
 */
function calculateCraterDiameter(asteroid: EnhancedAsteroid, impactVelocity: number): number {
  const projDensity = 2500;  // kg/m³ (assumed rocky asteroid)
  const targetDensity = 1500; // kg/m³ (lunar regolith, lower than crustal rock)
  const g = MOON_DATA.surfaceGravity; // 1.62 m/s²
  const L = asteroid.size;            // projectile diameter in metres
  const v = impactVelocity * 1000;    // km/s → m/s
  const sinTheta = Math.sin(Math.PI / 4); // 45° canonical angle

  const densityRatio = Math.pow(projDensity / targetDensity, 1 / 3);
  const craterDiameter =
    1.161 *
    densityRatio *
    Math.pow(L, 0.78) *
    Math.pow(v, 0.44) *
    Math.pow(g, -0.22) *
    Math.pow(sinTheta, 1 / 3);

  return craterDiameter;
}

/**
 * Determine if impact would be observable from Earth
 */
function isObservableFromEarth(asteroid: EnhancedAsteroid, impactEnergy: number): boolean {
  // Minimum energy for observable flash (based on historical observations)
  const minimumObservableEnergy = 1e10; // Joules (~2.4 tons TNT)
  
  // Size threshold - impacts of 1m+ objects are typically observable
  const minimumObservableSize = 1; // meters
  
  return impactEnergy >= minimumObservableEnergy && asteroid.size >= minimumObservableSize;
}

/**
 * Calculate confidence in the assessment
 */
function calculateConfidence(asteroid: EnhancedAsteroid): number {
  let confidence = 0.6; // Base confidence
  
  // Higher confidence for well-observed asteroids
  if (asteroid.missDistance < 0.1) confidence += 0.2; // Close approaches better measured
  if (asteroid.size > 10) confidence += 0.1; // Larger objects easier to track
  if (asteroid.is_potentially_hazardous_asteroid) confidence += 0.1; // PHAs are well-studied
  
  // Lower confidence for highly eccentric or inclined orbits
  if (asteroid.orbit.eccentricity > 0.5) confidence -= 0.1;
  if (Math.abs(asteroid.orbit.inclination) > 30) confidence -= 0.1;
  
  return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Get historical context for Moon impacts
 */
export function getMoonImpactHistoricalContext(): {
  famousImpacts: Array<{
    date: string;
    size: number;
    energy: number;
    craterDiameter: number;
    observedFromEarth: boolean;
  }>;
  averageImpactRate: {
    perYear: number;
    perCentury: number;
    perMillennium: number;
  };
} {
  return {
    famousImpacts: [
      {
        date: '1178 AD',
        size: 10, // meters (estimated)
        energy: 1e12, // Joules
        craterDiameter: 50, // meters
        observedFromEarth: true // Canterbury monks reported flash
      },
      {
        date: '1866',
        size: 5, // meters
        energy: 1e11, // Joules
        craterDiameter: 25, // meters
        observedFromEarth: true // Multiple observers
      },
      {
        date: '2019 (multiple)',
        size: 1, // meters
        energy: 1e9, // Joules
        craterDiameter: 5, // meters
        observedFromEarth: true // Detected by lunar monitoring programs
      }
    ],
    averageImpactRate: {
      perYear: 1, // Observable impacts
      perCentury: 100,
      perMillennium: 1000
    }
  };
}

/**
 * Compare Moon vs Earth collision probabilities
 */
export function compareMoonEarthCollisionRisk(asteroid: EnhancedAsteroid): {
  moonRisk: MoonCollisionRisk;
  earthRisk: number;
  ratio: number;
  interpretation: string;
} {
  const moonRisk = calculateMoonCollisionRisk(asteroid);
  const earthRisk = asteroid.risk;
  const ratio = moonRisk.probability / Math.max(earthRisk, 1e-10);
  
  let interpretation = '';
  if (ratio > 1) {
    interpretation = 'More likely to hit Moon than Earth';
  } else if (ratio > 0.1) {
    interpretation = 'Significant Moon collision risk';
  } else if (ratio > 0.01) {
    interpretation = 'Low but measurable Moon collision risk';
  } else {
    interpretation = 'Negligible Moon collision risk';
  }
  
  return {
    moonRisk,
    earthRisk,
    ratio,
    interpretation
  };
}