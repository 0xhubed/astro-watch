/**
 * Search Asteroids Tool
 * Semantic and filter-based asteroid search
 */

import type { ToolFunction } from '../../llm/types';
import type {
  ToolContext,
  ToolResult,
  AsteroidSearchFilters,
  AsteroidSearchResult,
  Citation,
} from '../types';
import type { EnhancedAsteroid } from '../../nasa-api';
import { getVectorClient } from '../../retrieval';

export const SEARCH_ASTEROIDS_SCHEMA: ToolFunction['parameters'] = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Natural language search query',
    },
    minRisk: {
      type: 'number',
      description: 'Minimum risk score (0-1)',
    },
    maxRisk: {
      type: 'number',
      description: 'Maximum risk score (0-1)',
    },
    hazardLevel: {
      type: 'array',
      description: 'Filter by hazard levels',
      items: {
        type: 'string',
        enum: ['none', 'normal', 'attention', 'threatening', 'certain'],
      },
    },
    minSize: {
      type: 'number',
      description: 'Minimum diameter in meters',
    },
    maxSize: {
      type: 'number',
      description: 'Maximum diameter in meters',
    },
    minDistance: {
      type: 'number',
      description: 'Minimum miss distance in lunar distances',
    },
    maxDistance: {
      type: 'number',
      description: 'Maximum miss distance in lunar distances',
    },
    isPotentiallyHazardous: {
      type: 'boolean',
      description: 'Filter to potentially hazardous asteroids only',
    },
    sortBy: {
      type: 'string',
      description: 'Sort field',
      enum: ['risk', 'size', 'distance', 'velocity', 'name'],
    },
    sortOrder: {
      type: 'string',
      description: 'Sort direction',
      enum: ['asc', 'desc'],
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results (default: 10, max: 50)',
    },
  },
  required: [],
};

export async function searchAsteroids(
  args: Partial<AsteroidSearchFilters>,
  context: ToolContext
): Promise<ToolResult<AsteroidSearchResult>> {
  const {
    query,
    minRisk,
    maxRisk,
    hazardLevel,
    minSize,
    maxSize,
    minDistance,
    maxDistance,
    isPotentiallyHazardous,
    sortBy = 'risk',
    sortOrder = 'desc',
    limit = 10,
  } = args;

  const maxLimit = Math.min(limit, 50);
  const citations: Citation[] = [];

  // Start with all asteroids from context
  let results = [...context.asteroids];

  // Apply filters
  if (minRisk !== undefined) {
    results = results.filter((a) => (a.risk ?? 0) >= minRisk);
  }
  if (maxRisk !== undefined) {
    results = results.filter((a) => (a.risk ?? 0) <= maxRisk);
  }
  if (hazardLevel && hazardLevel.length > 0) {
    results = results.filter((a) => hazardLevel.includes(a.hazardLevel));
  }
  if (minSize !== undefined) {
    results = results.filter((a) => (a.size ?? 0) >= minSize);
  }
  if (maxSize !== undefined) {
    results = results.filter((a) => (a.size ?? 0) <= maxSize);
  }
  if (minDistance !== undefined) {
    results = results.filter((a) => (a.missDistance ?? 0) >= minDistance);
  }
  if (maxDistance !== undefined) {
    results = results.filter((a) => (a.missDistance ?? 0) <= maxDistance);
  }
  if (isPotentiallyHazardous !== undefined) {
    results = results.filter(
      (a) => a.is_potentially_hazardous_asteroid === isPotentiallyHazardous
    );
  }

  // If query provided, try vector search for semantic matching
  let semanticScore: number | undefined;
  if (query && query.trim()) {
    try {
      const vectorClient = getVectorClient();
      const searchResponse = await vectorClient.search({
        query,
        limit: maxLimit * 2, // Get more to filter
        minScore: 0.3,
      });

      // Get asteroid IDs from vector search
      const vectorIds = new Set(searchResponse.results.map((r) => r.asteroidId));

      // If we have vector results, prioritize them
      if (vectorIds.size > 0) {
        // Partition: matched by vector search vs not
        const vectorMatched = results.filter((a) => vectorIds.has(a.id));
        const notMatched = results.filter((a) => !vectorIds.has(a.id));

        // Also do keyword matching for resilience
        const queryLower = query.toLowerCase();
        const keywordMatched = notMatched.filter(
          (a) =>
            a.name.toLowerCase().includes(queryLower) ||
            a.id.toLowerCase().includes(queryLower)
        );

        // Combine: vector matches first, then keyword matches
        results = [...vectorMatched, ...keywordMatched];

        if (searchResponse.results.length > 0) {
          semanticScore = searchResponse.results[0].score;
        }
      } else {
        // Fallback to keyword search
        const queryLower = query.toLowerCase();
        results = results.filter(
          (a) =>
            a.name.toLowerCase().includes(queryLower) ||
            a.id.toLowerCase().includes(queryLower)
        );
      }
    } catch {
      // Fallback to keyword search if vector search fails
      const queryLower = query.toLowerCase();
      results = results.filter(
        (a) =>
          a.name.toLowerCase().includes(queryLower) ||
          a.id.toLowerCase().includes(queryLower)
      );
    }
  }

  // Sort results
  results.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortBy) {
      case 'risk':
        aVal = a.risk ?? 0;
        bVal = b.risk ?? 0;
        break;
      case 'size':
        aVal = a.size ?? 0;
        bVal = b.size ?? 0;
        break;
      case 'distance':
        aVal = a.missDistance ?? Infinity;
        bVal = b.missDistance ?? Infinity;
        break;
      case 'velocity':
        aVal = a.velocity ?? 0;
        bVal = b.velocity ?? 0;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      default:
        aVal = a.risk ?? 0;
        bVal = b.risk ?? 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortOrder === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // Limit results
  const limitedResults = results.slice(0, maxLimit);

  // Generate citations
  limitedResults.forEach((asteroid) => {
    citations.push({
      id: `cite_${asteroid.id}`,
      text: `${asteroid.name}: Risk ${((asteroid.risk ?? 0) * 100).toFixed(1)}%, ` +
        `Size ${asteroid.size?.toFixed(0) ?? 'unknown'}m, ` +
        `Distance ${asteroid.missDistance?.toFixed(2) ?? 'unknown'} LD`,
      source: 'asteroid',
      asteroidId: asteroid.id,
      asteroidName: asteroid.name,
      confidence: asteroid.confidence,
    });
  });

  return {
    success: true,
    data: {
      asteroids: limitedResults,
      totalCount: results.length,
      filters: args,
      semanticScore,
    },
    citations,
  };
}

/**
 * Format search results for display
 */
export function formatSearchResults(result: AsteroidSearchResult): string {
  if (result.asteroids.length === 0) {
    return 'No asteroids found matching the search criteria.';
  }

  const lines = [
    `Found ${result.totalCount} asteroid(s). Showing top ${result.asteroids.length}:`,
    '',
  ];

  result.asteroids.forEach((asteroid, index) => {
    const risk = ((asteroid.risk ?? 0) * 100).toFixed(1);
    const size = asteroid.size?.toFixed(0) ?? '?';
    const distance = asteroid.missDistance?.toFixed(2) ?? '?';
    const velocity = asteroid.velocity?.toFixed(1) ?? '?';
    const hazard = asteroid.is_potentially_hazardous_asteroid ? '⚠️ PHA' : '';

    lines.push(
      `${index + 1}. **${asteroid.name}** (${asteroid.id}) ${hazard}`,
      `   Risk: ${risk}% | Size: ${size}m | Distance: ${distance} LD | Velocity: ${velocity} km/s`,
      `   Torino Scale: ${asteroid.torinoScale} | Hazard Level: ${asteroid.hazardLevel}`,
      ''
    );
  });

  return lines.join('\n');
}
