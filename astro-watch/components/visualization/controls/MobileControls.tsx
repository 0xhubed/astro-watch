'use client';

import { useAsteroidStore } from '@/lib/store';
import Link from 'next/link';
import { Image } from 'lucide-react';

export function MobileControls() {
  const {
    riskFilter,
    timeRange,
    viewMode,
    showTrajectories,
    setRiskFilter,
    setTimeRange,
    setViewMode,
    toggleTrajectories,
  } = useAsteroidStore();

  return (
    <>
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