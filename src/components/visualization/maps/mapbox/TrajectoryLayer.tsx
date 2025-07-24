'use client';

import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface TrajectoryLayerProps {
  map: mapboxgl.Map;
  asteroids: EnhancedAsteroid[];
  currentTime: number; // 0 to 1 representing animation progress
}

export function TrajectoryLayer({ map, asteroids, currentTime }: TrajectoryLayerProps) {
  const [isLayerAdded, setIsLayerAdded] = useState(false);

  useEffect(() => {
    if (!map || isLayerAdded) return;

    // Generate trajectory paths for asteroids
    const trajectoryData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: asteroids
        .filter(asteroid => asteroid.risk > 0.3)
        .map(asteroid => {
          // Generate approach path based on asteroid properties
          const approachAngle = (parseInt(asteroid.id, 36) % 360) * Math.PI / 180;
          const startDistance = 50; // Start 50 degrees away
          const endDistance = 5; // End 5 degrees from impact point
          
          // Calculate impact point
          const hash = asteroid.id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const impactLng = ((Math.abs(hash) % 360) - 180);
          const impactLat = ((Math.abs(hash * 7) % 180) - 90);
          
          // Generate path coordinates
          const pathCoordinates: [number, number][] = [];
          const steps = 50;
          
          for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const distance = startDistance - (startDistance - endDistance) * progress;
            
            const lng = impactLng + Math.cos(approachAngle) * distance;
            const lat = impactLat + Math.sin(approachAngle) * distance * 0.7; // Flatten for realistic trajectory
            
            pathCoordinates.push([lng, lat]);
          }
          
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: pathCoordinates
            },
            properties: {
              id: asteroid.id,
              name: asteroid.name,
              risk: asteroid.risk,
              velocity: asteroid.velocity,
              size: asteroid.size,
            }
          };
        })
    };

    // Add source
    map.addSource('asteroid-trajectories', {
      type: 'geojson',
      data: trajectoryData,
    });

    // Add trajectory lines
    map.addLayer({
      id: 'trajectory-lines',
      type: 'line',
      source: 'asteroid-trajectories',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'risk'],
          0.3, '#34c759',
          0.5, '#ff9500',
          0.7, '#ff3b30'
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'risk'],
          0.3, 1,
          0.7, 3
        ],
        'line-opacity': 0.6,
        'line-dasharray': [2, 1]
      }
    });

    // Add current position markers
    const currentPositions: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: asteroids
        .filter(asteroid => asteroid.risk > 0.3)
        .map(asteroid => {
          const hash = asteroid.id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const impactLng = ((Math.abs(hash) % 360) - 180);
          const impactLat = ((Math.abs(hash * 7) % 180) - 90);
          
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [impactLng, impactLat] // Will be updated with animation
            },
            properties: {
              id: asteroid.id,
              name: asteroid.name,
              risk: asteroid.risk,
              size: asteroid.size,
            }
          };
        })
    };

    map.addSource('asteroid-positions', {
      type: 'geojson',
      data: currentPositions,
    });

    // Add position markers
    map.addLayer({
      id: 'asteroid-markers',
      type: 'circle',
      source: 'asteroid-positions',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'size'],
          10, 3,
          1000, 10
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'risk'],
          0.3, '#34c759',
          0.5, '#ff9500',
          0.7, '#ff3b30'
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-blur': 0.2
      }
    });

    setIsLayerAdded(true);

    // Cleanup
    return () => {
      if (map.getLayer('trajectory-lines')) map.removeLayer('trajectory-lines');
      if (map.getLayer('asteroid-markers')) map.removeLayer('asteroid-markers');
      if (map.getSource('asteroid-trajectories')) map.removeSource('asteroid-trajectories');
      if (map.getSource('asteroid-positions')) map.removeSource('asteroid-positions');
    };
  }, [map, asteroids, isLayerAdded]);

  // Update positions based on animation time
  useEffect(() => {
    if (!map || !isLayerAdded) return;

    const source = map.getSource('asteroid-positions') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Update asteroid positions based on currentTime
    const updatedPositions: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: asteroids
        .filter(asteroid => asteroid.risk > 0.3)
        .map(asteroid => {
          const approachAngle = (parseInt(asteroid.id, 36) % 360) * Math.PI / 180;
          const startDistance = 50;
          const endDistance = 5;
          
          const hash = asteroid.id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const impactLng = ((Math.abs(hash) % 360) - 180);
          const impactLat = ((Math.abs(hash * 7) % 180) - 90);
          
          // Calculate current position based on time
          const distance = startDistance - (startDistance - endDistance) * currentTime;
          const lng = impactLng + Math.cos(approachAngle) * distance;
          const lat = impactLat + Math.sin(approachAngle) * distance * 0.7;
          
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
            }
          };
        })
    };

    source.setData(updatedPositions);
  }, [currentTime, asteroids, map, isLayerAdded]);

  return null;
}