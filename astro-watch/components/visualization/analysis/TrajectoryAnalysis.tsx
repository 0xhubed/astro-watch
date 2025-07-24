'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { getTorinoInfo } from '@/components/ui/RiskLegend';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, Cell
} from 'recharts';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function TrajectoryAnalysis({ asteroids }: Props) {
  const [selectedAsteroid, setSelectedAsteroid] = useState<EnhancedAsteroid | null>(null);

  // Analyze orbital characteristics
  const orbitalAnalysis = useMemo(() => {
    const apolloType = asteroids.filter(a => a.orbit.radius > 64); // Beyond Earth's orbit
    const atenType = asteroids.filter(a => a.orbit.radius < 64);   // Inside Earth's orbit
    const amorType = asteroids.filter(a => Math.abs(a.orbit.radius - 64) < 10); // Near Earth's orbit

    const distanceVsVelocity = asteroids.map(asteroid => ({
      distance: asteroid.missDistance,
      velocity: asteroid.velocity,
      size: asteroid.size,
      name: asteroid.name,
      torino: asteroid.torinoScale,
      energy: asteroid.impactEnergy / 1e12, // Convert to terajoules
      type: asteroid.orbit.radius > 64 ? 'Apollo' : 
            asteroid.orbit.radius < 64 ? 'Aten' : 'Amor'
    }));

    const approachTimeline = asteroids
      .map(asteroid => ({
        date: new Date(asteroid.close_approach_data[0].close_approach_date),
        distance: asteroid.missDistance,
        name: asteroid.name,
        velocity: asteroid.velocity,
        torino: asteroid.torinoScale
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 20); // Show next 20 approaches

    return {
      apolloType,
      atenType,
      amorType,
      distanceVsVelocity,
      approachTimeline,
      totalEnergy: asteroids.reduce((sum, a) => sum + a.impactEnergy, 0) / 1e15, // Petajoules
      averageDistance: asteroids.reduce((sum, a) => sum + a.missDistance, 0) / asteroids.length
    };
  }, [asteroids]);

  const OrbitTypeDistribution = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white">Orbital Classification</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-red-900/20 rounded-lg border border-red-700/30">
          <div className="text-2xl font-bold text-red-300">{orbitalAnalysis.apolloType.length}</div>
          <div className="text-sm text-red-200">Apollo Type</div>
          <div className="text-xs text-red-100/70 mt-1">Cross Earth's orbit from outside</div>
        </div>
        <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
          <div className="text-2xl font-bold text-yellow-300">{orbitalAnalysis.atenType.length}</div>
          <div className="text-sm text-yellow-200">Aten Type</div>
          <div className="text-xs text-yellow-100/70 mt-1">Orbit mostly inside Earth's</div>
        </div>
        <div className="text-center p-4 bg-green-900/20 rounded-lg border border-green-700/30">
          <div className="text-2xl font-bold text-green-300">{orbitalAnalysis.amorType.length}</div>
          <div className="text-sm text-green-200">Amor Type</div>
          <div className="text-xs text-green-100/70 mt-1">Approach but don't cross</div>
        </div>
      </div>
      
      <div className="text-white/60 text-sm">
        <p className="mb-2">
          <strong>Apollo asteroids</strong> have orbits larger than Earth's and cross our orbit from the outside.
          <strong> Aten asteroids</strong> have orbits smaller than Earth's but can still cross our path.
          <strong> Amor asteroids</strong> approach Earth but don't cross our orbital path.
        </p>
        <p className="text-blue-300">
          Average miss distance: <strong>{orbitalAnalysis.averageDistance.toFixed(3)} AU</strong> 
          ({(orbitalAnalysis.averageDistance * 149.6).toFixed(1)} million km)
        </p>
      </div>
    </motion.div>
  );

  const VelocityDistanceAnalysis = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white">Velocity vs Distance Analysis</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="distance" 
            stroke="#9CA3AF"
            label={{ value: 'Miss Distance (AU)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            dataKey="velocity" 
            stroke="#9CA3AF"
            label={{ value: 'Velocity (km/s)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value, name, props) => [
              name === 'distance' ? `${value} AU` : 
              name === 'velocity' ? `${value} km/s` : value,
              props.payload.name
            ]}
          />
          <ReferenceLine x={0.05} stroke="#ef4444" strokeDasharray="2 2" label="Danger Zone" />
          <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="2 2" label="High Velocity" />
          <Scatter data={orbitalAnalysis.distanceVsVelocity} fill="#8884d8">
            {orbitalAnalysis.distanceVsVelocity.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={
                  entry.torino >= 5 ? '#ef4444' :
                  entry.torino >= 2 ? '#f59e0b' :
                  entry.torino >= 1 ? '#10b981' : '#6b7280'
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-4 text-white/60 text-sm">
        <p>Each point represents an asteroid. Color indicates Torino Scale risk level.</p>
        <p className="text-yellow-300 mt-1">
          Objects closer than 0.05 AU and faster than 30 km/s pose the highest concern.
        </p>
      </div>
    </motion.div>
  );

  const CloseApproachTimeline = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white">Upcoming Close Approaches</h3>
      <div className="max-h-80 overflow-y-auto custom-scrollbar">
        {orbitalAnalysis.approachTimeline.map((approach, index) => {
          const torinoInfo = getTorinoInfo(approach.torino);
          return (
            <motion.div
              key={approach.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 mb-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => setSelectedAsteroid(asteroids.find(a => a.name === approach.name) || null)}
            >
              <div className="flex-1">
                <div className="text-white font-medium">{approach.name}</div>
                <div className="text-gray-400 text-sm">
                  {approach.date.toLocaleDateString()} • {approach.distance.toFixed(3)} AU • {approach.velocity.toFixed(1)} km/s
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full ${torinoInfo.bgColor}`}>
                <span className={`text-xs font-medium ${torinoInfo.color}`}>
                  T{approach.torino}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const EnergyAnalysis = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white">Impact Energy Analysis</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-300">
            {orbitalAnalysis.totalEnergy.toFixed(1)} PJ
          </div>
          <div className="text-sm text-blue-200">Total Combined Energy</div>
          <div className="text-xs text-blue-100/70 mt-1">
            Equivalent to {(orbitalAnalysis.totalEnergy * 0.239).toFixed(1)} megatons TNT
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-300">
            {asteroids.filter(a => a.impactEnergy > 1e15).length}
          </div>
          <div className="text-sm text-purple-200">High Energy Objects</div>
          <div className="text-xs text-purple-100/70 mt-1">
            &gt; 1 petajoule potential energy
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/30">
        <div className="text-yellow-300 text-sm font-medium mb-2">Reference Comparisons</div>
        <div className="text-yellow-200 text-xs space-y-1">
          <div>• Tunguska Event (1908): ~15 megatons</div>
          <div>• Chelyabinsk meteor (2013): ~0.5 megatons</div>
          <div>• Chicxulub impact: ~100 million megatons</div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 px-4 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrbitTypeDistribution />
        <VelocityDistanceAnalysis />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CloseApproachTimeline />
        <EnergyAnalysis />
      </div>

      {selectedAsteroid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedAsteroid(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-gray-900/95 backdrop-blur-md rounded-xl p-6 border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedAsteroid.name}</h3>
                <div className="text-sm text-gray-400 mt-1">
                  {selectedAsteroid.is_potentially_hazardous_asteroid ? 'Potentially Hazardous Asteroid' : 'Near-Earth Object'}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedAsteroid(null)}
                className="text-white/60 hover:text-white text-2xl hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
              <div>
                <h4 className="text-lg font-semibold mb-3 text-blue-300">Physical Properties</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Size</div>
                    <div className="text-white font-mono">
                      {selectedAsteroid.size >= 1000 
                        ? `${(selectedAsteroid.size / 1000).toFixed(2)} km`
                        : `${selectedAsteroid.size.toFixed(1)} m`
                      } diameter
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Velocity</div>
                    <div className="text-white font-mono">{selectedAsteroid.velocity.toFixed(1)} km/s</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Miss Distance</div>
                    <div className="text-white font-mono">{selectedAsteroid.missDistance.toFixed(3)} AU</div>
                    <div className="text-white/40 text-xs mt-1">
                      ({(selectedAsteroid.missDistance * 149.6).toFixed(1)} million km)
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Impact Energy</div>
                    <div className="text-white font-mono">{(selectedAsteroid.impactEnergy / 1e12).toFixed(1)} TJ</div>
                    <div className="text-white/40 text-xs mt-1">
                      (≈ {(selectedAsteroid.impactEnergy / 4.184e15).toFixed(2)} megatons TNT)
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-3 text-green-300">Orbital Data</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Torino Scale</div>
                    <div className="text-white font-mono text-lg">{selectedAsteroid.torinoScale}</div>
                    <div className="text-white/40 text-xs mt-1">
                      {selectedAsteroid.torinoScale === 0 ? 'No hazard' : 
                       selectedAsteroid.torinoScale <= 3 ? 'Normal monitoring' : 
                       selectedAsteroid.torinoScale <= 7 ? 'Threatening' : 'Certain collision'}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Inclination</div>
                    <div className="text-white font-mono">{(selectedAsteroid.orbit.inclination * 180 / Math.PI).toFixed(2)}°</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Eccentricity</div>
                    <div className="text-white font-mono">{selectedAsteroid.orbit.eccentricity.toFixed(3)}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-xs mb-1">Close Approach</div>
                    <div className="text-white font-mono">{selectedAsteroid.close_approach_data[0].close_approach_date}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Moon Collision Risk */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-lg font-semibold mb-3 text-purple-300">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Moon Collision Risk</div>
                  <div className="text-white font-mono">{(selectedAsteroid.moonCollisionData.probability * 100).toFixed(4)}%</div>
                  <div className="text-white/40 text-xs mt-1">{selectedAsteroid.moonCollisionData.comparisonToEarth.interpretation}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Confidence Level</div>
                  <div className="text-white font-mono">{(selectedAsteroid.confidence * 100).toFixed(1)}%</div>
                  <div className="text-white/40 text-xs mt-1">Risk assessment confidence</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}