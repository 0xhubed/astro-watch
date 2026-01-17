/**
 * LLM Provider Types for AstroWatch Agentic System
 * Provider-agnostic interfaces for language model interactions
 */

// Available model tiers for routing
export type ModelTier = 'flash-lite' | 'flash-thinking';

// Message roles in conversation
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// Chat message structure
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string; // For tool messages
  toolCallId?: string; // Reference to tool call being responded to
}

// Tool definition for function calling
export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
}

// JSON Schema property definition
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

// Tool call from LLM response
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Parsed tool call with typed arguments
export interface ParsedToolCall<T = Record<string, unknown>> {
  id: string;
  name: string;
  arguments: T;
}

// Chat request to LLM
export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolFunction[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  model?: ModelTier;
  stream?: boolean;
}

// Chat response from LLM (non-streaming)
export interface ChatResponse {
  id: string;
  content: string | null;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage: TokenUsage;
  modelUsed: ModelTier;
  latencyMs: number;
}

// Streaming chunk types
export type ChatChunkType =
  | 'content'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'done'
  | 'error';

// Streaming chunk from LLM
export interface ChatChunk {
  type: ChatChunkType;
  content?: string;
  toolCall?: Partial<ToolCall>;
  toolCallId?: string;
  finishReason?: ChatResponse['finishReason'];
  usage?: TokenUsage;
  error?: string;
}

// Token usage statistics
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: ModelTier;
  timeout?: number;
  maxRetries?: number;
}

// Model routing decision
export interface RoutingDecision {
  model: ModelTier;
  reason: string;
  confidence: number;
}

// Query complexity analysis
export interface ComplexityAnalysis {
  score: number; // 0-1, higher = more complex
  factors: {
    multiStep: boolean;
    requiresReasoning: boolean;
    ambiguous: boolean;
    domainSpecific: boolean;
    temporalReasoning: boolean;
  };
}

// Error types
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT', true, 429);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMAuthError extends LLMError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', false, 401);
    this.name = 'LLMAuthError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string) {
    super(message, 'TIMEOUT', true);
    this.name = 'LLMTimeoutError';
  }
}
