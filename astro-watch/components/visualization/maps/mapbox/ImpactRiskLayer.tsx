'use client';

import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface ImpactRiskLayerProps {
  map: mapboxgl.Map;
  asteroids: EnhancedAsteroid[];
}

export function ImpactRiskLayer({ map, asteroids }: ImpactRiskLayerProps) {
  const [isLayerAdded, setIsLayerAdded] = useState(false);
  
  console.log('ImpactRiskLayer: Component rendered with', asteroids.length, 'asteroids');

  useEffect(() => {
    if (!map) {
      console.log('ImpactRiskLayer: No map provided');
      return;
    }

    console.log('ImpactRiskLayer: useEffect triggered, map loaded:', map.loaded());

    // Wait for map to be fully loaded
    const setupLayers = () => {
      try {
        console.log('ImpactRiskLayer: setupLayers called');
        // Check if source or layers already exist
        if (map.getSource('asteroid-impacts')) {
          console.log('ImpactRiskLayer: Source already exists, skipping setup');
          return;
        }

        console.log('ImpactRiskLayer: Setting up layers with', asteroids.length, 'asteroids');
        
        // Convert asteroids to GeoJSON format
        const filteredAsteroids = asteroids.filter(asteroid => asteroid.risk > 0.3);
        console.log('ImpactRiskLayer: Filtered to', filteredAsteroids.length, 'high-risk asteroids');
        
        // If no filtered asteroids, create some test data to ensure map displays
        const testFeatures = filteredAsteroids.length === 0 ? [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [0, 0]
            },
            properties: {
              id: 'test-1',
              name: 'Test Impact Zone',
              risk: 0.5,
              size: 100,
              velocity: 15,
              distance: 0.1,
              magnitude: 8,
            }
          },
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [-100, 40]
            },
            properties: {
              id: 'test-2',
              name: 'Test Impact Zone 2',
              risk: 0.7,
              size: 200,
              velocity: 20,
              distance: 0.05,
              magnitude: 10,
            }
          }
        ] : [];

        const geojsonData: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            ...filteredAsteroids.map(asteroid => {
              // Generate pseudo-random coordinates based on asteroid ID
              const hash = asteroid.id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              
              const lng = ((Math.abs(hash) % 360) - 180);
              const lat = ((Math.abs(hash * 7) % 180) - 90);
              
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                },
                properties: {
                  id: asteroid.id,
                  name: asteroid.name,
                  risk: asteroid.risk,
                  size: asteroid.size,
                  velocity: asteroid.velocity,
                  distance: asteroid.missDistance,
                  magnitude: Math.log10(asteroid.size) * 3 + 5,
                }
              } as GeoJSON.Feature;
            }),
            ...testFeatures
          ]
        };

        // Add source
        map.addSource('asteroid-impacts', {
          type: 'geojson',
          data: geojsonData,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Add heatmap layer
        map.addLayer({
          id: 'asteroid-heatmap',
          type: 'heatmap',
          source: 'asteroid-impacts',
          maxzoom: 9,
          paint: {
            // Increase the heatmap weight based on risk
            'heatmap-weight': [
              'interpolate',
              ['linear'],
              ['get', 'risk'],
              0, 0,
              0.3, 0.5,
              0.7, 1
            ],
            // Increase the heatmap color weight by zoom level
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 1,
              9, 3
            ],
            // Color ramp for heatmap
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            // Adjust the heatmap radius by zoom level
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              9, 20
            ],
            // Transition from heatmap to circle layer by zoom level
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 1,
              9, 0
            ],
          }
        });

        // Add circle layer for individual points
        map.addLayer({
          id: 'asteroid-points',
          type: 'circle',
          source: 'asteroid-impacts',
          minzoom: 7,
          paint: {
            // Size based on asteroid size
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'magnitude'],
              5, 5,
              20, 20
            ],
            // Color based on risk level
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'risk'],
              0.3, '#34c759',
              0.5, '#ff9500',
              0.7, '#ff3b30'
            ],
            'circle-stroke-color': 'white',
            'circle-stroke-width': 1,
            // Transition from heatmap to circle layer by zoom level
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              7, 0,
              8, 1
            ]
          }
        });

        // Add cluster count layer
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'asteroid-impacts',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add popup on click
        map.on('click', 'asteroid-points', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
          const properties = feature.properties;
          
          if (!properties) return;

          // Ensure that if the map is zoomed out such that multiple
          // copies of the feature are visible, the popup appears
          // over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates as [number, number])
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold text-sm mb-1">${properties.name}</h3>
                <p class="text-xs">Risk: ${(properties.risk * 100).toFixed(1)}%</p>
                <p class="text-xs">Size: ${properties.size.toFixed(0)}m</p>
                <p class="text-xs">Velocity: ${properties.velocity.toFixed(1)} km/s</p>
                <p class="text-xs">Distance: ${(properties.distance / 1000000).toFixed(2)}M km</p>
              </div>
            `)
            .addTo(map);
        });

        // Change cursor on hover
        map.on('mouseenter', 'asteroid-points', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'asteroid-points', () => {
          map.getCanvas().style.cursor = '';
        });

        setIsLayerAdded(true);
        console.log('ImpactRiskLayer: Layers setup completed successfully');
      } catch (error) {
        console.error('Failed to setup impact risk layers:', error);
      }
    };

    // Handle style changes
    const handleStyleData = () => {
      setIsLayerAdded(false);
      setupLayers();
    };

    // Check if map is loaded
    if (map.loaded()) {
      console.log('ImpactRiskLayer: Map already loaded, calling setupLayers immediately');
      setupLayers();
    } else {
      console.log('ImpactRiskLayer: Map not loaded, waiting for load event');
      map.once('load', () => {
        console.log('ImpactRiskLayer: Load event fired, calling setupLayers');
        setupLayers();
      });
    }

    // Listen for style changes
    map.on('styledata', handleStyleData);

    // Cleanup
    return () => {
      map.off('styledata', handleStyleData);
      try {
        if (map.getLayer('asteroid-heatmap')) map.removeLayer('asteroid-heatmap');
        if (map.getLayer('asteroid-points')) map.removeLayer('asteroid-points');
        if (map.getLayer('cluster-count')) map.removeLayer('cluster-count');
        if (map.getSource('asteroid-impacts')) map.removeSource('asteroid-impacts');
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [map, asteroids]);

  return null;
}