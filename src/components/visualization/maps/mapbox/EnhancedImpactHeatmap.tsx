'use client';

import { useState } from 'react';
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
  const [mapStyle, setMapStyle] = useState(MAPBOX_STYLES.dark);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  const highRiskCount = asteroids.filter(a => a.risk > 0.7).length;
  const mediumRiskCount = asteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7).length;
  const lowRiskCount = asteroids.filter(a => a.risk > 0.3 && a.risk <= 0.4).length;

  return (
    <MapboxProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Impact Risk Heatmap</h2>
            <p className="text-gray-400 mt-1">
              Real-time visualization of potential asteroid impact zones
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
        </div>
        
        <div className="relative w-full h-[500px] bg-space-dark rounded-lg overflow-hidden">
          <BaseMap
            style={mapStyle}
            onMapLoad={setMapInstance}
            className="absolute inset-0"
          >
            {mapInstance && <ImpactRiskLayer map={mapInstance} asteroids={asteroids} />}
          </BaseMap>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-3">Risk Level</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,59,48,0.6)]"></div>
                <div>
                  <span className="text-xs text-gray-300">High Risk (>70%)</span>
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
        
        <div className="mt-4 text-sm text-gray-400 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Impact zones are estimated based on trajectory analysis. Actual locations vary due to atmospheric 
            effects and orbital mechanics. Zoom in to see individual asteroid risk points.
          </p>
        </div>
      </motion.div>
    </MapboxProvider>
  );
}