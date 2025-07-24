'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAsteroidStore } from '@/lib/store';
import { EnhancedSolarSystem } from '@/components/visualization/3d/EnhancedSolarSystem';
import { RiskDashboard } from '@/components/visualization/charts/RiskDashboard';
import { MobileControls } from '@/components/visualization/controls/MobileControls';
import { AsteroidAnalysisHub } from '@/components/visualization/analysis/AsteroidAnalysisHub';
import { InteractiveMapsView } from '@/components/visualization/InteractiveMapsView';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { motion, AnimatePresence } from 'framer-motion';
import { useMLPredictions } from '@/hooks/useMLPredictions';
import { MLIndicator } from '@/components/visualization/MLIndicator';

export default function Home() {
  const { 
    asteroids, 
    setAsteroids, 
    timeRange, 
    viewMode, 
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
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
      <header className="fixed top-0 z-50 w-full bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="w-full px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
            >
              AstroWatch
            </motion.h1>
            <MobileControls />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16 md:pt-20">
        <AnimatePresence mode="wait">
          {viewMode === 'solar-system' && (
            <motion.div
              key="solar-system"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="h-[calc(100vh-5rem)]"
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
              className="h-[calc(100vh-5rem)]"
            >
              <AsteroidAnalysisHub asteroids={filteredAsteroids} />
            </motion.div>
          )}
          
          {viewMode === 'interactive-maps' && (
            <motion.div
              key="interactive-maps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-[calc(100vh-5rem)] w-full"
            >
              <InteractiveMapsView asteroids={filteredAsteroids} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Statistics Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-900/80 backdrop-blur-md border-t border-gray-800">
        <div className="w-full px-4 py-2">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center text-xs md:text-sm text-gray-400">
            <div className="text-center md:text-left">
              <span className="hidden md:inline">Total Asteroids: {asteroids.length} | </span>
              <span className="md:hidden">Total: {asteroids.length} | </span>
              Filtered: {filteredAsteroids.length} | 
              <span className="hidden md:inline">Threatening: </span>
              <span className="md:hidden">High: </span>
              {asteroids.filter(a => a.torinoScale >= 5).length}
            </div>
            <div className="text-center md:text-right text-xs mt-1 md:mt-0">
              <span className="hidden md:inline">Last Updated: </span>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">
            © 2025 Daniel Huber
          </div>
        </div>
      </footer>
    </div>
  );
}