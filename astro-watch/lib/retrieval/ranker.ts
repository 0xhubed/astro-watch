/**
 * Multi-Factor Ranker
 * Combines semantic similarity with domain-specific signals for ranking
 */

import type {
  VectorSearchResult,
  RankedResult,
  RankingWeights,
  RankingFactors,
  RankingConfig,
} from './types';
import type { EnhancedAsteroid } from '../nasa-api';

// Default ranking weights
const DEFAULT_WEIGHTS: RankingWeights = {
  semanticSimilarity: 0.35,
  riskImportance: 0.25,
  recency: 0.15,
  hazardStatus: 0.15,
  distanceProximity: 0.10,
};

// Default ranking configuration
const DEFAULT_CONFIG: RankingConfig = {
  weights: DEFAULT_WEIGHTS,
  diversityPenalty: 0.1, // 10% penalty for duplicate asteroids
  minSemanticScore: 0.3,
};

export class Ranker {
  private config: RankingConfig;

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: { ...DEFAULT_WEIGHTS, ...config.weights },
    };
  }

  /**
   * Rank search results using multi-factor scoring
   */
  rank(
    results: VectorSearchResult[],
    asteroidContext?: Map<string, EnhancedAsteroid>
  ): RankedResult[] {
    // Filter by minimum semantic score
    const filtered = results.filter(
      (r) => r.score >= this.config.minSemanticScore
    );

    // Calculate ranking factors for each result
    const withFactors = filtered.map((result) => {
      const asteroid = asteroidContext?.get(result.asteroidId);
      const factors = this.calculateFactors(result, asteroid);
      const finalScore = this.calculateFinalScore(factors);

      return {
        ...result,
        rankingFactors: factors,
        finalScore,
        rank: 0, // Will be set after sorting
      };
    });

    // Apply diversity penalty (penalize multiple results from same asteroid)
    const seenAsteroids = new Map<string, number>();
    const withDiversity = withFactors.map((result) => {
      const count = seenAsteroids.get(result.asteroidId) ?? 0;
      seenAsteroids.set(result.asteroidId, count + 1);

      // Apply penalty for duplicates
      const penalty = count * this.config.diversityPenalty;
      return {
        ...result,
        finalScore: Math.max(0, result.finalScore - penalty),
      };
    });

    // Sort by final score descending
    const sorted = withDiversity.sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks
    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  }

  /**
   * Calculate individual ranking factors
   */
  private calculateFactors(
    result: VectorSearchResult,
    asteroid?: EnhancedAsteroid
  ): RankingFactors {
    // Semantic similarity (already normalized 0-1)
    const semanticScore = result.score;

    // Risk importance score (higher risk = higher score)
    let riskScore = 0;
    if (asteroid) {
      riskScore = asteroid.risk ?? 0;
    } else if (result.metadata?.risk !== undefined) {
      riskScore = Number(result.metadata.risk);
    }

    // Recency score (based on close approach date)
    let recencyScore = 0.5; // Default to middle
    if (asteroid?.close_approach_data?.[0]?.close_approach_date) {
      const approachDate = new Date(
        asteroid.close_approach_data[0].close_approach_date
      );
      const daysDiff = Math.abs(
        (approachDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      // Score higher for closer dates (within 30 days = 1.0, 365 days = 0.0)
      recencyScore = Math.max(0, 1 - daysDiff / 365);
    }

    // Hazard status score (1 if potentially hazardous, 0 otherwise)
    let hazardScore = 0;
    if (asteroid?.is_potentially_hazardous_asteroid) {
      hazardScore = 1;
    } else if (result.metadata?.isPotentiallyHazardous) {
      hazardScore = 1;
    }

    // Distance proximity score (closer = higher score)
    let proximityScore = 0.5;
    if (asteroid?.missDistance !== undefined) {
      // missDistance is typically in lunar distances
      // Score: 1 for < 1 LD, 0.5 for ~10 LD, 0 for > 50 LD
      const ld = asteroid.missDistance;
      proximityScore = Math.max(0, 1 - ld / 50);
    } else if (result.metadata?.missDistance !== undefined) {
      const ld = Number(result.metadata.missDistance);
      proximityScore = Math.max(0, 1 - ld / 50);
    }

    return {
      semanticScore,
      riskScore,
      recencyScore,
      hazardScore,
      proximityScore,
    };
  }

  /**
   * Calculate final weighted score from factors
   */
  private calculateFinalScore(factors: RankingFactors): number {
    const { weights } = this.config;

    return (
      factors.semanticScore * weights.semanticSimilarity +
      factors.riskScore * weights.riskImportance +
      factors.recencyScore * weights.recency +
      factors.hazardScore * weights.hazardStatus +
      factors.proximityScore * weights.distanceProximity
    );
  }

  /**
   * Explain the ranking for a specific result
   */
  explainRanking(result: RankedResult): string {
    const { rankingFactors, finalScore, rank } = result;
    const { weights } = this.config;

    const contributions = [
      {
        name: 'Semantic relevance',
        value: rankingFactors.semanticScore,
        weight: weights.semanticSimilarity,
        contribution: rankingFactors.semanticScore * weights.semanticSimilarity,
      },
      {
        name: 'Risk level',
        value: rankingFactors.riskScore,
        weight: weights.riskImportance,
        contribution: rankingFactors.riskScore * weights.riskImportance,
      },
      {
        name: 'Recency',
        value: rankingFactors.recencyScore,
        weight: weights.recency,
        contribution: rankingFactors.recencyScore * weights.recency,
      },
      {
        name: 'Hazard status',
        value: rankingFactors.hazardScore,
        weight: weights.hazardStatus,
        contribution: rankingFactors.hazardScore * weights.hazardStatus,
      },
      {
        name: 'Proximity',
        value: rankingFactors.proximityScore,
        weight: weights.distanceProximity,
        contribution: rankingFactors.proximityScore * weights.distanceProximity,
      },
    ];

    const sorted = contributions.sort((a, b) => b.contribution - a.contribution);

    const lines = [
      `Rank #${rank} (Score: ${finalScore.toFixed(3)})`,
      '',
      'Score breakdown:',
      ...sorted.map(
        (c) =>
          `  ${c.name}: ${(c.contribution * 100).toFixed(1)}% ` +
          `(${(c.value * 100).toFixed(0)}% × ${(c.weight * 100).toFixed(0)}% weight)`
      ),
    ];

    return lines.join('\n');
  }

  /**
   * Update ranking weights
   */
  updateWeights(weights: Partial<RankingWeights>): void {
    this.config.weights = { ...this.config.weights, ...weights };
  }

  /**
   * Get current configuration
   */
  getConfig(): RankingConfig {
    return { ...this.config };
  }
}

// Singleton instance
let _instance: Ranker | null = null;

export function getRanker(config?: Partial<RankingConfig>): Ranker {
  if (!_instance || config) {
    _instance = new Ranker(config);
  }
  return _instance;
}

/**
 * Convenience function to rank results with default config
 */
export function rankResults(
  results: VectorSearchResult[],
  asteroidContext?: Map<string, EnhancedAsteroid>,
  config?: Partial<RankingConfig>
): RankedResult[] {
  const ranker = new Ranker(config);
  return ranker.rank(results, asteroidContext);
}
