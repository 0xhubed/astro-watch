/**
 * LLM Output Parser
 * Parses ReAct-style outputs and extracts tool calls
 */

import type { ToolCall, ParsedToolCall } from '../llm/types';
import type { ThinkingStep, ToolName } from './types';

// Valid tool names
const VALID_TOOLS: Set<string> = new Set([
  'search_asteroids',
  'compare_asteroids',
  'calculate_trajectory',
  'get_risk_analysis',
]);

export interface ParsedOutput {
  thought?: string;
  action?: {
    name: string;
    input: Record<string, unknown>;
  };
  finalAnswer?: string;
  isComplete: boolean;
}

/**
 * Parse ReAct-style output from LLM
 */
export function parseReActOutput(output: string): ParsedOutput {
  const result: ParsedOutput = {
    isComplete: false,
  };

  // Extract thought
  const thoughtMatch = output.match(/Thought:\s*(.+?)(?=Action:|Final Answer:|$)/is);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Check for final answer
  const finalAnswerMatch = output.match(/Final Answer:\s*(.+)/is);
  if (finalAnswerMatch) {
    result.finalAnswer = finalAnswerMatch[1].trim();
    result.isComplete = true;
    return result;
  }

  // Extract action and input
  const actionMatch = output.match(/Action:\s*(\w+)/i);
  const inputMatch = output.match(/Action Input:\s*(\{[\s\S]*?\})/i);

  if (actionMatch) {
    const actionName = actionMatch[1].trim();

    let actionInput: Record<string, unknown> = {};
    if (inputMatch) {
      try {
        actionInput = JSON.parse(inputMatch[1]);
      } catch {
        // Try to extract key-value pairs manually
        actionInput = parseLooseJson(inputMatch[1]);
      }
    }

    result.action = {
      name: actionName,
      input: actionInput,
    };
  }

  return result;
}

/**
 * Parse loose/malformed JSON
 */
function parseLooseJson(input: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Match key: value or "key": value patterns
  const kvPattern = /"?(\w+)"?\s*:\s*(?:"([^"]*)"|(\[[^\]]*\])|(\d+(?:\.\d+)?)|(\w+))/g;
  let match;

  while ((match = kvPattern.exec(input)) !== null) {
    const key = match[1];
    const stringValue = match[2];
    const arrayValue = match[3];
    const numberValue = match[4];
    const boolOrOther = match[5];

    if (stringValue !== undefined) {
      result[key] = stringValue;
    } else if (arrayValue !== undefined) {
      try {
        result[key] = JSON.parse(arrayValue);
      } catch {
        result[key] = arrayValue;
      }
    } else if (numberValue !== undefined) {
      result[key] = parseFloat(numberValue);
    } else if (boolOrOther !== undefined) {
      if (boolOrOther === 'true') result[key] = true;
      else if (boolOrOther === 'false') result[key] = false;
      else if (boolOrOther === 'null') result[key] = null;
      else result[key] = boolOrOther;
    }
  }

  return result;
}

/**
 * Parse Gemini native tool calls
 */
export function parseToolCalls(toolCalls: ToolCall[]): ParsedToolCall[] {
  return toolCalls.map((call) => {
    let args: Record<string, unknown> = {};

    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      args = parseLooseJson(call.function.arguments);
    }

    return {
      id: call.id,
      name: call.function.name,
      arguments: args,
    };
  });
}

/**
 * Validate tool name
 */
export function isValidToolName(name: string): name is ToolName {
  return VALID_TOOLS.has(name);
}

/**
 * Extract thinking steps from LLM output
 */
export function extractThinkingSteps(output: string): ThinkingStep[] {
  const steps: ThinkingStep[] = [];

  // Find all thoughts in the output
  const thoughtPattern = /Thought:\s*(.+?)(?=Action:|Final Answer:|Thought:|$)/gis;
  let match;
  let index = 0;

  while ((match = thoughtPattern.exec(output)) !== null) {
    steps.push({
      id: `thought_${Date.now()}_${index++}`,
      content: match[1].trim(),
      timestamp: new Date(),
    });
  }

  return steps;
}

/**
 * Extract citations from response text
 */
export function extractCitations(
  text: string
): { id: string; name: string; position: number }[] {
  const citations: { id: string; name: string; position: number }[] = [];

  // Match [Name](asteroid:ID) pattern
  const citationPattern = /\[([^\]]+)\]\(asteroid:([^)]+)\)/g;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    citations.push({
      name: match[1],
      id: match[2],
      position: match.index,
    });
  }

  return citations;
}

/**
 * Format observation for ReAct continuation
 */
export function formatObservation(
  toolName: string,
  result: unknown,
  error?: string
): string {
  if (error) {
    return `Observation: Error calling ${toolName}: ${error}`;
  }

  const resultStr =
    typeof result === 'string' ? result : JSON.stringify(result, null, 2);

  // Truncate very long results
  const maxLength = 4000;
  const truncated =
    resultStr.length > maxLength
      ? resultStr.substring(0, maxLength) + '\n... (truncated)'
      : resultStr;

  return `Observation: ${truncated}`;
}

/**
 * Build continuation prompt after tool execution
 */
export function buildContinuationPrompt(
  originalThought: string,
  action: string,
  observation: string
): string {
  return `Thought: ${originalThought}

Action: ${action}

${observation}

Thought:`;
}

/**
 * Check if output indicates completion
 */
export function isOutputComplete(output: string): boolean {
  // Check for Final Answer
  if (/Final Answer:/i.test(output)) {
    return true;
  }

  // Check if there's no action and meaningful content
  const hasAction = /Action:\s*\w+/i.test(output);
  const hasContent = output.trim().length > 50;

  return !hasAction && hasContent;
}

/**
 * Clean and normalize LLM output
 */
export function normalizeOutput(output: string): string {
  return output
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}
