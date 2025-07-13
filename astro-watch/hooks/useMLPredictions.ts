import { useEffect, useState } from 'react';
import { Asteroid } from '@/lib/nasa-api';
import { predictRiskBatch } from '@/lib/ml/risk-predictor';

export function useMLPredictions(asteroids: Asteroid[]) {
  const [enhancedAsteroids, setEnhancedAsteroids] = useState<Asteroid[]>(asteroids);
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
        const enhanced = asteroids.map((asteroid, index) => {
          const prediction = predictions[index];
          
          // Update the enhanced asteroid data with ML predictions
          return {
            ...asteroid,
            enhanced_properties: {
              ...asteroid.enhanced_properties,
              risk: prediction.risk,
              confidence: prediction.confidence,
              model_used: prediction.modelUsed
            }
          };
        });
        
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