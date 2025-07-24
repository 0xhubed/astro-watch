'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/mapbox/config';

import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxContextValue {
  isLoaded: boolean;
  error: Error | null;
}

const MapboxContext = createContext<MapboxContextValue>({
  isLoaded: false,
  error: null,
});

export const useMapbox = () => useContext(MapboxContext);

interface MapboxProviderProps {
  children: React.ReactNode;
}

export function MapboxProvider({ children }: MapboxProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      console.log('Mapbox token:', MAPBOX_ACCESS_TOKEN ? 'Token exists' : 'No token');
      
      if (!MAPBOX_ACCESS_TOKEN) {
        throw new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not defined in environment variables');
      }
      
      // Set the access token
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      
      // RTL text plugin is optional and can cause issues when called multiple times
      // Skip it for now as it's not essential for our asteroid visualization
      
      // Verify token is valid
      if (!mapboxgl.accessToken) {
        throw new Error('Mapbox access token is required');
      }

      // Check if WebGL is supported
      if (!mapboxgl.supported()) {
        throw new Error('WebGL is not supported by your browser');
      }

      console.log('Mapbox initialized successfully');
      setIsLoaded(true);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to initialize Mapbox:', err);
    }
  }, []);

  return (
    <MapboxContext.Provider value={{ isLoaded, error }}>
      {children}
    </MapboxContext.Provider>
  );
}