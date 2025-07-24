export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

if (!MAPBOX_ACCESS_TOKEN && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not defined');
}

export const MAPBOX_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
} as const;

export const DEFAULT_MAP_STYLE = MAPBOX_STYLES.dark;

export const MAP_CONFIG = {
  defaultZoom: 2,
  defaultCenter: { lng: 0, lat: 0 },
  maxZoom: 18,
  minZoom: 1,
  attributionControl: false,
} as const;