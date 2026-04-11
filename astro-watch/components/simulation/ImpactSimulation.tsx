'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { X, MapPin, Zap, Circle, Radio } from 'lucide-react';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { computeImpact, formatEnergy, formatDistance, ImpactResult } from '@/lib/impact-physics';

// Dynamic import to prevent SSR issues with WebGL
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Toggle body class to hide R3F Html labels while this modal is open
function useBodyModalClass() {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => { document.body.classList.remove('modal-open'); };
  }, []);
}

interface Props {
  asteroid: EnhancedAsteroid;
  onClose: () => void;
}

// Land-weighted locations for default impact sites
const IMPACT_LOCATIONS = [
  { lat: 51.5, lng: -0.1, name: 'London, UK' },
  { lat: 40.7, lng: -74.0, name: 'New York, USA' },
  { lat: 35.7, lng: 139.7, name: 'Tokyo, Japan' },
  { lat: 48.9, lng: 2.3, name: 'Paris, France' },
  { lat: -23.5, lng: -46.6, name: 'São Paulo, Brazil' },
  { lat: 28.6, lng: 77.2, name: 'New Delhi, India' },
  { lat: -33.9, lng: 18.4, name: 'Cape Town, South Africa' },
  { lat: 39.9, lng: 116.4, name: 'Beijing, China' },
];

interface RingDatum {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatSection({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <span className="text-white/50">{icon}</span>
      <span className="text-white/60 text-xs uppercase tracking-widest font-semibold">{title}</span>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5">
      <span className="text-white/60 text-sm">{label}</span>
      <span className={`font-mono text-sm font-medium ${highlight ? 'text-orange-300' : 'text-white/90'}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ImpactSimulation({ asteroid, onClose }: Props) {
  useBodyModalClass();
  // Pick a random default location
  const [impactLocation, setImpactLocation] = useState(() => {
    const idx = Math.floor(Math.random() * IMPACT_LOCATIONS.length);
    return IMPACT_LOCATIONS[idx];
  });

  const [narrative, setNarrative] = useState('');
  const [narrativeLoading, setNarrativeLoading] = useState(true);
  const globeRef = useRef<any>(null);

  // Compute impact physics
  const impact: ImpactResult = computeImpact(
    asteroid.name,
    asteroid.size,
    asteroid.velocity,
    asteroid.is_potentially_hazardous_asteroid,
  );

  // Build globe rings for crater, fireball, blast radius
  const ringsData: RingDatum[] = [
    {
      lat: impactLocation.lat,
      lng: impactLocation.lng,
      maxR: Math.max(0.3, impact.craterDiameterM / 2 / 111000),   // degrees (~111km/deg)
      propagationSpeed: 0.4,
      repeatPeriod: 1200,
      color: 'rgba(220, 38, 38, 0.9)',    // red — crater
    },
    {
      lat: impactLocation.lat,
      lng: impactLocation.lng,
      maxR: Math.max(0.6, impact.fireballRadiusM / 111000),
      propagationSpeed: 0.6,
      repeatPeriod: 1500,
      color: 'rgba(234, 88, 12, 0.75)',   // orange — fireball
    },
    {
      lat: impactLocation.lat,
      lng: impactLocation.lng,
      maxR: Math.max(1.2, impact.overpressure1psiM / 111000),
      propagationSpeed: 0.8,
      repeatPeriod: 2000,
      color: 'rgba(59, 130, 246, 0.6)',   // blue — blast radius
    },
  ];

  // Point globe camera to impact location once globe is ready (initial mount)
  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView(
        { lat: impactLocation.lat, lng: impactLocation.lng, altitude: 1.5 },
        0, // immediate — no animation on initial load
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: captures initial impactLocation via ref timing

  // Re-point globe camera when impact location changes after initial mount
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return; // skip first render — handled by onGlobeReady
    }
    if (globeRef.current) {
      globeRef.current.pointOfView(
        { lat: impactLocation.lat, lng: impactLocation.lng, altitude: 1.5 },
        800,
      );
    }
  }, [impactLocation]);

  // Handle user clicking the globe to relocate impact
  const handleGlobeClick = useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    setImpactLocation({ lat, lng, name: `${lat.toFixed(1)}°, ${lng.toFixed(1)}°` });
  }, []);

  // Fetch AI narrative from /api/chat (SSE stream)
  useEffect(() => {
    let cancelled = false;
    setNarrative('');
    setNarrativeLoading(true);

    const fetchNarrative = async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `Describe what would happen if asteroid ${asteroid.name} (${asteroid.size.toFixed(0)}m diameter, ${asteroid.velocity.toFixed(1)} km/s) hit Earth near ${impactLocation.name}. Energy: ${formatEnergy(impact.kineticEnergyJ)}. Crater diameter: ${formatDistance(impact.craterDiameterM)}. Be vivid but scientific. 3-4 sentences. Do NOT use any tools.`,
              },
            ],
          }),
        });

        if (!res.ok || !res.body) {
          setNarrative('Unable to generate impact narrative.');
          setNarrativeLoading(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const parsed = JSON.parse(raw);
              // Handle OpenAI-style streaming delta
              const delta =
                parsed?.choices?.[0]?.delta?.content ??
                parsed?.delta?.text ??
                parsed?.content ??
                '';
              if (delta && !cancelled) {
                setNarrative(prev => prev + delta);
              }
            } catch {
              // Non-JSON lines (e.g. plain text chunks) — append directly
              if (raw && raw !== '[DONE]' && !cancelled) {
                setNarrative(prev => prev + raw);
              }
            }
          }
        }
      } catch {
        if (!cancelled) setNarrative('Unable to generate impact narrative at this time.');
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    };

    fetchNarrative();
    return () => { cancelled = true; };
    // Only refetch when the impact location changes (not every re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactLocation.name]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col md:flex-row overflow-hidden"
      >
        {/* ── Globe (left 60%) ───────────────────────────────────────────── */}
        <div className="relative w-full md:w-[60%] h-[45vh] md:h-full bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 border border-white/20 hover:border-white/40 text-white/70 hover:text-white rounded-full p-2 transition-all duration-200"
            aria-label="Close simulation"
          >
            <X size={18} />
          </button>

          {/* Title overlay */}
          <div className="absolute top-4 left-4 z-30 bg-black/70 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="text-white/90 text-sm font-bold">Impact Simulation</div>
            <div className="text-white/50 text-xs mt-0.5 flex items-center gap-1">
              <MapPin size={11} />
              <span>{impactLocation.name}</span>
            </div>
            <div className="text-white/40 text-xs mt-1">Click globe to relocate</div>
          </div>

          {/* Ring legend */}
          <div className="absolute bottom-4 left-4 z-10 space-y-1">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-3 h-1 bg-red-500 rounded-full inline-block" />
              Crater
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-3 h-1 bg-orange-500 rounded-full inline-block" />
              Fireball
            </div>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-3 h-1 bg-blue-400 rounded-full inline-block" />
              Blast radius
            </div>
          </div>

          <Globe
            ref={globeRef}
            width={undefined}
            height={undefined}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="rgba(100,150,255,0.4)"
            atmosphereAltitude={0.15}
            ringsData={ringsData}
            ringColor={(d: object) => (d as RingDatum).color}
            ringMaxRadius={(d: object) => (d as RingDatum).maxR}
            ringPropagationSpeed={(d: object) => (d as RingDatum).propagationSpeed}
            ringRepeatPeriod={(d: object) => (d as RingDatum).repeatPeriod}
            onGlobeReady={handleGlobeReady}
            onGlobeClick={handleGlobeClick}
            enablePointerInteraction
          />
        </div>

        {/* ── Stats panel (right 40%) ────────────────────────────────────── */}
        <div className="w-full md:w-[40%] h-[55vh] md:h-full bg-gray-950/95 border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-white text-lg font-bold">{asteroid.name}</h2>
            <p className="text-white/50 text-xs mt-0.5">Impact physics analysis</p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5 custom-scrollbar">

            {/* Comparison badge */}
            <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="text-orange-300 text-xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                <Zap size={11} />
                Equivalent to
              </div>
              <div className="text-orange-200 text-sm">{impact.comparison}</div>
            </div>

            {/* Energy */}
            <StatSection title="Energy" icon={<Zap size={13} />} />
            <StatRow label="Kinetic energy" value={formatEnergy(impact.kineticEnergyJ)} highlight />
            <StatRow label="Megatons TNT" value={`${impact.kineticEnergyMt.toFixed(impact.kineticEnergyMt < 0.01 ? 4 : impact.kineticEnergyMt < 1 ? 3 : 2)} Mt`} />
            <StatRow label="Hiroshima multiples" value={impact.hiroshimaMultiple >= 1 ? `×${impact.hiroshimaMultiple.toFixed(1)}` : `×${impact.hiroshimaMultiple.toFixed(3)}`} />

            {/* Crater */}
            <StatSection title="Crater" icon={<Circle size={13} />} />
            <StatRow label="Diameter" value={formatDistance(impact.craterDiameterM)} />
            <StatRow label="Depth" value={formatDistance(impact.craterDepthM)} />

            {/* Blast radii */}
            <StatSection title="Blast Radii" icon={<Radio size={13} />} />
            <StatRow label="Fireball radius" value={formatDistance(impact.fireballRadiusM)} />
            <StatRow label="Thermal radius" value={formatDistance(impact.thermalRadiusM)} />
            <StatRow label="Severe damage (10 psi)" value={formatDistance(impact.overpressure10psiM)} />
            <StatRow label="Moderate damage (5 psi)" value={formatDistance(impact.overpressure5psiM)} />
            <StatRow label="Window breakage (1 psi)" value={formatDistance(impact.overpressure1psiM)} />
            <StatRow
              label="Affected area"
              value={`${impact.affectedAreaKm2 >= 1000 ? (impact.affectedAreaKm2 / 1000).toFixed(1) + 'k' : impact.affectedAreaKm2.toFixed(0)} km²`}
            />

            {/* Asteroid properties */}
            <StatSection title="Asteroid Properties" icon={<MapPin size={13} />} />
            <StatRow label="Diameter" value={`${asteroid.size.toFixed(1)} m`} />
            <StatRow label="Velocity" value={`${asteroid.velocity.toFixed(1)} km/s`} />
            <StatRow label="Type" value={impact.asteroidType + '-type'} />
            <StatRow label="Density" value={`${impact.densityKgM3.toLocaleString()} kg/m³`} />
            <StatRow label="Mass" value={`${impact.massKg.toExponential(2)} kg`} />
            <StatRow label="PHA" value={asteroid.is_potentially_hazardous_asteroid ? 'Yes' : 'No'} />

            {/* AI narrative */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">
                Impact Scenario
              </div>
              <div className="text-white/80 text-sm leading-relaxed min-h-[4rem]">
                {narrativeLoading && !narrative && (
                  <span className="text-white/40 italic animate-pulse">Generating scenario...</span>
                )}
                {narrative}
                {narrativeLoading && narrative && (
                  <span className="inline-block w-1 h-4 bg-white/60 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
