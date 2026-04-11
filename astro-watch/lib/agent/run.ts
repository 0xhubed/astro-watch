/**
 * Core agent loop.
 *
 * Steps:
 *   1. FETCH    — Pull NASA NEO feed for today + 7 days
 *   2. RECALL   — Load agent memory (observations, watchlist, summary)
 *   3. BUILD    — Construct system + user prompt from context
 *   4. CALL     — Invoke Claude with tools; handle the tool-calling loop
 *   5. PERSIST  — Save updated summary and lastRunAt timestamp
 */

import Anthropic from '@anthropic-ai/sdk';
import { fetchNEOFeed, EnhancedAsteroid } from '@/lib/nasa-api';
import { loadMemory, saveSummary, saveLastRunAt } from './memory';
import { agentTools, executeAgentTool } from './tools';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface AgentRunResult {
  success: boolean;
  asteroidsAnalyzed: number;
  toolCallsMade: number;
  summary: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Haiku drives the loop — fast, cheap, handles routine data crunching. */
const EXECUTOR_MODEL = 'claude-haiku-4-5-20251001';
/** Opus advises on high-stakes decisions (alerts, threat levels). */
const ADVISOR_MODEL = 'claude-opus-4-6';
/** Max times the executor can consult the advisor per run. */
const ADVISOR_MAX_USES = 3;
const MAX_TOKENS = 4096;
/** Guard against runaway tool-calling loops. */
const MAX_ITERATIONS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildSystemPrompt(
  today: string,
  lastRunAt: string | null,
  memorySummary: string,
): string {
  const lastRun = lastRunAt ? `Last analysis run: ${lastRunAt}` : 'This is the first agent run.';

  return `You are AstroWatch's autonomous asteroid monitoring agent. Your mission is to:
  • Analyse the Near-Earth Object (NEO) feed for the next 7 days
  • Identify objects that are potentially hazardous, unusually close, fast, or rare
  • Save observations about noteworthy asteroids
  • Annotate the 3-D solar-system scene with concise labels for the most important objects
  • Publish threat assessments for medium-risk or higher bodies
  • Write a daily briefing summarising key findings
  • Send email alerts only for genuinely critical objects (rarity ≥ 4 or risk ≥ 0.7)

Today: ${today}
${lastRun}

Prior context summary:
${memorySummary || 'No prior context available.'}

Guidelines:
  - Use tools decisively; do not ask for confirmation.
  - Prioritise objects with high rarity scores, PHA designation, or very close miss distances (<0.05 AU).
  - Always call update_briefing once at the end of your analysis.
  - Keep annotation labels short (≤ 30 chars).
  - For send_alert, use the ALERT_TO_EMAIL environment variable as the recipient.
  - Consult the advisor before: sending email alerts, assigning "high" or "critical" threat levels, or when uncertain about an unusual orbital pattern. The advisor provides expert-level reasoning for these high-stakes decisions.`;
}

function buildUserPrompt(asteroids: EnhancedAsteroid[]): string {
  const payload = asteroids.map((a) => ({
    id: a.id,
    name: a.name,
    isPHA: a.is_potentially_hazardous_asteroid,
    rarity: a.rarity,
    hazardLevel: a.hazardLevel,
    risk: parseFloat(a.risk.toFixed(4)),
    confidence: parseFloat(a.confidence.toFixed(4)),
    size_m: parseFloat(a.size.toFixed(1)),
    velocity_kms: parseFloat(a.velocity.toFixed(2)),
    missDistance_au: parseFloat(a.missDistance.toFixed(6)),
    impactEnergy_J: a.impactEnergy,
    closeApproachDate: a.close_approach_data[0]?.close_approach_date,
    orbit: {
      semiMajorAxis: a.orbit.semi_major_axis,
      eccentricity: a.orbit.eccentricity,
      inclination: a.orbit.inclination,
    },
  }));

  return `Here is the current NEO feed data (${asteroids.length} objects over the next 7 days):\n\n${JSON.stringify(payload, null, 2)}\n\nPlease analyse these objects and use the available tools to record your findings.`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runAgent(): Promise<AgentRunResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let toolCallsMade = 0;
  let finalSummary = '';

  try {
    // ------------------------------------------------------------------
    // 1. FETCH
    // ------------------------------------------------------------------
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    const asteroids: EnhancedAsteroid[] = await fetchNEOFeed(
      formatDate(today),
      formatDate(endDate),
    );

    // ------------------------------------------------------------------
    // 2. RECALL
    // ------------------------------------------------------------------
    const memory = await loadMemory();

    // ------------------------------------------------------------------
    // 3. BUILD PROMPT
    // ------------------------------------------------------------------
    const systemPrompt = buildSystemPrompt(
      formatDate(today),
      memory.lastRunAt,
      memory.summary,
    );

    const userPrompt = buildUserPrompt(asteroids);

    // ------------------------------------------------------------------
    // 4. CALL CLAUDE — tool-calling loop
    // ------------------------------------------------------------------
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ];

    let iterations = 0;
    let lastTextContent = '';

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: EXECUTOR_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: [
          // Advisor: Opus provides strategic guidance on high-stakes decisions
          {
            type: 'advisor_20260301',
            name: 'advisor',
            model: ADVISOR_MODEL,
            max_uses: ADVISOR_MAX_USES,
          } as unknown as Anthropic.Tool,
          ...agentTools,
        ],
        messages,
      });

      // Collect any text from this turn
      for (const block of response.content) {
        if (block.type === 'text') {
          lastTextContent = block.text;
        }
      }

      // If Claude is done (no tool calls), break
      if (response.stop_reason === 'end_turn') {
        finalSummary = lastTextContent;
        break;
      }

      // Collect tool_use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        // No more tool calls and stop_reason is not end_turn — safe to exit
        finalSummary = lastTextContent;
        break;
      }

      // Execute tools in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          toolCallsMade++;
          const resultText = await executeAgentTool(
            block.name,
            block.input as Record<string, unknown>,
            asteroids,
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: resultText,
          };
        }),
      );

      // Append assistant turn + tool results to the conversation
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    // ------------------------------------------------------------------
    // 5. PERSIST
    // ------------------------------------------------------------------
    const runSummary =
      finalSummary ||
      `Agent run completed. Analysed ${asteroids.length} NEOs, made ${toolCallsMade} tool calls.`;

    await saveSummary(runSummary);
    await saveLastRunAt(new Date());

    return {
      success: true,
      asteroidsAnalyzed: asteroids.length,
      toolCallsMade,
      summary: runSummary,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[agent/run] Fatal error:', message);

    return {
      success: false,
      asteroidsAnalyzed: 0,
      toolCallsMade,
      summary: '',
      error: message,
    };
  }
}
