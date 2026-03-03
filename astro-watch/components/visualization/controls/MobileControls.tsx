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
  const highRiskCount = asteroids.filter(a => a.rarity >= 4).length;
  const mediumRiskCount = asteroids.filter(a => a.rarity >= 2 && a.rarity < 4).length;
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
                        <span className="text-zinc-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Rare (R4+):
                        </span>
                        <span className="text-zinc-300 font-medium">{highRiskCount}</span>
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
                      { value: 'impact-globe', label: 'Analysis Hub', icon: Shield, desc: 'Detailed analysis tools' }
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setViewMode(value as any);
                          setIsOpen(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          viewMode === value
                            ? 'bg-white/10 text-white border border-white/15'
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
                            ? 'bg-white/10 text-white border border-white/15'
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
                    Rarity Level
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Asteroids', count: asteroids.length },
                      { value: 'threatening', label: 'Rare (R4+)', count: highRiskCount },
                      { value: 'attention', label: 'Noteworthy (R2-3)', count: mediumRiskCount },
                      { value: 'normal', label: 'Routine (R0-1)', count: asteroids.length - highRiskCount - mediumRiskCount }
                    ].map(({ value, label, count }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setRiskFilter(value as any);
                          setIsOpen(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          riskFilter === value
                            ? 'bg-white/10 text-white border border-white/15'
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
                      className="flex items-center gap-3 w-full p-3 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors"
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
                            ? 'bg-white/10 text-white border border-white/15'
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
              className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                timeRange === range
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
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
          className="px-3 py-1 rounded-md bg-white/5 text-zinc-300 border border-white/10"
        >
          <option value="all">All Rarity Levels</option>
          <option value="threatening">Rare (R4+)</option>
          <option value="attention">Noteworthy (R2-3)</option>
          <option value="normal">Routine (R0-1)</option>
        </select>

        {/* View Mode */}
        <div className="flex gap-2">
          {[
            { value: 'solar-system', label: 'Solar System' },
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'impact-globe', label: 'Analysis Hub' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setViewMode(value as any)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === value
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Visual Options */}
        <button
          onClick={toggleTrajectories}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            showTrajectories
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          Trajectories
        </button>

        {/* APOD Link */}
        <Link
          href="/apod"
          className="flex items-center gap-2 px-3 py-1 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Image className="w-4 h-4" />
          Picture of the Day
        </Link>
      </div>
    </>
  );
}