/**
 * Vector Search API Route
 * Semantic search endpoint for asteroid data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVectorClient, getRanker } from '@/lib/retrieval';
import type { VectorFilters, HybridSearchRequest } from '@/lib/retrieval/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HybridSearchRequest;

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const vectorClient = getVectorClient();
    const ranker = getRanker();

    // Build vector filters
    const filters: VectorFilters = {};
    if (body.vectorFilters) {
      Object.assign(filters, body.vectorFilters);
    }

    // Execute vector search
    const searchResponse = await vectorClient.search({
      query: body.query,
      filters,
      limit: (body.limit ?? 10) * 2, // Get more for ranking
      minScore: 0.3,
    });

    // Apply ranking
    const rankedResults = ranker.rank(searchResponse.results);

    // Apply limit after ranking
    const limitedResults = rankedResults.slice(0, body.limit ?? 10);

    return NextResponse.json({
      results: limitedResults,
      totalCount: searchResponse.totalCount,
      query: body.query,
      latencyMs: searchResponse.latencyMs,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter (q) is required' },
      { status: 400 }
    );
  }

  try {
    const vectorClient = getVectorClient();
    const ranker = getRanker();

    const searchResponse = await vectorClient.search({
      query,
      limit: limit * 2,
      minScore: 0.3,
    });

    const rankedResults = ranker.rank(searchResponse.results);
    const limitedResults = rankedResults.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      totalCount: searchResponse.totalCount,
      query,
      latencyMs: searchResponse.latencyMs,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
