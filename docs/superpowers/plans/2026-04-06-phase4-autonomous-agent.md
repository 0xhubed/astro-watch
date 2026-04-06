# Phase 4: Autonomous Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous monitoring agent powered by Claude API that replaces the current threshold-based `/api/monitoring` cron with intelligent analysis. The agent reasons about asteroid data, maintains memory via Vercel KV, publishes threat assessments, generates briefings, and sends alert emails.

**Architecture:** New `/api/agent` route uses the Anthropic SDK with tool-calling to let Claude analyze data and decide what actions to take. Agent memory persists in Vercel KV. New dynamic pages `/briefings` and `/threats/[id]` display agent-generated content. The existing monitoring cron schedule in `vercel.json` points to the new agent route.

**Tech Stack:** `@anthropic-ai/sdk` for Claude API, `@vercel/kv` for persistent memory, existing Resend integration for alerts.

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/agent/tools.ts` | Agent tool definitions and execution functions |
| Create | `lib/agent/memory.ts` | Vercel KV read/write helpers for agent memory |
| Create | `lib/agent/run.ts` | Core agent loop: fetch data, recall memory, call Claude, execute tools, persist |
| Modify | `app/api/monitoring/route.ts` | Replace threshold logic with agent invocation |
| Create | `app/briefings/page.tsx` | Display latest agent briefing |
| Create | `app/threats/[id]/page.tsx` | Display individual threat assessments |
| Modify | `vercel.json` | Update cron to every 4 hours, add agent function config |
| Modify | `.env.example` | Add ANTHROPIC_API_KEY, KV vars |
| Modify | `package.json` | Add @anthropic-ai/sdk, @vercel/kv |

---

### Task 1: Install Dependencies and Add Env Vars

**Files:**
- Modify: `astro-watch/package.json`
- Modify: `astro-watch/.env.example`

- [ ] **Step 1: Install packages**

```bash
cd /Users/daniel/Documents/projects/astro-watch/astro-watch
npm install @anthropic-ai/sdk @vercel/kv
```

- [ ] **Step 2: Add env vars to .env.example**

Append to `astro-watch/.env.example`:

```
# Autonomous Agent (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/package.json astro-watch/package-lock.json astro-watch/.env.example
git commit -m "Add @anthropic-ai/sdk and @vercel/kv dependencies, agent env vars"
```

---

### Task 2: Agent Memory Layer

**Files:**
- Create: `astro-watch/lib/agent/memory.ts`

- [ ] **Step 1: Create memory.ts with KV helpers**

Create `astro-watch/lib/agent/memory.ts`:

```ts
// Agent memory persistence via Vercel KV
// Falls back to in-memory store when KV is not configured (local dev)

interface AgentMemory {
  observations: Array<{
    date: string;
    objectId: string;
    type: 'new_object' | 'revision' | 'anomaly' | 'trend';
    details: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  watchlist: Array<{
    objectId: string;
    name: string;
    reason: string;
    addedAt: string;
  }>;
  annotations: Array<{
    objectId: string;
    label: string;
    severity: string;
    explanation: string;
    priority: number;
    updatedAt: string;
  }>;
  summary: string;
  lastRunAt: string;
}

const DEFAULT_MEMORY: AgentMemory = {
  observations: [],
  watchlist: [],
  annotations: [],
  summary: '',
  lastRunAt: '',
};

// In-memory fallback for local development
let localMemory: AgentMemory = { ...DEFAULT_MEMORY };

async function getKv() {
  if (!process.env.KV_REST_API_URL) return null;
  const { kv } = await import('@vercel/kv');
  return kv;
}

export async function loadMemory(): Promise<AgentMemory> {
  const kv = await getKv();
  if (!kv) return localMemory;

  const [observations, watchlist, annotations, summary, lastRunAt] = await Promise.all([
    kv.get<AgentMemory['observations']>('agent:observations') ?? [],
    kv.get<AgentMemory['watchlist']>('agent:watchlist') ?? [],
    kv.get<AgentMemory['annotations']>('agent:annotations') ?? [],
    kv.get<string>('agent:memory:summary') ?? '',
    kv.get<string>('agent:lastRunAt') ?? '',
  ]);

  return {
    observations: observations || [],
    watchlist: watchlist || [],
    annotations: annotations || [],
    summary: summary || '',
    lastRunAt: lastRunAt || '',
  };
}

export async function saveObservations(observations: AgentMemory['observations']): Promise<void> {
  const kv = await getKv();
  if (!kv) { localMemory.observations = observations; return; }
  await kv.set('agent:observations', observations, { ex: 90 * 86400 }); // 90 day TTL
}

export async function saveWatchlist(watchlist: AgentMemory['watchlist']): Promise<void> {
  const kv = await getKv();
  if (!kv) { localMemory.watchlist = watchlist; return; }
  await kv.set('agent:watchlist', watchlist);
}

export async function saveAnnotations(annotations: AgentMemory['annotations']): Promise<void> {
  const kv = await getKv();
  if (!kv) { localMemory.annotations = annotations; return; }
  await kv.set('agent:annotations', annotations, { ex: 48 * 3600 }); // 48h TTL
}

export async function saveBriefing(briefing: { summary: string; highlights: string[]; watchlist: string[]; stats: Record<string, unknown> }): Promise<void> {
  const kv = await getKv();
  const date = new Date().toISOString().split('T')[0];
  if (!kv) { localMemory.summary = JSON.stringify(briefing); return; }
  await kv.set('agent:briefing:latest', briefing);
  await kv.set(`agent:briefing:${date}`, briefing, { ex: 30 * 86400 }); // 30 day TTL
}

export async function loadBriefing(): Promise<Record<string, unknown> | null> {
  const kv = await getKv();
  if (!kv) return localMemory.summary ? JSON.parse(localMemory.summary) : null;
  return kv.get('agent:briefing:latest');
}

export async function saveThreat(objectId: string, threat: { title: string; analysis: string; riskLevel: string; updatedAt: string }): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  await kv.set(`agent:threats:${objectId}`, threat);
}

export async function loadThreat(objectId: string): Promise<Record<string, unknown> | null> {
  const kv = await getKv();
  if (!kv) return null;
  return kv.get(`agent:threats:${objectId}`);
}

export async function saveSummary(summary: string): Promise<void> {
  const kv = await getKv();
  if (!kv) { localMemory.summary = summary; return; }
  await kv.set('agent:memory:summary', summary);
}

export async function saveLastRunAt(date: string): Promise<void> {
  const kv = await getKv();
  if (!kv) { localMemory.lastRunAt = date; return; }
  await kv.set('agent:lastRunAt', date);
}

export async function loadAnnotationsPublic(): Promise<AgentMemory['annotations']> {
  const kv = await getKv();
  if (!kv) return localMemory.annotations;
  return (await kv.get<AgentMemory['annotations']>('agent:annotations')) || [];
}
```

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/agent/
git commit -m "Add agent memory layer with Vercel KV persistence and local fallback"
```

---

### Task 3: Agent Tools

**Files:**
- Create: `astro-watch/lib/agent/tools.ts`

- [ ] **Step 1: Create tools.ts**

Create `astro-watch/lib/agent/tools.ts` with Anthropic SDK tool definitions:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { sendCriticalAsteroidsEmail } from '@/lib/email';
import {
  saveObservations, saveWatchlist, saveAnnotations,
  saveBriefing, saveThreat, saveSummary, loadMemory
} from './memory';

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'save_observation',
    description: 'Record something notable about an asteroid or the current data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        object_id: { type: 'string', description: 'Asteroid ID' },
        observation_type: { type: 'string', enum: ['new_object', 'revision', 'anomaly', 'trend'] },
        details: { type: 'string', description: 'What was observed' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['object_id', 'observation_type', 'details', 'severity'],
    },
  },
  {
    name: 'annotate_scene',
    description: 'Write a 3D annotation for the dashboard scene. Will appear as a floating label near the asteroid.',
    input_schema: {
      type: 'object' as const,
      properties: {
        object_id: { type: 'string' },
        label: { type: 'string', description: 'Short label text' },
        severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
        explanation: { type: 'string', description: 'Detailed explanation shown on hover' },
        priority: { type: 'number', description: '1-10, higher = more prominent' },
      },
      required: ['object_id', 'label', 'severity', 'explanation', 'priority'],
    },
  },
  {
    name: 'publish_threat',
    description: 'Publish a detailed threat assessment page for an asteroid. Only use for genuinely notable objects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        object_id: { type: 'string' },
        title: { type: 'string' },
        analysis: { type: 'string', description: 'Markdown analysis text' },
        risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['object_id', 'title', 'analysis', 'risk_level'],
    },
  },
  {
    name: 'update_briefing',
    description: 'Generate or update the daily NEO briefing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'Brief overview paragraph' },
        highlights: { type: 'array', items: { type: 'string' }, description: 'Key findings' },
        watchlist: { type: 'array', items: { type: 'string' }, description: 'Objects to watch' },
        stats: { type: 'object', description: 'Key numbers (total, PHA count, etc.)' },
      },
      required: ['summary', 'highlights', 'watchlist', 'stats'],
    },
  },
  {
    name: 'send_alert',
    description: 'Send an email alert for critical events. Only use for truly notable situations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subject: { type: 'string' },
        body: { type: 'string', description: 'Email body text' },
        urgency: { type: 'string', enum: ['info', 'warning', 'critical'] },
      },
      required: ['subject', 'body', 'urgency'],
    },
  },
];

export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  asteroids: EnhancedAsteroid[],
): Promise<string> {
  switch (toolName) {
    case 'save_observation': {
      const memory = await loadMemory();
      const obs = {
        date: new Date().toISOString(),
        objectId: input.object_id as string,
        type: input.observation_type as 'new_object' | 'revision' | 'anomaly' | 'trend',
        details: input.details as string,
        severity: input.severity as 'low' | 'medium' | 'high' | 'critical',
      };
      const updated = [...memory.observations.slice(-50), obs]; // Keep last 50
      await saveObservations(updated);
      return JSON.stringify({ saved: true, totalObservations: updated.length });
    }

    case 'annotate_scene': {
      const memory = await loadMemory();
      const annotation = {
        objectId: input.object_id as string,
        label: input.label as string,
        severity: input.severity as string,
        explanation: input.explanation as string,
        priority: input.priority as number,
        updatedAt: new Date().toISOString(),
      };
      const existing = memory.annotations.filter(a => a.objectId !== annotation.objectId);
      await saveAnnotations([...existing, annotation]);
      return JSON.stringify({ annotated: true, objectId: annotation.objectId });
    }

    case 'publish_threat': {
      await saveThreat(input.object_id as string, {
        title: input.title as string,
        analysis: input.analysis as string,
        riskLevel: input.risk_level as string,
        updatedAt: new Date().toISOString(),
      });
      return JSON.stringify({ published: true, url: `/threats/${input.object_id}` });
    }

    case 'update_briefing': {
      await saveBriefing({
        summary: input.summary as string,
        highlights: input.highlights as string[],
        watchlist: input.watchlist as string[],
        stats: input.stats as Record<string, unknown>,
      });
      return JSON.stringify({ briefingUpdated: true });
    }

    case 'send_alert': {
      const to = process.env.NOTIFICATION_EMAIL;
      if (!to) return JSON.stringify({ sent: false, reason: 'No notification email configured' });
      const result = await sendCriticalAsteroidsEmail({
        to,
        subject: input.subject as string,
        asteroids: asteroids.filter(a => a.rarity >= 4).map(a => ({
          id: a.id, name: a.name, rarity: a.rarity, risk: a.risk,
          isPHA: a.is_potentially_hazardous_asteroid, size: a.size,
          velocity: a.velocity, missDistance: a.missDistance,
          closeApproachDate: a.close_approach_data[0]?.close_approach_date,
        })),
      });
      return JSON.stringify({ sent: true, result });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/agent/tools.ts
git commit -m "Add agent tool definitions and execution for Claude autonomous agent"
```

---

### Task 4: Agent Core Loop

**Files:**
- Create: `astro-watch/lib/agent/run.ts`

- [ ] **Step 1: Create run.ts**

Create `astro-watch/lib/agent/run.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { fetchNEOFeed, EnhancedAsteroid } from '@/lib/nasa-api';
import { agentTools, executeAgentTool } from './tools';
import { loadMemory, saveSummary, saveLastRunAt } from './memory';

export interface AgentRunResult {
  success: boolean;
  asteroidsAnalyzed: number;
  toolCallsMade: number;
  summary: string;
  error?: string;
}

export async function runAgent(): Promise<AgentRunResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, asteroidsAnalyzed: 0, toolCallsMade: 0, summary: '', error: 'ANTHROPIC_API_KEY not configured' };
  }

  // 1. FETCH
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 7);
  const start = today.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  let asteroids: EnhancedAsteroid[];
  try {
    asteroids = await fetchNEOFeed(start, end);
  } catch (e) {
    return { success: false, asteroidsAnalyzed: 0, toolCallsMade: 0, summary: '', error: `Failed to fetch NEO data: ${e}` };
  }

  // 2. RECALL
  const memory = await loadMemory();

  // 3. Build context for Claude
  const asteroidSummary = asteroids.map(a => ({
    id: a.id, name: a.name, rarity: a.rarity, hazardLevel: a.hazardLevel,
    size: `${a.size.toFixed(0)}m`, velocity: `${a.velocity.toFixed(1)} km/s`,
    missDistance: `${a.missDistance.toFixed(4)} AU`, risk: a.risk.toFixed(3),
    isPHA: a.is_potentially_hazardous_asteroid,
    closeApproachDate: a.close_approach_data[0]?.close_approach_date,
  }));

  const systemPrompt = `You are the AstroWatch autonomous monitoring agent. You analyze near-Earth asteroid data from NASA and take actions when you find notable objects or trends.

Current date: ${today.toISOString().split('T')[0]}
Last run: ${memory.lastRunAt || 'never'}

Your memory from previous runs:
- Observations: ${memory.observations.length} recorded
- Watchlist: ${memory.watchlist.map(w => w.name).join(', ') || 'empty'}
- Previous summary: ${memory.summary || 'none'}

Current asteroid data (${asteroids.length} objects):
${JSON.stringify(asteroidSummary, null, 2)}

Your task:
1. Compare current data against your previous observations
2. Identify: new objects, anomalous velocities/sizes, objects crossing alert thresholds, emerging trends
3. Use your tools to: save observations, annotate notable objects for the dashboard, update the daily briefing
4. Only publish threat assessments for genuinely exceptional objects (rarity >= 4)
5. Only send email alerts for critical situations
6. Always update the briefing with a summary of your analysis

Be thorough but judicious. Not every run needs alerts or threats — most runs should just observe and brief.`;

  // 4. ANALYZE + DECIDE (tool-calling loop)
  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: 'Analyze the current asteroid data and take appropriate actions.' },
  ];

  let toolCallsMade = 0;
  let summaryText = '';

  try {
    let loopCount = 0;
    while (loopCount < 10) {
      loopCount++;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: agentTools,
        messages,
      });

      // Collect text and tool use blocks
      const textBlocks = response.content.filter(b => b.type === 'text');
      const toolBlocks = response.content.filter(b => b.type === 'tool_use');

      if (textBlocks.length > 0) {
        summaryText += textBlocks.map(b => b.type === 'text' ? b.text : '').join('\n');
      }

      if (response.stop_reason === 'end_turn' || toolBlocks.length === 0) {
        break;
      }

      // Execute tool calls
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.type === 'tool_use') {
          toolCallsMade++;
          const result = await executeAgentTool(block.name, block.input as Record<string, unknown>, asteroids);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }
  } catch (e) {
    return {
      success: false, asteroidsAnalyzed: asteroids.length,
      toolCallsMade, summary: summaryText,
      error: `Claude API error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // 5. PERSIST
  await saveSummary(summaryText);
  await saveLastRunAt(today.toISOString());

  return { success: true, asteroidsAnalyzed: asteroids.length, toolCallsMade, summary: summaryText };
}
```

- [ ] **Step 2: Commit**

```bash
git add astro-watch/lib/agent/run.ts
git commit -m "Add core agent loop: fetch, recall, analyze with Claude, execute tools, persist"
```

---

### Task 5: Replace Monitoring Route + Update Cron

**Files:**
- Modify: `astro-watch/app/api/monitoring/route.ts`
- Modify: `astro-watch/vercel.json`

- [ ] **Step 1: Replace monitoring route**

Rewrite `astro-watch/app/api/monitoring/route.ts` to call the agent:

```ts
import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/run';

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  if (dryRun) {
    return NextResponse.json({ status: 'dry_run', message: 'Agent would run here' });
  }

  try {
    const result = await runAgent();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Agent run failed:', error);
    return NextResponse.json({ error: 'Agent run failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update vercel.json cron to every 4 hours**

Change the cron schedule from `0 0 * * *` (daily) to `0 */4 * * *` (every 4 hours). Also add function config for the agent route:

In `vercel.json`, update:
```json
"functions": {
  "app/api/asteroids/route.ts": { "maxDuration": 30 },
  "app/api/monitoring/route.ts": { "maxDuration": 60 },
  "app/api/chat/route.ts": { "maxDuration": 30 }
},
```

And update crons:
```json
"crons": [
  { "path": "/api/monitoring", "schedule": "0 */4 * * *" }
]
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/app/api/monitoring/route.ts astro-watch/vercel.json
git commit -m "Replace threshold-based monitoring with Claude autonomous agent, update cron to 4h"
```

---

### Task 6: Briefings and Threats Pages

**Files:**
- Create: `astro-watch/app/briefings/page.tsx`
- Create: `astro-watch/app/threats/[id]/page.tsx`

- [ ] **Step 1: Create briefings page**

Create `astro-watch/app/briefings/page.tsx`:

```tsx
import { loadBriefing } from '@/lib/agent/memory';

export const dynamic = 'force-dynamic';

export default async function BriefingsPage() {
  const briefing = await loadBriefing();

  return (
    <div className="min-h-screen bg-space-dark text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold mb-2">NEO Daily Briefing</h1>
        <p className="text-gray-400 text-sm mb-8">Generated by AstroWatch AI Agent</p>

        {!briefing ? (
          <div className="text-gray-500">No briefing available yet. The agent runs every 4 hours.</div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-200 mb-3">Summary</h2>
              <p className="text-gray-300 leading-relaxed">{(briefing as Record<string, unknown>).summary as string}</p>
            </section>

            {Array.isArray((briefing as Record<string, unknown>).highlights) && ((briefing as Record<string, unknown>).highlights as string[]).length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-200 mb-3">Highlights</h2>
                <ul className="space-y-2">
                  {((briefing as Record<string, unknown>).highlights as string[]).map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Array.isArray((briefing as Record<string, unknown>).watchlist) && ((briefing as Record<string, unknown>).watchlist as string[]).length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-200 mb-3">Watchlist</h2>
                <ul className="space-y-2">
                  {((briefing as Record<string, unknown>).watchlist as string[]).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-amber-400 mt-1">⚠</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="border-t border-gray-800 pt-4 text-xs text-gray-500">
              Generated by Claude Agent • Updated periodically
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create threats page**

Create `astro-watch/app/threats/[id]/page.tsx`:

```tsx
import { loadThreat } from '@/lib/agent/memory';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ThreatPage({ params }: Props) {
  const { id } = await params;
  const threat = await loadThreat(id);

  if (!threat) notFound();

  const riskColors: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/15 text-green-400 border-green-500/30',
  };

  const riskLevel = (threat.riskLevel as string) || 'medium';
  const riskClass = riskColors[riskLevel] || riskColors.medium;

  return (
    <div className="min-h-screen bg-space-dark text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className={`inline-block px-3 py-1 rounded border text-xs font-semibold uppercase mb-4 ${riskClass}`}>
          {riskLevel} risk
        </div>
        <h1 className="text-3xl font-semibold mb-2">{threat.title as string}</h1>
        <p className="text-gray-400 text-sm mb-8">Threat Assessment • {threat.updatedAt as string}</p>

        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap">
          {threat.analysis as string}
        </div>

        <div className="border-t border-gray-800 mt-8 pt-4 text-xs text-gray-500">
          Generated by Claude Agent • Asteroid ID: {id}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add astro-watch/app/briefings/ astro-watch/app/threats/
git commit -m "Add /briefings and /threats/[id] pages for agent-published content"
```

---

### Task 7: Build Verification

- [ ] **Step 1: Typecheck**

```bash
cd /Users/daniel/Documents/projects/astro-watch/astro-watch && npm run typecheck
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: New routes `/briefings` and `/threats/[id]` appear in build output.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "Fix build issues from Phase 4 integration"
```
