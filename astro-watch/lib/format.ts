/**
 * Shared display formatters (review-fixes Task 4).
 * All chart and stat surfaces should use these so units and
 * number formatting stay consistent across the app.
 */

/** NASA NEO sizes are meters: "467 m" below 1 km, "1.2 km" above. */
export function formatMeters(m: number): string {
  if (!Number.isFinite(m)) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/** Thousands separators, default 0-1 decimals. */
export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

/** "2026-07-04" (or ISO datetime) -> "Jul 4", UTC so ticks don't drift. */
export function formatDateShort(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Shared dark tooltip style for all Recharts surfaces. */
export const DARK_TOOLTIP = {
  backgroundColor: 'rgba(9, 9, 20, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 8,
  color: '#ffffff',
} as const;

export const DARK_TOOLTIP_LABEL = { color: '#F3F4F6' } as const;

export const DARK_TOOLTIP_ITEM = { color: '#D1D5DB' } as const;
