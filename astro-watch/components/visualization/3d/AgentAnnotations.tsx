'use client';

import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useAsteroidStore } from '@/lib/store';
import { EnhancedAsteroid } from '@/lib/nasa-api';

/** Schema persisted by the monitoring agent (lib/agent/memory.ts). */
interface SceneAnnotation {
  asteroidId: string;
  label: string;
  color?: string;
  notes?: string;
  createdAt: string;
}

const FALLBACK_COLOR = '#f59e0b';

/**
 * Renders the agent's scene annotations as labels pinned to the annotated
 * asteroids. Must be mounted inside the same Earth-offset group as
 * AsteroidField — placement below reuses AsteroidField's exact math so the
 * label tracks the rock (review #1: schema mismatch, #2: coordinate space).
 */
export function AgentAnnotations({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  const [annotations, setAnnotations] = useState<SceneAnnotation[]>([]);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const res = await fetch('/api/agent-data');
        if (res.ok) {
          const data = await res.json();
          setAnnotations(Array.isArray(data.annotations) ? data.annotations : []);
        }
      } catch { /* silent fail */ }
    };

    fetchAnnotations();
    const interval = setInterval(fetchAnnotations, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  if (annotations.length === 0 || asteroids.length === 0) return null;

  return (
    <>
      {annotations.map(ann => {
        const asteroid = asteroids.find(a => a.id === ann.asteroidId);
        if (!asteroid) return null; // annotated object left the 7-day feed

        // Exact same placement math as AsteroidField (EnhancedSolarSystem).
        const orbit = asteroid.orbit;
        const angle = orbit.phase;
        const actualRadius = Math.max(5.0, orbit.radius);
        const x = Math.cos(angle) * actualRadius;
        const z = Math.sin(angle) * actualRadius;
        const y = Math.sin(angle * 0.2) * (orbit.inclination * 180 / Math.PI) * 0.15;

        const color = ann.color || FALLBACK_COLOR;

        return (
          <group key={`${ann.asteroidId}-${ann.createdAt}`} position={[x, y + 3, z]}>
            <Html center style={{ pointerEvents: 'none', zIndex: 1 }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  border: `1px solid ${color}80`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  maxWidth: 200,
                  fontSize: 12,
                  lineHeight: 1.35,
                  whiteSpace: 'normal',
                }}
              >
                <div style={{ color, fontWeight: 600 }}>{ann.label}</div>
                {ann.notes && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
                    {ann.notes}
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
