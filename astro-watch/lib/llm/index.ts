/**
 * LLM Module Exports
 * Centralized exports for all LLM-related functionality
 */

// Types
export type {
  ModelTier,
  MessageRole,
  ChatMessage,
  ToolFunction,
  JSONSchemaProperty,
  ToolCall,
  ParsedToolCall,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ChatChunkType,
  TokenUsage,
  ProviderConfig,
  RoutingDecision,
  ComplexityAnalysis,
} from './types';

// Errors
export {
  LLMError,
  LLMRateLimitError,
  LLMAuthError,
  LLMTimeoutError,
} from './types';

// Provider interface
export type { LLMProvider } from './provider';
export { BaseLLMProvider, providerRegistry } from './provider';

// Gemini implementation
export { GeminiProvider, createGeminiProvider, getGeminiProvider } from './gemini';

// Router
export {
  analyzeComplexity,
  routeModel,
  ModelRouter,
  getModelRouter,
} from './router';
