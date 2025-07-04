'use client';

import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface Props {
  asteroids: EnhancedAsteroid[];
  timeRange: 'day' | 'week' | 'month';
}

export function RiskDashboard({ asteroids, timeRange }: Props) {
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
      maxRisk: Math.max(...asteroids.map(a => a.risk)),
      avgRisk: asteroids.reduce((sum, a) => sum + a.risk, 0) / asteroids.length,
      count: asteroids.length
    }));
  };

  const TimeSeriesRisk = () => {
    const data = processTimeSeriesData(asteroids, timeRange);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
      >
        <h3 className="text-xl font-semibold mb-4 text-white">Risk Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
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
              dataKey="maxRisk" 
              stroke="#ff3b30" 
              fillOpacity={1} 
              fill="url(#riskGradient)"
            />
            <Area 
              type="monotone" 
              dataKey="avgRisk" 
              stroke="#ff9500" 
              fillOpacity={0.3} 
              fill="#ff9500"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const RiskDistribution = () => {
    const riskData = [
      { name: 'High Risk', value: asteroids.filter(a => a.risk > 0.7).length, color: '#ff3b30' },
      { name: 'Medium Risk', value: asteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7).length, color: '#ff9500' },
      { name: 'Low Risk', value: asteroids.filter(a => a.risk <= 0.4).length, color: '#34c759' }
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
      >
        <h3 className="text-xl font-semibold mb-4 text-white">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={riskData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {riskData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TimeSeriesRisk />
      <RiskDistribution />
    </div>
  );
}