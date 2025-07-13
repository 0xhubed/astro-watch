import { Asteroid, EnhancedAsteroid } from '../nasa-api';
import { extractFeaturesFromParams, AsteroidFeatures } from './feature-engineering';

export interface TrainingData {
  features: number[][];
  labels: number[][];
  metadata: {
    totalSamples: number;
    featureStats: {
      means: number[];
      stds: number[];
    };
    labelStats: {
      riskMean: number;
      confidenceMean: number;
    };
  };
}

/**
 * Generate synthetic asteroid data for training the ML model
 * Uses realistic parameter distributions based on NASA NEO database statistics
 */
export function generateSyntheticAsteroid(): AsteroidFeatures {
  // Size distribution: Log-normal (most asteroids are small, few are large)
  // Range: 10m to 10km, with bias toward smaller objects
  const sizeLog = Math.random() * 3 + 1; // 1-4 in log10 scale
  const size = Math.pow(10, sizeLog); // 10m to 10km

  // Velocity distribution: Normal around 15-20 km/s
  // Range: 5-40 km/s (typical NEO velocities)
  const velocityBase = 15 + Math.random() * 10; // 15-25 km/s base
  const velocityNoise = (Math.random() - 0.5) * 10; // ±5 km/s noise
  const velocity = Math.max(5, Math.min(40, velocityBase + velocityNoise));

  // Miss distance distribution: Exponential (most are far, few are close)
  // Range: 0.001 AU to 1.0 AU (close approaches to distant passes)
  const distanceExp = Math.random() * 3; // 0-3 exponential scale
  const missDistance = 0.001 + Math.exp(distanceExp) / 1000; // Exponential distribution

  // PHA designation: ~20% of NEOs are PHAs (realistic proportion)
  const isPHA = Math.random() < 0.2;

  return {
    size,
    velocity,
    missDistance,
    isPHA
  };
}

/**
 * Enhanced rule-based risk calculation for generating training labels
 * This is the "ground truth" that we want our ML model to learn
 */
function calculateAdvancedRiskRuleBased(params: AsteroidFeatures): { risk: number; confidence: number } {
  const { size, velocity, missDistance, isPHA } = params;

  // Size factor (larger = more dangerous)
  // Log scale normalized to [0,1]
  const sizeFactor = Math.min(1, Math.log10(size + 1) / 3);

  // Distance factor (closer = more dangerous)
  // Inverse relationship with threshold at 0.05 AU
  const distanceFactor = missDistance < 0.05 ? 1 - (missDistance / 0.05) : 0;

  // Velocity factor (faster = more dangerous)
  // Normalized to 30 km/s maximum
  const velocityFactor = Math.min(1, velocity / 30);

  // PHA designation adds base risk
  const phaFactor = isPHA ? 0.3 : 0;

  // Impact energy consideration (size × velocity²)
  // Adds nonlinear interaction between size and velocity
  const energyFactor = Math.min(0.2, (size * velocity * velocity) / 1000000);

  // Close approach bonus (very close approaches are extremely dangerous)
  const proximityBonus = missDistance < 0.01 ? 0.2 : 0;

  // Weighted risk calculation with enhanced factors
  const riskScore = Math.min(1, 
    sizeFactor * 0.2 + 
    distanceFactor * 0.35 + 
    velocityFactor * 0.15 + 
    phaFactor * 0.15 +
    energyFactor * 0.1 +
    proximityBonus * 0.05
  );

  // Confidence based on data quality and measurement precision
  // Closer objects have more accurate measurements
  let confidence = 0.7; // Base confidence
  
  // Distance affects measurement precision
  if (missDistance < 0.1) confidence += 0.25;
  else if (missDistance < 0.5) confidence += 0.15;
  
  // Large objects are easier to measure accurately
  if (size > 100) confidence += 0.1;
  
  // PHA objects are more thoroughly studied
  if (isPHA) confidence += 0.05;

  // Add some realistic noise to prevent overfitting
  const riskNoise = (Math.random() - 0.5) * 0.1; // ±5% noise
  const confidenceNoise = (Math.random() - 0.5) * 0.05; // ±2.5% noise

  return {
    risk: Math.max(0, Math.min(1, riskScore + riskNoise)),
    confidence: Math.max(0.5, Math.min(0.99, confidence + confidenceNoise))
  };
}

/**
 * Generate training dataset with specified number of samples
 */
export function generateTrainingData(samples: number = 10000): TrainingData {
  const features: number[][] = [];
  const labels: number[][] = [];

  console.log(`Generating ${samples} synthetic asteroid samples...`);

  for (let i = 0; i < samples; i++) {
    // Generate synthetic asteroid parameters
    const syntheticParams = generateSyntheticAsteroid();
    
    // Extract normalized features
    const featureVector = extractFeaturesFromParams(syntheticParams);
    
    // Generate labels using enhanced rule-based system
    const { risk, confidence } = calculateAdvancedRiskRuleBased(syntheticParams);
    
    features.push(featureVector);
    labels.push([risk, confidence]);

    // Progress logging
    if ((i + 1) % 1000 === 0) {
      console.log(`Generated ${i + 1}/${samples} samples...`);
    }
  }

  // Calculate dataset statistics
  const featureStats = calculateFeatureStatistics(features);
  const labelStats = calculateLabelStatistics(labels);

  console.log('Training data generation complete!');
  console.log(`Risk range: ${labelStats.riskMin.toFixed(3)} - ${labelStats.riskMax.toFixed(3)} (mean: ${labelStats.riskMean.toFixed(3)})`);
  console.log(`Confidence range: ${labelStats.confidenceMin.toFixed(3)} - ${labelStats.confidenceMax.toFixed(3)} (mean: ${labelStats.confidenceMean.toFixed(3)})`);

  return {
    features,
    labels,
    metadata: {
      totalSamples: samples,
      featureStats: {
        means: featureStats.means,
        stds: featureStats.stds
      },
      labelStats: {
        riskMean: labelStats.riskMean,
        confidenceMean: labelStats.confidenceMean
      }
    }
  };
}

/**
 * Generate balanced dataset with specific risk level distributions
 */
export function generateBalancedTrainingData(samples: number = 10000): TrainingData {
  const features: number[][] = [];
  const labels: number[][] = [];

  // Target distribution:
  // 60% low risk (0.0-0.3)
  // 25% medium risk (0.3-0.6)  
  // 15% high risk (0.6-1.0)

  const lowRiskSamples = Math.floor(samples * 0.6);
  const mediumRiskSamples = Math.floor(samples * 0.25);
  const highRiskSamples = samples - lowRiskSamples - mediumRiskSamples;

  console.log(`Generating balanced dataset: ${lowRiskSamples} low, ${mediumRiskSamples} medium, ${highRiskSamples} high risk samples`);

  // Generate low risk samples
  for (let i = 0; i < lowRiskSamples; i++) {
    const params = generateSyntheticAsteroidForRiskLevel('low');
    const featureVector = extractFeaturesFromParams(params);
    const { risk, confidence } = calculateAdvancedRiskRuleBased(params);
    
    features.push(featureVector);
    labels.push([risk, confidence]);
  }

  // Generate medium risk samples
  for (let i = 0; i < mediumRiskSamples; i++) {
    const params = generateSyntheticAsteroidForRiskLevel('medium');
    const featureVector = extractFeaturesFromParams(params);
    const { risk, confidence } = calculateAdvancedRiskRuleBased(params);
    
    features.push(featureVector);
    labels.push([risk, confidence]);
  }

  // Generate high risk samples
  for (let i = 0; i < highRiskSamples; i++) {
    const params = generateSyntheticAsteroidForRiskLevel('high');
    const featureVector = extractFeaturesFromParams(params);
    const { risk, confidence } = calculateAdvancedRiskRuleBased(params);
    
    features.push(featureVector);
    labels.push([risk, confidence]);
  }

  // Shuffle the dataset
  const shuffledData = shuffleDataset(features, labels);

  const featureStats = calculateFeatureStatistics(shuffledData.features);
  const labelStats = calculateLabelStatistics(shuffledData.labels);

  return {
    features: shuffledData.features,
    labels: shuffledData.labels,
    metadata: {
      totalSamples: samples,
      featureStats: {
        means: featureStats.means,
        stds: featureStats.stds
      },
      labelStats: {
        riskMean: labelStats.riskMean,
        confidenceMean: labelStats.confidenceMean
      }
    }
  };
}

/**
 * Generate asteroid parameters biased toward specific risk levels
 */
function generateSyntheticAsteroidForRiskLevel(riskLevel: 'low' | 'medium' | 'high'): AsteroidFeatures {
  let size: number, velocity: number, missDistance: number, isPHA: boolean;

  switch (riskLevel) {
    case 'low':
      // Small, distant, slow asteroids
      size = 10 + Math.random() * 90; // 10-100m
      velocity = 5 + Math.random() * 10; // 5-15 km/s
      missDistance = 0.1 + Math.random() * 0.9; // 0.1-1.0 AU
      isPHA = Math.random() < 0.1; // 10% PHA
      break;

    case 'medium':
      // Medium-sized, moderately close asteroids
      size = 50 + Math.random() * 200; // 50-250m
      velocity = 10 + Math.random() * 15; // 10-25 km/s
      missDistance = 0.02 + Math.random() * 0.2; // 0.02-0.22 AU
      isPHA = Math.random() < 0.3; // 30% PHA
      break;

    case 'high':
      // Large, close, fast asteroids
      size = 200 + Math.random() * 1800; // 200m-2km
      velocity = 15 + Math.random() * 20; // 15-35 km/s
      missDistance = 0.001 + Math.random() * 0.05; // 0.001-0.051 AU
      isPHA = Math.random() < 0.6; // 60% PHA
      break;
  }

  return { size, velocity, missDistance, isPHA };
}

/**
 * Shuffle dataset while maintaining feature-label correspondence
 */
function shuffleDataset(features: number[][], labels: number[][]): { features: number[][], labels: number[][] } {
  const indices = Array.from({ length: features.length }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledFeatures = indices.map(i => features[i]);
  const shuffledLabels = indices.map(i => labels[i]);

  return { features: shuffledFeatures, labels: shuffledLabels };
}

/**
 * Calculate feature statistics for normalization and analysis
 */
function calculateFeatureStatistics(features: number[][]) {
  const numFeatures = features[0].length;
  const numSamples = features.length;
  
  const means = new Array(numFeatures).fill(0);
  
  // Calculate means
  features.forEach(feature => {
    feature.forEach((value, i) => {
      means[i] += value;
    });
  });
  means.forEach((_, i) => { means[i] /= numSamples; });

  // Calculate standard deviations
  const stds = new Array(numFeatures).fill(0);
  features.forEach(feature => {
    feature.forEach((value, i) => {
      stds[i] += Math.pow(value - means[i], 2);
    });
  });
  stds.forEach((_, i) => { stds[i] = Math.sqrt(stds[i] / numSamples); });

  return { means, stds };
}

/**
 * Calculate label statistics for analysis
 */
function calculateLabelStatistics(labels: number[][]) {
  const risks = labels.map(label => label[0]);
  const confidences = labels.map(label => label[1]);

  return {
    riskMean: risks.reduce((a, b) => a + b, 0) / risks.length,
    riskMin: Math.min(...risks),
    riskMax: Math.max(...risks),
    confidenceMean: confidences.reduce((a, b) => a + b, 0) / confidences.length,
    confidenceMin: Math.min(...confidences),
    confidenceMax: Math.max(...confidences)
  };
}