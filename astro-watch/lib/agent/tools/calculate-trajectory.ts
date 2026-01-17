/**
 * Calculate Trajectory Tool
 * Project asteroid orbital trajectory and closest approach
 */

import type { ToolFunction } from '../../llm/types';
import type {
  ToolContext,
  ToolResult,
  TrajectoryProjection,
  Citation,
} from '../types';
import type { EnhancedAsteroid } from '../../nasa-api';

export const CALCULATE_TRAJECTORY_SCHEMA: ToolFunction['parameters'] = {
  type: 'object',
  properties: {
    asteroidId: {
      type: 'string',
      description: 'The asteroid ID to calculate trajectory for',
    },
    days: {
      type: 'number',
      description: 'Number of days to project (default: 30, max: 365)',
    },
  },
  required: ['asteroidId'],
};

interface TrajectoryArgs {
  asteroidId: string;
  days?: number;
}

// Gravitational constant * Sun mass (AU^3 / day^2)
const GM_SUN = 2.959122e-4;

export async function calculateTrajectory(
  args: TrajectoryArgs,
  context: ToolContext
): Promise<ToolResult<TrajectoryProjection>> {
  const { asteroidId, days = 30 } = args;
  const projectionDays = Math.min(Math.max(1, days), 365);

  // Find the asteroid
  const asteroid = context.asteroids.find(
    (a) =>
      a.id === asteroidId ||
      a.id.toLowerCase() === asteroidId.toLowerCase() ||
      a.name.toLowerCase().includes(asteroidId.toLowerCase())
  );

  if (!asteroid) {
    return {
      success: false,
      error: `Asteroid not found: ${asteroidId}`,
    };
  }

  // Get orbital parameters
  const orbit = asteroid.orbit ?? {
    semi_major_axis: 1.5,
    eccentricity: 0.2,
    inclination: 5,
    phase: 0,
  };

  // Calculate trajectory points
  const points = calculateOrbitPoints(asteroid, orbit, projectionDays);

  // Find closest approach to Earth
  const closestApproach = findClosestApproach(points, asteroid);

  // Calculate orbital period
  const semiMajorAU = orbit.semi_major_axis ?? 1.5;
  const periodDays = 365.25 * Math.pow(semiMajorAU, 1.5); // Kepler's third law

  // Generate citation
  const citations: Citation[] = [
    {
      id: `cite_traj_${asteroid.id}`,
      text: `Trajectory projection for ${asteroid.name}`,
      source: 'calculation',
      asteroidId: asteroid.id,
      asteroidName: asteroid.name,
    },
  ];

  return {
    success: true,
    data: {
      asteroid,
      points,
      closestApproach,
      periodDays,
    },
    citations,
  };
}

interface OrbitParams {
  semi_major_axis?: number;
  eccentricity?: number;
  inclination?: number;
  phase?: number;
}

function calculateOrbitPoints(
  asteroid: EnhancedAsteroid,
  orbit: OrbitParams,
  days: number
): TrajectoryProjection['points'] {
  const points: TrajectoryProjection['points'] = [];

  const a = orbit.semi_major_axis ?? 1.5; // AU
  const e = orbit.eccentricity ?? 0.2;
  const i = ((orbit.inclination ?? 5) * Math.PI) / 180; // Convert to radians
  let phase = orbit.phase ?? 0;

  // Mean motion (radians per day)
  const n = Math.sqrt(GM_SUN / Math.pow(a, 3));

  // Current date
  const startDate = new Date();

  // Calculate daily interval points
  const interval = Math.max(1, Math.floor(days / 100)); // Max 100 points

  for (let d = 0; d <= days; d += interval) {
    // Mean anomaly
    const M = (phase + n * d) % (2 * Math.PI);

    // Solve Kepler's equation for eccentric anomaly (Newton's method)
    let E = M;
    for (let iter = 0; iter < 10; iter++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    // True anomaly
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Distance from Sun
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));

    // Position in orbital plane
    const xOrbital = r * Math.cos(nu);
    const yOrbital = r * Math.sin(nu);

    // Rotate by inclination (simplified - ignoring longitude of ascending node)
    const x = xOrbital;
    const y = yOrbital * Math.cos(i);
    const z = yOrbital * Math.sin(i);

    // Earth position (simplified circular orbit)
    const earthAngle = (2 * Math.PI * d) / 365.25;
    const earthX = Math.cos(earthAngle);
    const earthY = Math.sin(earthAngle);
    const earthZ = 0;

    // Distance from Earth (in AU)
    const dx = x - earthX;
    const dy = y - earthY;
    const dz = z - earthZ;
    const distanceFromEarth = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Convert AU to lunar distances (1 AU ≈ 389.17 LD)
    const distanceLD = distanceFromEarth * 389.17;

    const pointDate = new Date(startDate);
    pointDate.setDate(pointDate.getDate() + d);

    points.push({
      date: pointDate,
      x,
      y,
      z,
      distanceFromEarth: distanceLD,
      distanceFromSun: r,
    });
  }

  return points;
}

function findClosestApproach(
  points: TrajectoryProjection['points'],
  asteroid: EnhancedAsteroid
): TrajectoryProjection['closestApproach'] {
  // Find minimum distance point
  let closest = points[0];
  for (const point of points) {
    if (point.distanceFromEarth < closest.distanceFromEarth) {
      closest = point;
    }
  }

  // Use existing close approach data if available and more accurate
  if (asteroid.close_approach_data?.[0]) {
    const approach = asteroid.close_approach_data[0];
    const approachDate = new Date(approach.close_approach_date);
    const missDistanceKm = parseFloat(
      approach.miss_distance?.kilometers ?? '0'
    );
    const missDistanceLD = missDistanceKm / 384400; // Convert to LD

    if (missDistanceLD < closest.distanceFromEarth) {
      return {
        date: approachDate,
        distance: missDistanceLD,
        velocity: asteroid.velocity ?? 0,
      };
    }
  }

  return {
    date: closest.date,
    distance: closest.distanceFromEarth,
    velocity: asteroid.velocity ?? 0,
  };
}

/**
 * Format trajectory results for display
 */
export function formatTrajectoryResults(result: TrajectoryProjection): string {
  const { asteroid, points, closestApproach, periodDays } = result;

  const lines = [
    `**Trajectory Projection: ${asteroid.name}**`,
    '',
    `Orbital Period: ${periodDays?.toFixed(1) ?? 'unknown'} days (${((periodDays ?? 0) / 365.25).toFixed(2)} years)`,
    '',
    '**Closest Approach:**',
    `- Date: ${closestApproach.date.toISOString().split('T')[0]}`,
    `- Distance: ${closestApproach.distance.toFixed(2)} LD (${(closestApproach.distance * 384400).toFixed(0)} km)`,
    `- Velocity: ${closestApproach.velocity.toFixed(1)} km/s`,
    '',
    `**Trajectory Summary (${points.length} points over ${points.length > 1 ? Math.round((points[points.length - 1].date.getTime() - points[0].date.getTime()) / (1000 * 60 * 60 * 24)) : 0} days):**`,
  ];

  // Add a few sample points
  const sampleIndices = [0, Math.floor(points.length / 2), points.length - 1];
  for (const idx of sampleIndices) {
    if (idx < points.length) {
      const p = points[idx];
      lines.push(
        `- ${p.date.toISOString().split('T')[0]}: ${p.distanceFromEarth.toFixed(2)} LD from Earth, ${p.distanceFromSun.toFixed(3)} AU from Sun`
      );
    }
  }

  return lines.join('\n');
}
