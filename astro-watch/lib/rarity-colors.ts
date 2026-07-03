/**
 * Single source of truth for rarity-level colors (review #42).
 *
 * Cold -> hot ramp, no magenta. Labels match the existing user-facing
 * copy from the original RiskLegend rarity scale (not renamed here) —
 * only the colors were divergent across the ~6 places that used to
 * define them independently (3D scene, charts, legend, detail views).
 */

export interface RarityLevelStyle {
  level: number; // 0..7
  label: string; // 'Routine', 'Common', 'Noteworthy', 'Uncommon', 'Rare', 'Very Rare', 'Exceptionally Rare', 'Extraordinary'
  hex: string; // canonical color, used by 3D emissive, chart cells, map/legend swatches
  textClass: string; // tailwind text-* class
  bgClass: string; // tailwind bg-* class for chips
}

export const RARITY_COLORS: RarityLevelStyle[] = [
  { level: 0, label: 'Routine', hex: '#60a5fa', textClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  { level: 1, label: 'Common', hex: '#34d399', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  { level: 2, label: 'Noteworthy', hex: '#a3e635', textClass: 'text-lime-400', bgClass: 'bg-lime-500/20' },
  { level: 3, label: 'Uncommon', hex: '#facc15', textClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20' },
  { level: 4, label: 'Rare', hex: '#fb923c', textClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  { level: 5, label: 'Very Rare', hex: '#f87171', textClass: 'text-red-400', bgClass: 'bg-red-500/20' },
  { level: 6, label: 'Exceptionally Rare', hex: '#dc2626', textClass: 'text-red-600', bgClass: 'bg-red-600/20' },
  { level: 7, label: 'Extraordinary', hex: '#991b1b', textClass: 'text-red-800', bgClass: 'bg-red-800/20' },
];

export function rarityStyle(level: number): RarityLevelStyle {
  const idx = Math.min(Math.max(Math.round(level ?? 0), 0), RARITY_COLORS.length - 1);
  return RARITY_COLORS[idx];
}
