/**
 * Metrics Types for AstroWatch Agent System
 */

import type { ModelTier } from '../llm/types';
import type { ToolName } from '../agent/types';

// =============================================================================
// Core Metric Types
// =============================================================================

export interface QueryMetric {
  id: string;
  timestamp: Date;
  sessionId: string;
  query: string;
  modelUsed: ModelTier;
  latencyMs: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolCalls: ToolCallMetric[];
  success: boolean;
  errorType?: string;
}

export interface ToolCallMetric {
  name: ToolName | string;
  latencyMs: number;
  success: boolean;
  errorType?: string;
}

export interface ModelRoutingMetric {
  id: string;
  timestamp: Date;
  query: string;
  complexityScore: number;
  modelSelected: ModelTier;
  confidence: number;
  factors: {
    multiStep: boolean;
    requiresReasoning: boolean;
    ambiguous: boolean;
    domainSpecific: boolean;
    temporalReasoning: boolean;
  };
}

export interface EmbeddingMetric {
  id: string;
  timestamp: Date;
  textCount: number;
  totalTokens: number;
  latencyMs: number;
  cached: boolean;
  cacheHitRate: number;
}

export interface SearchMetric {
  id: string;
  timestamp: Date;
  query: string;
  resultCount: number;
  topScore: number;
  avgScore: number;
  latencyMs: number;
  filters: Record<string, unknown>;
}

// =============================================================================
// Aggregated Metrics
// =============================================================================

export interface PeriodStats {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  totalQueries: number;
  successRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  modelUsage: {
    [K in ModelTier]?: {
      count: number;
      percentage: number;
      avgLatencyMs: number;
    };
  };
  toolUsage: {
    [key: string]: {
      count: number;
      successRate: number;
      avgLatencyMs: number;
    };
  };
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
    estimatedCost: number;
  };
}

export interface CostMetric {
  period: 'day' | 'week' | 'month';
  timestamp: Date;
  flashLiteTokens: number;
  flashThinkingTokens: number;
  embeddingTokens: number;
  estimatedCostUSD: number;
}

// =============================================================================
// Real-time Dashboard Types
// =============================================================================

export interface DashboardMetrics {
  currentHour: PeriodStats;
  today: PeriodStats;
  recentQueries: QueryMetric[];
  errorRate: number;
  activeUsers: number;
  healthStatus: HealthStatus;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    llm: ComponentHealth;
    vectorStore: ComponentHealth;
    embeddings: ComponentHealth;
  };
  lastUpdated: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  errorRate: number;
  lastError?: string;
  lastCheck: Date;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface MetricsConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of requests to track
  retentionDays: number;
  aggregationIntervals: ('hour' | 'day' | 'week')[];
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  latencyMs: number;
  errorRate: number;
  dailyCostUSD: number;
}

export interface Alert {
  id: string;
  type: 'latency' | 'error_rate' | 'cost' | 'health';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// =============================================================================
// Cost Calculation
// =============================================================================

// Gemini pricing per 1M tokens (as of plan date)
export const GEMINI_PRICING = {
  'flash-lite': {
    input: 0.10, // $0.10 per 1M input tokens
    output: 0.40, // $0.40 per 1M output tokens
  },
  'flash-thinking': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
} as const;

export function calculateCost(
  model: ModelTier,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = GEMINI_PRICING[model];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
