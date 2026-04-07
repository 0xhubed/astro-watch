'use client';

import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useAsteroidStore } from '@/lib/store';

interface Annotation {
  objectId: string;
  label: string;
  severity: string;
  explanation: string;
  priority: number;
  updatedAt: string;
}

export function AgentAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const asteroids = useAsteroidStore(s => s.asteroids);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const res = await fetch('/api/agent-data');
        if (res.ok) {
          const data = await res.json();
          setAnnotations(data.annotations || []);
        }
      } catch { /* silent fail */ }
    };

    fetchAnnotations();
    const interval = setInterval(fetchAnnotations, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(interval);
  }, []);

  if (annotations.length === 0) return null;

  return (
    <>
      {annotations.map(ann => {
        const asteroid = asteroids.find(a => a.id === ann.objectId || a.name.includes(ann.objectId));
        if (!asteroid) return null;

        const severityColors: Record<string, string> = {
          critical: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        };
        const color = severityColors[ann.severity] || severityColors.info;

        return (
          <group key={ann.objectId} position={[asteroid.position.x, asteroid.position.y + 3, asteroid.position.z]}>
            <Html center style={{ pointerEvents: 'auto', zIndex: 1 }}>
              <div
                style={{
                  background: `${color}12`,
                  border: `1px solid ${color}60`,
                  borderRadius: 6,
                  padding: '4px 8px',
                  maxWidth: 180,
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                }}
                title={ann.explanation}
              >
                <div style={{ color, fontWeight: 600, fontSize: 10 }}>{ann.label}</div>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
