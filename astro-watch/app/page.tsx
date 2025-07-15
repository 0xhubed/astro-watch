'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAsteroidStore } from '@/lib/store';
import { EnhancedSolarSystem } from '@/components/visualization/3d/EnhancedSolarSystem';
import { RiskDashboard } from '@/components/visualization/charts/RiskDashboard';
import { Controls } from '@/components/visualization/controls/Controls';
import { AsteroidAnalysisHub } from '@/components/visualization/analysis/AsteroidAnalysisHub';
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
    <div className="min-h-screen bg-space-dark">
      {/* ML Indicator */}
      <MLIndicator isMLReady={isMLReady} mlStats={mlStats} />
      
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
            >
              AstroWatch
            </motion.h1>
            <Controls />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-20">
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
              className="container mx-auto px-4 py-8"
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
        </AnimatePresence>
      </main>
      
      {/* Statistics Footer */}
      <footer className="fixed bottom-0 w-full bg-gray-900/80 backdrop-blur-md border-t border-gray-800">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              Total Asteroids: {asteroids.length} | 
              Filtered: {filteredAsteroids.length} | 
              Threatening: {asteroids.filter(a => a.torinoScale >= 5).length}
            </div>
            <div>
              Last Updated: {new Date().toLocaleTimeString()}
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