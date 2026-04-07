import { NextRequest } from 'next/server';
import { chatTools, executeQueryAsteroids, executeGetStatistics, executeGetAgentInsights } from '@/lib/chat/tools';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { fetchNEOFeed, EnhancedAsteroid } from '@/lib/nasa-api';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>;
  name?: string; // tool name for role: 'tool'
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

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: Array<{ role: string; content: string }> };

  const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
  const baseUrl = process.env.OLLAMA_CLOUD_BASE_URL || 'https://ollama.com';
  const model = process.env.OLLAMA_CLOUD_MODEL || 'qwen3.5:397b-cloud';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OLLAMA_CLOUD_API_KEY not configured' }), {
      status: 500,
    });
  }

  const asteroids = await getAsteroids();
  const systemPrompt = buildSystemPrompt(asteroids);

  const allMessages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-20).map(m => ({ role: m.role as OllamaMessage['role'], content: m.content })),
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

          // Call Ollama Cloud API (native format)
          const response = await fetch(`${baseUrl}/api/chat`, {
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

          // Ollama streams newline-delimited JSON (not SSE)
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let assistantContent = '';
          let toolCalls: Array<{ function: { name: string; arguments: Record<string, unknown> } }> = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Process complete JSON lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const chunk = JSON.parse(line);

                // Stream text content
                if (chunk.message?.content) {
                  assistantContent += chunk.message.content;
                  send({ type: 'text', content: chunk.message.content });
                }

                // Collect tool calls (arrive in the final chunk or accumulated)
                if (chunk.message?.tool_calls) {
                  toolCalls = chunk.message.tool_calls;
                }
              } catch {
                /* skip malformed lines */
              }
            }
          }

          // If no tool calls, we're done
          if (toolCalls.length === 0) break;

          // Add assistant message with tool calls to conversation
          allMessages.push({
            role: 'assistant',
            content: assistantContent || '',
            tool_calls: toolCalls,
          });

          // Execute each tool call
          for (const tc of toolCalls) {
            const toolName = tc.function.name;
            // Ollama returns arguments as an object (not a JSON string)
            const args = tc.function.arguments;

            send({ type: 'tool_call', name: toolName, arguments: args });

            const { result, sceneCommand } = await executeTool(toolName, args, asteroids);
            if (sceneCommand) send({ type: 'scene_command', ...sceneCommand });

            // Ollama expects tool results with 'name' field (not tool_call_id)
            allMessages.push({
              role: 'tool',
              content: result,
              name: toolName,
            });
          }

          // Reset for next iteration
          toolCalls = [];
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
    },
  });
}
