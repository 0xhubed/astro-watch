/**
 * Embed API Route
 * Proxy endpoint to Ubuntu embedding service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEmbedClient } from '@/lib/retrieval';

interface EmbedRequest {
  texts: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmbedRequest;

    if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    if (body.texts.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 texts per request' },
        { status: 400 }
      );
    }

    // Validate text lengths
    for (const text of body.texts) {
      if (typeof text !== 'string' || text.length > 10000) {
        return NextResponse.json(
          { error: 'Each text must be a string with max 10000 characters' },
          { status: 400 }
        );
      }
    }

    const embedClient = getEmbedClient();
    const response = await embedClient.embedBatch(body.texts);

    return NextResponse.json({
      embeddings: response.embeddings,
      model: response.model,
      dimensions: response.dimensions,
      count: response.embeddings.length,
    });
  } catch (error) {
    console.error('Embed API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get('text');

  if (!text) {
    return NextResponse.json(
      { error: 'text parameter is required' },
      { status: 400 }
    );
  }

  if (text.length > 10000) {
    return NextResponse.json(
      { error: 'Text too long (max 10000 characters)' },
      { status: 400 }
    );
  }

  try {
    const embedClient = getEmbedClient();
    const embedding = await embedClient.embed(text);

    return NextResponse.json({
      embedding,
      dimensions: embedding.length,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });
  } catch (error) {
    console.error('Embed API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}
