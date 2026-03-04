'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAsteroidStore } from '@/lib/store';
import { EnhancedSolarSystem } from '@/components/visualization/3d/EnhancedSolarSystem';
import { RiskDashboard } from '@/components/visualization/charts/RiskDashboard';
import { MobileControls } from '@/components/visualization/controls/MobileControls';
import { AsteroidAnalysisHub } from '@/components/visualization/analysis/AsteroidAnalysisHub';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { motion, AnimatePresence } from 'framer-motion';
import { useMLPredictions } from '@/hooks/useMLPredictions';
import { MLIndicator } from '@/components/visualization/MLIndicator';
import { Orbit, BarChart3, Shield } from 'lucide-react';

export default function Home() {
  const {
    asteroids,
    setAsteroids,
    timeRange,
    viewMode,
    setViewMode,
    getFilteredAsteroids
  } = useAsteroidStore();
  
  const [selectedAsteroid, setSelectedAsteroid] = useState<EnhancedAsteroid | null>(null);
  const [hoveredAsteroid, setHoveredAsteroid] = useState<number | null>(null);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['asteroids', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/asteroids?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch asteroids');
      return response.json();
    },
    refetchInterval: 900000, // Refresh every 15 minutes
    staleTime: 300000, // Consider data stale after 5 minutes
  });
  
  // Set asteroids immediately when data is loaded
  useEffect(() => {
    if (data?.asteroids && data.asteroids.length > 0) {
      setAsteroids(data.asteroids);
    }
  }, [data?.asteroids, setAsteroids]);
  
  // Use ML predictions to enhance asteroid data on client-side (non-blocking)
  const { asteroids: mlEnhancedAsteroids, isMLReady, mlStats } = useMLPredictions(data?.asteroids || []);
  
  // Update asteroids with ML predictions when ready (without blocking initial render)
  useEffect(() => {
    if (mlEnhancedAsteroids.length > 0 && isMLReady) {
      setAsteroids(mlEnhancedAsteroids);
    }
  }, [mlEnhancedAsteroids, isMLReady, setAsteroids]);

  const filteredAsteroids = getFilteredAsteroids();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-center"
        >
          <div className="animate-spin w-16 h-16 border-4 border-zinc-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading asteroid data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white text-center"
        >
          <p className="text-lg text-red-400">Error loading asteroid data</p>
          <p className="text-sm text-gray-400 mt-2">Please check your NASA API key</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-space-dark w-full overflow-x-hidden">
      {/* ML Indicator */}
      <MLIndicator isMLReady={isMLReady} mlStats={mlStats} />
      
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-gray-900/80 backdrop-blur-md border-b border-gray-800 pointer-events-auto">
        <div className="w-full px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight"
            >
              AstroWatch
            </motion.h1>
            <MobileControls />
          </div>
        </div>
      </header>
      
      {/* Main Content - pb-16 on mobile for bottom tab bar clearance */}
      <main className="pt-16 md:pt-20 pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          {viewMode === 'solar-system' && (
            <motion.div
              key="solar-system"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]"
            >
              <EnhancedSolarSystem
                asteroids={filteredAsteroids}
                selectedAsteroid={selectedAsteroid}
                onAsteroidSelect={setSelectedAsteroid}
                hoveredAsteroid={hoveredAsteroid}
                setHoveredAsteroid={setHoveredAsteroid}
              />
            </motion.div>
          )}

          {viewMode === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
              className="w-full px-4 py-4 md:py-8"
            >
              <RiskDashboard asteroids={filteredAsteroids} timeRange={timeRange} />
            </motion.div>
          )}

          {viewMode === 'impact-globe' && (
            <motion.div
              key="analysis-hub"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)]"
            >
              <AsteroidAnalysisHub asteroids={filteredAsteroids} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-gray-700">
        <div className="flex items-stretch">
          {[
            { value: 'solar-system' as const, label: '3D View', icon: Orbit },
            { value: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
            { value: 'impact-globe' as const, label: 'Analysis', icon: Shield },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                viewMode === value
                  ? 'text-blue-400 bg-white/5'
                  : 'text-gray-500 active:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Statistics Footer — hidden on mobile to free up screen space */}
      <footer className="hidden md:block fixed bottom-0 w-full bg-gray-900/80 backdrop-blur-md border-t border-gray-800">
        <div className="w-full px-4 py-1.5">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              Total Asteroids: {asteroids.length} |
              Filtered: {filteredAsteroids.length} |
              Rare: {asteroids.filter(a => a.rarity >= 4).length}
            </div>
            <div className="text-xs">
              Last Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}