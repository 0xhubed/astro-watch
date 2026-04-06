/**
 * Agent memory layer — Vercel KV persistence with in-memory fallback for local dev.
 *
 * When KV_REST_API_URL is not set the module falls back to a plain JS Map so the
 * agent can run locally without any KV credentials.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentObservation {
  asteroidId: string;
  name: string;
  observedAt: string;
  notes: string;
  rarity: number;
  risk: number;
}

export interface WatchlistEntry {
  asteroidId: string;
  name: string;
  addedAt: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SceneAnnotation {
  asteroidId: string;
  label: string;
  color?: string;
  notes?: string;
  createdAt: string;
}

export interface ThreatAssessment {
  asteroidId: string;
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  factors: string[];
  assessedAt: string;
}

export interface AgentBriefing {
  date: string;
  summary: string;
  highlights: string[];
  generatedAt: string;
}

export interface AgentMemory {
  observations: AgentObservation[];
  watchlist: WatchlistEntry[];
  annotations: SceneAnnotation[];
  summary: string;
  lastRunAt: string | null;
}

// ---------------------------------------------------------------------------
// KV keys
// ---------------------------------------------------------------------------

const KEYS = {
  observations: 'agent:observations',
  watchlist: 'agent:watchlist',
  annotations: 'agent:annotations',
  briefingLatest: 'agent:briefing:latest',
  briefingByDate: (date: string) => `agent:briefing:${date}`,
  threat: (objectId: string) => `agent:threats:${objectId}`,
  summary: 'agent:memory:summary',
  lastRunAt: 'agent:lastRunAt',
} as const;

// ---------------------------------------------------------------------------
// In-memory fallback store (used when KV_REST_API_URL is not configured)
// ---------------------------------------------------------------------------

const memStore = new Map<string, unknown>();

// ---------------------------------------------------------------------------
// KV helpers
// ---------------------------------------------------------------------------

async function getKv() {
  if (!process.env.KV_REST_API_URL) return null;
  const { kv } = await import('@vercel/kv');
  return kv;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKv();
  if (!kv) return (memStore.get(key) as T) ?? null;
  return kv.get<T>(key);
}

async function kvSet(key: string, value: unknown, exSeconds?: number): Promise<void> {
  const kv = await getKv();
  if (!kv) {
    memStore.set(key, value);
    return;
  }
  if (exSeconds !== undefined) {
    await kv.set(key, value, { ex: exSeconds });
  } else {
    await kv.set(key, value);
  }
}

// ---------------------------------------------------------------------------
// TTL constants (seconds)
// ---------------------------------------------------------------------------

const TTL_90_DAYS = 90 * 24 * 60 * 60;
const TTL_48_HOURS = 48 * 60 * 60;
const TTL_30_DAYS = 30 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load the full agent memory snapshot. */
export async function loadMemory(): Promise<AgentMemory> {
  const [observations, watchlist, annotations, summary, lastRunAt] = await Promise.all([
    kvGet<AgentObservation[]>(KEYS.observations),
    kvGet<WatchlistEntry[]>(KEYS.watchlist),
    kvGet<SceneAnnotation[]>(KEYS.annotations),
    kvGet<string>(KEYS.summary),
    kvGet<string>(KEYS.lastRunAt),
  ]);

  return {
    observations: observations ?? [],
    watchlist: watchlist ?? [],
    annotations: annotations ?? [],
    summary: summary ?? '',
    lastRunAt: lastRunAt ?? null,
  };
}

/** Persist observations list (90-day TTL). */
export async function saveObservations(obs: AgentObservation[]): Promise<void> {
  await kvSet(KEYS.observations, obs, TTL_90_DAYS);
}

/** Persist watchlist (no expiry). */
export async function saveWatchlist(wl: WatchlistEntry[]): Promise<void> {
  await kvSet(KEYS.watchlist, wl);
}

/** Persist scene annotations (48-hour TTL). */
export async function saveAnnotations(anns: SceneAnnotation[]): Promise<void> {
  await kvSet(KEYS.annotations, anns, TTL_48_HOURS);
}

/**
 * Persist briefing — saves to `agent:briefing:latest` AND a date-keyed archive
 * entry with a 30-day TTL.
 */
export async function saveBriefing(briefing: AgentBriefing): Promise<void> {
  await Promise.all([
    kvSet(KEYS.briefingLatest, briefing),
    kvSet(KEYS.briefingByDate(briefing.date), briefing, TTL_30_DAYS),
  ]);
}

/** Load the most recent briefing. */
export async function loadBriefing(): Promise<AgentBriefing | null> {
  return kvGet<AgentBriefing>(KEYS.briefingLatest);
}

/** Persist a threat assessment for a specific object ID. */
export async function saveThreat(objectId: string, threat: ThreatAssessment): Promise<void> {
  await kvSet(KEYS.threat(objectId), threat);
}

/** Load a threat assessment by object ID. */
export async function loadThreat(objectId: string): Promise<ThreatAssessment | null> {
  return kvGet<ThreatAssessment>(KEYS.threat(objectId));
}

/** Persist the rolling context summary. */
export async function saveSummary(text: string): Promise<void> {
  await kvSet(KEYS.summary, text);
}

/** Persist the timestamp of the last completed agent run. */
export async function saveLastRunAt(date: Date): Promise<void> {
  await kvSet(KEYS.lastRunAt, date.toISOString());
}

/**
 * Load annotations for the public dashboard to display.
 * Returns an empty array when no annotations are stored.
 */
export async function loadAnnotationsPublic(): Promise<SceneAnnotation[]> {
  return (await kvGet<SceneAnnotation[]>(KEYS.annotations)) ?? [];
}
