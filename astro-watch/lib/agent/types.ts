/**
 * Agent Types for AstroWatch Agentic System
 * Defines types for messages, tools, traces, and executor state
 */

import type { ModelTier, TokenUsage, ToolFunction, ParsedToolCall } from '../llm/types';
import type { EnhancedAsteroid } from '../nasa-api';

// =============================================================================
// Message Types
// =============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ThinkingStep {
  id: string;
  content: string;
  timestamp: Date;
  duration?: number;
}

export interface ThinkingTrace {
  steps: ThinkingStep[];
  totalDuration: number;
  isComplete: boolean;
}

export interface Citation {
  id: string;
  text: string;
  source: 'asteroid' | 'nasa' | 'calculation' | 'vector-search';
  asteroidId?: string;
  asteroidName?: string;
  url?: string;
  confidence?: number;
}

export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolExecution {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: ToolStatus;
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface AgentMessageMetadata {
  thinking?: ThinkingTrace;
  toolExecutions?: ToolExecution[];
  citations?: Citation[];
  modelUsed?: ModelTier;
  latencyMs?: number;
  tokenUsage?: TokenUsage;
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: AgentMessageMetadata;
}

// =============================================================================
// Tool Types
// =============================================================================

export type ToolName =
  | 'search_asteroids'
  | 'compare_asteroids'
  | 'calculate_trajectory'
  | 'get_risk_analysis';

export interface ToolContext {
  asteroids: EnhancedAsteroid[];
  sessionId: string;
  userId?: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  citations?: Citation[];
}

export interface ToolDefinition<TArgs = Record<string, unknown>, TResult = unknown> {
  name: ToolName;
  description: string;
  parameters: ToolFunction['parameters'];
  execute: (args: TArgs, context: ToolContext) => Promise<ToolResult<TResult>>;
}

// =============================================================================
// Executor Types
// =============================================================================

export type ExecutorStatus =
  | 'idle'
  | 'thinking'
  | 'executing_tool'
  | 'generating'
  | 'complete'
  | 'error';

export interface ExecutorConfig {
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  model?: ModelTier;
}

export interface ExecutorState {
  status: ExecutorStatus;
  currentIteration: number;
  toolCallCount: number;
  startTime?: Date;
  thinkingTrace: ThinkingTrace;
  toolExecutions: ToolExecution[];
  citations: Citation[];
  error?: string;
}

export interface ExecutorResult {
  response: string;
  state: ExecutorState;
  messages: AgentMessage[];
  usage: TokenUsage;
  modelUsed: ModelTier;
  totalLatencyMs: number;
}

// =============================================================================
// Streaming Types
// =============================================================================

export type StreamEventType =
  | 'thinking_start'
  | 'thinking_step'
  | 'thinking_end'
  | 'tool_start'
  | 'tool_progress'
  | 'tool_end'
  | 'content_delta'
  | 'citation'
  | 'done'
  | 'error';

export interface BaseStreamEvent {
  type: StreamEventType;
  timestamp: Date;
}

export interface ThinkingStartEvent extends BaseStreamEvent {
  type: 'thinking_start';
}

export interface ThinkingStepEvent extends BaseStreamEvent {
  type: 'thinking_step';
  step: ThinkingStep;
}

export interface ThinkingEndEvent extends BaseStreamEvent {
  type: 'thinking_end';
  trace: ThinkingTrace;
}

export interface ToolStartEvent extends BaseStreamEvent {
  type: 'tool_start';
  execution: ToolExecution;
}

export interface ToolProgressEvent extends BaseStreamEvent {
  type: 'tool_progress';
  executionId: string;
  progress: number; // 0-100
  message?: string;
}

export interface ToolEndEvent extends BaseStreamEvent {
  type: 'tool_end';
  execution: ToolExecution;
}

export interface ContentDeltaEvent extends BaseStreamEvent {
  type: 'content_delta';
  content: string;
}

export interface CitationEvent extends BaseStreamEvent {
  type: 'citation';
  citation: Citation;
}

export interface DoneEvent extends BaseStreamEvent {
  type: 'done';
  result: ExecutorResult;
}

export interface ErrorEvent extends BaseStreamEvent {
  type: 'error';
  error: string;
  recoverable: boolean;
}

export type StreamEvent =
  | ThinkingStartEvent
  | ThinkingStepEvent
  | ThinkingEndEvent
  | ToolStartEvent
  | ToolProgressEvent
  | ToolEndEvent
  | ContentDeltaEvent
  | CitationEvent
  | DoneEvent
  | ErrorEvent;

// =============================================================================
// Search/Filter Types (for tools)
// =============================================================================

export interface AsteroidSearchFilters {
  query?: string;
  minRisk?: number;
  maxRisk?: number;
  hazardLevel?: ('none' | 'normal' | 'attention' | 'threatening' | 'certain')[];
  minSize?: number;
  maxSize?: number;
  minDistance?: number;
  maxDistance?: number;
  isPotentiallyHazardous?: boolean;
  sortBy?: 'risk' | 'size' | 'distance' | 'velocity' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface AsteroidSearchResult {
  asteroids: EnhancedAsteroid[];
  totalCount: number;
  filters: AsteroidSearchFilters;
  semanticScore?: number;
}

export interface AsteroidComparison {
  asteroids: EnhancedAsteroid[];
  metrics: {
    size: { min: EnhancedAsteroid; max: EnhancedAsteroid; average: number };
    risk: { min: EnhancedAsteroid; max: EnhancedAsteroid; average: number };
    distance: { min: EnhancedAsteroid; max: EnhancedAsteroid; average: number };
    velocity: { min: EnhancedAsteroid; max: EnhancedAsteroid; average: number };
  };
  rankings: {
    byRisk: EnhancedAsteroid[];
    bySize: EnhancedAsteroid[];
    byCloseness: EnhancedAsteroid[];
  };
  summary: string;
}

export interface TrajectoryProjection {
  asteroid: EnhancedAsteroid;
  points: {
    date: Date;
    x: number;
    y: number;
    z: number;
    distanceFromEarth: number;
    distanceFromSun: number;
  }[];
  closestApproach: {
    date: Date;
    distance: number;
    velocity: number;
  };
  periodDays?: number;
}

export interface RiskAnalysisResult {
  asteroid: EnhancedAsteroid;
  torinoScale: {
    value: number;
    description: string;
    color: string;
  };
  palermoScale?: number;
  impactScenarios: {
    probability: number;
    energy: number;
    craterDiameter?: number;
    tsunamiHeight?: number;
    affectedArea?: number;
    description: string;
  }[];
  mitigationWindow?: {
    earliestDate: Date;
    latestDate: Date;
    deltaVRequired: number;
  };
  summary: string;
}

// =============================================================================
// Chat State Types (for Zustand store)
// =============================================================================

export interface ChatState {
  messages: AgentMessage[];
  isLoading: boolean;
  currentStatus: ExecutorStatus;
  activeToolExecutions: ToolExecution[];
  currentThinking: ThinkingTrace | null;
  sessionId: string;
  error: string | null;
}

export interface ChatActions {
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  cancelRequest: () => void;
  setStatus: (status: ExecutorStatus) => void;
  addMessage: (message: AgentMessage) => void;
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void;
  setThinking: (trace: ThinkingTrace | null) => void;
  addToolExecution: (execution: ToolExecution) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  setError: (error: string | null) => void;
}

export type ChatSlice = ChatState & ChatActions;
