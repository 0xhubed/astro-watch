'use client';

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { DEFAULT_MAP_STYLE, MAP_CONFIG } from '@/lib/mapbox/config';
import { useMapbox } from './MapboxProvider';

interface BaseMapProps {
  id?: string;
  style?: string;
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapError?: (error: Error) => void;
  children?: React.ReactNode;
}

export function BaseMap({
  id = 'map',
  style = DEFAULT_MAP_STYLE,
  center = [MAP_CONFIG.defaultCenter.lng, MAP_CONFIG.defaultCenter.lat],
  zoom = MAP_CONFIG.defaultZoom,
  minZoom = MAP_CONFIG.minZoom,
  maxZoom = MAP_CONFIG.maxZoom,
  className = '',
  onMapLoad,
  onMapError,
  children,
}: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { isLoaded, error: providerError } = useMapbox();

  useEffect(() => {
    if (!isLoaded || !mapContainer.current || map.current) return;

    try {
      console.log('Creating map with style:', style);
      console.log('Map center:', center, 'zoom:', zoom);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style,
        center,
        zoom,
        minZoom,
        maxZoom,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-left'
      );

      // Handle map load
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });
      
      // Add style.load event
      map.current.on('style.load', () => {
        console.log('Map style loaded');
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      if (onMapError) {
        onMapError(error as Error);
      }
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isLoaded, style, center, zoom, minZoom, maxZoom]);

  // Call onMapLoad when map is loaded
  useEffect(() => {
    if (mapLoaded && onMapLoad && map.current) {
      // Small delay to ensure map.loaded() returns true
      const timer = setTimeout(() => {
        if (map.current) {
          console.log('BaseMap: Calling onMapLoad with loaded map, status:', map.current.loaded());
          onMapLoad(map.current);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, onMapLoad]);

  // Handle provider errors
  if (providerError) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 text-white ${className}`}>
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">Failed to load map</p>
          <p className="text-sm text-gray-400">{providerError.message}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 text-white ${className}`}>
        <div className="text-center p-4">
          <p className="text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: '400px' }}>
      <div ref={mapContainer} id={id} className="w-full h-full" style={{ minHeight: '400px' }} />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <p className="text-white">Initializing map...</p>
        </div>
      )}
      {mapLoaded && children}
    </div>
  );
}