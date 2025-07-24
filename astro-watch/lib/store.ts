import { create } from 'zustand';
import { EnhancedAsteroid } from './nasa-api';

interface AsteroidStore {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid: EnhancedAsteroid | null;
  riskFilter: 'all' | 'threatening' | 'attention' | 'normal';
  timeRange: 'day' | 'week' | 'month';
  viewMode: 'solar-system' | 'dashboard' | 'impact-globe' | 'interactive-maps';
  showTrajectories: boolean;
  
  setAsteroids: (asteroids: EnhancedAsteroid[]) => void;
  selectAsteroid: (asteroid: EnhancedAsteroid | null) => void;
  setRiskFilter: (filter: 'all' | 'threatening' | 'attention' | 'normal') => void;
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
  setViewMode: (mode: 'solar-system' | 'dashboard' | 'impact-globe' | 'interactive-maps') => void;
  toggleTrajectories: () => void;
  
  getFilteredAsteroids: () => EnhancedAsteroid[];
}

export const useAsteroidStore = create<AsteroidStore>((set, get) => ({
  asteroids: [],
  selectedAsteroid: null,
  riskFilter: 'all',
  timeRange: 'week',
  viewMode: 'solar-system',
  showTrajectories: false,
  
  setAsteroids: (asteroids) => set({ asteroids }),
  selectAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setTimeRange: (range) => set({ timeRange: range }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrajectories: () => set(state => ({ showTrajectories: !state.showTrajectories })),
  
  getFilteredAsteroids: () => {
    const { asteroids, riskFilter } = get();
    
    if (riskFilter === 'all') return asteroids;
    
    return asteroids.filter(asteroid => {
      switch (riskFilter) {
        case 'threatening': return asteroid.torinoScale >= 5;
        case 'attention': return asteroid.torinoScale >= 2 && asteroid.torinoScale < 5;
        case 'normal': return asteroid.torinoScale < 2;
        default: return true;
      }
    });
  }
}));