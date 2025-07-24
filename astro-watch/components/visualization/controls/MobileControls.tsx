'use client';

import { useState } from 'react';
import { useAsteroidStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Image, Menu, X, Calendar, Shield, Eye, Orbit, AlertTriangle, BarChart3, Info, Home } from 'lucide-react';

export function MobileControls() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    asteroids,
    riskFilter,
    timeRange,
    viewMode,
    showTrajectories,
    setRiskFilter,
    setTimeRange,
    setViewMode,
    toggleTrajectories,
    getFilteredAsteroids
  } = useAsteroidStore();
  
  const filteredAsteroids = getFilteredAsteroids();
  const highRiskCount = asteroids.filter(a => a.torinoScale >= 5).length;
  const mediumRiskCount = asteroids.filter(a => a.torinoScale >= 2 && a.torinoScale < 5).length;
  const todayCount = asteroids.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.close_approach_data[0].close_approach_date === today;
  }).length;

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={toggleMenu}
        className="flex md:!hidden p-2 rounded-lg bg-gray-800 text-white min-h-[44px] min-w-[44px] items-center justify-center"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - Only on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="md:!hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Menu Panel - Only on mobile */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="md:!hidden fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">AstroWatch</h2>
                  <button
                    onClick={toggleMenu}
                    className="p-2 rounded-lg bg-gray-800 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Quick Stats */}
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Current Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Tracked:</span>
                      <span className="text-white font-medium">{asteroids.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Filtered View:</span>
                      <span className="text-white font-medium">{filteredAsteroids.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Today's Approaches:</span>
                      <span className="text-white font-medium">{todayCount}</span>
                    </div>
                    {highRiskCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          High Risk:
                        </span>
                        <span className="text-red-400 font-medium">{highRiskCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Quick Views
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'solar-system', label: '3D Solar System', icon: Orbit, desc: 'Interactive 3D view' },
                      { value: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3, desc: 'Charts and statistics' },
                      { value: 'impact-globe', label: 'Analysis Hub', icon: Shield, desc: 'Detailed analysis tools' },
                      { value: 'interactive-maps', label: 'Interactive Maps', icon: Globe, desc: 'Real-time map visualizations' }
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setViewMode(value as any);
                          setIsOpen(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          viewMode === value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs opacity-75">{desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range Section */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Time Range
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'day', label: 'Today', desc: 'Next 24h' },
                      { value: 'week', label: 'Week', desc: 'Next 7 days' },
                      { value: 'month', label: 'Month', desc: 'Next 30 days' }
                    ].map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setTimeRange(value as any);
                          setIsOpen(false);
                        }}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
                          timeRange === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="text-center">
                          <div>{label}</div>
                          <div className="text-xs opacity-75">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Level Filter */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Show Risk Level
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Asteroids', count: asteroids.length, color: 'bg-gray-600' },
                      { value: 'threatening', label: 'High Risk', count: highRiskCount, color: 'bg-red-600' },
                      { value: 'attention', label: 'Medium Risk', count: mediumRiskCount, color: 'bg-orange-600' },
                      { value: 'normal', label: 'Low Risk', count: asteroids.length - highRiskCount - mediumRiskCount, color: 'bg-green-600' }
                    ].map(({ value, label, count, color }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setRiskFilter(value as any);
                          setIsOpen(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          riskFilter === value
                            ? color + ' text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{label}</span>
                          <span className="text-sm opacity-75">{count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Explore
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href="/apod"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 w-full p-3 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                    >
                      <Image className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Picture of the Day</div>
                        <div className="text-xs opacity-75">NASA's daily space image</div>
                      </div>
                    </Link>
                    <Link
                      href="/"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <Home className="w-5 h-5" />
                      <div>
                        <div className="font-medium">Home</div>
                        <div className="text-xs opacity-75">Back to landing page</div>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Advanced Settings - Collapsible */}
                {viewMode === 'solar-system' && (
                  <details className="mb-4">
                    <summary className="text-white font-semibold mb-3 flex items-center gap-2 cursor-pointer">
                      <Orbit className="w-4 h-4" />
                      3D Options
                    </summary>
                    <div className="ml-6 mt-3">
                      <button
                        onClick={() => {
                          toggleTrajectories();
                          setIsOpen(false);
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          showTrajectories
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {showTrajectories ? 'Hide' : 'Show'} Orbital Paths
                      </button>
                    </div>
                  </details>
                )}
                
                <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-800">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Controls - Hidden on mobile */}
      <div className="hidden md:flex flex-wrap gap-4 items-center">
        {/* Time Range */}
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm capitalize ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
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
          {[
            { value: 'solar-system', label: 'Solar System' },
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'impact-globe', label: 'Analysis Hub' },
            { value: 'interactive-maps', label: 'Interactive Maps' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setViewMode(value as any)}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Visual Options */}
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

        {/* APOD Link */}
        <Link
          href="/apod"
          className="flex items-center gap-2 px-3 py-1 rounded-md text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors"
        >
          <Image className="w-4 h-4" />
          Picture of the Day
        </Link>
      </div>
    </>
  );
}