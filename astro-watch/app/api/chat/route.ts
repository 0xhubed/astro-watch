/**
 * Chat API Route
 * Streaming chat endpoint with ReAct agent execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentExecutor } from '@/lib/agent';
import type { ToolContext, AgentMessage, StreamEvent } from '@/lib/agent/types';
import type { EnhancedAsteroid } from '@/lib/nasa-api';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

interface ChatRequest {
  message: string;
  sessionId: string;
  asteroids?: Partial<EnhancedAsteroid>[];
  history?: AgentMessage[];
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (body.message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Build tool context
    const context: ToolContext = {
      asteroids: (body.asteroids ?? []) as EnhancedAsteroid[],
      sessionId: body.sessionId ?? `session_${Date.now()}`,
    };

    // Get executor
    const executor = getAgentExecutor();

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Execute with streaming
          const eventStream = executor.executeStream(
            body.message,
            context,
            body.history
          );

          for await (const event of eventStream) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errorEvent: StreamEvent = {
            type: 'error',
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
            recoverable: false,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Non-streaming fallback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const message = searchParams.get('message');

  if (!message) {
    return NextResponse.json(
      { error: 'Message parameter required' },
      { status: 400 }
    );
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  try {
    const context: ToolContext = {
      asteroids: [],
      sessionId: `session_${Date.now()}`,
    };

    const executor = getAgentExecutor();
    const result = await executor.execute(message, context);

    return NextResponse.json({
      response: result.response,
      modelUsed: result.modelUsed,
      latencyMs: result.totalLatencyMs,
      toolsUsed: result.state.toolExecutions.map((t) => t.name),
      citations: result.state.citations,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
