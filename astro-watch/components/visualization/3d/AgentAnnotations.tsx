'use client';

import { useState, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAsteroidStore } from '@/lib/store';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { asteroidScenePosition } from '@/lib/orbit-mechanics';

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

        const color = ann.color || FALLBACK_COLOR;

        return (
          <AnnotationMarker
            key={`${ann.asteroidId}-${ann.createdAt}`}
            orbit={asteroid.orbit}
            label={ann.label}
            notes={ann.notes}
            color={color}
          />
        );
      })}
    </>
  );
}

/**
 * One annotation label, tracking its asteroid along the same Keplerian
 * orbit the mesh rides (shared placement from lib/orbit-mechanics).
 */
function AnnotationMarker({ orbit, label, notes, color }: {
  orbit: EnhancedAsteroid['orbit'];
  label: string;
  notes?: string;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const [x, y, z] = asteroidScenePosition(orbit, state.clock.elapsedTime);
      groupRef.current.position.set(x, y + 3, z);
    }
  });

  return (
    <group ref={groupRef}>
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
          <div style={{ color, fontWeight: 600 }}>{label}</div>
          {notes && (
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
              {notes}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
