'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { EnhancedImpactHeatmap, TrajectoryMap, RegionalRiskMap } from '@/components/visualization/maps/mapbox';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function InteractiveMapsView({ asteroids }: Props) {
  const [activeView, setActiveView] = useState<'heatmap' | 'trajectories' | 'regional'>('heatmap');

  console.log('InteractiveMapsView rendering, activeView:', activeView, 'asteroids:', asteroids.length);

  return (
    <div className="h-full w-full relative">
      {/* View Selector */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 flex gap-2 bg-gray-900/80 backdrop-blur-md rounded-lg p-1">
        <button
          onClick={() => setActiveView('heatmap')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            activeView === 'heatmap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Impact Heatmap
        </button>
        <button
          onClick={() => setActiveView('trajectories')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            activeView === 'trajectories'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Trajectories
        </button>
        <button
          onClick={() => setActiveView('regional')}
          className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
            activeView === 'regional'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Regional Risk
        </button>
      </div>

      {/* Map Content */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full w-full absolute inset-0"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {activeView === 'heatmap' && (
          <div className="w-full h-full">
            <EnhancedImpactHeatmap asteroids={asteroids} />
          </div>
        )}
        {activeView === 'trajectories' && (
          <div className="w-full h-full">
            <TrajectoryMap asteroids={asteroids} />
          </div>
        )}
        {activeView === 'regional' && (
          <div className="w-full h-full">
            <RegionalRiskMap asteroids={asteroids} />
          </div>
        )}
      </motion.div>
    </div>
  );
}