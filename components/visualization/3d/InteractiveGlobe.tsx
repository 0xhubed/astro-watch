'use client';

import { useEffect, useRef } from 'react';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function InteractiveGlobe({ asteroids }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Dynamic import for client-side only
    import('react-globe.gl').then(({ default: Globe }) => {
      // Initialize globe with dynamic import
      const globe = Globe();
      
      const impactPoints = asteroids
        .filter(a => a.risk > 0.5)
        .map(asteroid => ({
          lat: (Math.random() - 0.5) * 180,
          lng: (Math.random() - 0.5) * 360,
          size: Math.log10(asteroid.size) * 2,
          color: asteroid.risk > 0.7 ? '#ff3b30' : '#ff9500',
          asteroid
        }));
      
      globe(mountRef.current!)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointsData(impactPoints)
        .pointAltitude(0.1)
        .pointRadius('size')
        .pointColor('color')
        .pointsMerge(true)
        .atmosphereColor('#3a228a')
        .atmosphereAltitude(0.25)
        .showGraticules(true)
        .onPointClick((point: any) => {
          console.log('Impact point clicked:', point);
        })
        .onPointHover((point: any) => {
          if (point) {
            console.log('Asteroid:', point.asteroid.name);
          }
        });
    });
  }, [asteroids]);
  
  return (
    <div ref={mountRef} className="w-full h-full" />
  );
}