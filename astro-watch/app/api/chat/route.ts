import { NextRequest } from 'next/server';
import { chatTools, executeQueryAsteroids, executeGetStatistics, executeGetAgentInsights } from '@/lib/chat/tools';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { fetchNEOFeed, EnhancedAsteroid } from '@/lib/nasa-api';
import { rateLimit } from '@/lib/rate-limit';
import { filterMessage } from '@/lib/content-filter';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

async function getAsteroids(): Promise<EnhancedAsteroid[]> {
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const start = today.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return await fetchNEOFeed(start, end);
  } catch (e) {
    console.error('Failed to fetch asteroids for chat:', e);
    return [];
  }
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  asteroids: EnhancedAsteroid[]
): Promise<{ result: string; sceneCommand?: Record<string, unknown> }> {
  switch (toolName) {
    case 'query_asteroids':
      return {
        result: executeQueryAsteroids(
          asteroids,
          args as Parameters<typeof executeQueryAsteroids>[1]
        ),
      };
    case 'get_statistics':
      return {
        result: executeGetStatistics(
          asteroids,
          args as Parameters<typeof executeGetStatistics>[1]
        ),
      };
    case 'control_scene':
      return {
        result: JSON.stringify({ success: true, action: args.action }),
        sceneCommand: args,
      };
    case 'get_agent_insights':
      return {
        result: await executeGetAgentInsights(
          args as Parameters<typeof executeGetAgentInsights>[0]
        ),
      };
    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

// Limits — tune as needed
const RATE_LIMIT_PER_HOUR = 30;      // max chat messages per IP per hour
const GLOBAL_DAILY_LIMIT = 1000;     // max chat messages across ALL users per day
const MAX_MESSAGE_LENGTH = 2000;     // max characters per user message
const MAX_CONVERSATION_MESSAGES = 30; // max messages in a single request

export async function POST(request: NextRequest) {
  // --- Rate limiting (per IP, sliding window) ---
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous';

  const { allowed, remaining, retryAfterSeconds } = await rateLimit(
    `chat:${ip}`,
    RATE_LIMIT_PER_HOUR,
    3600,
  );

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(RATE_LIMIT_PER_HOUR),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // --- Global daily budget (all users combined) ---
  const { allowed: globalAllowed } = await rateLimit(
    'chat:global',
    GLOBAL_DAILY_LIMIT,
    86400,
  );

  if (!globalAllowed) {
    return new Response(
      JSON.stringify({ error: 'The AI assistant has reached its daily usage limit. Please check back tomorrow.' }),
      {
        status: 429,
        headers: { 'Retry-After': '3600' },
      },
    );
  }

  // --- Input validation ---
  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), { status: 400 });
  }

  if (messages.length > MAX_CONVERSATION_MESSAGES) {
    return new Response(
      JSON.stringify({ error: `Too many messages (max ${MAX_CONVERSATION_MESSAGES})` }),
      { status: 400 },
    );
  }

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage && lastUserMessage.content.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }),
      { status: 400 },
    );
  }

  // --- Content filter (runs before LLM call — saves tokens) ---
  if (lastUserMessage) {
    const filterResult = filterMessage(lastUserMessage.content);
    if (!filterResult.allowed) {
      return new Response(JSON.stringify({ error: filterResult.reason }), { status: 400 });
    }
  }

  // --- Message sanitization: only allow user/assistant roles from the client ---
  // Prevents clients from injecting system or tool role messages.
  const sanitizedMessages = messages.filter(
    m => m.role === 'user' || m.role === 'assistant',
  );

  const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
  const baseUrl = process.env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.com/v1';
  const model = process.env.OLLAMA_CLOUD_MODEL || 'gemma4:31b-cloud';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OLLAMA_CLOUD_API_KEY not configured' }), {
      status: 500,
    });
  }

  const asteroids = await getAsteroids();
  const systemPrompt = buildSystemPrompt(asteroids);

  const allMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...sanitizedMessages.slice(-20),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let loopCount = 0;
        while (loopCount < 5) {
          loopCount++;

          // OpenAI-compatible endpoint on Ollama Cloud
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: allMessages,
              tools: chatTools,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            send({ type: 'error', content: `API error: ${response.status} ${errorText}` });
            break;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let assistantContent = '';
          let toolCalls: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }> = [];
          let currentToolCall: {
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          } | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;
                if (delta.content) {
                  assistantContent += delta.content;
                  send({ type: 'text', content: delta.content });
                }
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.id) {
                      if (currentToolCall) toolCalls.push(currentToolCall);
                      currentToolCall = {
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.function?.name || '', arguments: '' },
                      };
                    }
                    if (tc.function?.name && currentToolCall) {
                      currentToolCall.function.name = tc.function.name;
                    }
                    if (tc.function?.arguments && currentToolCall) {
                      currentToolCall.function.arguments += tc.function.arguments;
                    }
                  }
                }
              } catch {
                /* skip malformed SSE frames */
              }
            }
          }

          if (currentToolCall) toolCalls.push(currentToolCall);
          if (toolCalls.length === 0) break;

          allMessages.push({
            role: 'assistant',
            content: assistantContent || '',
            tool_calls: toolCalls,
          });

          for (const tc of toolCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              /* leave args as empty object */
            }
            send({ type: 'tool_call', name: tc.function.name, arguments: args });
            const { result, sceneCommand } = await executeTool(tc.function.name, args, asteroids);
            if (sceneCommand) send({ type: 'scene_command', ...sceneCommand });
            allMessages.push({ role: 'tool', content: result, tool_call_id: tc.id });
          }

          toolCalls = [];
          currentToolCall = null;
          assistantContent = '';
        }

        send({ type: 'done' });
      } catch (error) {
        send({
          type: 'error',
          content: `Stream error: ${error instanceof Error ? error.message : 'Unknown'}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': String(RATE_LIMIT_PER_HOUR),
      'X-RateLimit-Remaining': String(remaining),
    },
  });
}
