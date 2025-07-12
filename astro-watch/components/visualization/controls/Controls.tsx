'use client';

import { useAsteroidStore } from '@/lib/store';
import { motion } from 'framer-motion';

export function Controls() {
  const {
    riskFilter,
    timeRange,
    viewMode,
    showTrajectories,
    setRiskFilter,
    setTimeRange,
    setViewMode,
    toggleTrajectories
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
        <option value="all">All Torino Levels</option>
        <option value="threatening">Threatening (5-10)</option>
        <option value="attention">Attention (2-4)</option>
        <option value="normal">Normal (0-1)</option>
      </select>

      {/* View Mode */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('solar-system')}
          className={`px-3 py-1 rounded-md text-sm ${
            viewMode === 'solar-system' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Solar System
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
          onClick={() => setViewMode('impact-globe')}
          className={`px-3 py-1 rounded-md text-sm ${
            viewMode === 'impact-globe' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Analysis Hub
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
      </div>
    </motion.div>
  );
}