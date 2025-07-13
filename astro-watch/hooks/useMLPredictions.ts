import { useEffect, useState } from 'react';
import { Asteroid, EnhancedAsteroid, enhanceAsteroidData } from '@/lib/nasa-api';
import { predictRiskBatch } from '@/lib/ml/risk-predictor';

export function useMLPredictions(asteroids: Asteroid[]) {
  const [enhancedAsteroids, setEnhancedAsteroids] = useState<EnhancedAsteroid[]>([]);
  const [isMLReady, setIsMLReady] = useState(false);
  const [mlStats, setMlStats] = useState({
    modelUsed: 'fallback' as 'ml' | 'fallback',
    processingTime: 0,
    predictionsCount: 0
  });

  useEffect(() => {
    // Only run ML predictions on client-side
    if (typeof window === 'undefined' || !asteroids.length) {
      return;
    }

    const runMLPredictions = async () => {
      try {
        console.log('Running ML predictions for', asteroids.length, 'asteroids...');
        const startTime = performance.now();
        
        // Get ML predictions for all asteroids
        const predictions = await predictRiskBatch(asteroids);
        
        // Enhance asteroids with ML predictions
        const enhanced = await Promise.all(asteroids.map(async (asteroid, index) => {
          const prediction = predictions[index];
          
          // Convert Asteroid to EnhancedAsteroid with ML predictions
          const enhancedAsteroid = await enhanceAsteroidData(asteroid);
          
          // Override risk and confidence with ML predictions
          return {
            ...enhancedAsteroid,
            risk: prediction.risk,
            confidence: prediction.confidence
          };
        }));
        
        const processingTime = performance.now() - startTime;
        
        setEnhancedAsteroids(enhanced);
        setIsMLReady(true);
        setMlStats({
          modelUsed: predictions[0]?.modelUsed || 'fallback',
          processingTime,
          predictionsCount: predictions.length
        });
        
        console.log(`ML predictions completed in ${processingTime.toFixed(2)}ms using ${predictions[0]?.modelUsed} model`);
        
      } catch (error) {
        console.error('Failed to run ML predictions:', error);
        // Keep server-side predictions as fallback
        setIsMLReady(true);
      }
    };

    runMLPredictions();
  }, [asteroids]);

  return { 
    asteroids: enhancedAsteroids, 
    isMLReady,
    mlStats 
  };
}