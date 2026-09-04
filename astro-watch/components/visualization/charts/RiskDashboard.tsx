'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, ScatterChart, Scatter, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { RiskLegend, getRarityInfo } from '@/components/ui/RiskLegend';
import { RARITY_COLORS, rarityStyle } from '@/lib/rarity-colors';
import { formatMeters, formatNumber, formatDateShort, DARK_TOOLTIP, DARK_TOOLTIP_LABEL, DARK_TOOLTIP_ITEM } from '@/lib/format';
import { ApproachTimeline } from './ApproachTimeline';

interface Props {
  asteroids: EnhancedAsteroid[];
  timeRange: 'day' | 'week' | 'month';
  /** Timestamp of the last successful feed fetch (from TanStack Query). */
  dataUpdatedAt?: number;
  isError?: boolean;
}

export function RiskDashboard({ asteroids, timeRange, dataUpdatedAt, isError = false }: Props) {
  const timeSeriesData = useMemo(() => {
    // Group asteroids by date, then sort chronologically (review #50).
    const grouped = asteroids.reduce((acc, asteroid) => {
      const date = asteroid.close_approach_data[0].close_approach_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(asteroid);
      return acc;
    }, {} as Record<string, EnhancedAsteroid[]>);

    return Object.entries(grouped)
      .map(([date, group]) => ({
        date,
        maxRarity: Math.max(...group.map(a => a.rarity)),
        avgRarity: group.reduce((sum, a) => sum + a.rarity, 0) / group.length,
        highRarity: group.filter(a => a.rarity >= 4).length,
        mediumRarity: group.filter(a => a.rarity >= 2 && a.rarity < 4).length,
        lowRarity: group.filter(a => a.rarity < 2).length,
        count: group.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [asteroids]);

  const TimeSeriesRisk = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Close-Approach Rarity Over Time</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px] max-w-full">
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={formatDateShort} />
            <YAxis stroke="#9CA3AF" allowDecimals={false} />
            <Tooltip
              contentStyle={DARK_TOOLTIP}
              labelStyle={DARK_TOOLTIP_LABEL}
              itemStyle={DARK_TOOLTIP_ITEM}
            />
            <Legend wrapperStyle={{ color: '#D1D5DB' }} />
            <Area
              type="monotone"
              dataKey="highRarity"
              name="Rare (R4+)"
              stackId="1"
              stroke="#ef4444"
              fillOpacity={0.8}
              fill="#ef4444"
            />
            <Area
              type="monotone"
              dataKey="mediumRarity"
              name="Notable (R2-3)"
              stackId="1"
              stroke="#f59e0b"
              fillOpacity={0.8}
              fill="#f59e0b"
            />
            <Area
              type="monotone"
              dataKey="lowRarity"
              name="Routine (R0-1)"
              stackId="1"
              stroke="#10b981"
              fillOpacity={0.8}
              fill="#10b981"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const RiskDistribution = () => {
    // Group by rarity levels
    // Colors keyed to the upper end of each bucket's rarity range (single source: lib/rarity-colors.ts).
    const rarityGroups = [
      { name: 'Routine (R0)', value: asteroids.filter(a => a.rarity === 0).length, color: rarityStyle(0).hex },
      { name: 'Common (R1)', value: asteroids.filter(a => a.rarity === 1).length, color: rarityStyle(1).hex },
      { name: 'Noteworthy (R2-3)', value: asteroids.filter(a => a.rarity >= 2 && a.rarity <= 3).length, color: rarityStyle(3).hex },
      { name: 'Rare (R4-5)', value: asteroids.filter(a => a.rarity >= 4 && a.rarity <= 5).length, color: rarityStyle(5).hex },
      { name: 'Exceptional (R6+)', value: asteroids.filter(a => a.rarity >= 6).length, color: rarityStyle(7).hex }
    ].filter(group => group.value > 0);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Rarity Distribution</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px] max-w-full">
          <PieChart>
            <Pie
              data={rarityGroups}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {rarityGroups.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={DARK_TOOLTIP}
              labelStyle={DARK_TOOLTIP_LABEL}
              itemStyle={DARK_TOOLTIP_ITEM}
            />
            <Legend wrapperStyle={{ color: '#D1D5DB' }} />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const TopThreats = () => {
    const topAsteroids = [...asteroids]
      .sort((a, b) => b.rarity - a.rarity)
      .slice(0, 5);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Rarest Close Approaches</h3>
        <div className="space-y-3">
          {topAsteroids.map((asteroid) => {
            const rarityInfo = getRarityInfo(asteroid.rarity);
            return (
              <div key={asteroid.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white font-medium">{asteroid.name}</div>
                  <div className="text-gray-400 text-sm">
                    {asteroid.size.toFixed(1)} m | {asteroid.velocity.toFixed(1)} km/s
                  </div>
                </div>
                <div className={`${rarityInfo.bgColor} px-3 py-1 rounded-full`}>
                  <span className={`text-sm font-medium ${rarityInfo.color}`}>
                    R{asteroid.rarity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Educational Content Components
  const AsteroidFacts = () => {
    const stats = {
      totalDetected: asteroids.length,
      averageSize: asteroids.reduce((sum, a) => sum + a.size, 0) / asteroids.length,
      fastestVelocity: Math.max(...asteroids.map(a => a.velocity)),
      closestApproach: Math.min(...asteroids.map(a => a.missDistance)),
      hazardousCount: asteroids.filter(a => a.is_potentially_hazardous_asteroid).length,
      totalEnergy: asteroids.reduce((sum, a) => sum + a.impactEnergy, 0) / 1e15 // Convert to petajoules
    };

    const facts = [
      {
        title: "Did You Know?",
        items: [
          "Over 90% of kilometer-sized near-Earth asteroids have been discovered",
          "The Chicxulub impactor (dinosaur extinction) was ~10-15 km in diameter",
          "Small asteroids (~1m) hit Earth's atmosphere about once a year",
          "The asteroid belt contains only 4% of the Moon's mass"
        ]
      },
      {
        title: "Current Data Insights",
        items: [
          `We're tracking ${formatNumber(stats.totalDetected)} asteroids in this time period`,
          `Average size: ${formatMeters(stats.averageSize)} diameter`,
          `Fastest detected: ${stats.fastestVelocity.toFixed(1)} km/s`,
          `${formatNumber(stats.hazardousCount)} classified as Potentially Hazardous Asteroids`
        ]
      },
      {
        title: "Scale Perspective",
        items: [
          "1 AU = 149.6 million km (Earth-Sun distance)",
          "Moon's distance = 0.00257 AU (384,400 km)",
          `Closest approach: ${stats.closestApproach.toFixed(3)} AU`,
          `Combined energy: ${stats.totalEnergy.toFixed(1)} petajoules`
        ]
      }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 h-full"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Asteroid Facts & Insights</h3>
        <div className="space-y-6 overflow-y-auto max-h-[300px] custom-scrollbar">
          {facts.map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-medium text-blue-300 mb-2">{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((fact, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const ImpactScenarios = () => {
    const scenarios = [
      {
        size: "10m",
        frequency: "Every few years",
        description: "Burns up in atmosphere, creates fireball",
        example: "Chelyabinsk meteor (2013)",
        damage: "Broken windows, minor injuries"
      },
      {
        size: "50m",
        frequency: "Every few centuries",
        description: "Ground impact with local destruction",
        example: "Tunguska event (1908)",
        damage: "Flattens forests over 2,000 km²"
      },
      {
        size: "1km",
        frequency: "Every 500,000 years",
        description: "Global climate effects",
        example: "Theoretical 1km impactor",
        damage: "Global crop failures, climate change"
      },
      {
        size: "10km",
        frequency: "Every 50-100 million years",
        description: "Mass extinction event",
        example: "Chicxulub impactor (66 Mya)",
        damage: "Dinosaur extinction, 75% species loss"
      }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Impact Scenarios by Size</h3>
        <div className="space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar">
          {scenarios.map((scenario, index) => (
            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-lg font-bold text-yellow-300">{scenario.size}</span>
                <span className="text-xs text-gray-400">{scenario.frequency}</span>
              </div>
              <p className="text-gray-300 text-sm mb-2">{scenario.description}</p>
              <div className="flex justify-between text-xs">
                <span className="text-blue-300">Ex: {scenario.example}</span>
                <span className="text-red-300">{scenario.damage}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const SizeVelocityChart = () => {
    const scatterData = asteroids.map(asteroid => ({
      x: asteroid.size,
      y: asteroid.velocity,
      name: asteroid.name,
      rarity: asteroid.rarity,
      color: getRarityInfo(asteroid.rarity).color
    }));

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Size vs Velocity Distribution</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px] max-w-full">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="x"
              type="number"
              domain={['auto', 'auto']}
              stroke="#9CA3AF"
              label={{ value: 'Size (m)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={['auto', 'auto']}
              stroke="#9CA3AF"
              label={{ value: 'Velocity (km/s)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={DARK_TOOLTIP}
              labelStyle={DARK_TOOLTIP_LABEL}
              itemStyle={DARK_TOOLTIP_ITEM}
              formatter={(value, name) => [
                name === 'x' ? `${formatMeters(Number(value))}` : `${formatNumber(Number(value), 1)} km/s`,
                name === 'x' ? 'Size' : 'Velocity'
              ]}
            />
            <Scatter data={scatterData} fill="#8884d8">
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={rarityStyle(entry.rarity).hex} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const RarityScaleCard = () => {
    const descriptions: Record<number, string> = {
      0: 'Multiple per year',
      1: '~Once per year',
      2: '~Once per decade',
      3: '~Once per century',
      4: '~Once per millennium',
      5: '~Once per 10,000 years',
      6: '~Once per 100,000 years',
      7: '< Once per million years'
    };
    const scaleInfo = RARITY_COLORS.map((rc) => ({
      level: rc.level,
      color: rc.hex,
      label: rc.label,
      description: descriptions[rc.level]
    }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Close-Approach Rarity Scale</h3>
        <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar">
          {scaleInfo.map((item) => (
            <div key={item.level} className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 min-w-[60px]">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-white font-medium text-sm">R{item.level}</span>
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{item.label}</div>
                <div className="text-gray-400 text-xs">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
          <div className="text-blue-300 text-sm font-medium mb-1">Note</div>
          <div className="text-blue-200 text-xs">
            Rarity is based on Farnocchia & Chodas (2021). It measures how many years
            pass between close approaches of a given size at a given distance (log scale).
          </div>
        </div>
      </motion.div>
    );
  };

  const APIStatus = () => {
    const feedFresh = !isError && dataUpdatedAt !== undefined;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Data & API Information</h3>
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            feedFresh
              ? 'bg-green-900/20 border-green-700/30'
              : 'bg-yellow-900/20 border-yellow-700/30'
          }`}>
            <div>
              <div className={`font-medium ${feedFresh ? 'text-green-300' : 'text-yellow-300'}`}>
                NASA NEO Feed
              </div>
              <div className={`text-sm ${feedFresh ? 'text-green-200' : 'text-yellow-200'}`}>
                {feedFresh
                  ? `Loaded ${new Date(dataUpdatedAt!).toLocaleTimeString()} · auto-refreshes every 15 min`
                  : isError
                    ? 'Feed currently unavailable — showing cached data if any'
                    : 'Awaiting first load · auto-refreshes every 15 min'}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${feedFresh ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-400">Data Source</div>
              <div className="text-white font-medium">NASA NEO API</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-400">Update Frequency</div>
              <div className="text-white font-medium">15 minutes</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-400">Cache Duration</div>
              <div className="text-white font-medium">1 hour</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-gray-400">Time Range</div>
              <div className="text-white font-medium capitalize">{timeRange}</div>
            </div>
          </div>

          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
            <div className="text-blue-300 text-sm font-medium mb-1">About the Data</div>
            <div className="text-blue-200 text-xs">
              This application uses NASA's Near Earth Object Web Service to track asteroids. 
              Rarity scores are calculated using the Farnocchia & Chodas (2021) method for educational purposes.
            </div>
          </div>
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Primary Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        <TimeSeriesRisk />
        <RiskDistribution />
      </div>
      
      {/* Secondary Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        <TopThreats />
        <SizeVelocityChart />
      </div>
      
      {/* Educational Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        <AsteroidFacts />
        <ImpactScenarios />
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        <APIStatus />
        <RarityScaleCard />
      </div>

      {/* Approach Timelines */}
      <ApproachTimeline asteroids={asteroids} />

    </div>
  );
}