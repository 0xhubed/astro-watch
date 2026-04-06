# Phase 3: Chat Assistant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a conversational AI assistant powered by Qwen 3.5 397B via Ollama Cloud. Users can ask about asteroids, get analytics, and control the 3D scene through natural language.

**Architecture:** New `/api/chat` route handles SSE streaming to Ollama Cloud's OpenAI-compatible API with tool-calling. A slide-out chat panel renders responses and intercepts scene commands dispatched to the Zustand store. System prompt includes current asteroid summary.

**Tech Stack:** Next.js API routes (SSE streaming), Ollama Cloud (OpenAI-compatible), Zustand (scene control), React (chat UI).

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/chat/tools.ts` | Tool definitions + server-side tool execution functions |
| Create | `lib/chat/system-prompt.ts` | Dynamic system prompt builder with asteroid context |
| Create | `app/api/chat/route.ts` | SSE streaming route, Ollama Cloud API calls, tool-calling loop |
| Create | `components/chat/ChatPanel.tsx` | Slide-out chat UI with message rendering and streaming |
| Create | `components/chat/ChatMessage.tsx` | Individual message bubble component |
| Modify | `lib/store.ts` | Add chat-related state (open/close panel, scene commands) |
| Modify | `app/dashboard/page.tsx` | Mount ChatPanel |
| Modify | `.env.example` | Add Ollama Cloud env vars |

---

### Task 1: Chat Tools and System Prompt

**Files:**
- Create: `astro-watch/lib/chat/tools.ts`
- Create: `astro-watch/lib/chat/system-prompt.ts`
- Modify: `astro-watch/.env.example`

- [ ] **Step 1: Add env vars to .env.example**

Add to `astro-watch/.env.example`:
```
# Ollama Cloud (Chat Assistant)
OLLAMA_CLOUD_API_KEY=your_ollama_cloud_api_key
OLLAMA_CLOUD_BASE_URL=https://api.ollama.com/v1
OLLAMA_CLOUD_MODEL=qwen3.5:397b
```

- [ ] **Step 2: Create tools.ts with tool definitions and execution**

Create `astro-watch/lib/chat/tools.ts`:

```ts
import { EnhancedAsteroid } from '@/lib/nasa-api';

// OpenAI-compatible tool definitions for Qwen function calling
export const chatTools = [
  {
    type: 'function' as const,
    function: {
      name: 'query_asteroids',
      description: 'Search and filter asteroid data. Use this to answer questions about specific asteroids or find asteroids matching criteria.',
      parameters: {
        type: 'object',
        properties: {
          sort_by: { type: 'string', enum: ['risk', 'rarity', 'size', 'velocity', 'miss_distance'], description: 'Field to sort by' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          limit: { type: 'number', description: 'Max results to return', default: 5 },
          min_rarity: { type: 'number', description: 'Minimum rarity score (0-6+)' },
          hazard_level: { type: 'string', enum: ['none', 'normal', 'noteworthy', 'rare', 'exceptional'] },
          name_search: { type: 'string', description: 'Search asteroid by name (partial match)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'control_scene',
      description: 'Control the 3D visualization. Use this when the user asks to see, show, focus on, zoom to, or filter the view.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['focus', 'set_filter', 'set_view', 'toggle_trajectories', 'cinematic'],
            description: 'The scene action to perform',
          },
          asteroid_id: { type: 'string', description: 'Asteroid ID for focus/cinematic actions' },
          filter: { type: 'string', enum: ['all', 'threatening', 'attention', 'normal'], description: 'Risk filter for set_filter action' },
          view: { type: 'string', enum: ['solar-system', 'dashboard', 'impact-globe'], description: 'View mode for set_view action' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_statistics',
      description: 'Compute statistics about the current asteroid data. Use for analytical questions about distributions, trends, and comparisons.',
      parameters: {
        type: 'object',
        properties: {
          stat_type: {
            type: 'string',
            enum: ['risk_distribution', 'size_summary', 'velocity_summary', 'closest_approaches', 'hazardous_count'],
            description: 'Type of statistic to compute',
          },
        },
        required: ['stat_type'],
      },
    },
  },
];

// Server-side tool execution
export function executeQueryAsteroids(
  asteroids: EnhancedAsteroid[],
  params: {
    sort_by?: string;
    sort_order?: string;
    limit?: number;
    min_rarity?: number;
    hazard_level?: string;
    name_search?: string;
  }
): string {
  let filtered = [...asteroids];

  if (params.name_search) {
    const search = params.name_search.toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(search));
  }
  if (params.min_rarity !== undefined) {
    filtered = filtered.filter(a => a.rarity >= params.min_rarity!);
  }
  if (params.hazard_level) {
    filtered = filtered.filter(a => a.hazardLevel === params.hazard_level);
  }

  const sortKey = params.sort_by || 'rarity';
  const sortOrder = params.sort_order === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortKey] as number;
    const bVal = (b as Record<string, unknown>)[sortKey] as number;
    return (aVal - bVal) * sortOrder;
  });

  const limit = params.limit || 5;
  const results = filtered.slice(0, limit);

  return JSON.stringify(results.map(a => ({
    id: a.id,
    name: a.name,
    rarity: a.rarity,
    hazardLevel: a.hazardLevel,
    size: `${a.size.toFixed(0)}m`,
    velocity: `${a.velocity.toFixed(1)} km/s`,
    missDistance: `${a.missDistance.toFixed(4)} AU`,
    risk: a.risk.toFixed(3),
    isPHA: a.is_potentially_hazardous_asteroid,
    closeApproachDate: a.close_approach_data[0]?.close_approach_date,
  })));
}

export function executeGetStatistics(
  asteroids: EnhancedAsteroid[],
  params: { stat_type: string }
): string {
  switch (params.stat_type) {
    case 'risk_distribution': {
      const dist = { exceptional: 0, rare: 0, noteworthy: 0, normal: 0, none: 0 };
      asteroids.forEach(a => dist[a.hazardLevel]++);
      return JSON.stringify({ total: asteroids.length, distribution: dist });
    }
    case 'size_summary': {
      const sizes = asteroids.map(a => a.size);
      return JSON.stringify({
        count: sizes.length,
        min: `${Math.min(...sizes).toFixed(0)}m`,
        max: `${Math.max(...sizes).toFixed(0)}m`,
        avg: `${(sizes.reduce((s, v) => s + v, 0) / sizes.length).toFixed(0)}m`,
      });
    }
    case 'velocity_summary': {
      const vels = asteroids.map(a => a.velocity);
      return JSON.stringify({
        count: vels.length,
        min: `${Math.min(...vels).toFixed(1)} km/s`,
        max: `${Math.max(...vels).toFixed(1)} km/s`,
        avg: `${(vels.reduce((s, v) => s + v, 0) / vels.length).toFixed(1)} km/s`,
      });
    }
    case 'closest_approaches': {
      const sorted = [...asteroids].sort((a, b) => a.missDistance - b.missDistance).slice(0, 5);
      return JSON.stringify(sorted.map(a => ({
        name: a.name,
        missDistance: `${a.missDistance.toFixed(4)} AU`,
        missDistanceKm: `${(a.missDistance * 149597870.7).toFixed(0)} km`,
        date: a.close_approach_data[0]?.close_approach_date,
      })));
    }
    case 'hazardous_count': {
      const pha = asteroids.filter(a => a.is_potentially_hazardous_asteroid);
      return JSON.stringify({
        total: asteroids.length,
        potentiallyHazardous: pha.length,
        percentage: `${((pha.length / asteroids.length) * 100).toFixed(1)}%`,
      });
    }
    default:
      return JSON.stringify({ error: 'Unknown stat_type' });
  }
}
```

- [ ] **Step 3: Create system-prompt.ts**

Create `astro-watch/lib/chat/system-prompt.ts`:

```ts
import { EnhancedAsteroid } from '@/lib/nasa-api';

export function buildSystemPrompt(asteroids: EnhancedAsteroid[]): string {
  const totalCount = asteroids.length;
  const phaCount = asteroids.filter(a => a.is_potentially_hazardous_asteroid).length;
  const closestApproach = asteroids.length > 0
    ? [...asteroids].sort((a, b) => a.missDistance - b.missDistance)[0]
    : null;
  const highestRarity = asteroids.length > 0
    ? [...asteroids].sort((a, b) => b.rarity - a.rarity)[0]
    : null;

  return `You are the AstroWatch AI assistant, helping users explore near-Earth asteroid data from NASA.

Current data summary:
- ${totalCount} asteroids currently tracked
- ${phaCount} designated as Potentially Hazardous Asteroids (PHA)
${closestApproach ? `- Closest approach: ${closestApproach.name} at ${closestApproach.missDistance.toFixed(4)} AU` : ''}
${highestRarity ? `- Highest rarity: ${highestRarity.name} (rarity ${highestRarity.rarity.toFixed(1)})` : ''}

You can:
1. Answer questions about specific asteroids or general NEO data
2. Control the 3D visualization (focus on asteroids, filter by risk, switch views)
3. Compute statistics and analytics
4. Explain concepts (Torino scale, miss distance, PHA designation, rarity scores)

When users ask to see or show something, use the control_scene tool. When they ask about data, use query_asteroids or get_statistics.

Be concise. Use the tools to get data before answering data questions — don't guess.
Rarity scale: 0 = common, 1+ = noteworthy, 2+ = attention, 4+ = rare, 6+ = exceptional.
Miss distance is in AU (1 AU = ~150 million km). 1 lunar distance = ~0.00257 AU.`;
}
```

- [ ] **Step 4: Commit**

```bash
git add astro-watch/lib/chat/ astro-watch/.env.example
git commit -m "Add chat tools, system prompt builder, and Ollama Cloud env vars"
```

---

### Task 2: Chat API Route (SSE Streaming)

**Files:**
- Create: `astro-watch/app/api/chat/route.ts`

- [ ] **Step 1: Create the streaming chat route**

Create `astro-watch/app/api/chat/route.ts`:

```ts
import { NextRequest } from 'next/server';
import { chatTools, executeQueryAsteroids, executeGetStatistics } from '@/lib/chat/tools';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { fetchNEOFeed, enhanceAsteroidData, EnhancedAsteroid } from '@/lib/nasa-api';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

async function getAsteroids(): Promise<EnhancedAsteroid[]> {
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const start = today.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const feed = await fetchNEOFeed(start, end);
    const asteroids: EnhancedAsteroid[] = [];
    for (const dateKey of Object.keys(feed.near_earth_objects)) {
      for (const neo of feed.near_earth_objects[dateKey]) {
        asteroids.push(await enhanceAsteroidData(neo));
      }
    }
    return asteroids;
  } catch {
    return [];
  }
}

function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  asteroids: EnhancedAsteroid[]
): { result: string; sceneCommand?: Record<string, unknown> } {
  switch (toolName) {
    case 'query_asteroids':
      return { result: executeQueryAsteroids(asteroids, args as Parameters<typeof executeQueryAsteroids>[1]) };
    case 'get_statistics':
      return { result: executeGetStatistics(asteroids, args as Parameters<typeof executeGetStatistics>[1]) };
    case 'control_scene':
      return {
        result: JSON.stringify({ success: true, action: args.action }),
        sceneCommand: args,
      };
    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
  const baseUrl = process.env.OLLAMA_CLOUD_BASE_URL || 'https://api.ollama.com/v1';
  const model = process.env.OLLAMA_CLOUD_MODEL || 'qwen3.5:397b';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OLLAMA_CLOUD_API_KEY not configured' }), { status: 500 });
  }

  const asteroids = await getAsteroids();
  const systemPrompt = buildSystemPrompt(asteroids);

  const allMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-20),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Tool-calling loop: call Ollama, execute tools, repeat until text response
        let loopCount = 0;
        while (loopCount < 5) {
          loopCount++;

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
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
          let toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
          let currentToolCall: { id: string; type: 'function'; function: { name: string; arguments: string } } | null = null;

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

                // Stream text content
                if (delta.content) {
                  assistantContent += delta.content;
                  send({ type: 'text', content: delta.content });
                }

                // Accumulate tool calls
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.id) {
                      if (currentToolCall) toolCalls.push(currentToolCall);
                      currentToolCall = { id: tc.id, type: 'function', function: { name: tc.function?.name || '', arguments: '' } };
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
                // Skip malformed SSE lines
              }
            }
          }

          if (currentToolCall) toolCalls.push(currentToolCall);

          // If no tool calls, we're done
          if (toolCalls.length === 0) break;

          // Add assistant message with tool calls
          allMessages.push({
            role: 'assistant',
            content: assistantContent || '',
            tool_calls: toolCalls,
          });

          // Execute each tool call
          for (const tc of toolCalls) {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.function.arguments); } catch { /* empty args */ }

            send({ type: 'tool_call', name: tc.function.name, arguments: args });

            const { result, sceneCommand } = executeTool(tc.function.name, args, asteroids);

            if (sceneCommand) {
              send({ type: 'scene_command', ...sceneCommand });
            }

            allMessages.push({
              role: 'tool',
              content: result,
              tool_call_id: tc.id,
            });
          }

          // Reset for next iteration
          toolCalls = [];
          currentToolCall = null;
          assistantContent = '';
        }

        send({ type: 'done' });
      } catch (error) {
        send({ type: 'error', content: `Stream error: ${error instanceof Error ? error.message : 'Unknown'}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Verify typecheck and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck
git add app/api/chat/
git commit -m "Add /api/chat SSE streaming route with Ollama Cloud tool-calling"
```

---

### Task 3: Chat Store State

**Files:**
- Modify: `astro-watch/lib/store.ts`

- [ ] **Step 1: Add chat state to the Zustand store**

Add these properties to the store:

```ts
// Chat state
chatOpen: false,
setChatOpen: (open: boolean) => set({ chatOpen: open }),
pendingSceneCommand: null as Record<string, unknown> | null,
setPendingSceneCommand: (cmd: Record<string, unknown> | null) => set({ pendingSceneCommand: cmd }),
```

The `pendingSceneCommand` is how the chat API sends scene control commands to the 3D view. The chat panel writes to it, the dashboard reads and executes it.

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/store.ts
git commit -m "Add chat panel state and scene command slot to Zustand store"
```

---

### Task 4: Chat UI Components

**Files:**
- Create: `astro-watch/components/chat/ChatMessage.tsx`
- Create: `astro-watch/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Create ChatMessage.tsx**

Create `astro-watch/components/chat/ChatMessage.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
}

export function ChatMessage({ role, content, toolCall }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-purple-600/20 border border-purple-500/30 text-gray-200 rounded-br-sm'
            : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-bl-sm'
        }`}
      >
        {content}
        {toolCall && (
          <div className="mt-2 px-2 py-1 bg-blue-500/[0.08] border border-blue-500/20 rounded text-xs font-mono text-blue-400">
            → {toolCall.name}({Object.keys(toolCall.arguments).length > 0
              ? JSON.stringify(toolCall.arguments).slice(0, 60)
              : ''
            })
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create ChatPanel.tsx**

Create `astro-watch/components/chat/ChatPanel.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useAsteroidStore } from '@/lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

export function ChatPanel() {
  const { chatOpen, setChatOpen, selectAsteroid, setRiskFilter, setViewMode, toggleTrajectories, setCinematicTarget, asteroids } = useAsteroidStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSceneCommand = useCallback((cmd: Record<string, unknown>) => {
    switch (cmd.action) {
      case 'focus': {
        const asteroid = asteroids.find(a => a.id === cmd.asteroid_id || a.name.toLowerCase().includes(String(cmd.asteroid_id).toLowerCase()));
        if (asteroid) selectAsteroid(asteroid);
        break;
      }
      case 'set_filter':
        if (cmd.filter) setRiskFilter(cmd.filter as 'all' | 'threatening' | 'attention' | 'normal');
        break;
      case 'set_view':
        if (cmd.view) setViewMode(cmd.view as 'solar-system' | 'dashboard' | 'impact-globe');
        break;
      case 'toggle_trajectories':
        toggleTrajectories();
        break;
      case 'cinematic':
        if (cmd.asteroid_id) setCinematicTarget(cmd.asteroid_id as string);
        break;
    }
  }, [asteroids, selectAsteroid, setRiskFilter, setViewMode, toggleTrajectories, setCinematicTarget]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', toolCalls: [] };
    setMessages([...newMessages, assistantMessage]);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              assistantMessage.content += data.content;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            } else if (data.type === 'tool_call') {
              assistantMessage.toolCalls = [...(assistantMessage.toolCalls || []), { name: data.name, arguments: data.arguments }];
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            } else if (data.type === 'scene_command') {
              handleSceneCommand(data);
            } else if (data.type === 'error') {
              assistantMessage.content += `\n\nError: ${data.content}`;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
          } catch {
            // Skip malformed SSE
          }
        }
      }
    } catch (error) {
      assistantMessage.content = `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      {/* FAB trigger */}
      {!chatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => { setChatOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
          className="fixed bottom-20 md:bottom-12 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[400px] bg-gray-900/95 backdrop-blur-xl border-l border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <span className="text-sm font-semibold text-gray-200">AstroWatch AI</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">
                  Ask about asteroids, or say "show me the closest one"
                </div>
              )}
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolCall={msg.toolCalls?.[0]}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.08]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask about asteroids..."
                  disabled={isStreaming}
                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="w-9 h-9 flex items-center justify-center bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/components/chat/
git commit -m "Add ChatPanel and ChatMessage components with streaming and scene control"
```

---

### Task 5: Mount Chat in Dashboard

**Files:**
- Modify: `astro-watch/app/dashboard/page.tsx`

- [ ] **Step 1: Import and render ChatPanel**

In `astro-watch/app/dashboard/page.tsx`, add import:
```tsx
import { ChatPanel } from '@/components/chat/ChatPanel';
```

Add `<ChatPanel />` just before the closing `</div>` of the root element (after the footer, before `</div>`):
```tsx
      {/* Chat Assistant */}
      <ChatPanel />
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck && npm run build
```

```bash
git add astro-watch/app/dashboard/page.tsx
git commit -m "Mount ChatPanel in dashboard page"
```
