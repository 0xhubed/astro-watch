'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { MapboxProvider } from './MapboxProvider';
import { BaseMap } from './BaseMap';
import { MAPBOX_STYLES } from '@/lib/mapbox/config';

interface Props {
  asteroids: EnhancedAsteroid[];
}

interface RegionData {
  name: string;
  center: [number, number];
  risk: number;
  asteroidCount: number;
  population: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

// Sample major regions/cities for demonstration
const MAJOR_REGIONS: RegionData[] = [
  { name: 'North America', center: [-100, 45], risk: 0, asteroidCount: 0, population: 579000000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
  { name: 'Europe', center: [10, 50], risk: 0, asteroidCount: 0, population: 746000000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
  { name: 'Asia', center: [100, 30], risk: 0, asteroidCount: 0, population: 4641000000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
  { name: 'South America', center: [-60, -15], risk: 0, asteroidCount: 0, population: 430000000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
  { name: 'Africa', center: [20, 0], risk: 0, asteroidCount: 0, population: 1340000000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
  { name: 'Australia', center: [135, -25], risk: 0, asteroidCount: 0, population: 25700000, highRisk: 0, mediumRisk: 0, lowRisk: 0 },
];

export function RegionalRiskMap({ asteroids }: Props) {
  const [mapStyle, setMapStyle] = useState<string>(MAPBOX_STYLES.dark);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  const [regionData, setRegionData] = useState<RegionData[]>(MAJOR_REGIONS);

  // Calculate regional risks based on asteroid data
  useEffect(() => {
    const updatedRegions = MAJOR_REGIONS.map(region => {
      // Calculate which asteroids might affect this region
      const regionAsteroids = asteroids.filter(asteroid => {
        if (asteroid.risk <= 0.3) return false;
        
        // Simple distance calculation (in real implementation, would use actual trajectory data)
        const hash = asteroid.id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        const impactLng = ((Math.abs(hash) % 360) - 180);
        const impactLat = ((Math.abs(hash * 7) % 180) - 90);
        
        const distance = Math.sqrt(
          Math.pow(impactLng - region.center[0], 2) + 
          Math.pow(impactLat - region.center[1], 2)
        );
        
        return distance < 30; // Within 30 degrees
      });
      
      const highRisk = regionAsteroids.filter(a => a.risk > 0.7).length;
      const mediumRisk = regionAsteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7).length;
      const lowRisk = regionAsteroids.filter(a => a.risk > 0.3 && a.risk <= 0.4).length;
      
      const avgRisk = regionAsteroids.length > 0
        ? regionAsteroids.reduce((sum, a) => sum + a.risk, 0) / regionAsteroids.length
        : 0;
      
      return {
        ...region,
        asteroidCount: regionAsteroids.length,
        risk: avgRisk,
        highRisk,
        mediumRisk,
        lowRisk,
      };
    });
    
    setRegionData(updatedRegions);
  }, [asteroids]);

  // Add choropleth layer and markers when map loads
  useEffect(() => {
    if (!mapInstance) return;

    const setupLayers = () => {
      try {
        // Create GeoJSON for regions
        const regionsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: regionData.map(region => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: region.center
        },
        properties: {
          ...region
        }
      }))
    };

    // Add source
    if (!mapInstance.getSource('regions')) {
      mapInstance.addSource('regions', {
        type: 'geojson',
        data: regionsGeoJSON
      });
    } else {
      (mapInstance.getSource('regions') as mapboxgl.GeoJSONSource).setData(regionsGeoJSON);
    }

    // Add region markers
    if (!mapInstance.getLayer('region-markers')) {
      mapInstance.addLayer({
        id: 'region-markers',
        type: 'circle',
        source: 'regions',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'asteroidCount'],
            0, 20,
            10, 40,
            50, 60
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk'],
            0, '#1f2937',
            0.3, '#34c759',
            0.5, '#ff9500',
            0.7, '#ff3b30'
          ],
          'circle-opacity': 0.6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });

      // Add region labels
      mapInstance.addLayer({
        id: 'region-labels',
        type: 'symbol',
        source: 'regions',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-offset': [0, -3]
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      });

      // Add click handler
      mapInstance.on('click', 'region-markers', (e) => {
        if (!e.features || e.features.length === 0) return;
        const properties = e.features[0].properties;
        setSelectedRegion(properties as RegionData);
      });

      // Change cursor on hover
      mapInstance.on('mouseenter', 'region-markers', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'region-markers', () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }
      } catch (error) {
        console.error('Failed to setup regional risk layers:', error);
      }
    };

    // Check if map is loaded
    if (mapInstance.loaded()) {
      setupLayers();
    } else {
      mapInstance.once('load', setupLayers);
    }

    // Handle style changes
    const handleStyleData = () => {
      setupLayers();
    };
    mapInstance.on('styledata', handleStyleData);

    return () => {
      mapInstance.off('styledata', handleStyleData);
      try {
        if (mapInstance.getLayer('region-markers')) mapInstance.removeLayer('region-markers');
        if (mapInstance.getLayer('region-labels')) mapInstance.removeLayer('region-labels');
        if (mapInstance.getSource('regions')) mapInstance.removeSource('regions');
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [mapInstance, regionData]);

  const totalPopulationAtRisk = regionData
    .filter(r => r.risk > 0.3)
    .reduce((sum, r) => sum + r.population, 0);

  return (
    <MapboxProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full flex flex-col"
      >
        <div className="hidden">
          <div>
            <h2 className="text-2xl font-bold text-white">Regional Risk Analysis</h2>
            <p className="text-gray-400 mt-1">
              Risk assessment by geographic region and population exposure
            </p>
          </div>
          
          {/* Map Style Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.dark)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.dark
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.satellite)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.satellite
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>
        
        <div className="relative w-full h-full bg-space-dark overflow-hidden">
          <BaseMap
            style={mapStyle}
            onMapLoad={setMapInstance}
            className="absolute inset-0"
            zoom={1.5}
          />
          
          {/* Map Style Selector */}
          <div className="absolute top-4 left-4 flex gap-2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1 z-10">
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.dark)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.dark
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle(MAPBOX_STYLES.satellite)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                mapStyle === MAPBOX_STYLES.satellite
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Satellite
            </button>
          </div>
          
          {/* Selected Region Details */}
          {selectedRegion && (
            <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-xs">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-white">{selectedRegion.name}</h3>
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Population:</span>
                  <span className="text-white font-mono">
                    {(selectedRegion.population / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Level:</span>
                  <span className={`font-mono ${
                    selectedRegion.risk > 0.7 ? 'text-red-500' :
                    selectedRegion.risk > 0.4 ? 'text-orange-500' :
                    selectedRegion.risk > 0 ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {(selectedRegion.risk * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tracked Asteroids:</span>
                  <span className="text-white font-mono">{selectedRegion.asteroidCount}</span>
                </div>
                
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">High Risk:</span>
                    <span className="text-white">{selectedRegion.highRisk}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-400">Medium Risk:</span>
                    <span className="text-white">{selectedRegion.mediumRisk}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Low Risk:</span>
                    <span className="text-white">{selectedRegion.lowRisk}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Global Stats */}
          <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Global Statistics</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex justify-between gap-4">
                <span>Regions at Risk:</span>
                <span className="font-mono text-white">
                  {regionData.filter(r => r.risk > 0.3).length} / {regionData.length}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Population Exposed:</span>
                <span className="font-mono text-white">
                  {(totalPopulationAtRisk / 1000000000).toFixed(2)}B
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Highest Risk:</span>
                <span className="font-mono text-white">
                  {regionData.reduce((max, r) => r.risk > max.risk ? r : max).name}
                </span>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-400">
              <div>• Click regions for details</div>
              <div>• Circle size = asteroid count</div>
              <div>• Color intensity = risk level</div>
            </div>
          </div>
        </div>
        
      </motion.div>
    </MapboxProvider>
  );
}