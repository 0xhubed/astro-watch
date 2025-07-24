'use client';

import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { RiskLegend, getTorinoInfo } from '@/components/ui/RiskLegend';
import { MLModelStats } from './MLModelStats';
import { useState } from 'react';

interface Props {
  asteroids: EnhancedAsteroid[];
  timeRange: 'day' | 'week' | 'month';
}

export function RiskDashboard({ asteroids, timeRange }: Props) {
  const [selectedEducationalTab, setSelectedEducationalTab] = useState('facts');
  const processTimeSeriesData = (asteroids: EnhancedAsteroid[], range: string) => {
    // Group asteroids by date
    const grouped = asteroids.reduce((acc, asteroid) => {
      const date = asteroid.close_approach_data[0].close_approach_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(asteroid);
      return acc;
    }, {} as Record<string, EnhancedAsteroid[]>);
    
    return Object.entries(grouped).map(([date, asteroids]) => ({
      date,
      maxTorino: Math.max(...asteroids.map(a => a.torinoScale)),
      avgTorino: asteroids.reduce((sum, a) => sum + a.torinoScale, 0) / asteroids.length,
      highRisk: asteroids.filter(a => a.torinoScale >= 5).length,
      mediumRisk: asteroids.filter(a => a.torinoScale >= 2 && a.torinoScale < 5).length,
      lowRisk: asteroids.filter(a => a.torinoScale < 2).length,
      count: asteroids.length
    }));
  };

  const TimeSeriesRisk = () => {
    const data = processTimeSeriesData(asteroids, timeRange);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Torino Scale Risk Over Time</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px] max-w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Area 
              type="monotone" 
              dataKey="highRisk" 
              stackId="1"
              stroke="#ef4444" 
              fillOpacity={0.8} 
              fill="#ef4444"
            />
            <Area 
              type="monotone" 
              dataKey="mediumRisk" 
              stackId="1"
              stroke="#f59e0b" 
              fillOpacity={0.8} 
              fill="#f59e0b"
            />
            <Area 
              type="monotone" 
              dataKey="lowRisk" 
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
    // Group by Torino Scale levels
    const torinoGroups = [
      { name: 'No Hazard (0)', value: asteroids.filter(a => a.torinoScale === 0).length, color: '#9ca3af' },
      { name: 'Normal (1)', value: asteroids.filter(a => a.torinoScale === 1).length, color: '#10b981' },
      { name: 'Attention (2-4)', value: asteroids.filter(a => a.torinoScale >= 2 && a.torinoScale <= 4).length, color: '#f59e0b' },
      { name: 'Threatening (5-7)', value: asteroids.filter(a => a.torinoScale >= 5 && a.torinoScale <= 7).length, color: '#ef4444' },
      { name: 'Certain (8-10)', value: asteroids.filter(a => a.torinoScale >= 8).length, color: '#991b1b' }
    ].filter(group => group.value > 0); // Only show groups with asteroids

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Torino Scale Distribution</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px] max-w-full">
          <PieChart>
            <Pie
              data={torinoGroups}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {torinoGroups.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const TopThreats = () => {
    const topAsteroids = [...asteroids]
      .sort((a, b) => b.torinoScale - a.torinoScale)
      .slice(0, 5);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Top Threats by Torino Scale</h3>
        <div className="space-y-3">
          {topAsteroids.map((asteroid) => {
            const torinoInfo = getTorinoInfo(asteroid.torinoScale);
            return (
              <div key={asteroid.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white font-medium">{asteroid.name}</div>
                  <div className="text-gray-400 text-sm">
                    {asteroid.size.toFixed(1)} m | {asteroid.velocity.toFixed(1)} km/s
                  </div>
                </div>
                <div className={`${torinoInfo.bgColor} px-3 py-1 rounded-full`}>
                  <span className={`text-sm font-medium ${torinoInfo.color}`}>
                    Torino {asteroid.torinoScale}
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
          `We're tracking ${stats.totalDetected} asteroids in this time period`,
          `Average size: ${stats.averageSize.toFixed(1)} km diameter`,
          `Fastest detected: ${stats.fastestVelocity.toFixed(1)} km/s`,
          `${stats.hazardousCount} classified as Potentially Hazardous Asteroids`
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
      torino: asteroid.torinoScale,
      color: getTorinoInfo(asteroid.torinoScale).color
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
              stroke="#9CA3AF" 
              label={{ value: 'Size (km)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="y" 
              stroke="#9CA3AF"
              label={{ value: 'Velocity (km/s)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#F3F4F6' }}
              formatter={(value, name) => [
                name === 'x' ? `${value} km` : `${value} km/s`,
                name === 'x' ? 'Size' : 'Velocity'
              ]}
            />
            <Scatter data={scatterData} fill="#8884d8">
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.torino >= 5 ? '#ef4444' :
                  entry.torino >= 2 ? '#f59e0b' :
                  entry.torino >= 1 ? '#10b981' : '#9ca3af'
                } />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const TorinoScaleCard = () => {
    const scaleInfo = [
      { level: 0, color: '#9ca3af', label: 'No Hazard', description: 'Minimal threat' },
      { level: 1, color: '#10b981', label: 'Normal', description: 'Routine monitoring' },
      { level: 2, color: '#f59e0b', label: 'Attention', description: 'Merits attention' },
      { level: 3, color: '#f59e0b', label: 'Attention', description: 'Close monitoring' },
      { level: 4, color: '#f59e0b', label: 'Attention', description: 'Careful monitoring' },
      { level: 5, color: '#ef4444', label: 'Threatening', description: 'Threatening event' },
      { level: 6, color: '#ef4444', label: 'Threatening', description: 'Certain collision' },
      { level: 7, color: '#ef4444', label: 'Threatening', description: 'Very high impact' },
      { level: 8, color: '#991b1b', label: 'Certain', description: 'Certain collision' },
      { level: 9, color: '#991b1b', label: 'Certain', description: 'Regional devastation' },
      { level: 10, color: '#991b1b', label: 'Certain', description: 'Global catastrophe' }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Torino Impact Hazard Scale</h3>
        <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar">
          {scaleInfo.map((item) => (
            <div key={item.level} className="flex items-center gap-3 p-2 bg-gray-800/30 rounded-lg">
              <div className="flex items-center gap-2 min-w-[60px]">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-white font-medium text-sm">{item.level}</span>
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
            The Torino Scale rates impact hazard from 0 (no concern) to 10 (global catastrophe). 
            Values shown are calculated for educational purposes.
          </div>
        </div>
      </motion.div>
    );
  };

  const APIStatus = () => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
      >
        <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">Data & API Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-700/30">
            <div>
              <div className="text-green-300 font-medium">NASA API Status</div>
              <div className="text-green-200 text-sm">Live data • Updated every 15 minutes</div>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
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
              Torino Scale calculations are enhanced for educational purposes and may differ from official assessments.
            </div>
          </div>
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* ML Model Performance Section */}
      <MLModelStats />
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
        <TorinoScaleCard />
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
    </div>
  );
}