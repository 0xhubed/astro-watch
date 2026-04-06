import { create } from 'zustand';
import { EnhancedAsteroid } from './nasa-api';

interface AsteroidStore {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid: EnhancedAsteroid | null;
  riskFilter: 'all' | 'threatening' | 'attention' | 'normal';
  timeRange: 'day' | 'week' | 'month';
  viewMode: 'solar-system' | 'dashboard' | 'impact-globe';
  showTrajectories: boolean;
  cinematicTarget: string | null;

  setAsteroids: (asteroids: EnhancedAsteroid[]) => void;
  selectAsteroid: (asteroid: EnhancedAsteroid | null) => void;
  setRiskFilter: (filter: 'all' | 'threatening' | 'attention' | 'normal') => void;
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
  setViewMode: (mode: 'solar-system' | 'dashboard' | 'impact-globe') => void;
  toggleTrajectories: () => void;
  setCinematicTarget: (id: string | null) => void;

  getFilteredAsteroids: () => EnhancedAsteroid[];
}

export const useAsteroidStore = create<AsteroidStore>((set, get) => ({
  asteroids: [],
  selectedAsteroid: null,
  riskFilter: 'all',
  timeRange: 'week',
  viewMode: 'solar-system',
  showTrajectories: false,
  cinematicTarget: null,

  setAsteroids: (asteroids) => set({ asteroids }),
  selectAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setTimeRange: (range) => set({ timeRange: range }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrajectories: () => set(state => ({ showTrajectories: !state.showTrajectories })),
  setCinematicTarget: (id) => set({ cinematicTarget: id }),
  
  getFilteredAsteroids: () => {
    const { asteroids, riskFilter } = get();
    
    if (riskFilter === 'all') return asteroids;

    return asteroids.filter(asteroid => {
      switch (riskFilter) {
        case 'threatening': return asteroid.rarity >= 4;
        case 'attention': return asteroid.rarity >= 2 && asteroid.rarity < 4;
        case 'normal': return asteroid.rarity < 2;
        default: return true;
      }
    });
  }
}));