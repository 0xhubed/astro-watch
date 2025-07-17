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
  
  // Debug logging
  console.log(`Moon Collision Calculation for ${asteroid.id}:`, {
    geometricProbability,
    orbitalFactors,
    gravitationalFocusing,
    missDistance: asteroid.missDistance,
    velocity: asteroid.velocity,
    size: asteroid.size
  });
  
  // 4. Combined probability
  let moonCollisionProbability = geometricProbability * orbitalFactors * gravitationalFocusing;
  
  // Apply minimum probability based on historical impact rates
  // For asteroids passing within 0.1 AU of Earth, there's always some small chance
  if (asteroid.missDistance < 0.1 && asteroid.size > 0.1) {
    const minProbability = 1e-8 * (asteroid.size / 10); // Scale with size
    moonCollisionProbability = Math.max(moonCollisionProbability, minProbability);
  }
  
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
 * Calculate basic geometric collision probability
 */
function calculateGeometricCollisionProbability(asteroid: EnhancedAsteroid): number {
  // Moon's cross-sectional area as seen by incoming asteroid
  const moonCrossSection = Math.PI * MOON_DATA.radius * MOON_DATA.radius; // km²
  
  // Effective target area considering Moon's orbital motion
  // Moon sweeps out an annular area in its orbit
  const moonOrbitCircumference = 2 * Math.PI * MOON_DATA.orbitalRadius; // km
  const moonOrbitWidth = MOON_DATA.radius * 2; // km
  const moonOrbitArea = moonOrbitCircumference * moonOrbitWidth; // km²
  
  // Basic geometric probability
  // Consider the asteroid's uncertainty region and Moon's capture cross-section
  const asteroidUncertaintyKm = asteroid.missDistance * 1.496e8 * 0.01; // 1% uncertainty in AU to km
  const effectiveTargetRadius = MOON_DATA.radius + asteroidUncertaintyKm;
  const effectiveCrossSection = Math.PI * effectiveTargetRadius * effectiveTargetRadius;
  
  // Moon's orbital sweep area per day
  const moonDailyOrbitArc = (2 * Math.PI * MOON_DATA.orbitalRadius) / MOON_DATA.orbitalPeriod;
  const sweepArea = moonDailyOrbitArc * (2 * effectiveTargetRadius);
  
  // Base probability considering encounter duration
  const encounterDurationDays = 3; // Typical close approach window
  const baseCollisionChance = (effectiveCrossSection / sweepArea) * encounterDurationDays;
  
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
  const semiMajorAxisDiff = Math.abs(asteroid.orbit.semi_major_axis - 1.0); // AU
  const semiMajorAxisFactor = Math.exp(-semiMajorAxisDiff);
  
  return inclinationFactor * timingFactor * eccentricityFactor * semiMajorAxisFactor;
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
 * Calculate expected crater diameter
 */
function calculateCraterDiameter(asteroid: EnhancedAsteroid, impactVelocity: number): number {
  // Simplified crater scaling law for Moon
  // D = K * (E/ρg)^(1/3.4)
  // Where: D = diameter, E = energy, ρ = target density, g = surface gravity
  
  const impactEnergy = calculateImpactEnergy(asteroid, impactVelocity);
  const targetDensity = 2500; // kg/m³ (lunar regolith)
  const surfaceGravity = MOON_DATA.surfaceGravity; // m/s²
  
  // Scaling constant (empirically derived)
  const scalingConstant = 1.8;
  
  // Crater diameter in meters
  const craterDiameter = scalingConstant * Math.pow(
    impactEnergy / (targetDensity * surfaceGravity),
    1/3.4
  );
  
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