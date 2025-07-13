import { Asteroid } from '../nasa-api';

export interface AsteroidFeatures {
  size: number;
  velocity: number;
  missDistance: number;
  isPHA: boolean;
}

export interface FeatureVector {
  features: number[];
  metadata: {
    originalSize: number;
    originalVelocity: number;
    originalDistance: number;
    originalPHA: boolean;
  };
}

/**
 * Extract normalized features from asteroid data for ML model input
 * Returns 6-dimensional feature vector optimized for neural network training
 */
export function extractFeatures(asteroid: Asteroid): FeatureVector {
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const isPHA = asteroid.is_potentially_hazardous_asteroid;

  // Feature 1: Normalized log size [0-1]
  // Log scale handles wide size distribution (10m to 10km+)
  // Using log10(size + 1) / 5 to handle sizes up to ~100km properly
  const logSize = Math.min(1, Math.log10(size + 1) / 5);

  // Feature 2: Normalized velocity [0-1]
  // 30 km/s is very fast for NEOs, most are 5-25 km/s
  const normalizedVelocity = Math.min(1, velocity / 30);

  // Feature 3: Inverse distance factor [0-1]
  // Closer objects are more dangerous, inverse relationship
  // 0.05 AU is ~19.5 lunar distances (close approach threshold)
  const inverseDistance = Math.min(1, Math.max(0, 1 / (missDistance * 20)));

  // Feature 4: PHA binary flag [0-1]
  const phaFlag = isPHA ? 1 : 0;

  // Feature 5: Kinetic energy proxy [0-1]
  // Combines size and velocity for impact energy estimation
  // Normalized to typical ranges observed in NEO data
  const kineticEnergyProxy = Math.min(1, Math.max(0, (size * velocity) / 50000));

  // Feature 6: Close approach binary threshold [0-1]
  // Binary flag for very close approaches (<0.05 AU)
  const closeApproachFlag = missDistance < 0.05 ? 1 : 0;

  const features = [
    logSize,
    normalizedVelocity,
    inverseDistance,
    phaFlag,
    kineticEnergyProxy,
    closeApproachFlag
  ];

  return {
    features,
    metadata: {
      originalSize: size,
      originalVelocity: velocity,
      originalDistance: missDistance,
      originalPHA: isPHA
    }
  };
}

/**
 * Extract features from raw asteroid parameters (for synthetic data generation)
 */
export function extractFeaturesFromParams(params: AsteroidFeatures): number[] {
  const { size, velocity, missDistance, isPHA } = params;

  return [
    Math.min(1, Math.log10(size + 1) / 5),
    Math.min(1, velocity / 30),
    Math.min(1, Math.max(0, 1 / (missDistance * 20))),
    isPHA ? 1 : 0,
    Math.min(1, Math.max(0, (size * velocity) / 50000)),
    missDistance < 0.05 ? 1 : 0
  ];
}

/**
 * Validate feature vector for ML model input
 */
export function validateFeatures(features: number[]): boolean {
  if (features.length !== 6) {
    console.error('Feature vector must have exactly 6 elements');
    return false;
  }

  // Check if all features are in valid range [0-1]
  for (let i = 0; i < features.length; i++) {
    if (isNaN(features[i]) || features[i] < 0 || features[i] > 1) {
      console.error(`Feature ${i} is out of range [0,1]: ${features[i]}`);
      return false;
    }
  }

  return true;
}

/**
 * Get feature names for debugging and visualization
 */
export function getFeatureNames(): string[] {
  return [
    'Log Size (normalized)',
    'Velocity (normalized)',
    'Inverse Distance',
    'PHA Flag',
    'Kinetic Energy Proxy',
    'Close Approach Flag'
  ];
}

/**
 * Calculate feature statistics for dataset analysis
 */
export function calculateFeatureStats(featureVectors: number[][]): {
  means: number[];
  stds: number[];
  mins: number[];
  maxs: number[];
} {
  const numFeatures = 6;
  const numSamples = featureVectors.length;
  
  const means = new Array(numFeatures).fill(0);
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);

  // Calculate means, mins, maxs
  featureVectors.forEach(features => {
    features.forEach((value, i) => {
      means[i] += value;
      mins[i] = Math.min(mins[i], value);
      maxs[i] = Math.max(maxs[i], value);
    });
  });

  means.forEach((_, i) => {
    means[i] /= numSamples;
  });

  // Calculate standard deviations
  const stds = new Array(numFeatures).fill(0);
  featureVectors.forEach(features => {
    features.forEach((value, i) => {
      stds[i] += Math.pow(value - means[i], 2);
    });
  });

  stds.forEach((_, i) => {
    stds[i] = Math.sqrt(stds[i] / numSamples);
  });

  return { means, stds, mins, maxs };
}