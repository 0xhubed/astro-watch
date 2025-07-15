// Lazy load TensorFlow.js to improve initial page load
let tf: typeof import('@tensorflow/tfjs') | null = null;

async function loadTensorFlow() {
  if (!tf) {
    console.log('Loading TensorFlow.js...');
    tf = await import('@tensorflow/tfjs');
    console.log('TensorFlow.js loaded');
  }
  return tf;
}
import { Asteroid } from '../nasa-api';
import { extractFeatures, validateFeatures } from './feature-engineering';

interface ModelCache {
  model: any | null; // Will be tf.LayersModel when loaded
  loading: Promise<any> | null;
  lastLoaded: number;
  version: string;
}

interface PredictionResult {
  risk: number;
  confidence: number;
  modelUsed: 'ml' | 'fallback';
  processingTime: number;
}

interface ModelMetadata {
  version: string;
  trainedAt: string;
  performance: {
    loss: number;
    mae: number;
    correlations: {
      risk: number;
      confidence: number;
    };
  };
  modelArchitecture: {
    inputFeatures: number;
    hiddenLayers: number[];
    outputs: number;
    totalParameters: number;
  };
}

// Global model cache
const modelCache: ModelCache = {
  model: null,
  loading: null,
  lastLoaded: 0,
  version: '1.0.0'
};

// Configuration
const MODEL_CONFIG = {
  modelPath: '/models/asteroid-risk-model/model.json',
  metadataPath: '/models/model-metadata.json',
  cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxRetries: 3,
  fallbackEnabled: true
};

// Helper function to get the correct model URL
function getModelUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use relative path from origin
    return `${window.location.origin}${MODEL_CONFIG.modelPath}`;
  } else {
    // Node.js environment - use file:// protocol
    return `file://${process.cwd()}/public${MODEL_CONFIG.modelPath}`;
  }
}

/**
 * Load the ML model from various sources (public directory, browser storage, or train new)
 * Uses caching to avoid reloading the model multiple times
 */
async function loadModel(): Promise<any> {
  const now = Date.now();

  // Return cached model if still valid
  if (modelCache.model && (now - modelCache.lastLoaded) < MODEL_CONFIG.cacheTimeout) {
    return modelCache.model;
  }

  // Return existing loading promise if already in progress
  if (modelCache.loading) {
    return modelCache.loading;
  }

  // Start loading the model
  modelCache.loading = (async () => {
    try {
      console.log('Loading asteroid risk prediction model...');
      
      // Only attempt to load models in browser environment
      if (typeof window === 'undefined') {
        console.log('Server environment detected, model loading not supported');
        throw new Error('TensorFlow.js models can only be loaded in browser environment');
      }
      
      // Try to load from public directory first (production)
      try {
        const modelUrl = getModelUrl();
        console.log(`Attempting to load from: ${modelUrl}`);
        const tfjs = await loadTensorFlow();
        const model = await tfjs.loadLayersModel(modelUrl);
        
        // Verify model architecture
        const inputShape = model.inputs[0].shape;
        const outputShape = model.outputs[0].shape;
        
        if (inputShape[1] !== 6) {
          throw new Error(`Expected 6 input features, got ${inputShape[1]}`);
        }
        
        if (outputShape[1] !== 2) {
          throw new Error(`Expected 2 outputs, got ${outputShape[1]}`);
        }

        // Cache the model
        modelCache.model = model;
        modelCache.lastLoaded = now;
        modelCache.loading = null;

        console.log(`Model loaded from public directory. Parameters: ${model.countParams().toLocaleString()}`);
        return model;
        
      } catch (publicLoadError) {
        console.warn('Failed to load from public directory:', publicLoadError);
        
        // Fallback to browser-based training (development/demo)
        console.log('Falling back to browser-based model...');
        
        const { ensureModelAvailable } = await import('./browser-trainer');
        const { model } = await ensureModelAvailable();
        
        // Cache the model
        modelCache.model = model;
        modelCache.lastLoaded = now;
        modelCache.loading = null;

        console.log(`Model loaded from browser training. Parameters: ${model.countParams().toLocaleString()}`);
        return model;
      }

    } catch (error) {
      modelCache.loading = null;
      console.error('Failed to load ML model from all sources:', error);
      throw error;
    }
  })();

  return modelCache.loading;
}

/**
 * Load model metadata for performance information
 */
async function loadModelMetadata(): Promise<ModelMetadata | null> {
  try {
    // Try to load from public directory first
    const metadataUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${MODEL_CONFIG.metadataPath}`
      : MODEL_CONFIG.metadataPath;
    
    const response = await fetch(metadataUrl);
    if (response.ok) {
      return await response.json();
    }
    
    // Fallback to browser storage metadata
    if (typeof window !== 'undefined') {
      const browserMetadata = localStorage.getItem('asteroid-model-metadata');
      if (browserMetadata) {
        return JSON.parse(browserMetadata);
      }
    }
    
    throw new Error(`Failed to load metadata: ${response.status}`);
  } catch (error) {
    console.warn('Could not load model metadata from any source:', error);
    return null;
  }
}

/**
 * Predict asteroid risk using the ML model
 * Falls back to rule-based calculation if ML model fails
 */
export async function predictRisk(asteroid: Asteroid): Promise<PredictionResult> {
  const startTime = performance.now();

  try {
    // Extract and validate features
    const { features } = extractFeatures(asteroid);
    
    if (!validateFeatures(features)) {
      throw new Error('Invalid feature vector');
    }

    // Load model
    const model = await loadModel();

    // Make prediction
    const tfjs = await loadTensorFlow();
    const inputTensor = tfjs.tensor2d([features]);
    const predictionTensor = model.predict(inputTensor) as any;
    const prediction = await predictionTensor.data();

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    const processingTime = performance.now() - startTime;

    return {
      risk: Math.max(0, Math.min(1, prediction[0])),
      confidence: Math.max(0, Math.min(1, prediction[1])),
      modelUsed: 'ml',
      processingTime
    };

  } catch (error) {
    console.warn('ML prediction failed, using fallback:', error);
    
    if (MODEL_CONFIG.fallbackEnabled) {
      return await predictRiskFallback(asteroid, startTime);
    } else {
      throw error;
    }
  }
}

/**
 * Fallback rule-based risk calculation
 * This is the original enhanced rule-based system
 */
async function predictRiskFallback(asteroid: Asteroid, startTime: number): Promise<PredictionResult> {
  const size = asteroid.estimated_diameter.meters.estimated_diameter_max;
  const velocity = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
  const missDistance = parseFloat(asteroid.close_approach_data[0].miss_distance.astronomical);
  const isPHA = asteroid.is_potentially_hazardous_asteroid;

  // Enhanced rule-based calculation (same as training data generation)
  const sizeFactor = Math.min(1, Math.log10(size + 1) / 3);
  const distanceFactor = missDistance < 0.05 ? 1 - (missDistance / 0.05) : 0;
  const velocityFactor = Math.min(1, velocity / 30);
  const phaFactor = isPHA ? 0.3 : 0;
  const energyFactor = Math.min(0.2, (size * velocity * velocity) / 1000000);
  const proximityBonus = missDistance < 0.01 ? 0.2 : 0;

  const riskScore = Math.min(1, 
    sizeFactor * 0.2 + 
    distanceFactor * 0.35 + 
    velocityFactor * 0.15 + 
    phaFactor * 0.15 +
    energyFactor * 0.1 +
    proximityBonus * 0.05
  );

  // Confidence calculation
  let confidence = 0.7;
  if (missDistance < 0.1) confidence += 0.25;
  else if (missDistance < 0.5) confidence += 0.15;
  if (size > 100) confidence += 0.1;
  if (isPHA) confidence += 0.05;

  const processingTime = performance.now() - startTime;

  return {
    risk: Math.max(0, Math.min(1, riskScore)),
    confidence: Math.max(0.5, Math.min(0.99, confidence)),
    modelUsed: 'fallback',
    processingTime
  };
}

/**
 * Batch prediction for multiple asteroids
 * More efficient than individual predictions
 */
export async function predictRiskBatch(asteroids: Asteroid[]): Promise<PredictionResult[]> {
  if (asteroids.length === 0) {
    return [];
  }

  try {
    // Extract features for all asteroids
    const allFeatures = asteroids.map(asteroid => {
      const { features } = extractFeatures(asteroid);
      if (!validateFeatures(features)) {
        throw new Error(`Invalid features for asteroid ${asteroid.id}`);
      }
      return features;
    });

    // Load model
    const model = await loadModel();

    // Batch prediction
    const startTime = performance.now();
    const tfjs = await loadTensorFlow();
    const inputTensor = tfjs.tensor2d(allFeatures);
    const predictionTensor = model.predict(inputTensor) as any;
    const predictions = await predictionTensor.data();
    const processingTime = performance.now() - startTime;

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    // Parse predictions
    const results: PredictionResult[] = [];
    for (let i = 0; i < asteroids.length; i++) {
      const riskIndex = i * 2;
      const confidenceIndex = i * 2 + 1;
      
      results.push({
        risk: Math.max(0, Math.min(1, predictions[riskIndex])),
        confidence: Math.max(0, Math.min(1, predictions[confidenceIndex])),
        modelUsed: 'ml',
        processingTime: processingTime / asteroids.length
      });
    }

    return results;

  } catch (error) {
    console.warn('Batch ML prediction failed, using individual fallbacks:', error);
    
    // Fall back to individual predictions
    const results: PredictionResult[] = [];
    for (const asteroid of asteroids) {
      try {
        const result = await predictRiskFallback(asteroid, performance.now());
        results.push(result);
      } catch (fallbackError) {
        console.error(`Failed to predict risk for asteroid ${asteroid.id}:`, fallbackError);
        // Return default safe values
        results.push({
          risk: 0,
          confidence: 0.5,
          modelUsed: 'fallback',
          processingTime: 0
        });
      }
    }
    
    return results;
  }
}

/**
 * Get model performance information
 */
export async function getModelInfo(): Promise<{
  loaded: boolean;
  metadata: ModelMetadata | null;
  cacheStatus: {
    cached: boolean;
    loadedAt: number;
    version: string;
  };
}> {
  const metadata = await loadModelMetadata();
  
  return {
    loaded: modelCache.model !== null,
    metadata,
    cacheStatus: {
      cached: modelCache.model !== null,
      loadedAt: modelCache.lastLoaded,
      version: modelCache.version
    }
  };
}

/**
 * Preload the model for faster first prediction
 * Call this during application initialization
 */
export async function preloadModel(): Promise<boolean> {
  try {
    await loadModel();
    console.log('ML model preloaded successfully');
    return true;
  } catch (error) {
    console.warn('Failed to preload ML model:', error);
    return false;
  }
}

/**
 * Clear model cache (useful for development/testing)
 */
export function clearModelCache(): void {
  if (modelCache.model) {
    modelCache.model.dispose();
  }
  modelCache.model = null;
  modelCache.loading = null;
  modelCache.lastLoaded = 0;
}

/**
 * Get prediction statistics for monitoring
 */
export interface PredictionStats {
  totalPredictions: number;
  mlPredictions: number;
  fallbackPredictions: number;
  averageProcessingTime: number;
  errorRate: number;
}

// Simple in-memory stats (reset on page reload)
let predictionStats: PredictionStats = {
  totalPredictions: 0,
  mlPredictions: 0,
  fallbackPredictions: 0,
  averageProcessingTime: 0,
  errorRate: 0
};

/**
 * Update prediction statistics
 */
function updateStats(result: PredictionResult, error: boolean = false): void {
  predictionStats.totalPredictions++;
  
  if (error) {
    predictionStats.errorRate = (predictionStats.errorRate * (predictionStats.totalPredictions - 1) + 1) / predictionStats.totalPredictions;
  } else {
    if (result.modelUsed === 'ml') {
      predictionStats.mlPredictions++;
    } else {
      predictionStats.fallbackPredictions++;
    }
    
    predictionStats.averageProcessingTime = (
      predictionStats.averageProcessingTime * (predictionStats.totalPredictions - 1) + 
      result.processingTime
    ) / predictionStats.totalPredictions;
  }
}

/**
 * Get current prediction statistics
 */
export function getPredictionStats(): PredictionStats {
  return { ...predictionStats };
}

/**
 * Reset prediction statistics
 */
export function resetPredictionStats(): void {
  predictionStats = {
    totalPredictions: 0,
    mlPredictions: 0,
    fallbackPredictions: 0,
    averageProcessingTime: 0,
    errorRate: 0
  };
}