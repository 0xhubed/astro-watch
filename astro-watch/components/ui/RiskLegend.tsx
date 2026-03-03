'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface RarityLevel {
  scale: number;
  level: string;
  color: string;
  description: string;
  bgColor: string;
}

const RARITY_SCALE: RarityLevel[] = [
  {
    scale: 0,
    level: 'Routine',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    description: 'Close approaches of this size happen multiple times per year.'
  },
  {
    scale: 1,
    level: 'Common',
    color: 'text-green-300',
    bgColor: 'bg-green-500/20',
    description: 'Expected roughly once per year. Typical small-body flyby.'
  },
  {
    scale: 2,
    level: 'Noteworthy',
    color: 'text-green-400',
    bgColor: 'bg-green-500/30',
    description: 'Expected roughly once per decade. Merits public interest.'
  },
  {
    scale: 3,
    level: 'Uncommon',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/20',
    description: 'Expected roughly once per century. Unusual close approach.'
  },
  {
    scale: 4,
    level: 'Rare',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    description: 'Expected roughly once per millennium. Very rare event.'
  },
  {
    scale: 5,
    level: 'Very Rare',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/30',
    description: 'Expected roughly once per 10,000 years. Extremely uncommon.'
  },
  {
    scale: 6,
    level: 'Exceptionally Rare',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Expected roughly once per 100,000 years. Historic-scale event.'
  },
  {
    scale: 7,
    level: 'Extraordinary',
    color: 'text-red-500',
    bgColor: 'bg-red-500/30',
    description: 'Expected less than once per million years. Unprecedented.'
  }
];

interface Props {
  expanded?: boolean;
  position?: 'left' | 'right' | 'center';
  onToggle?: () => void;
}

export function RiskLegend({ expanded = false, position = 'left', onToggle }: Props) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  const positionClasses = {
    left: 'left-4',
    right: 'right-4',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute bottom-20 ${positionClasses[position]} z-20 max-w-md`}
    >
      <div className="bg-black/60 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <button
          onClick={handleToggle}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <h3 className="text-white text-sm font-semibold">Close-Approach Rarity Scale</h3>
          </div>
          <svg
            className={`w-4 h-4 text-white/60 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <motion.div
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 space-y-2">
            <p className="text-white/60 text-xs mb-3">
              Based on Farnocchia & Chodas (2021). Measures how many years between
              close approaches of this size at this distance (log scale, 0-7).
            </p>

            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {RARITY_SCALE.map((item) => (
                <div
                  key={item.scale}
                  className={`${item.bgColor} rounded-lg px-3 py-2 border border-white/5`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-lg font-bold ${item.color} min-w-[1.5rem] text-center`}>
                      {item.scale}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${item.color}`}>
                        {item.level}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                <strong>Note:</strong> Rarity reflects how statistically uncommon
                the close approach is, not impact probability. Higher values mean
                the event is rarer. No known asteroid currently poses a significant
                threat to Earth.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </motion.div>
  );
}

// Helper function to get rarity info
export function getRarityInfo(rarity: number): RarityLevel {
  return RARITY_SCALE[Math.min(Math.max(0, Math.round(rarity)), 7)];
}

// Helper function to get risk color based on rarity
export function getRarityColor(rarity: number): string {
  const info = getRarityInfo(rarity);
  const colorMap: Record<string, string> = {
    'text-blue-300': '#93c5fd',
    'text-green-300': '#6ee7b7',
    'text-green-400': '#4ade80',
    'text-yellow-300': '#fef08a',
    'text-orange-300': '#fed7aa',
    'text-orange-400': '#fb923c',
    'text-red-400': '#f87171',
    'text-red-500': '#ef4444'
  };
  return colorMap[info.color] || '#ffffff';
}

// Helper function to get brighter colors specifically for 3D rendering
export function getRarity3DColor(rarity: number): string {
  if (rarity === 0) return '#4488ff';  // Blue for routine
  if (rarity === 1) return '#00ff00';  // Green for common
  if (rarity === 2) return '#44ff44';  // Bright green for noteworthy
  if (rarity === 3) return '#ffff00';  // Yellow for uncommon
  if (rarity === 4) return '#ff8800';  // Orange for rare
  if (rarity === 5) return '#ff4400';  // Orange-red for very rare
  if (rarity === 6) return '#ff0000';  // Red for exceptionally rare
  if (rarity >= 7) return '#ff00ff';   // Magenta for extraordinary
  return '#4488ff';
}
