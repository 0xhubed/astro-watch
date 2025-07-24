'use client';

import { useState, useEffect } from 'react';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { EnhancedImpactHeatmap, TrajectoryMap, RegionalRiskMap } from '@/components/visualization/maps/mapbox';

// Generate sample asteroid data for demonstration
const generateSampleAsteroids = (): EnhancedAsteroid[] => {
  const samples = [];
  for (let i = 0; i < 50; i++) {
    samples.push({
      id: `2024-DEMO-${i}`,
      name: `Asteroid ${i}`,
      size: Math.random() * 500 + 50,
      velocity: Math.random() * 30 + 5,
      distance: Math.random() * 50000000 + 1000000,
      risk: Math.random(),
      predictedImpact: null,
      orbitClass: 'Apollo',
      magnitude: Math.random() * 10 + 15,
      hazardous: Math.random() > 0.5,
      closeApproachDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      relativeVelocity: {
        kmPerSec: Math.random() * 30 + 5,
        kmPerHour: (Math.random() * 30 + 5) * 3600,
      },
      missDistance: {
        astronomical: Math.random() * 0.5,
        lunar: Math.random() * 200,
        kilometers: Math.random() * 50000000,
      },
      orbitDetermination: {
        epochOsculation: '2460600.5',
        eccentricity: Math.random() * 0.5 + 0.1,
        semiMajorAxis: Math.random() * 2 + 1,
        inclination: Math.random() * 30,
        ascendingNodeLongitude: Math.random() * 360,
        orbitalPeriod: Math.random() * 1000 + 365,
        perihelionDistance: Math.random() * 1.5 + 0.5,
        aphelionDistance: Math.random() * 3 + 2,
      },
    });
  }
  return samples;
};

export default function MapboxDemoPage() {
  const [asteroids, setAsteroids] = useState<EnhancedAsteroid[]>([]);
  const [activeMap, setActiveMap] = useState<'heatmap' | 'trajectory' | 'regional'>('heatmap');

  useEffect(() => {
    setAsteroids(generateSampleAsteroids());
  }, []);

  return (
    <div className="min-h-screen bg-space-dark p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Mapbox Integration Demo</h1>
        <p className="text-gray-400 mb-8">
          Interactive maps with real geographic data, satellite imagery, and advanced visualizations
        </p>

        {/* Map Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveMap('heatmap')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeMap === 'heatmap'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Impact Heatmap
          </button>
          <button
            onClick={() => setActiveMap('trajectory')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeMap === 'trajectory'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Trajectory Tracking
          </button>
          <button
            onClick={() => setActiveMap('regional')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeMap === 'regional'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Regional Analysis
          </button>
        </div>

        {/* Key Differences */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-3">Key Mapbox Features:</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Real world map with countries, cities, and terrain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Satellite imagery and street view options</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Smooth zooming from global to street level</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Click on impact points for detailed information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Animated trajectories with time controls</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Population exposure analysis by region</span>
            </li>
          </ul>
        </div>

        {/* Map Display */}
        <div className="h-[700px]">
          {activeMap === 'heatmap' && <EnhancedImpactHeatmap asteroids={asteroids} />}
          {activeMap === 'trajectory' && <TrajectoryMap asteroids={asteroids} />}
          {activeMap === 'regional' && <RegionalRiskMap asteroids={asteroids} />}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">Try These Features:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Use mouse wheel to zoom in/out (notice the real geography)</li>
            <li>• Click and drag to pan around the world</li>
            <li>• Switch between Dark/Satellite/Terrain map styles</li>
            <li>• Click on asteroid markers for detailed information</li>
            <li>• Use the trajectory playback controls to animate paths</li>
            <li>• Click regions to see population exposure data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}