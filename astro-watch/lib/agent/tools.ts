/**
 * Agent tool definitions (Anthropic SDK format) and execution logic.
 *
 * Five tools are exposed to Claude:
 *   1. save_observation   — record a noteworthy asteroid in persistent memory
 *   2. annotate_scene     — attach a visible label to an asteroid in the 3-D scene
 *   3. publish_threat     — store a structured threat assessment for an object
 *   4. update_briefing    — write today's mission briefing
 *   5. send_alert         — email the operator when a critical body is detected
 */

import Anthropic from '@anthropic-ai/sdk';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { sendCriticalAsteroidsEmail, CriticalAsteroidSummary } from '@/lib/email';
import {
  loadMemory,
  saveObservations,
  saveAnnotations,
  saveThreat,
  saveBriefing,
  AgentObservation,
  SceneAnnotation,
  ThreatAssessment,
  AgentBriefing,
} from './memory';

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic SDK format)
// ---------------------------------------------------------------------------

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'save_observation',
    description:
      'Record an observation about a specific asteroid into the agent\'s persistent memory. ' +
      'Use this for bodies that are noteworthy, hazardous, or should be tracked across runs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asteroidId: {
          type: 'string',
          description: 'The NASA NEO ID of the asteroid.',
        },
        name: {
          type: 'string',
          description: 'Human-readable name of the asteroid.',
        },
        notes: {
          type: 'string',
          description: 'Detailed observation notes, trajectory context, or risk reasoning.',
        },
        rarity: {
          type: 'number',
          description: 'Rarity score (0–10) as computed by AstroWatch.',
        },
        risk: {
          type: 'number',
          description: 'Risk score (0–1) as computed by AstroWatch.',
        },
      },
      required: ['asteroidId', 'name', 'notes', 'rarity', 'risk'],
    },
  },

  {
    name: 'annotate_scene',
    description:
      'Attach a visual annotation label to an asteroid in the 3-D solar-system scene ' +
      'so dashboard users can immediately see your assessment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asteroidId: {
          type: 'string',
          description: 'The NASA NEO ID of the asteroid to annotate.',
        },
        label: {
          type: 'string',
          description: 'Short label text shown in the scene (e.g. "PHA – Watch", "Close Approach").',
        },
        color: {
          type: 'string',
          description: 'Optional hex color for the label (e.g. "#ff4444").',
        },
        notes: {
          type: 'string',
          description: 'Optional longer tooltip text.',
        },
      },
      required: ['asteroidId', 'label'],
    },
  },

  {
    name: 'publish_threat',
    description:
      'Store a structured threat assessment for an asteroid. ' +
      'Use for any body assessed as medium risk or higher.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asteroidId: {
          type: 'string',
          description: 'The NASA NEO ID.',
        },
        level: {
          type: 'string',
          enum: ['none', 'low', 'medium', 'high', 'critical'],
          description: 'Threat level classification.',
        },
        summary: {
          type: 'string',
          description: 'One-paragraph threat summary for operators.',
        },
        factors: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of key factors driving the threat classification.',
        },
      },
      required: ['asteroidId', 'level', 'summary', 'factors'],
    },
  },

  {
    name: 'update_briefing',
    description:
      'Write the daily mission briefing that appears on the AstroWatch dashboard. ' +
      'Call this once per run after completing all analyses.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Two-to-four sentence executive summary of today\'s NEO activity.',
        },
        highlights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to five bullet-point highlights for the briefing card.',
        },
      },
      required: ['summary', 'highlights'],
    },
  },

  {
    name: 'send_alert',
    description:
      'Send an email alert to the operator about one or more critical asteroids. ' +
      'Only call this for genuinely high-priority or critical objects — avoid alert fatigue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address (use ALERT_TO_EMAIL env var value if available).',
        },
        subject: {
          type: 'string',
          description: 'Optional custom email subject line.',
        },
        asteroids: {
          type: 'array',
          description: 'List of critical asteroids to include in the alert.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              rarity: { type: 'number' },
              risk: { type: 'number' },
              isPHA: { type: 'boolean' },
              size: { type: 'number', description: 'Max estimated diameter in meters.' },
              velocity: { type: 'number', description: 'Relative velocity in km/s.' },
              missDistance: { type: 'number', description: 'Miss distance in AU.' },
              closeApproachDate: { type: 'string', description: 'ISO date string.' },
            },
            required: ['id', 'name', 'rarity', 'risk', 'isPHA', 'size', 'velocity', 'missDistance'],
          },
        },
      },
      required: ['to', 'asteroids'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

/**
 * Execute a single agent tool call and return a JSON-serialised result string.
 *
 * @param toolName   Name matching one of the agentTools entries.
 * @param input      Parsed input object from Claude's tool_use block.
 * @param asteroids  Current asteroid data set (used for context lookups).
 */
export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  asteroids: EnhancedAsteroid[],
): Promise<string> {
  try {
    switch (toolName) {
      case 'save_observation': {
        const memory = await loadMemory();
        const now = new Date().toISOString();

        const newObs: AgentObservation = {
          asteroidId: input.asteroidId as string,
          name: input.name as string,
          notes: input.notes as string,
          rarity: input.rarity as number,
          risk: input.risk as number,
          observedAt: now,
        };

        // Upsert: replace existing entry for same asteroid if present
        const existing = memory.observations.filter(
          (o) => o.asteroidId !== newObs.asteroidId,
        );
        await saveObservations([...existing, newObs]);

        return JSON.stringify({ success: true, asteroidId: newObs.asteroidId });
      }

      case 'annotate_scene': {
        const memory = await loadMemory();
        const now = new Date().toISOString();

        const newAnnotation: SceneAnnotation = {
          asteroidId: input.asteroidId as string,
          label: input.label as string,
          color: (input.color as string | undefined),
          notes: (input.notes as string | undefined),
          createdAt: now,
        };

        const existing = memory.annotations.filter(
          (a) => a.asteroidId !== newAnnotation.asteroidId,
        );
        await saveAnnotations([...existing, newAnnotation]);

        return JSON.stringify({ success: true, asteroidId: newAnnotation.asteroidId });
      }

      case 'publish_threat': {
        const now = new Date().toISOString();

        const threat: ThreatAssessment = {
          asteroidId: input.asteroidId as string,
          level: input.level as ThreatAssessment['level'],
          summary: input.summary as string,
          factors: input.factors as string[],
          assessedAt: now,
        };

        await saveThreat(threat.asteroidId, threat);

        return JSON.stringify({ success: true, asteroidId: threat.asteroidId, level: threat.level });
      }

      case 'update_briefing': {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        const briefing: AgentBriefing = {
          date: today,
          summary: input.summary as string,
          highlights: input.highlights as string[],
          generatedAt: now,
        };

        await saveBriefing(briefing);

        return JSON.stringify({ success: true, date: today });
      }

      case 'send_alert': {
        const alertTo = (input.to as string) || process.env.ALERT_TO_EMAIL || '';
        if (!alertTo) {
          return JSON.stringify({ success: false, error: 'No recipient address provided and ALERT_TO_EMAIL is not set.' });
        }

        const asteroidSummaries = (input.asteroids as CriticalAsteroidSummary[]);

        const result = await sendCriticalAsteroidsEmail({
          to: alertTo,
          subject: input.subject as string | undefined,
          asteroids: asteroidSummaries,
        });

        if (!result) {
          return JSON.stringify({ success: false, error: 'Email sending skipped — RESEND_API_KEY not configured.' });
        }

        if (result.error) {
          return JSON.stringify({ success: false, error: result.error });
        }

        return JSON.stringify({ success: true, emailId: result.id });
      }

      default:
        return JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent/tools] Error executing tool "${toolName}":`, message);
    return JSON.stringify({ success: false, error: message });
  }
}
