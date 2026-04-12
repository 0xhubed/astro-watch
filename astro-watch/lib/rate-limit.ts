import { kv } from '@vercel/kv';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// In-memory fallback for local dev (no KV configured)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limiter backed by Vercel KV.
 * Falls back to in-memory store when KV is not configured.
 *
 * @param key       Unique identifier (e.g. IP address)
 * @param limit     Max requests allowed in the window
 * @param windowSec Window duration in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const kvConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (kvConfigured) {
    return rateLimitKV(key, limit, windowSec);
  }
  return rateLimitMemory(key, limit, windowSec);
}

async function rateLimitKV(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const kvKey = `rl:${key}`;

  try {
    const count = await kv.incr(kvKey);

    // Set TTL only on the first request in the window
    if (count === 1) {
      await kv.expire(kvKey, windowSec);
    }

    const ttl = await kv.ttl(kvKey);
    const retryAfterSeconds = ttl > 0 ? ttl : windowSec;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
    };
  } catch (e) {
    console.error('Rate limit KV error, allowing request:', e);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

function rateLimitMemory(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count++;
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds,
  };
}
