'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { MapboxProvider } from './MapboxProvider';
import { BaseMap } from './BaseMap';
import { TrajectoryLayer } from './TrajectoryLayer';
import { MAPBOX_STYLES } from '@/lib/mapbox/config';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function TrajectoryMap({ asteroids }: Props) {
  const [mapStyle, setMapStyle] = useState(MAPBOX_STYLES.satelliteStreets);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => {
        const next = prev + (0.01 * playbackSpeed);
        return next > 1 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationTime(parseFloat(e.target.value));
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setAnimationTime(0);
    setIsPlaying(false);
  };

  const trackedAsteroids = asteroids.filter(a => a.risk > 0.3);

  return (
    <MapboxProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Asteroid Trajectories</h2>
            <p className="text-gray-400 mt-1">
              Track asteroid approach paths and predicted trajectories
            </p>
          </div>
          
          {/* Map Style Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.dark)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.dark
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.satelliteStreets)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.satelliteStreets
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.outdoors)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.outdoors
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Terrain
            </button>
          </div>
        </div>
        
        <div className="relative w-full h-[500px] bg-space-dark rounded-lg overflow-hidden">
          <BaseMap
            style={mapStyle}
            onMapLoad={setMapInstance}
            className="absolute inset-0"
          >
            {mapInstance && (
              <TrajectoryLayer 
                map={mapInstance} 
                asteroids={asteroids} 
                currentTime={animationTime}
              />
            )}
          </BaseMap>
          
          {/* Time Controls */}
          <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={togglePlayback}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={resetAnimation}
                className="flex items-center justify-center w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                aria-label="Reset"
              >
                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                </svg>
              </button>
              
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={animationTime}
                  onChange={handleTimeChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${animationTime * 100}%, #374151 ${animationTime * 100}%, #374151 100%)`
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="bg-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="5">5x</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-400">
              <span>Approach</span>
              <span className="font-mono text-white">
                {Math.round(animationTime * 100)}%
              </span>
              <span>Impact</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-3">Trajectory Legend</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-0.5 bg-red-500"></div>
                <span className="text-xs text-gray-300">High Risk Path</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-0.5 bg-orange-500"></div>
                <span className="text-xs text-gray-300">Medium Risk Path</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-0.5 bg-green-500"></div>
                <span className="text-xs text-gray-300">Low Risk Path</span>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Active Tracking</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex justify-between gap-4">
                <span>Asteroids:</span>
                <span className="font-mono text-white">{trackedAsteroids.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Avg Velocity:</span>
                <span className="font-mono text-white">
                  {(trackedAsteroids.reduce((sum, a) => sum + a.velocity, 0) / trackedAsteroids.length).toFixed(1)} km/s
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Time to Impact:</span>
                <span className="font-mono text-white">
                  {Math.round((1 - animationTime) * 48)} hours
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-400 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Trajectories show predicted approach paths based on current orbital data. 
            Use playback controls to simulate approach over time. Actual paths may vary due to gravitational influences.
          </p>
        </div>
      </motion.div>
    </MapboxProvider>
  );
}