/**
 * Compare Asteroids Tool
 * Compare multiple asteroids across various metrics
 */

import type { ToolFunction } from '../../llm/types';
import type {
  ToolContext,
  ToolResult,
  AsteroidComparison,
  Citation,
} from '../types';
import type { EnhancedAsteroid } from '../../nasa-api';

export const COMPARE_ASTEROIDS_SCHEMA: ToolFunction['parameters'] = {
  type: 'object',
  properties: {
    asteroidIds: {
      type: 'array',
      description: 'List of 2-5 asteroid IDs to compare',
      items: { type: 'string' },
    },
  },
  required: ['asteroidIds'],
};

interface CompareArgs {
  asteroidIds: string[];
}

export async function compareAsteroids(
  args: CompareArgs,
  context: ToolContext
): Promise<ToolResult<AsteroidComparison>> {
  const { asteroidIds } = args;

  if (!asteroidIds || asteroidIds.length < 2) {
    return {
      success: false,
      error: 'Please provide at least 2 asteroid IDs to compare',
    };
  }

  if (asteroidIds.length > 5) {
    return {
      success: false,
      error: 'Maximum 5 asteroids can be compared at once',
    };
  }

  // Find asteroids by ID
  const asteroidMap = new Map(context.asteroids.map((a) => [a.id, a]));
  const foundAsteroids: EnhancedAsteroid[] = [];
  const notFound: string[] = [];

  for (const id of asteroidIds) {
    // Try exact match first
    let asteroid = asteroidMap.get(id);

    // Try case-insensitive match
    if (!asteroid) {
      const idLower = id.toLowerCase();
      asteroid = context.asteroids.find(
        (a) =>
          a.id.toLowerCase() === idLower ||
          a.name.toLowerCase().includes(idLower)
      );
    }

    if (asteroid) {
      foundAsteroids.push(asteroid);
    } else {
      notFound.push(id);
    }
  }

  if (foundAsteroids.length < 2) {
    return {
      success: false,
      error: `Could not find enough asteroids. Not found: ${notFound.join(', ')}`,
    };
  }

  // Calculate metrics
  const metrics = calculateMetrics(foundAsteroids);
  const rankings = calculateRankings(foundAsteroids);
  const summary = generateSummary(foundAsteroids, metrics, rankings);

  // Generate citations
  const citations: Citation[] = foundAsteroids.map((asteroid) => ({
    id: `cite_${asteroid.id}`,
    text: `${asteroid.name}: Compared asteroid`,
    source: 'asteroid',
    asteroidId: asteroid.id,
    asteroidName: asteroid.name,
    confidence: asteroid.confidence,
  }));

  return {
    success: true,
    data: {
      asteroids: foundAsteroids,
      metrics,
      rankings,
      summary,
    },
    citations,
  };
}

function calculateMetrics(asteroids: EnhancedAsteroid[]): AsteroidComparison['metrics'] {
  const getMetric = (
    accessor: (a: EnhancedAsteroid) => number | undefined,
    defaultVal = 0
  ) => {
    const values = asteroids.map((a) => ({
      asteroid: a,
      value: accessor(a) ?? defaultVal,
    }));

    const sorted = [...values].sort((a, b) => a.value - b.value);
    const sum = values.reduce((acc, v) => acc + v.value, 0);

    return {
      min: sorted[0].asteroid,
      max: sorted[sorted.length - 1].asteroid,
      average: sum / values.length,
    };
  };

  return {
    size: getMetric((a) => a.size),
    risk: getMetric((a) => a.risk),
    distance: getMetric((a) => a.missDistance),
    velocity: getMetric((a) => a.velocity),
  };
}

function calculateRankings(asteroids: EnhancedAsteroid[]): AsteroidComparison['rankings'] {
  const byRisk = [...asteroids].sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0));
  const bySize = [...asteroids].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const byCloseness = [...asteroids].sort(
    (a, b) => (a.missDistance ?? Infinity) - (b.missDistance ?? Infinity)
  );

  return {
    byRisk,
    bySize,
    byCloseness,
  };
}

function generateSummary(
  asteroids: EnhancedAsteroid[],
  metrics: AsteroidComparison['metrics'],
  rankings: AsteroidComparison['rankings']
): string {
  const lines: string[] = [];

  // Overview
  lines.push(`Comparing ${asteroids.length} asteroids:\n`);

  // Key findings
  const mostDangerous = rankings.byRisk[0];
  const largest = rankings.bySize[0];
  const closest = rankings.byCloseness[0];

  lines.push('**Key Findings:**');

  if (mostDangerous) {
    lines.push(
      `- Highest risk: ${mostDangerous.name} (${((mostDangerous.risk ?? 0) * 100).toFixed(1)}%)`
    );
  }

  if (largest) {
    lines.push(
      `- Largest: ${largest.name} (${largest.size?.toFixed(0) ?? 'unknown'}m diameter)`
    );
  }

  if (closest) {
    lines.push(
      `- Closest approach: ${closest.name} (${closest.missDistance?.toFixed(2) ?? 'unknown'} LD)`
    );
  }

  // Averages
  lines.push('\n**Averages:**');
  lines.push(`- Risk: ${(metrics.risk.average * 100).toFixed(1)}%`);
  lines.push(`- Size: ${metrics.size.average.toFixed(0)}m`);
  lines.push(`- Distance: ${metrics.distance.average.toFixed(2)} LD`);
  lines.push(`- Velocity: ${metrics.velocity.average.toFixed(1)} km/s`);

  // Notable differences
  const riskRange = (metrics.risk.max.risk ?? 0) - (metrics.risk.min.risk ?? 0);
  if (riskRange > 0.3) {
    lines.push(
      `\n**Note:** Significant risk variation (${(riskRange * 100).toFixed(1)}%) between asteroids.`
    );
  }

  return lines.join('\n');
}

/**
 * Format comparison results as a table
 */
export function formatComparisonTable(result: AsteroidComparison): string {
  const { asteroids, rankings } = result;

  const header = ['Metric', ...asteroids.map((a) => a.name)];
  const separator = header.map(() => '---');

  const rows = [
    ['Risk', ...asteroids.map((a) => `${((a.risk ?? 0) * 100).toFixed(1)}%`)],
    ['Size (m)', ...asteroids.map((a) => a.size?.toFixed(0) ?? '?')],
    ['Distance (LD)', ...asteroids.map((a) => a.missDistance?.toFixed(2) ?? '?')],
    ['Velocity (km/s)', ...asteroids.map((a) => a.velocity?.toFixed(1) ?? '?')],
    ['Torino Scale', ...asteroids.map((a) => String(a.torinoScale))],
    ['Hazard Level', ...asteroids.map((a) => a.hazardLevel)],
    ['PHA', ...asteroids.map((a) => (a.is_potentially_hazardous_asteroid ? 'Yes' : 'No'))],
  ];

  const formatRow = (cells: string[]) => `| ${cells.join(' | ')} |`;

  const lines = [
    formatRow(header),
    formatRow(separator),
    ...rows.map(formatRow),
    '',
    '**Rankings:**',
    `- By Risk: ${rankings.byRisk.map((a) => a.name).join(' > ')}`,
    `- By Size: ${rankings.bySize.map((a) => a.name).join(' > ')}`,
    `- By Closeness: ${rankings.byCloseness.map((a) => a.name).join(' > ')}`,
  ];

  return lines.join('\n');
}
