/**
 * Tool Registry
 * Central registry for all agent tools
 */

import type { ToolFunction } from '../../llm/types';
import type { ToolDefinition, ToolName, ToolContext, ToolResult } from '../types';
import { searchAsteroids, SEARCH_ASTEROIDS_SCHEMA } from './search-asteroids';
import { compareAsteroids, COMPARE_ASTEROIDS_SCHEMA } from './compare-asteroids';
import { calculateTrajectory, CALCULATE_TRAJECTORY_SCHEMA } from './calculate-trajectory';
import { getRiskAnalysis, GET_RISK_ANALYSIS_SCHEMA } from './get-risk-analysis';

// Tool registry map
const toolRegistry = new Map<ToolName, ToolDefinition>();

// Register all tools
toolRegistry.set('search_asteroids', {
  name: 'search_asteroids',
  description: 'Search for asteroids matching specific criteria. Supports filtering by risk, size, distance, and more.',
  parameters: SEARCH_ASTEROIDS_SCHEMA,
  execute: searchAsteroids,
});

toolRegistry.set('compare_asteroids', {
  name: 'compare_asteroids',
  description: 'Compare multiple asteroids side-by-side across various metrics including size, risk, velocity, and distance.',
  parameters: COMPARE_ASTEROIDS_SCHEMA,
  execute: compareAsteroids,
});

toolRegistry.set('calculate_trajectory', {
  name: 'calculate_trajectory',
  description: 'Calculate and project an asteroid\'s orbital trajectory, including closest approach details.',
  parameters: CALCULATE_TRAJECTORY_SCHEMA,
  execute: calculateTrajectory,
});

toolRegistry.set('get_risk_analysis', {
  name: 'get_risk_analysis',
  description: 'Perform detailed risk analysis including Torino scale assessment and impact scenarios.',
  parameters: GET_RISK_ANALYSIS_SCHEMA,
  execute: getRiskAnalysis,
});

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name as ToolName);
}

/**
 * Get all registered tools
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tool functions for LLM
 */
export function getToolFunctions(): ToolFunction[] {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const tool = getTool(name);

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${name}`,
    };
  }

  try {
    return await tool.execute(args, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a tool exists
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name as ToolName);
}

/**
 * Get tool names
 */
export function getToolNames(): ToolName[] {
  return Array.from(toolRegistry.keys());
}

// Export individual tools for direct use
export { searchAsteroids } from './search-asteroids';
export { compareAsteroids } from './compare-asteroids';
export { calculateTrajectory } from './calculate-trajectory';
export { getRiskAnalysis } from './get-risk-analysis';
