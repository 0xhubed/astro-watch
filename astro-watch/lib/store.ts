import { create } from 'zustand';
import { EnhancedAsteroid } from './nasa-api';

interface AsteroidStore {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid: EnhancedAsteroid | null;
  riskFilter: 'all' | 'high' | 'medium' | 'low';
  timeRange: 'day' | 'week' | 'month';
  viewMode: '3d' | 'dashboard' | 'map';
  showTrajectories: boolean;
  showParticleEffects: boolean;
  
  setAsteroids: (asteroids: EnhancedAsteroid[]) => void;
  selectAsteroid: (asteroid: EnhancedAsteroid | null) => void;
  setRiskFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
  setViewMode: (mode: '3d' | 'dashboard' | 'map') => void;
  toggleTrajectories: () => void;
  toggleParticleEffects: () => void;
  
  getFilteredAsteroids: () => EnhancedAsteroid[];
}

export const useAsteroidStore = create<AsteroidStore>((set, get) => ({
  asteroids: [],
  selectedAsteroid: null,
  riskFilter: 'all',
  timeRange: 'week',
  viewMode: '3d',
  showTrajectories: true,
  showParticleEffects: true,
  
  setAsteroids: (asteroids) => set({ asteroids }),
  selectAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setTimeRange: (range) => set({ timeRange: range }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrajectories: () => set(state => ({ showTrajectories: !state.showTrajectories })),
  toggleParticleEffects: () => set(state => ({ showParticleEffects: !state.showParticleEffects })),
  
  getFilteredAsteroids: () => {
    const { asteroids, riskFilter } = get();
    
    if (riskFilter === 'all') return asteroids;
    
    return asteroids.filter(asteroid => {
      switch (riskFilter) {
        case 'high': return asteroid.risk > 0.7;
        case 'medium': return asteroid.risk > 0.4 && asteroid.risk <= 0.7;
        case 'low': return asteroid.risk <= 0.4;
        default: return true;
      }
    });
  }
}));