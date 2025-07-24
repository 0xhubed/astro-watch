'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { MapboxProvider } from './MapboxProvider';
import { BaseMap } from './BaseMap';
import { ImpactRiskLayer } from './ImpactRiskLayer';
import { MAPBOX_STYLES } from '@/lib/mapbox/config';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function EnhancedImpactHeatmap({ asteroids }: Props) {
  const [mapStyle, setMapStyle] = useState<string>(MAPBOX_STYLES.dark);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  console.log('EnhancedImpactHeatmap rendering with', asteroids.length, 'asteroids');

  const highRiskCount = asteroids.filter(a => a.risk > 0.7).length;
  const mediumRiskCount = asteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7).length;
  const lowRiskCount = asteroids.filter(a => a.risk > 0.3 && a.risk <= 0.4).length;

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    console.log('EnhancedImpactHeatmap: Map loaded', map);
    console.log('EnhancedImpactHeatmap: Map loaded status:', map.loaded());
    setMapInstance(map);
  }, []);

  const handleMapError = useCallback((error: Error) => {
    console.error('EnhancedImpactHeatmap: Map error', error);
  }, []);

  return (
    <MapboxProvider>
      <div style={{ width: '100%', height: '100%', background: 'red', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', zIndex: 9999 }}>
          MAPBOX HEATMAP LOADING
        </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full flex flex-col"
        style={{ background: 'blue' }}
      >
        <div className="hidden">
          <div>
            <h2 className="text-xl font-bold text-white">Impact Risk Heatmap</h2>
            <p className="text-gray-400 text-sm">
              Real-time visualization of potential asteroid impact zones
            </p>
          </div>
          
        </div>
        
        <div className="relative w-full h-full bg-space-dark overflow-hidden">
          <BaseMap
            style={mapStyle}
            onMapLoad={handleMapLoad}
            onMapError={handleMapError}
            className="absolute inset-0"
          >
            {mapInstance && <ImpactRiskLayer map={mapInstance} asteroids={asteroids} />}
          </BaseMap>
          
          {/* Map Style Selector */}
          <div className="absolute top-4 right-4 flex gap-2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1">
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
              onClick={() => setMapStyle(MAPBOX_STYLES.satellite)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.satellite
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Satellite
            </button>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-3">Risk Level</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,59,48,0.6)]"></div>
                <div>
                  <span className="text-xs text-gray-300">High Risk (&gt;70%)</span>
                  <span className="text-xs text-gray-500 ml-2">({highRiskCount})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,149,0,0.6)]"></div>
                <div>
                  <span className="text-xs text-gray-300">Medium Risk (40-70%)</span>
                  <span className="text-xs text-gray-500 ml-2">({mediumRiskCount})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_rgba(52,199,89,0.6)]"></div>
                <div>
                  <span className="text-xs text-gray-300">Low Risk (30-40%)</span>
                  <span className="text-xs text-gray-500 ml-2">({lowRiskCount})</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Statistics</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex justify-between gap-4">
                <span>Total Tracked:</span>
                <span className="font-mono text-white">{asteroids.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Displayed:</span>
                <span className="font-mono text-white">
                  {asteroids.filter(a => a.risk > 0.3).length}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Avg Risk:</span>
                <span className="font-mono text-white">
                  {(asteroids.reduce((sum, a) => sum + a.risk, 0) / asteroids.length * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-400 space-y-1">
              <div>• Click on points for details</div>
              <div>• Scroll to zoom</div>
              <div>• Drag to pan</div>
            </div>
          </div>
        </div>
        
      </motion.div>
      </div>
    </MapboxProvider>
  );
}