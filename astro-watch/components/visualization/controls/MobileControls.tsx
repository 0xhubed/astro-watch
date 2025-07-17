'use client';

import { useState } from 'react';
import { useAsteroidStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Image, Menu, X, Calendar, Shield, Eye, Orbit } from 'lucide-react';

export function MobileControls() {
  const [isOpen, setIsOpen] = useState(false);
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

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMenu}
        className="md:hidden p-2 rounded-lg bg-gray-800 text-white touch-target"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="md:hidden fixed right-0 top-0 h-full w-80 max-w-full bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Controls</h2>
                  <button
                    onClick={toggleMenu}
                    className="p-2 rounded-lg bg-gray-800 text-white touch-target"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Time Range Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>Time Range</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['day', 'week', 'month'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => {
                          setTimeRange(range);
                          setIsOpen(false);
                        }}
                        className={`py-3 px-4 rounded-lg text-sm font-medium capitalize transition-colors ${
                          timeRange === range
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Filter Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Shield className="w-4 h-4" />
                    <span>Risk Filter</span>
                  </div>
                  <select
                    value={riskFilter}
                    onChange={(e) => {
                      setRiskFilter(e.target.value as any);
                      setIsOpen(false);
                    }}
                    className="w-full py-3 px-4 rounded-lg bg-gray-800 text-gray-300 border border-gray-700"
                  >
                    <option value="all">All Torino Levels</option>
                    <option value="threatening">Threatening (5-10)</option>
                    <option value="attention">Attention (2-4)</option>
                    <option value="normal">Normal (0-1)</option>
                  </select>
                </div>

                {/* View Mode Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Eye className="w-4 h-4" />
                    <span>View Mode</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { value: 'solar-system', label: 'Solar System' },
                      { value: 'dashboard', label: 'Dashboard' },
                      { value: 'impact-globe', label: 'Analysis Hub' }
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setViewMode(value as any);
                          setIsOpen(false);
                        }}
                        className={`w-full py-3 px-4 rounded-lg text-sm font-medium text-left transition-colors ${
                          viewMode === value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Options Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Orbit className="w-4 h-4" />
                    <span>Visual Options</span>
                  </div>
                  <button
                    onClick={() => {
                      toggleTrajectories();
                      setIsOpen(false);
                    }}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      showTrajectories
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {showTrajectories ? 'Hide' : 'Show'} Trajectories
                  </button>
                </div>

                {/* APOD Link */}
                <Link
                  href="/apod"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                >
                  <Image className="w-4 h-4" />
                  Picture of the Day
                </Link>
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
            { value: 'impact-globe', label: 'Analysis Hub' }
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