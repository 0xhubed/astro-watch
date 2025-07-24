'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { X, ExternalLink, AlertTriangle, Info, Orbit, Calendar, Gauge, HelpCircle } from 'lucide-react';

interface DetailedAsteroidViewProps {
  asteroid: EnhancedAsteroid;
  isOpen: boolean;
  onClose: () => void;
}

function getTorinoInfo(scale: number) {
  if (scale === 0) return { level: 'No Hazard', color: 'text-green-400', bgColor: 'bg-green-500/20' };
  if (scale <= 3) return { level: 'Normal', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
  if (scale <= 7) return { level: 'Threatening', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
  return { level: 'Certain Collision', color: 'text-red-400', bgColor: 'bg-red-500/20' };
}

function InfoTooltip({ text, children, position = "auto" }: { text: string; children: React.ReactNode; position?: "left" | "right" | "auto" }) {
  const tooltipClasses = position === "right" 
    ? "absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800/95 text-white text-xs rounded-lg shadow-lg border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs whitespace-normal"
    : "absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800/95 text-white text-xs rounded-lg shadow-lg border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-xs whitespace-normal";
    
  const arrowClasses = position === "right"
    ? "absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800/95"
    : "absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800/95";

  return (
    <div className="group relative inline-flex items-center gap-1">
      {children}
      <HelpCircle className="w-3 h-3 text-white/40 group-hover:text-white/70 transition-colors cursor-help" />
      <div className={tooltipClasses}>
        {text}
        <div className={arrowClasses}></div>
      </div>
    </div>
  );
}

export function DetailedAsteroidView({ asteroid, isOpen, onClose }: DetailedAsteroidViewProps) {
  if (!isOpen) return null;

  const torinoInfo = getTorinoInfo(asteroid.torinoScale);
  const closeApproach = asteroid.close_approach_data[0];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-white/10 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{asteroid.name}</h1>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${torinoInfo.bgColor}`}>
                    <div className={`w-2 h-2 rounded-full bg-current animate-pulse ${torinoInfo.color}`}></div>
                    <span className={torinoInfo.color}>
                      Torino Scale {asteroid.torinoScale} - {torinoInfo.level}
                    </span>
                  </div>
                  {asteroid.is_potentially_hazardous_asteroid && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      Potentially Hazardous
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Physical Properties */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Physical Properties
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="The estimated size range of the asteroid based on its brightness and distance">
                    <div className="text-white/60 text-sm mb-1">Estimated Diameter</div>
                  </InfoTooltip>
                  <div className="text-white font-mono">
                    {asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(1)} - {asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(1)} meters
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Size (Max)</div>
                  <div className="text-white font-mono text-lg">
                    {asteroid.size >= 1000 
                      ? `${(asteroid.size / 1000).toFixed(2)} km`
                      : `${asteroid.size.toFixed(1)} m`
                    }
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="The theoretical energy that would be released if this asteroid impacted Earth, measured in Joules">
                    <div className="text-white/60 text-sm mb-1">Impact Energy</div>
                  </InfoTooltip>
                  <div className="text-white font-mono">{asteroid.impactEnergy.toExponential(2)} Joules</div>
                  <div className="text-white/60 text-xs mt-1">
                    (≈ {(asteroid.impactEnergy / 4.184e15).toFixed(1)} megatons TNT)
                  </div>
                </div>
              </div>
            </section>

            {/* Orbital Data */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Orbit className="w-5 h-5 text-purple-400" />
                Orbital Characteristics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Velocity</div>
                    <div className="text-white font-mono text-lg">{asteroid.velocity.toFixed(2)} km/s</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <InfoTooltip text="AU = Astronomical Unit (distance from Earth to Sun ≈ 150 million km). This shows how close the asteroid comes to Earth">
                      <div className="text-white/60 text-sm mb-1">Miss Distance</div>
                    </InfoTooltip>
                    <div className="text-white font-mono text-lg">{asteroid.missDistance.toFixed(4)} AU</div>
                    <div className="text-white/60 text-xs mt-1">
                      ({(asteroid.missDistance * 149597870.7).toFixed(0)} km)
                    </div>
                  </div>
                </div>
                {asteroid.orbital_data && (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <InfoTooltip text="How elliptical the orbit is. 0 = perfect circle, closer to 1 = more stretched oval" position="right">
                        <div className="text-white/60 text-sm mb-1">Eccentricity</div>
                      </InfoTooltip>
                      <div className="text-white font-mono">{parseFloat(asteroid.orbital_data.eccentricity).toFixed(4)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <InfoTooltip text="How tilted the asteroid's orbit is compared to Earth's orbit around the Sun (in degrees)" position="right">
                        <div className="text-white/60 text-sm mb-1">Inclination</div>
                      </InfoTooltip>
                      <div className="text-white font-mono">{parseFloat(asteroid.orbital_data.inclination).toFixed(2)}°</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Approach Data */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-400" />
                Close Approach Information
              </h2>
              <div className="bg-white/5 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <InfoTooltip text="The next time this asteroid will pass closest to Earth in its orbit">
                      <div className="text-white/60 text-sm mb-2">Next Approach Date</div>
                    </InfoTooltip>
                    <div className="text-white font-mono text-lg">
                      {new Date(closeApproach.close_approach_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <InfoTooltip text="How fast the asteroid is moving relative to Earth during its closest approach">
                      <div className="text-white/60 text-sm mb-2">Approach Velocity</div>
                    </InfoTooltip>
                    <div className="text-white font-mono text-lg">
                      {parseFloat(closeApproach.relative_velocity.kilometers_per_second).toFixed(2)} km/s
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      ({(parseFloat(closeApproach.relative_velocity.kilometers_per_second) * 3600).toFixed(0)} km/h)
                    </div>
                  </div>
                  <div>
                    <InfoTooltip text="The closest distance the asteroid will pass to Earth (in Astronomical Units - 1 AU ≈ 150 million km)" position="right">
                      <div className="text-white/60 text-sm mb-2">Miss Distance</div>
                    </InfoTooltip>
                    <div className="text-white font-mono text-lg">
                      {parseFloat(closeApproach.miss_distance.astronomical).toFixed(4)} AU
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      ({(parseFloat(closeApproach.miss_distance.astronomical) * 149597870.7).toFixed(0)} km)
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Risk Assessment */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-red-400" />
                Risk Assessment
              </h2>
              <div className="bg-white/5 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <InfoTooltip text="AI-calculated probability of this asteroid posing a threat to Earth based on size, speed, and trajectory">
                      <div className="text-white/60 text-sm mb-2">Risk Level</div>
                    </InfoTooltip>
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${asteroid.risk * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-mono text-sm">
                        {(asteroid.risk * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <InfoTooltip text="How confident our AI model is in the risk assessment based on data quality and orbital precision" position="right">
                      <div className="text-white/60 text-sm mb-2">Confidence Level</div>
                    </InfoTooltip>
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${asteroid.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-mono text-sm">
                        {(asteroid.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Lunar Collision Assessment */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🌙</span>
                Lunar Collision Assessment
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Moon Collision Probability */}
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="Probability this asteroid will collide with the Moon instead of or in addition to Earth-Moon system encounters">
                    <div className="text-white/60 text-sm mb-1">Moon Collision Risk</div>
                  </InfoTooltip>
                  <div className="text-white font-mono text-lg">
                    {(asteroid.moonCollisionData.probability * 100).toFixed(4)}%
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    Confidence: {(asteroid.moonCollisionData.confidence * 100).toFixed(0)}%
                  </div>
                </div>
                
                {/* Impact Characteristics */}
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="Expected crater size if Moon collision occurs" position="right">
                    <div className="text-white/60 text-sm mb-1">Expected Crater</div>
                  </InfoTooltip>
                  <div className="text-white font-mono text-lg">
                    {asteroid.moonCollisionData.craterDiameter.toFixed(1)} m
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {asteroid.moonCollisionData.observableFromEarth ? "🔭 Visible from Earth" : "Too small to observe"}
                  </div>
                </div>
                
                {/* Comparison to Earth */}
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="How Moon collision probability compares to Earth collision risk">
                    <div className="text-white/60 text-sm mb-1">Moon vs Earth Risk</div>
                  </InfoTooltip>
                  <div className="text-white font-mono text-lg">
                    {asteroid.moonCollisionData.comparisonToEarth.moonToEarthRatio.toFixed(2)}×
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {asteroid.moonCollisionData.comparisonToEarth.interpretation}
                  </div>
                </div>
                
                {/* Impact Energy */}
                <div className="bg-white/5 rounded-lg p-4">
                  <InfoTooltip text="Kinetic energy released in Moon collision scenario" position="right">
                    <div className="text-white/60 text-sm mb-1">Impact Energy</div>
                  </InfoTooltip>
                  <div className="text-white font-mono text-lg">
                    {(asteroid.moonCollisionData.impactEnergy / 1e12).toFixed(1)} TJ
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {(asteroid.moonCollisionData.impactEnergy / 4.184e12).toFixed(1)} tons TNT equivalent
                  </div>
                </div>
              </div>
              
              {/* Educational Context */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 mt-6">
                <h4 className="text-blue-300 font-medium mb-2">Lunar Impact Context</h4>
                <div className="space-y-2 text-blue-200 text-sm">
                  <p><strong>Moon as Shield:</strong> The Moon intercepts approximately 1 asteroid per year that might otherwise approach Earth.</p>
                  <p><strong>Observable Impacts:</strong> Lunar impacts larger than 1 meter create flashes visible from Earth with telescopes.</p>
                  <p><strong>Crater Formation:</strong> Unlike Earth, the Moon has no atmosphere to burn up small objects - even tiny impacts create permanent craters.</p>
                </div>
              </div>
            </section>

            {/* Additional Information */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-indigo-400" />
                Additional Information
              </h2>
              <div className="bg-white/5 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">NASA JPL ID:</span>
                    <span className="text-white font-mono ml-2">{asteroid.id}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Hazard Classification:</span>
                    <span className="text-white ml-2 capitalize">{asteroid.hazardLevel}</span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-300 font-medium mb-2">Understanding the Data</h4>
                  <div className="space-y-2 text-blue-200 text-sm">
                    <p><strong>Torino Scale:</strong> A 0-10 scale that combines impact probability and kinetic energy to assess asteroid threat level. Most asteroids are level 0 (no hazard).</p>
                    <p><strong>Potentially Hazardous:</strong> Asteroids larger than 140 meters that come within 0.05 AU (7.5 million km) of Earth's orbit.</p>
                    <p><strong>Data Source:</strong> NASA's Near Earth Object Web Service (NeoWs) with machine learning risk assessment enhancement.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}