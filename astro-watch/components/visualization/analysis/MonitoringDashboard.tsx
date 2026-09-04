'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { getRarityInfo } from '@/components/ui/RiskLegend';
import { formatMeters, formatNumber } from '@/lib/format';

interface Props {
  asteroids: EnhancedAsteroid[];
  /** Timestamp of the last successful feed fetch (from TanStack Query). */
  dataUpdatedAt?: number;
}

interface Alert {
  id: string;
  type: 'close-approach' | 'risk-update';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  asteroid?: EnhancedAsteroid;
}

export function MonitoringDashboard({ asteroids, dataUpdatedAt }: Props) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Derive alert-like highlights from the real feed data only.
  // No simulated observatory telemetry or fabricated discovery events.
  const monitoringData = useMemo(() => {
    const baseTime = new Date();

    const alerts: Alert[] = [];

    // Close approach alerts (within 7 days)
    asteroids.forEach((asteroid) => {
      const approachDate = new Date(asteroid.close_approach_data[0].close_approach_date);
      const daysUntil = Math.ceil((approachDate.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 7 && daysUntil >= 0) {
        alerts.push({
          id: `approach-${asteroid.id}`,
          type: 'close-approach',
          severity: asteroid.missDistance < 0.05 ? 'high' :
                   asteroid.missDistance < 0.1 ? 'medium' : 'low',
          message: `${asteroid.name} approaching within ${asteroid.missDistance.toFixed(3)} AU in ${daysUntil} days`,
          timestamp: approachDate,
          asteroid
        });
      }
    });

    // Notable rarity objects in the current feed
    asteroids
      .filter(a => a.rarity >= 3)
      .slice(0, 3)
      .forEach((asteroid) => {
        alerts.push({
          id: `risk-${asteroid.id}`,
          type: 'risk-update',
          severity: 'high',
          message: `Rarity R${asteroid.rarity} object ${asteroid.name} in the current feed`,
          timestamp: baseTime,
          asteroid
        });
      });

    // Sort alerts by approach date (soonest first)
    alerts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Current tracking statistics - derived from the feed
    const trackingStats = {
      totalTracked: asteroids.length,
      activelyMonitored: asteroids.filter(a => a.rarity > 0).length,
      closeApproaches: asteroids.filter(a => {
        const approachDate = new Date(a.close_approach_data[0].close_approach_date);
        const daysUntil = Math.ceil((approachDate.getTime() - baseTime.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil >= 0;
      }).length,
      highRiskObjects: asteroids.filter(a => a.rarity >= 3).length,
      averageSize: asteroids.reduce((sum, a) => sum + a.size, 0) / asteroids.length
    };

    return {
      alerts: alerts.slice(0, 10),
      trackingStats
    };
  }, [asteroids]);

  const AlertItem = ({ alert }: { alert: Alert }) => {
    const severityColors = {
      low: 'border-green-700/30 bg-green-900/20',
      medium: 'border-yellow-700/30 bg-yellow-900/20',
      high: 'border-red-700/30 bg-red-900/20'
    };

    const typeIcons = {
      'close-approach': '🛸',
      'risk-update': '⚠️'
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`p-4 rounded-lg border cursor-pointer hover:bg-opacity-80 transition-all ${severityColors[alert.severity]}`}
        onClick={() => setSelectedAlert(alert)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-lg">{typeIcons[alert.type]}</span>
            <div>
              <div className="text-white text-sm font-medium">{alert.message}</div>
              <div className="text-white/60 text-xs mt-1">
                {alert.type === 'close-approach'
                  ? `Approach date: ${alert.timestamp.toLocaleDateString()}`
                  : `Derived from today's feed`}
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            alert.severity === 'high' ? 'bg-red-500/20 text-red-300' :
            alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-green-500/20 text-green-300'
          }`}>
            {alert.severity.toUpperCase()}
          </div>
        </div>
      </motion.div>
    );
  };

  const TrackingStatus = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-1 text-white flex items-center">
        <span className="mr-2">📡</span>
        Tracking Status
      </h3>
      <p className="text-white/40 text-xs mb-4">Illustrative view — derived from today's feed, not live telemetry.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30">
          <div className="text-2xl font-bold text-blue-300">{formatNumber(monitoringData.trackingStats.totalTracked)}</div>
          <div className="text-sm text-blue-200">Objects in Feed</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/30">
          <div className="text-2xl font-bold text-green-300">{formatNumber(monitoringData.trackingStats.activelyMonitored)}</div>
          <div className="text-sm text-green-200">Rarity R1+</div>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-700/30">
          <div className="text-2xl font-bold text-yellow-300">{formatNumber(monitoringData.trackingStats.closeApproaches)}</div>
          <div className="text-sm text-yellow-200">Close Approaches (30d)</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/30">
          <div className="text-2xl font-bold text-red-300">{formatNumber(monitoringData.trackingStats.highRiskObjects)}</div>
          <div className="text-sm text-red-200">Notable (R≥3)</div>
        </div>
        <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-700/30">
          <div className="text-2xl font-bold text-indigo-300">{formatMeters(monitoringData.trackingStats.averageSize)}</div>
          <div className="text-sm text-indigo-200">Average Size</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="text-white/80 text-sm">
          <div className="mb-2">
            <strong>Feed freshness:</strong>
            {dataUpdatedAt ? (
              <span className="text-green-300 ml-2">
                Loaded {new Date(dataUpdatedAt).toLocaleTimeString()} · refreshes every 15 min
              </span>
            ) : (
              <span className="text-blue-300 ml-2">Refreshes every 15 minutes</span>
            )}
          </div>
          <div>
            <strong>Data source:</strong> <span className="text-blue-300">NASA NEO Web Service (today's feed)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const AlertsPanel = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
        <span className="mr-2">🚨</span>
        Alerts & Updates
      </h3>
      
      <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-3">
        {monitoringData.alerts.map((alert, index) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </motion.div>
  );

  const ExternalResources = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
    >
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center">
        <span className="mr-2">🔗</span>
        External Resources & Databases
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a 
          href="https://cneos.jpl.nasa.gov/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg hover:bg-blue-800/30 transition-colors"
        >
          <div className="text-blue-300 font-medium mb-1">NASA CNEOS</div>
          <div className="text-blue-200 text-xs">Center for Near Earth Object Studies</div>
          <div className="text-blue-100/70 text-xs mt-1">Official NASA NEO tracking center</div>
        </a>

        <a 
          href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-green-900/20 border border-green-700/30 rounded-lg hover:bg-green-800/30 transition-colors"
        >
          <div className="text-green-300 font-medium mb-1">JPL Small-Body Database</div>
          <div className="text-green-200 text-xs">Detailed asteroid orbital data</div>
          <div className="text-green-100/70 text-xs mt-1">Comprehensive asteroid database</div>
        </a>

        <a 
          href="https://www.esa.int/Safety_Security/Space_Situational_Awareness/ESA_s_Space_Situational_Awareness_programme" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg hover:bg-purple-800/30 transition-colors"
        >
          <div className="text-purple-300 font-medium mb-1">ESA SSA</div>
          <div className="text-purple-200 text-xs">European Space Situational Awareness</div>
          <div className="text-purple-100/70 text-xs mt-1">European NEO monitoring program</div>
        </a>

        <a 
          href="https://minorplanetcenter.net/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg hover:bg-yellow-800/30 transition-colors"
        >
          <div className="text-yellow-300 font-medium mb-1">Minor Planet Center</div>
          <div className="text-yellow-200 text-xs">IAU clearinghouse for asteroid observations</div>
          <div className="text-yellow-100/70 text-xs mt-1">Global asteroid observation coordination</div>
        </a>

        <a 
          href="https://neo.ssa.esa.int/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-red-900/20 border border-red-700/30 rounded-lg hover:bg-red-800/30 transition-colors"
        >
          <div className="text-red-300 font-medium mb-1">ESA NEO Coordination Centre</div>
          <div className="text-red-200 text-xs">European NEO risk assessment</div>
          <div className="text-red-100/70 text-xs mt-1">Risk analysis and impact modeling</div>
        </a>

        <a 
          href="https://neowise.ipac.caltech.edu/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block p-4 bg-indigo-900/20 border border-indigo-700/30 rounded-lg hover:bg-indigo-800/30 transition-colors"
        >
          <div className="text-indigo-300 font-medium mb-1">NEOWISE Mission</div>
          <div className="text-indigo-200 text-xs">Space-based asteroid discovery</div>
          <div className="text-indigo-100/70 text-xs mt-1">Infrared space telescope data</div>
        </a>
      </div>

      <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
        <div className="text-white/80 text-sm mb-2">
          <strong>Additional Resources:</strong>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-white/60">🔬 Research Papers:</div>
            <a href="https://iopscience.iop.org/journal/1538-3881" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
              Astronomical Journal NEO Studies
            </a>
          </div>
          <div>
            <div className="text-white/60">📊 Live Sky Surveys:</div>
            <a href="https://catalina.lpl.arizona.edu/" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
              Catalina Sky Survey
            </a>
          </div>
          <div>
            <div className="text-white/60">🎯 Impact Risk:</div>
            <a href="https://neo.ssa.esa.int/risk-list" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
              ESA Risk List
            </a>
          </div>
          <div>
            <div className="text-white/60">📡 Ground Telescopes:</div>
            <a href="https://spacewatch.lpl.arizona.edu/" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
              Spacewatch Program
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 px-4 pb-8">
      <TrackingStatus />

      <AlertsPanel />

      {/* External Resources */}
      <ExternalResources />

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 border border-gray-700 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Alert Details</h3>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="text-white/60 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-white">
                <div>
                  <div className="text-sm text-gray-400">Message</div>
                  <div className="text-white">{selectedAlert.message}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">{selectedAlert.type === 'close-approach' ? 'Approach Date' : 'Added'}</div>
                  <div className="text-white">{selectedAlert.timestamp.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Type</div>
                  <div className="text-white capitalize">{selectedAlert.type.replace('-', ' ')}</div>
                </div>
                
                {selectedAlert.asteroid && (
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">Asteroid Details</div>
                    <div className="space-y-1 text-sm">
                      <div>Size: {selectedAlert.asteroid.size.toFixed(1)} m</div>
                      <div>Velocity: {selectedAlert.asteroid.velocity.toFixed(1)} km/s</div>
                      <div>Miss Distance: {selectedAlert.asteroid.missDistance.toFixed(3)} AU</div>
                      <div>Rarity: R{selectedAlert.asteroid.rarity}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}