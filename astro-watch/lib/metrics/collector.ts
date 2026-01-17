/**
 * Metrics Collector for AstroWatch Agent System
 * Collects, aggregates, and reports metrics
 */

import type {
  QueryMetric,
  ToolCallMetric,
  ModelRoutingMetric,
  EmbeddingMetric,
  SearchMetric,
  PeriodStats,
  DashboardMetrics,
  HealthStatus,
  MetricsConfig,
  Alert,
  AlertThresholds,
} from './types';
import { calculateCost, GEMINI_PRICING } from './types';
import type { ModelTier } from '../llm/types';

// Default configuration
const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  sampleRate: 1.0,
  retentionDays: 30,
  aggregationIntervals: ['hour', 'day', 'week'],
  alertThresholds: {
    latencyMs: 5000,
    errorRate: 0.1,
    dailyCostUSD: 10,
  },
};

/**
 * Metrics Collector
 * In-memory metrics collection with optional persistence
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private queryMetrics: QueryMetric[] = [];
  private routingMetrics: ModelRoutingMetric[] = [];
  private embeddingMetrics: EmbeddingMetric[] = [];
  private searchMetrics: SearchMetric[] = [];
  private alerts: Alert[] = [];
  private healthStatus: HealthStatus;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.healthStatus = this.initHealthStatus();

    // Start periodic cleanup
    if (typeof window === 'undefined') {
      // Server-side only
      setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
    }
  }

  private initHealthStatus(): HealthStatus {
    const now = new Date();
    return {
      overall: 'healthy',
      components: {
        llm: { status: 'healthy', latencyMs: 0, errorRate: 0, lastCheck: now },
        vectorStore: { status: 'healthy', latencyMs: 0, errorRate: 0, lastCheck: now },
        embeddings: { status: 'healthy', latencyMs: 0, errorRate: 0, lastCheck: now },
      },
      lastUpdated: now,
    };
  }

  /**
   * Record a query metric
   */
  recordQuery(metric: Omit<QueryMetric, 'id'>): void {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.sampleRate) return;

    const fullMetric: QueryMetric = {
      ...metric,
      id: `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    this.queryMetrics.push(fullMetric);
    this.checkAlerts(fullMetric);
  }

  /**
   * Record model routing decision
   */
  recordRouting(metric: Omit<ModelRoutingMetric, 'id'>): void {
    if (!this.config.enabled) return;

    this.routingMetrics.push({
      ...metric,
      id: `routing_${Date.now()}`,
    });
  }

  /**
   * Record embedding operation
   */
  recordEmbedding(metric: Omit<EmbeddingMetric, 'id'>): void {
    if (!this.config.enabled) return;

    this.embeddingMetrics.push({
      ...metric,
      id: `embed_${Date.now()}`,
    });
  }

  /**
   * Record search operation
   */
  recordSearch(metric: Omit<SearchMetric, 'id'>): void {
    if (!this.config.enabled) return;

    this.searchMetrics.push({
      ...metric,
      id: `search_${Date.now()}`,
    });
  }

  /**
   * Update component health
   */
  updateHealth(
    component: 'llm' | 'vectorStore' | 'embeddings',
    latencyMs: number,
    success: boolean,
    error?: string
  ): void {
    const health = this.healthStatus.components[component];
    health.latencyMs = latencyMs;
    health.lastCheck = new Date();

    // Update error rate (exponential moving average)
    const alpha = 0.1;
    health.errorRate = alpha * (success ? 0 : 1) + (1 - alpha) * health.errorRate;

    if (!success && error) {
      health.lastError = error;
    }

    // Update status
    if (health.errorRate > 0.5) {
      health.status = 'unhealthy';
    } else if (health.errorRate > 0.1 || latencyMs > 5000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    // Update overall status
    const statuses = Object.values(this.healthStatus.components).map((c) => c.status);
    if (statuses.includes('unhealthy')) {
      this.healthStatus.overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'healthy';
    }

    this.healthStatus.lastUpdated = new Date();
  }

  /**
   * Get aggregated stats for a period
   */
  getStats(period: 'hour' | 'day' | 'week'): PeriodStats {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const metrics = this.queryMetrics.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= now
    );

    const latencies = metrics.map((m) => m.latencyMs).sort((a, b) => a - b);
    const successCount = metrics.filter((m) => m.success).length;

    // Model usage breakdown
    const modelUsage: PeriodStats['modelUsage'] = {};
    for (const metric of metrics) {
      const model = metric.modelUsed;
      if (!modelUsage[model]) {
        modelUsage[model] = { count: 0, percentage: 0, avgLatencyMs: 0 };
      }
      modelUsage[model]!.count++;
      modelUsage[model]!.avgLatencyMs += metric.latencyMs;
    }
    for (const model of Object.keys(modelUsage) as ModelTier[]) {
      modelUsage[model]!.percentage = (modelUsage[model]!.count / metrics.length) * 100;
      modelUsage[model]!.avgLatencyMs /= modelUsage[model]!.count;
    }

    // Tool usage breakdown
    const toolUsage: PeriodStats['toolUsage'] = {};
    for (const metric of metrics) {
      for (const tool of metric.toolCalls) {
        if (!toolUsage[tool.name]) {
          toolUsage[tool.name] = { count: 0, successRate: 0, avgLatencyMs: 0 };
        }
        toolUsage[tool.name].count++;
        toolUsage[tool.name].avgLatencyMs += tool.latencyMs;
        if (tool.success) {
          toolUsage[tool.name].successRate++;
        }
      }
    }
    for (const name of Object.keys(toolUsage)) {
      toolUsage[name].successRate /= toolUsage[name].count;
      toolUsage[name].avgLatencyMs /= toolUsage[name].count;
    }

    // Token usage
    const tokenUsage = metrics.reduce(
      (acc, m) => ({
        prompt: acc.prompt + m.tokensUsed.prompt,
        completion: acc.completion + m.tokensUsed.completion,
        total: acc.total + m.tokensUsed.total,
        estimatedCost:
          acc.estimatedCost +
          calculateCost(m.modelUsed, m.tokensUsed.prompt, m.tokensUsed.completion),
      }),
      { prompt: 0, completion: 0, total: 0, estimatedCost: 0 }
    );

    return {
      period,
      startTime,
      endTime: now,
      totalQueries: metrics.length,
      successRate: metrics.length > 0 ? successCount / metrics.length : 1,
      avgLatencyMs:
        metrics.length > 0 ? latencies.reduce((a, b) => a + b, 0) / metrics.length : 0,
      p50LatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0,
      p95LatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0,
      p99LatencyMs: latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0,
      modelUsage,
      toolUsage,
      tokenUsage,
    };
  }

  /**
   * Get dashboard metrics
   */
  getDashboard(): DashboardMetrics {
    const hourStats = this.getStats('hour');
    const dayStats = this.getStats('day');

    // Get unique sessions from last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = new Set(
      this.queryMetrics.filter((m) => m.timestamp >= hourAgo).map((m) => m.sessionId)
    );

    return {
      currentHour: hourStats,
      today: dayStats,
      recentQueries: this.queryMetrics.slice(-20),
      errorRate: 1 - dayStats.successRate,
      activeUsers: recentSessions.size,
      healthStatus: this.healthStatus,
    };
  }

  /**
   * Get active alerts
   */
  getAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Check and create alerts based on metrics
   */
  private checkAlerts(metric: QueryMetric): void {
    const { alertThresholds } = this.config;

    // Latency alert
    if (metric.latencyMs > alertThresholds.latencyMs) {
      this.createAlert('latency', 'warning', metric.latencyMs, alertThresholds.latencyMs);
    }

    // Error rate check (need historical data)
    const recentMetrics = this.queryMetrics.slice(-100);
    const errorRate = recentMetrics.filter((m) => !m.success).length / recentMetrics.length;
    if (errorRate > alertThresholds.errorRate) {
      this.createAlert('error_rate', 'critical', errorRate, alertThresholds.errorRate);
    }
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    value: number,
    threshold: number
  ): void {
    // Check if similar alert already exists
    const existing = this.alerts.find(
      (a) => a.type === type && !a.resolved && Date.now() - a.timestamp.getTime() < 300000
    );

    if (!existing) {
      this.alerts.push({
        id: `alert_${Date.now()}`,
        type,
        severity,
        message: this.getAlertMessage(type, value, threshold),
        value,
        threshold,
        timestamp: new Date(),
        resolved: false,
      });
    }
  }

  private getAlertMessage(type: Alert['type'], value: number, threshold: number): string {
    switch (type) {
      case 'latency':
        return `High latency detected: ${value.toFixed(0)}ms (threshold: ${threshold}ms)`;
      case 'error_rate':
        return `High error rate: ${(value * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`;
      case 'cost':
        return `Cost threshold exceeded: $${value.toFixed(2)} (threshold: $${threshold.toFixed(2)})`;
      case 'health':
        return `System health degraded`;
      default:
        return `Alert: ${type}`;
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

    this.queryMetrics = this.queryMetrics.filter((m) => m.timestamp >= cutoff);
    this.routingMetrics = this.routingMetrics.filter((m) => m.timestamp >= cutoff);
    this.embeddingMetrics = this.embeddingMetrics.filter((m) => m.timestamp >= cutoff);
    this.searchMetrics = this.searchMetrics.filter((m) => m.timestamp >= cutoff);
    this.alerts = this.alerts.filter(
      (a) => a.timestamp >= cutoff || (!a.resolved && a.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000))
    );
  }

  /**
   * Export metrics for persistence
   */
  export(): {
    queries: QueryMetric[];
    routing: ModelRoutingMetric[];
    embeddings: EmbeddingMetric[];
    searches: SearchMetric[];
  } {
    return {
      queries: [...this.queryMetrics],
      routing: [...this.routingMetrics],
      embeddings: [...this.embeddingMetrics],
      searches: [...this.searchMetrics],
    };
  }

  /**
   * Import metrics from persistence
   */
  import(data: {
    queries?: QueryMetric[];
    routing?: ModelRoutingMetric[];
    embeddings?: EmbeddingMetric[];
    searches?: SearchMetric[];
  }): void {
    if (data.queries) this.queryMetrics = data.queries;
    if (data.routing) this.routingMetrics = data.routing;
    if (data.embeddings) this.embeddingMetrics = data.embeddings;
    if (data.searches) this.searchMetrics = data.searches;
  }
}

// Singleton instance
let _collector: MetricsCollector | null = null;

export function getMetricsCollector(config?: Partial<MetricsConfig>): MetricsCollector {
  if (!_collector || config) {
    _collector = new MetricsCollector(config);
  }
  return _collector;
}
