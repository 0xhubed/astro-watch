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
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      
      // Verify token is valid
      if (!mapboxgl.accessToken) {
        throw new Error('Mapbox access token is required');
      }

      // Check if WebGL is supported
      if (!mapboxgl.supported()) {
        throw new Error('WebGL is not supported by your browser');
      }

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