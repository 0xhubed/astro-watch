'use client';

import { useAsteroidStore } from '@/lib/store';
import { motion } from 'framer-motion';

export function Controls() {
  const {
    riskFilter,
    timeRange,
    viewMode,
    showTrajectories,
    showParticleEffects,
    setRiskFilter,
    setTimeRange,
    setViewMode,
    toggleTrajectories,
    toggleParticleEffects
  } = useAsteroidStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-4 items-center"
    >
      {/* Time Range */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeRange('day')}
          className={`px-3 py-1 rounded-md text-sm ${
            timeRange === 'day' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-3 py-1 rounded-md text-sm ${
            timeRange === 'week' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-3 py-1 rounded-md text-sm ${
            timeRange === 'month' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Month
        </button>
      </div>

      {/* Risk Filter */}
      <select
        value={riskFilter}
        onChange={(e) => setRiskFilter(e.target.value as any)}
        className="px-3 py-1 rounded-md bg-gray-700 text-gray-300 border border-gray-600"
      >
        <option value="all">All Risks</option>
        <option value="high">High Risk</option>
        <option value="medium">Medium Risk</option>
        <option value="low">Low Risk</option>
      </select>

      {/* View Mode */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('3d')}
          className={`px-3 py-1 rounded-md text-sm ${
            viewMode === '3d' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          3D
        </button>
        <button
          onClick={() => setViewMode('dashboard')}
          className={`px-3 py-1 rounded-md text-sm ${
            viewMode === 'dashboard' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`px-3 py-1 rounded-md text-sm ${
            viewMode === 'map' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Map
        </button>
      </div>

      {/* Visual Options */}
      <div className="flex gap-2">
        <button
          onClick={toggleTrajectories}
          className={`px-3 py-1 rounded-md text-sm ${
            showTrajectories 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Trajectories
        </button>
        <button
          onClick={toggleParticleEffects}
          className={`px-3 py-1 rounded-md text-sm ${
            showParticleEffects 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Effects
        </button>
      </div>
    </motion.div>
  );
}