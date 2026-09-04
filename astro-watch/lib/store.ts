import { create } from 'zustand';
import { EnhancedAsteroid } from './nasa-api';

interface AsteroidStore {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid: EnhancedAsteroid | null;
  /** Hover is tracked by id so components can subscribe narrowly (#26/#27). */
  hoveredAsteroidId: string | null;
  riskFilter: 'all' | 'threatening' | 'attention' | 'normal';
  timeRange: 'day' | 'week' | 'month';
  viewMode: 'solar-system' | 'dashboard' | 'impact-globe';
  showTrajectories: boolean;
  cinematicTarget: string | null;
  chatOpen: boolean;
  pendingSceneCommand: Record<string, unknown> | null;
  modalOpen: boolean;

  setAsteroids: (asteroids: EnhancedAsteroid[]) => void;
  selectAsteroid: (asteroid: EnhancedAsteroid | null) => void;
  setHoveredAsteroidId: (id: string | null) => void;
  setRiskFilter: (filter: 'all' | 'threatening' | 'attention' | 'normal') => void;
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
  setViewMode: (mode: 'solar-system' | 'dashboard' | 'impact-globe') => void;
  toggleTrajectories: () => void;
  setCinematicTarget: (id: string | null) => void;
  setChatOpen: (open: boolean) => void;
  setPendingSceneCommand: (cmd: Record<string, unknown> | null) => void;
  setModalOpen: (open: boolean) => void;

  getFilteredAsteroids: () => EnhancedAsteroid[];
}

export const useAsteroidStore = create<AsteroidStore>((set, get) => ({
  asteroids: [],
  selectedAsteroid: null,
  hoveredAsteroidId: null,
  riskFilter: 'all',
  timeRange: 'week',
  viewMode: 'solar-system',
  showTrajectories: false,
  cinematicTarget: null,
  chatOpen: false,
  pendingSceneCommand: null,
  modalOpen: false,

  setAsteroids: (asteroids) => set({ asteroids }),
  selectAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),
  setHoveredAsteroidId: (id) => {
    // No-op writes keep referential stability when hover re-fires on the
    // same rock (pointer jitter would otherwise re-render subscribers).
    if (get().hoveredAsteroidId !== id) set({ hoveredAsteroidId: id });
  },
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setTimeRange: (range) => set({ timeRange: range }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrajectories: () => set(state => ({ showTrajectories: !state.showTrajectories })),
  setCinematicTarget: (id) => set({ cinematicTarget: id }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setPendingSceneCommand: (cmd) => set({ pendingSceneCommand: cmd }),
  setModalOpen: (open) => set({ modalOpen: open }),
  
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