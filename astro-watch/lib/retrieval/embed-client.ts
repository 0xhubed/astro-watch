/**
 * Embedding Client
 * Client for generating embeddings via Ubuntu server's Ollama EmbeddingGemma
 */

import type {
  EmbeddingRequest,
  EmbeddingResponse,
  EmbedClientConfig,
  CacheEntry,
} from './types';

// Default configuration
const DEFAULT_CONFIG: EmbedClientConfig = {
  serviceUrl: process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000',
  serviceToken: process.env.EMBED_SERVICE_TOKEN ?? '',
  timeout: 30000,
  maxRetries: 3,
  cacheConfig: {
    maxSize: 1000,
    defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
};

// Simple LRU-like cache for embeddings
class EmbeddingCache {
  private cache = new Map<string, CacheEntry<number[]>>();
  private maxSize: number;
  private defaultTtl: number;

  constructor(maxSize: number = 1000, defaultTtl: number = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  private hashText(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `embed_${hash}`;
  }

  get(text: string): number[] | null {
    const key = this.hashText(text);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(text: string, embedding: number[], ttl?: number): void {
    const key = this.hashText(text);

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: embedding,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

export class EmbedClient {
  private config: EmbedClientConfig;
  private cache: EmbeddingCache;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<EmbedClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new EmbeddingCache(
      this.config.cacheConfig?.maxSize,
      this.config.cacheConfig?.defaultTtl
    );

    // Start cleanup timer
    if (this.config.cacheConfig?.cleanupInterval) {
      this.cleanupTimer = setInterval(
        () => this.cache.cleanup(),
        this.config.cacheConfig.cleanupInterval
      );
    }
  }

  /**
   * Embed a single text
   */
  async embed(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const response = await this.embedBatch([text]);
    const embedding = response.embeddings[0];

    // Cache the result
    this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * Embed multiple texts in a batch
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResponse> {
    // Check cache for each text
    const cachedResults: (number[] | null)[] = texts.map((t) =>
      this.cache.get(t)
    );
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    cachedResults.forEach((cached, index) => {
      if (cached === null) {
        uncachedIndices.push(index);
        uncachedTexts.push(texts[index]);
      }
    });

    // If all cached, return immediately
    if (uncachedTexts.length === 0) {
      return {
        embeddings: cachedResults as number[][],
        model: 'embedding-gemma-cached',
        dimensions: cachedResults[0]?.length ?? 768,
        tokensUsed: 0,
      };
    }

    // Fetch uncached embeddings
    const request: EmbeddingRequest = { texts: uncachedTexts };
    const response = await this.fetchEmbeddings(request);

    // Cache new results and merge with cached
    const finalEmbeddings: number[][] = [...cachedResults] as number[][];
    response.embeddings.forEach((embedding, idx) => {
      const originalIndex = uncachedIndices[idx];
      finalEmbeddings[originalIndex] = embedding;
      this.cache.set(texts[originalIndex], embedding);
    });

    return {
      ...response,
      embeddings: finalEmbeddings,
    };
  }

  /**
   * Fetch embeddings from the embedding service
   */
  private async fetchEmbeddings(
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        try {
          const res = await fetch(`${this.config.serviceUrl}/embed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.serviceToken}`,
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!res.ok) {
            const body = await res.text();
            throw new Error(`Embedding service error: ${res.status} - ${body}`);
          }

          return (await res.json()) as EmbeddingResponse;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(
            `Embedding request timed out after ${this.config.timeout}ms`
          );
        }

        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // Fallback to mock embeddings for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Embedding service unavailable, using random embeddings');
      return this.generateMockEmbeddings(request.texts);
    }

    throw lastError ?? new Error('Failed to fetch embeddings');
  }

  /**
   * Generate mock embeddings for development/testing
   */
  private generateMockEmbeddings(texts: string[]): EmbeddingResponse {
    const dimensions = 768;
    const embeddings = texts.map(() => {
      const embedding: number[] = [];
      for (let i = 0; i < dimensions; i++) {
        embedding.push(Math.random() * 2 - 1);
      }
      // Normalize
      const norm = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      return embedding.map((val) => val / norm);
    });

    return {
      embeddings,
      model: 'mock-embeddings',
      dimensions,
      tokensUsed: texts.reduce((sum, t) => sum + t.split(/\s+/).length, 0),
    };
  }

  /**
   * Check if the embedding service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.serviceUrl}/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.serviceToken}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size(),
      hitRate: 0, // Would need hit/miss tracking for accurate rate
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
let _instance: EmbedClient | null = null;

export function getEmbedClient(
  config?: Partial<EmbedClientConfig>
): EmbedClient {
  if (!_instance || config) {
    _instance = new EmbedClient(config);
  }
  return _instance;
}
