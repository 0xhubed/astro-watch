'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { RiskLegend, getRarityInfo, getRarityColor } from '@/components/ui/RiskLegend';
import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface Props {
  asteroids: EnhancedAsteroid[];
}

interface ImpactPoint {
  lat: number;
  lng: number;
  risk: number;
  asteroid: EnhancedAsteroid;
  size: number;
  color: string;
}

export function ImpactRiskMap({ asteroids }: Props) {
  const globeRef = useRef<any>(null);
  const [globeReady, setGlobeReady] = useState(false);

  // Calculate impact points from asteroid data
  const impactPoints = useMemo(() => {
    // Ensure asteroids is a valid array
    if (!Array.isArray(asteroids) || asteroids.length === 0) {
      return [];
    }
    
    return asteroids.map((asteroid, index) => {
      // Generate consistent impact coordinates based on asteroid properties
      const hash = asteroid.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const lat = ((hash * 123 + index * 456) % 180) - 90; // -90 to 90
      const lng = ((hash * 789 + index * 321) % 360) - 180; // -180 to 180
      
      // Size based on actual asteroid size and rarity
      const size = Math.max(0.5, Math.min(3, asteroid.size / 200 + asteroid.rarity * 0.3));

      // Color based on rarity
      const color = getRarityColor(asteroid.rarity);
      
      return {
        lat,
        lng,
        risk: asteroid.risk,
        asteroid,
        size,
        color
      };
    });
  }, [asteroids]);

  // Risk heatmap data
  const heatmapData = useMemo(() => {
    const gridSize = 10; // degrees
    const heatMap = new Map<string, { lat: number; lng: number; weight: number; count: number }>();
    
    // Aggregate risk by grid cells
    impactPoints.forEach(point => {
      const gridLat = Math.floor(point.lat / gridSize) * gridSize;
      const gridLng = Math.floor(point.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;
      
      if (heatMap.has(key)) {
        const existing = heatMap.get(key)!;
        existing.weight += point.asteroid.rarity;
        existing.count += 1;
      } else {
        heatMap.set(key, {
          lat: gridLat + gridSize / 2,
          lng: gridLng + gridSize / 2,
          weight: point.asteroid.rarity,
          count: 1
        });
      }
    });
    
    // Convert to array with normalized weights
    return Array.from(heatMap.values()).map(cell => ({
      lat: cell.lat,
      lng: cell.lng,
      weight: cell.weight / cell.count, // Average risk in this cell
      count: cell.count
    }));
  }, [impactPoints]);

  useEffect(() => {
    if (globeRef.current && globeReady) {
      // Auto-rotate
      try {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.5;
        }
      } catch (e) {
        console.log('Globe controls not available yet');
      }
    }
  }, [globeReady]);

  // Show loading state if no asteroids data
  if (!asteroids || asteroids.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-space-dark to-blue-900/20 relative flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-pulse text-lg mb-2">No asteroid data available</div>
          <div className="text-sm text-gray-400">Waiting for asteroid data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark to-blue-900/20 relative">
      {/* Globe Container */}
      <div className="w-full h-full">
        <Globe
          ref={globeRef}
          onGlobeReady={() => setGlobeReady(true)}
          
          // Impact points
          pointsData={impactPoints || []}
          pointLat={(d: any) => d.lat}
          pointLng={(d: any) => d.lng}
          pointColor={(d: any) => d.color}
          pointRadius={(d: any) => d.size}
          pointAltitude={0.01}
          pointResolution={12}
          pointLabel={(point: any) => `
            <div class="bg-black/90 text-white px-3 py-2 rounded-lg text-sm border border-white/20">
              <div class="font-bold text-yellow-300">${point.asteroid.name}</div>
              <div class="text-gray-300 mt-1">
                <div>Rarity: R${point.asteroid.rarity}</div>
                <div>Level: ${getRarityInfo(point.asteroid.rarity).level}</div>
                <div>Size: ${point.asteroid.size.toFixed(1)} m</div>
                <div>Speed: ${point.asteroid.velocity.toFixed(1)} km/s</div>
                <div>Distance: ${point.asteroid.missDistance.toFixed(3)} AU</div>
              </div>
            </div>
          `}
          
          // Heatmap (commented out for now to isolate the issue)
          // heatmapsData={[heatmapData]}
          // heatmapPointLat={d => d.lat}
          // heatmapPointLng={d => d.lng}
          // heatmapPointWeight={d => d.weight}
          // heatmapBandwidth={15}
          // heatmapColorFn={(t: number) => {
          //   // t is normalized between 0 and 1
          //   if (t > 0.7) return `rgba(255, 0, 0, ${t * 0.8})`;
          //   if (t > 0.4) return `rgba(255, 136, 0, ${t * 0.6})`;
          //   return `rgba(0, 255, 0, ${t * 0.4})`;
          // }}
          // heatmapColorSaturation={1.0}
          
          // Arcs showing asteroid trajectories
          arcsData={impactPoints.slice(0, 20) || []} // Limit to 20 for performance
          arcStartLat={() => Math.random() * 180 - 90}
          arcStartLng={() => Math.random() * 360 - 180}
          arcEndLat={(d: any) => d.lat}
          arcEndLng={(d: any) => d.lng}
          arcColor={(d: any) => d.color || '#00ff00'}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcStroke={0.8}
          arcAltitude={0.3}
          
          // Globe configuration
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={true}
          atmosphereColor="#4a90e2"
          atmosphereAltitude={0.25}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          enablePointerInteraction={true}
          
          width={typeof window !== 'undefined' ? window.innerWidth : 800}
          height={typeof window !== 'undefined' ? window.innerHeight - 160 : 600}
        />
      </div>
      
      {/* Map Controls & Info */}
      <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20 max-w-sm">
        <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
          <span className="text-red-400">🌍</span>
          Impact Risk Map
        </h3>
        
        <div className="space-y-3 text-sm text-white/90">
          {/* Rarity Distribution */}
          <div>
            <div className="text-white/70 font-semibold mb-2">Rarity Distribution</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-red-400 text-lg font-bold">
                  {asteroids.filter(a => a.rarity >= 4).length}
                </div>
                <div className="text-xs text-white/60">Rare</div>
                <div className="text-xs text-white/40">(R4+)</div>
              </div>
              <div className="border-x border-white/20">
                <div className="text-yellow-400 text-lg font-bold">
                  {asteroids.filter(a => a.rarity >= 2 && a.rarity < 4).length}
                </div>
                <div className="text-xs text-white/60">Noteworthy</div>
                <div className="text-xs text-white/40">(R2-3)</div>
              </div>
              <div>
                <div className="text-blue-400 text-lg font-bold">
                  {asteroids.filter(a => a.rarity < 2).length}
                </div>
                <div className="text-xs text-white/60">Routine</div>
                <div className="text-xs text-white/40">(R0-1)</div>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="border-t border-white/20 pt-3">
            <div className="text-white/70 font-semibold mb-2">Map Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Rare (R4+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Noteworthy (R2-3)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span>Routine (R0-1)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-gradient-to-r from-blue-500 to-transparent"></div>
                <span>Trajectory paths</span>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="border-t border-white/20 pt-3">
            <div className="text-xs text-white/60">
              🖱️ Click & drag to rotate • Scroll to zoom • Hover points for details
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistics Panel */}
      <div className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/20">
        <h4 className="text-white text-sm font-bold mb-2">Global Impact Statistics</h4>
        <div className="space-y-2 text-xs text-white/80">
          <div className="flex justify-between">
            <span>Total Asteroids:</span>
            <span className="font-mono">{asteroids.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Rare Objects (R4+):</span>
            <span className="font-mono text-red-400">{asteroids.filter(a => a.rarity >= 4).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Average Rarity:</span>
            <span className="font-mono">
              {asteroids.length > 0 ? (asteroids.reduce((sum, a) => sum + a.rarity, 0) / asteroids.length).toFixed(1) : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Max Size:</span>
            <span className="font-mono">
              {asteroids.length > 0 ? Math.max(...asteroids.map(a => a.size)).toFixed(0) : 0}m
            </span>
          </div>
        </div>
      </div>
      
      {/* Risk Legend */}
      <RiskLegend position="left" />
    </div>
  );
}