/**
 * Retrieval System Types
 * Types for vector search, embeddings, and ranking
 */

// =============================================================================
// Embedding Types
// =============================================================================

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  tokensUsed: number;
}

export interface EmbeddingConfig {
  serviceUrl: string;
  serviceToken: string;
  model: string;
  dimensions: number;
  batchSize: number;
  timeout: number;
}

// =============================================================================
// Vector Store Types
// =============================================================================

export type ChunkType = 'description' | 'orbital' | 'risk' | 'approach' | 'full';

export interface VectorRecord {
  id: string;
  asteroidId: string;
  chunkType: ChunkType;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface VectorSearchRequest {
  query: string;
  queryEmbedding?: number[];
  filters?: VectorFilters;
  limit?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

export interface VectorFilters {
  asteroidIds?: string[];
  chunkTypes?: ChunkType[];
  minRisk?: number;
  maxRisk?: number;
  isPotentiallyHazardous?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface VectorSearchResult {
  id: string;
  asteroidId: string;
  chunkType: ChunkType;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  totalCount: number;
  queryEmbedding?: number[];
  latencyMs: number;
}

// =============================================================================
// Ingestion Types
// =============================================================================

export interface IngestionChunk {
  asteroidId: string;
  chunkType: ChunkType;
  content: string;
  metadata: Record<string, unknown>;
}

export interface IngestionRequest {
  chunks: IngestionChunk[];
  updateExisting?: boolean;
}

export interface IngestionResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { chunk: IngestionChunk; error: string }[];
  latencyMs: number;
}

// =============================================================================
// Ranking Types
// =============================================================================

export interface RankingWeights {
  semanticSimilarity: number;
  riskImportance: number;
  recency: number;
  hazardStatus: number;
  distanceProximity: number;
}

export interface RankingFactors {
  semanticScore: number;
  riskScore: number;
  recencyScore: number;
  hazardScore: number;
  proximityScore: number;
}

export interface RankedResult extends VectorSearchResult {
  rankingFactors: RankingFactors;
  finalScore: number;
  rank: number;
}

export interface RankingConfig {
  weights: RankingWeights;
  diversityPenalty: number; // Penalize multiple results from same asteroid
  minSemanticScore: number;
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  cleanupInterval: number;
}

// =============================================================================
// Client Configuration
// =============================================================================

export interface VectorClientConfig {
  databaseUrl: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface EmbedClientConfig {
  serviceUrl: string;
  serviceToken: string;
  timeout: number;
  maxRetries: number;
  cacheConfig?: CacheConfig;
}

// =============================================================================
// Hybrid Search Types
// =============================================================================

export interface HybridSearchRequest {
  query: string;
  semanticWeight: number; // 0-1, how much weight to give semantic vs keyword
  keywordFilters?: {
    mustInclude?: string[];
    mustExclude?: string[];
  };
  vectorFilters?: VectorFilters;
  limit?: number;
  rankingConfig?: Partial<RankingConfig>;
}

export interface HybridSearchResponse {
  results: RankedResult[];
  totalCount: number;
  searchMethods: {
    semantic: { count: number; avgScore: number };
    keyword: { count: number; avgScore: number };
  };
  latencyMs: number;
}
