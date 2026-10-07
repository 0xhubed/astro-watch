import { EnhancedAsteroid } from './nasa-api';

/**
 * Scene-space Keplerian placement (shared by the 3D scene, labels, trails,
 * cinematic camera and agent annotations — one source of truth).
 *
 * Positions come from each asteroid's real orbital elements where published
 * (a, e, i, Ω, ω from lib/nasa-api), propagated as uniform-in-time mean
 * anomaly with a Kepler solve. Scene time t is R3F's shared clock in
 * seconds; mean motion is Kepler-consistent with the scene's Earth
 * (n = 0.2 / a^1.5 rad/s), so inner rocks visibly outrun outer ones.
 */

const AU_UNITS = 64; // scene scale: 1 AU = 64 units (matches PLANET_DATA)
const MIN_RADIUS = 5.0; // keep rocks outside Earth's visual neighborhood
const EARTH_MEAN_MOTION = 0.2; // rad/s — matches the scene's Earth drive

/** Mean motion (rad/s) for a scene orbit with semi-major axis a (AU). */
export function meanMotion(a: number): number {
  return EARTH_MEAN_MOTION / Math.pow(Math.max(0.1, a), 1.5);
}

/**
 * Position on the orbit at time t, in scene units [x, y, z] with y up.
 * Solves Kepler's equation (Newton) from the mean anomaly, then applies the
 * standard perifocal → ecliptic rotation (ω, i, Ω) and maps to the scene's
 * XZ-plane / y-up convention.
 */
export function asteroidScenePosition(
  orbit: EnhancedAsteroid['orbit'],
  t: number
): [number, number, number] {
  const a = orbit.semi_major_axis;
  const e = Math.min(0.99, Math.max(0, orbit.eccentricity));

  // Mean anomaly → eccentric anomaly (Newton). Visual use only: even a
  // mis-converged high-e outlier just sits on a slightly odd ellipse.
  const M = orbit.phase + orbit.speed * t;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 5; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  // Perifocal coordinates (units), focus at the Sun.
  const aUnits = a * AU_UNITS;
  const px = aUnits * (Math.cos(E) - e);
  const py = aUnits * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate ω (in-plane) → i (about node line) → Ω (ecliptic), mapping the
  // orbital xy-plane onto the scene's XZ-plane with y up.
  const cosW = Math.cos(orbit.perihelionArgument);
  const sinW = Math.sin(orbit.perihelionArgument);
  const cosO = Math.cos(orbit.ascendingNode);
  const sinO = Math.sin(orbit.ascendingNode);
  const cosI = Math.cos(orbit.inclination);
  const sinI = Math.sin(orbit.inclination);

  const xw = px * cosW - py * sinW;
  const yw = px * sinW + py * cosW;

  const x = xw * cosO - yw * cosI * sinO;
  const z = xw * sinO + yw * cosI * cosO; // becomes the scene's z
  const y = yw * sinI; // out of the ecliptic plane

  // Soft floor: never let a rock (or its label) enter Earth's visual space.
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r < MIN_RADIUS) {
    const k = MIN_RADIUS / Math.max(1e-6, r);
    return [x * k, y * k, z * k];
  }
  return [x, y, z];
}

/**
 * Full orbit path as scene-space points for line rendering. Sampled
 * uniformly in eccentric anomaly, which naturally clusters points near
 * perihelion where the curve bends.
 */
export function orbitPathPoints(
  orbit: EnhancedAsteroid['orbit'],
  segments = 192
): Float32Array {
  const a = orbit.semi_major_axis;
  const e = Math.min(0.99, Math.max(0, orbit.eccentricity));
  const aUnits = a * AU_UNITS;

  const cosW = Math.cos(orbit.perihelionArgument);
  const sinW = Math.sin(orbit.perihelionArgument);
  const cosO = Math.cos(orbit.ascendingNode);
  const sinO = Math.sin(orbit.ascendingNode);
  const cosI = Math.cos(orbit.inclination);
  const sinI = Math.sin(orbit.inclination);

  const points = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const E = (i / segments) * Math.PI * 2;
    const px = aUnits * (Math.cos(E) - e);
    const py = aUnits * Math.sqrt(1 - e * e) * Math.sin(E);

    const xw = px * cosW - py * sinW;
    const yw = px * sinW + py * cosW;

    const x = xw * cosO - yw * cosI * sinO;
    const z = xw * sinO + yw * cosI * cosO;
    const y = yw * sinI;

    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;
  }
  return points;
}
