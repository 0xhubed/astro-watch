/**
 * Ingest API Route
 * Batch embedding and ingestion of asteroid data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVectorClient } from '@/lib/retrieval';
import type { IngestionChunk, ChunkType } from '@/lib/retrieval/types';
import type { EnhancedAsteroid } from '@/lib/nasa-api';

// Admin token for ingestion
const INGEST_TOKEN = process.env.INGEST_API_TOKEN;

interface IngestRequest {
  asteroids: EnhancedAsteroid[];
  updateExisting?: boolean;
}

export async function POST(request: NextRequest) {
  // Check admin authorization
  const authHeader = request.headers.get('authorization');
  if (INGEST_TOKEN && authHeader !== `Bearer ${INGEST_TOKEN}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as IngestRequest;

    if (!body.asteroids || !Array.isArray(body.asteroids)) {
      return NextResponse.json(
        { error: 'asteroids array is required' },
        { status: 400 }
      );
    }

    if (body.asteroids.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 asteroids per request' },
        { status: 400 }
      );
    }

    const vectorClient = getVectorClient();

    // Generate chunks for each asteroid
    const chunks: IngestionChunk[] = [];

    for (const asteroid of body.asteroids) {
      // Generate different chunk types for comprehensive coverage
      chunks.push(...generateAsteroidChunks(asteroid));
    }

    // Ingest chunks
    const result = await vectorClient.ingest(chunks);

    return NextResponse.json({
      success: true,
      asteroidsProcessed: body.asteroids.length,
      chunksGenerated: chunks.length,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error('Ingest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateAsteroidChunks(asteroid: EnhancedAsteroid): IngestionChunk[] {
  const chunks: IngestionChunk[] = [];
  const baseMetadata = {
    name: asteroid.name,
    risk: asteroid.risk,
    torinoScale: asteroid.torinoScale,
    hazardLevel: asteroid.hazardLevel,
    isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
  };

  // Full description chunk
  chunks.push({
    asteroidId: asteroid.id,
    chunkType: 'full',
    content: generateFullDescription(asteroid),
    metadata: baseMetadata,
  });

  // Orbital data chunk
  if (asteroid.orbit) {
    chunks.push({
      asteroidId: asteroid.id,
      chunkType: 'orbital',
      content: generateOrbitalDescription(asteroid),
      metadata: {
        ...baseMetadata,
        semi_major_axis: asteroid.orbit.semi_major_axis,
        eccentricity: asteroid.orbit.eccentricity,
      },
    });
  }

  // Risk assessment chunk
  chunks.push({
    asteroidId: asteroid.id,
    chunkType: 'risk',
    content: generateRiskDescription(asteroid),
    metadata: {
      ...baseMetadata,
      impactEnergy: asteroid.impactEnergy,
    },
  });

  // Close approach chunk
  if (asteroid.close_approach_data && asteroid.close_approach_data.length > 0) {
    chunks.push({
      asteroidId: asteroid.id,
      chunkType: 'approach',
      content: generateApproachDescription(asteroid),
      metadata: {
        ...baseMetadata,
        missDistance: asteroid.missDistance,
        velocity: asteroid.velocity,
      },
    });
  }

  return chunks;
}

function generateFullDescription(asteroid: EnhancedAsteroid): string {
  const parts: string[] = [];

  parts.push(`${asteroid.name} (${asteroid.id}) is a near-Earth asteroid.`);

  if (asteroid.size) {
    parts.push(`It has an estimated diameter of ${asteroid.size.toFixed(0)} meters.`);
  }

  if (asteroid.is_potentially_hazardous_asteroid) {
    parts.push('It is classified as a potentially hazardous asteroid (PHA).');
  }

  if (asteroid.risk !== undefined) {
    const riskPercent = (asteroid.risk * 100).toFixed(1);
    parts.push(`The ML-derived risk score is ${riskPercent}%.`);
  }

  if (asteroid.torinoScale !== undefined) {
    parts.push(`Torino scale rating: ${asteroid.torinoScale}/10 (${asteroid.hazardLevel}).`);
  }

  if (asteroid.missDistance !== undefined) {
    parts.push(`Closest approach distance: ${asteroid.missDistance.toFixed(2)} lunar distances.`);
  }

  if (asteroid.velocity !== undefined) {
    parts.push(`Relative velocity: ${asteroid.velocity.toFixed(1)} km/s.`);
  }

  return parts.join(' ');
}

function generateOrbitalDescription(asteroid: EnhancedAsteroid): string {
  const parts: string[] = [];

  parts.push(`Orbital characteristics of ${asteroid.name}:`);

  if (asteroid.orbit?.semi_major_axis) {
    parts.push(`Semi-major axis: ${asteroid.orbit.semi_major_axis.toFixed(3)} AU.`);
  }

  if (asteroid.orbit?.eccentricity !== undefined) {
    parts.push(`Eccentricity: ${asteroid.orbit.eccentricity.toFixed(4)}.`);
  }

  if (asteroid.orbit?.inclination !== undefined) {
    parts.push(`Inclination: ${asteroid.orbit.inclination.toFixed(2)} degrees.`);
  }

  // Calculate orbital period
  if (asteroid.orbit?.semi_major_axis) {
    const periodYears = Math.pow(asteroid.orbit.semi_major_axis, 1.5);
    parts.push(`Orbital period: approximately ${periodYears.toFixed(2)} years.`);
  }

  return parts.join(' ');
}

function generateRiskDescription(asteroid: EnhancedAsteroid): string {
  const parts: string[] = [];

  parts.push(`Risk assessment for ${asteroid.name}:`);

  if (asteroid.torinoScale !== undefined) {
    const torinoDescriptions: Record<number, string> = {
      0: 'No hazard - virtually no chance of collision',
      1: 'Normal - routine discovery, merits monitoring',
      2: 'Merits attention by astronomers',
      3: 'Close encounter, 1%+ chance of localized destruction',
      4: 'Close encounter, 1%+ chance of regional devastation',
      5: 'Serious but uncertain threat of regional devastation',
      6: 'Serious but uncertain threat of global catastrophe',
      7: 'Very close encounter with serious global threat',
      8: 'Certain collision with localized destruction',
      9: 'Certain collision with regional devastation',
      10: 'Certain collision with global catastrophe',
    };
    const desc = torinoDescriptions[asteroid.torinoScale] ?? 'Unknown';
    parts.push(`Torino Scale: ${asteroid.torinoScale} - ${desc}.`);
  }

  if (asteroid.risk !== undefined) {
    const riskLevel =
      asteroid.risk > 0.7
        ? 'high'
        : asteroid.risk > 0.4
          ? 'moderate'
          : asteroid.risk > 0.1
            ? 'low'
            : 'minimal';
    parts.push(`ML risk assessment: ${(asteroid.risk * 100).toFixed(1)}% (${riskLevel} risk).`);
  }

  if (asteroid.impactEnergy) {
    const energyMT = asteroid.impactEnergy / 4.184e15; // Convert to megatons
    if (energyMT > 1) {
      parts.push(`Estimated impact energy: ${energyMT.toFixed(2)} megatons TNT equivalent.`);
    } else {
      parts.push(`Estimated impact energy: ${(energyMT * 1000).toFixed(0)} kilotons TNT equivalent.`);
    }
  }

  return parts.join(' ');
}

function generateApproachDescription(asteroid: EnhancedAsteroid): string {
  const parts: string[] = [];
  const approach = asteroid.close_approach_data?.[0];

  parts.push(`Close approach data for ${asteroid.name}:`);

  if (approach?.close_approach_date) {
    parts.push(`Next close approach: ${approach.close_approach_date}.`);
  }

  if (asteroid.missDistance !== undefined) {
    const km = asteroid.missDistance * 384400;
    parts.push(
      `Miss distance: ${asteroid.missDistance.toFixed(2)} lunar distances ` +
        `(${km.toFixed(0)} km).`
    );
  }

  if (asteroid.velocity !== undefined) {
    parts.push(`Relative velocity: ${asteroid.velocity.toFixed(1)} km/s.`);
  }

  // Compare to Moon distance
  if (asteroid.missDistance !== undefined) {
    if (asteroid.missDistance < 1) {
      parts.push('This is closer than the Moon!');
    } else if (asteroid.missDistance < 5) {
      parts.push('This is a relatively close approach.');
    } else {
      parts.push('This is a safe distance from Earth.');
    }
  }

  return parts.join(' ');
}

// GET endpoint for stats
export async function GET() {
  try {
    const vectorClient = getVectorClient();
    const stats = await vectorClient.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Ingest stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
