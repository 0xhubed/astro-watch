/**
 * Vector Client for pgvector
 * Client for vector similarity search using PostgreSQL + pgvector
 */

import type {
  VectorClientConfig,
  VectorSearchRequest,
  VectorSearchResponse,
  VectorSearchResult,
  VectorRecord,
  VectorFilters,
  IngestionChunk,
  IngestionResult,
} from './types';
import { getEmbedClient } from './embed-client';

// Default configuration
const DEFAULT_CONFIG: VectorClientConfig = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  maxConnections: 10,
  connectionTimeout: 5000,
  queryTimeout: 30000,
};

export class VectorClient {
  private config: VectorClientConfig;
  private embedClient = getEmbedClient();

  constructor(config: Partial<VectorClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Search for similar vectors
   */
  async search(request: VectorSearchRequest): Promise<VectorSearchResponse> {
    const startTime = Date.now();

    // Get or use provided embedding
    let queryEmbedding = request.queryEmbedding;
    if (!queryEmbedding && request.query) {
      queryEmbedding = await this.embedClient.embed(request.query);
    }

    if (!queryEmbedding) {
      return {
        results: [],
        totalCount: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // Build and execute query via API
    const results = await this.executeVectorSearch(
      queryEmbedding,
      request.filters,
      request.limit ?? 10,
      request.minScore ?? 0.5
    );

    return {
      results,
      totalCount: results.length,
      queryEmbedding,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Execute vector similarity search via Ubuntu server API
   */
  private async executeVectorSearch(
    embedding: number[],
    filters?: VectorFilters,
    limit: number = 10,
    minScore: number = 0.5
  ): Promise<VectorSearchResult[]> {
    try {
      const serviceUrl = process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000';
      const serviceToken = process.env.EMBED_SERVICE_TOKEN ?? '';

      const res = await fetch(`${serviceUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({
          embedding,
          filters,
          limit,
          min_score: minScore,
        }),
      });

      if (!res.ok) {
        console.error('Vector search failed:', res.status);
        return [];
      }

      const data = await res.json();
      return data.results ?? [];
    } catch (error) {
      console.error('Vector search error:', error);

      // Fallback to mock results for development
      if (process.env.NODE_ENV === 'development') {
        return this.generateMockResults(limit);
      }

      return [];
    }
  }

  /**
   * Ingest chunks into the vector store
   */
  async ingest(chunks: IngestionChunk[]): Promise<IngestionResult> {
    const startTime = Date.now();
    const result: IngestionResult = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      latencyMs: 0,
    };

    // Generate embeddings for all chunks
    const contents = chunks.map((c) => c.content);
    const embeddingResponse = await this.embedClient.embedBatch(contents);

    // Prepare records
    const records: VectorRecord[] = chunks.map((chunk, index) => ({
      id: `${chunk.asteroidId}_${chunk.chunkType}`,
      asteroidId: chunk.asteroidId,
      chunkType: chunk.chunkType,
      content: chunk.content,
      embedding: embeddingResponse.embeddings[index],
      metadata: chunk.metadata,
      createdAt: new Date(),
    }));

    // Send to ingest endpoint
    try {
      const serviceUrl = process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000';
      const serviceToken = process.env.EMBED_SERVICE_TOKEN ?? '';

      const res = await fetch(`${serviceUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({ records }),
      });

      if (!res.ok) {
        throw new Error(`Ingest failed: ${res.status}`);
      }

      const data = await res.json();
      result.inserted = data.inserted ?? records.length;
      result.updated = data.updated ?? 0;
    } catch (error) {
      console.error('Ingest error:', error);
      result.errors.push({
        chunk: chunks[0],
        error: String(error),
      });
    }

    result.latencyMs = Date.now() - startTime;
    return result;
  }

  /**
   * Delete vectors for an asteroid
   */
  async deleteByAsteroidId(asteroidId: string): Promise<boolean> {
    try {
      const serviceUrl = process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000';
      const serviceToken = process.env.EMBED_SERVICE_TOKEN ?? '';

      const res = await fetch(`${serviceUrl}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({ asteroid_id: asteroidId }),
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get vector count statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    uniqueAsteroids: number;
    chunkTypeCounts: Record<string, number>;
  }> {
    try {
      const serviceUrl = process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000';
      const serviceToken = process.env.EMBED_SERVICE_TOKEN ?? '';

      const res = await fetch(`${serviceUrl}/stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${serviceToken}`,
        },
      });

      if (!res.ok) {
        return { totalVectors: 0, uniqueAsteroids: 0, chunkTypeCounts: {} };
      }

      return await res.json();
    } catch {
      return { totalVectors: 0, uniqueAsteroids: 0, chunkTypeCounts: {} };
    }
  }

  /**
   * Health check for vector store
   */
  async healthCheck(): Promise<boolean> {
    try {
      const serviceUrl = process.env.EMBED_SERVICE_URL ?? 'http://localhost:8000';
      const serviceToken = process.env.EMBED_SERVICE_TOKEN ?? '';

      const res = await fetch(`${serviceUrl}/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${serviceToken}`,
        },
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate mock results for development
   */
  private generateMockResults(limit: number): VectorSearchResult[] {
    const mockAsteroids = [
      { id: '2024-AA', name: 'Mock Asteroid Alpha', risk: 0.8 },
      { id: '2024-BB', name: 'Mock Asteroid Beta', risk: 0.4 },
      { id: '2024-CC', name: 'Mock Asteroid Charlie', risk: 0.2 },
    ];

    return mockAsteroids.slice(0, limit).map((asteroid, index) => ({
      id: `${asteroid.id}_full`,
      asteroidId: asteroid.id,
      chunkType: 'full' as const,
      content: `${asteroid.name} is an asteroid with estimated risk level ${asteroid.risk}`,
      score: 0.9 - index * 0.1,
      metadata: {
        name: asteroid.name,
        risk: asteroid.risk,
      },
    }));
  }
}

// Singleton instance
let _instance: VectorClient | null = null;

export function getVectorClient(
  config?: Partial<VectorClientConfig>
): VectorClient {
  if (!_instance || config) {
    _instance = new VectorClient(config);
  }
  return _instance;
}
