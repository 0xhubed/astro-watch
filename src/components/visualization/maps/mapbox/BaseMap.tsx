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
        setMapLoaded(true);
        if (onMapLoad && map.current) {
          onMapLoad(map.current);
        }
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        if (onMapError) {
          onMapError(new Error(e.error.message || 'Map error occurred'));
        }
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
  }, [isLoaded, style, center, zoom, minZoom, maxZoom, onMapLoad, onMapError]);

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

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} id={id} className="absolute inset-0" />
      {mapLoaded && children}
    </div>
  );
}