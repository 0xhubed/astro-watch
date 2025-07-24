'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { TrajectoryAnalysis } from './TrajectoryAnalysis';
import { MonitoringDashboard } from './MonitoringDashboard';

interface Props {
  asteroids: EnhancedAsteroid[];
}

type TabType = 'trajectories' | 'monitoring';

export function AsteroidAnalysisHub({ asteroids }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('trajectories');

  const tabs = [
    {
      id: 'trajectories' as TabType,
      name: 'Trajectory Analysis',
      icon: '🛸',
      description: 'Orbital mechanics and close approach analysis'
    },
    {
      id: 'monitoring' as TabType,
      name: 'Real-Time Monitoring',
      icon: '📡',
      description: 'Live tracking and discovery timeline'
    }
  ];

  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark via-blue-900/20 to-space-dark">
      {/* Tab Navigation */}
      <div className="fixed top-16 md:top-20 left-2 right-2 md:left-4 md:right-4 z-10 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-500/70 text-white shadow-lg'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="mr-1 md:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </motion.button>
            ))}
          </div>
          
          <div className="flex-1 text-white/60 text-xs leading-relaxed hidden md:block">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </div>
          
          <div className="text-white/40 text-xs text-center sm:text-right">
            {asteroids.length} asteroids
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-28 md:pt-32 h-full">
        <AnimatePresence mode="wait">
          {activeTab === 'trajectories' && (
            <motion.div
              key="trajectories"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <TrajectoryAnalysis asteroids={asteroids} />
            </motion.div>
          )}
          
          {activeTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <MonitoringDashboard asteroids={asteroids} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}