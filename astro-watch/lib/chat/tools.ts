import { EnhancedAsteroid } from '@/lib/nasa-api';

export const chatTools = [
  {
    type: 'function' as const,
    function: {
      name: 'query_asteroids',
      description: 'Search and filter asteroid data. Use this to answer questions about specific asteroids or find asteroids matching criteria.',
      parameters: {
        type: 'object',
        properties: {
          sort_by: { type: 'string', enum: ['risk', 'rarity', 'size', 'velocity', 'miss_distance'], description: 'Field to sort by' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          limit: { type: 'number', description: 'Max results to return', default: 5 },
          min_rarity: { type: 'number', description: 'Minimum rarity score (0-6+)' },
          hazard_level: { type: 'string', enum: ['none', 'normal', 'noteworthy', 'rare', 'exceptional'] },
          name_search: { type: 'string', description: 'Search asteroid by name (partial match)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'control_scene',
      description: 'Control the 3D visualization. Use this when the user asks to see, show, focus on, zoom to, or filter the view.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['focus', 'set_filter', 'set_view', 'toggle_trajectories', 'cinematic'], description: 'The scene action to perform' },
          asteroid_id: { type: 'string', description: 'Asteroid ID for focus/cinematic actions' },
          filter: { type: 'string', enum: ['all', 'threatening', 'attention', 'normal'], description: 'Risk filter for set_filter action' },
          view: { type: 'string', enum: ['solar-system', 'dashboard', 'impact-globe'], description: 'View mode for set_view action' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_statistics',
      description: 'Compute statistics about the current asteroid data. Use for analytical questions about distributions, trends, and comparisons.',
      parameters: {
        type: 'object',
        properties: {
          stat_type: { type: 'string', enum: ['risk_distribution', 'size_summary', 'velocity_summary', 'closest_approaches', 'hazardous_count'], description: 'Type of statistic to compute' },
        },
        required: ['stat_type'],
      },
    },
  },
];

export function executeQueryAsteroids(
  asteroids: EnhancedAsteroid[],
  params: { sort_by?: string; sort_order?: string; limit?: number; min_rarity?: number; hazard_level?: string; name_search?: string }
): string {
  let filtered = [...asteroids];
  if (params.name_search) {
    const search = params.name_search.toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(search));
  }
  if (params.min_rarity !== undefined) {
    filtered = filtered.filter(a => a.rarity >= params.min_rarity!);
  }
  if (params.hazard_level) {
    filtered = filtered.filter(a => a.hazardLevel === params.hazard_level);
  }
  const sortKey = params.sort_by === 'miss_distance' ? 'missDistance' : (params.sort_by || 'rarity');
  const sortOrder = params.sort_order === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortKey] as number;
    const bVal = (b as unknown as Record<string, unknown>)[sortKey] as number;
    return (aVal - bVal) * sortOrder;
  });
  const results = filtered.slice(0, params.limit || 5);
  return JSON.stringify(results.map(a => ({
    id: a.id, name: a.name, rarity: a.rarity, hazardLevel: a.hazardLevel,
    size: `${a.size.toFixed(0)}m`, velocity: `${a.velocity.toFixed(1)} km/s`,
    missDistance: `${a.missDistance.toFixed(4)} AU`, risk: a.risk.toFixed(3),
    isPHA: a.is_potentially_hazardous_asteroid,
    closeApproachDate: a.close_approach_data[0]?.close_approach_date,
  })));
}

export function executeGetStatistics(
  asteroids: EnhancedAsteroid[],
  params: { stat_type: string }
): string {
  switch (params.stat_type) {
    case 'risk_distribution': {
      const dist: Record<string, number> = { exceptional: 0, rare: 0, noteworthy: 0, normal: 0, none: 0 };
      asteroids.forEach(a => { if (a.hazardLevel in dist) dist[a.hazardLevel]++; });
      return JSON.stringify({ total: asteroids.length, distribution: dist });
    }
    case 'size_summary': {
      const sizes = asteroids.map(a => a.size);
      if (sizes.length === 0) return JSON.stringify({ count: 0 });
      return JSON.stringify({ count: sizes.length, min: `${Math.min(...sizes).toFixed(0)}m`, max: `${Math.max(...sizes).toFixed(0)}m`, avg: `${(sizes.reduce((s, v) => s + v, 0) / sizes.length).toFixed(0)}m` });
    }
    case 'velocity_summary': {
      const vels = asteroids.map(a => a.velocity);
      if (vels.length === 0) return JSON.stringify({ count: 0 });
      return JSON.stringify({ count: vels.length, min: `${Math.min(...vels).toFixed(1)} km/s`, max: `${Math.max(...vels).toFixed(1)} km/s`, avg: `${(vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1)} km/s` });
    }
    case 'closest_approaches': {
      const sorted = [...asteroids].sort((a, b) => a.missDistance - b.missDistance).slice(0, 5);
      return JSON.stringify(sorted.map(a => ({ name: a.name, missDistance: `${a.missDistance.toFixed(4)} AU`, missDistanceKm: `${(a.missDistance * 149597870.7).toFixed(0)} km`, date: a.close_approach_data[0]?.close_approach_date })));
    }
    case 'hazardous_count': {
      const pha = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
      return JSON.stringify({ total: asteroids.length, potentiallyHazardous: pha.length, percentage: asteroids.length > 0 ? `${((pha.length / asteroids.length) * 100).toFixed(1)}%` : '0%' });
    }
    default:
      return JSON.stringify({ error: 'Unknown stat_type' });
  }
}
