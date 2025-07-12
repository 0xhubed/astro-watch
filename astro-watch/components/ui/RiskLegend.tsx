'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface TorinoLevel {
  scale: number;
  level: string;
  color: string;
  description: string;
  bgColor: string;
}

const TORINO_SCALE: TorinoLevel[] = [
  {
    scale: 0,
    level: 'No Hazard',
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20',
    description: 'Zero likelihood of collision. No hazard.'
  },
  {
    scale: 1,
    level: 'Normal',
    color: 'text-green-300',
    bgColor: 'bg-green-500/20',
    description: 'Routine discovery. Will pass near Earth with no unusual level of danger.'
  },
  {
    scale: 2,
    level: 'Meriting Attention',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/20',
    description: 'Somewhat close but not unusual pass. Merits attention by astronomers.'
  },
  {
    scale: 3,
    level: 'Meriting Attention',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/30',
    description: 'Close encounter. 1% or greater chance of collision capable of localized destruction.'
  },
  {
    scale: 4,
    level: 'Meriting Attention',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    description: 'Close encounter. 1% or greater chance of collision capable of regional devastation.'
  },
  {
    scale: 5,
    level: 'Threatening',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/30',
    description: 'Extremely close encounter with significant threat of collision causing regional devastation.'
  },
  {
    scale: 6,
    level: 'Threatening',
    color: 'text-red-300',
    bgColor: 'bg-red-500/20',
    description: 'Large object with significant threat of collision causing global catastrophe.'
  },
  {
    scale: 7,
    level: 'Threatening',
    color: 'text-red-400',
    bgColor: 'bg-red-500/30',
    description: 'Very close encounter with extremely significant threat of collision causing global catastrophe.'
  },
  {
    scale: 8,
    level: 'Certain Collision',
    color: 'text-red-500',
    bgColor: 'bg-red-600/40',
    description: 'Collision certain, capable of causing localized destruction.'
  },
  {
    scale: 9,
    level: 'Certain Collision',
    color: 'text-red-600',
    bgColor: 'bg-red-700/50',
    description: 'Collision certain, capable of causing regional devastation.'
  },
  {
    scale: 10,
    level: 'Certain Collision',
    color: 'text-red-700',
    bgColor: 'bg-red-800/60',
    description: 'Collision certain, capable of causing global climatic catastrophe.'
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
            <h3 className="text-white text-sm font-semibold">Torino Impact Hazard Scale</h3>
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
              NASA's standard scale for communicating asteroid impact risk (0-10)
            </p>
            
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {TORINO_SCALE.map((item) => (
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
                <strong>Note:</strong> This app uses simplified calculations. 
                Actual impact probabilities require complex orbital mechanics calculations.
                No known asteroid currently poses a significant threat to Earth.
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

// Helper function to get Torino Scale info
export function getTorinoInfo(torinoScale: number): TorinoLevel {
  return TORINO_SCALE[Math.min(Math.max(0, Math.round(torinoScale)), 10)];
}

// Helper function to get risk color based on Torino Scale
export function getTorinoColor(torinoScale: number): string {
  const info = getTorinoInfo(torinoScale);
  const colorMap: Record<string, string> = {
    'text-gray-300': '#f3f4f6',     // Much brighter gray
    'text-green-300': '#6ee7b7',    // Brighter green
    'text-yellow-300': '#fef08a',   // Brighter yellow
    'text-yellow-400': '#fbbf24',   // Brighter yellow
    'text-orange-300': '#fed7aa',   // Brighter orange
    'text-orange-400': '#fb923c',   // Keep as is
    'text-red-300': '#fca5a5',      // Keep as is
    'text-red-400': '#f87171',      // Keep as is
    'text-red-500': '#ef4444',      // Keep as is
    'text-red-600': '#dc2626',      // Keep as is
    'text-red-700': '#b91c1c'       // Keep as is
  };
  return colorMap[info.color] || '#ffffff';
}

// Helper function to get brighter colors specifically for 3D rendering
export function getTorino3DColor(torinoScale: number): string {
  // Much brighter, saturated colors for maximum visibility
  if (torinoScale === 0) return '#ffffff';        // Pure white for no hazard
  if (torinoScale === 1) return '#00ff00';        // Pure green for normal
  if (torinoScale === 2) return '#ffff00';        // Pure yellow for attention
  if (torinoScale === 3) return '#ff8000';        // Bright orange for attention
  if (torinoScale === 4) return '#ff4000';        // Orange-red for attention
  if (torinoScale === 5) return '#ff0000';        // Pure red for threatening
  if (torinoScale === 6) return '#ff0080';        // Pink-red for threatening
  if (torinoScale >= 7) return '#ff00ff';         // Pure magenta for high threatening
  return '#ffffff';
}