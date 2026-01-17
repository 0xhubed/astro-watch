/**
 * LLM Provider Interface
 * Provider-agnostic abstraction for language model interactions
 */

import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ProviderConfig,
  ModelTier,
} from './types';

/**
 * Abstract interface for LLM providers
 * Implementations must support both streaming and non-streaming chat
 */
export interface LLMProvider {
  /** Provider name (e.g., 'gemini', 'openai') */
  readonly name: string;

  /** Available model tiers */
  readonly availableModels: ModelTier[];

  /** Default model tier */
  readonly defaultModel: ModelTier;

  /**
   * Non-streaming chat completion
   * @param request Chat request with messages and optional tools
   * @returns Complete response with content and/or tool calls
   */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Streaming chat completion
   * @param request Chat request with messages and optional tools
   * @returns Async iterable of response chunks
   */
  chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;

  /**
   * Check if provider is configured and ready
   * @returns true if provider can make requests
   */
  isConfigured(): boolean;

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<ProviderConfig, 'apiKey'> & { hasApiKey: boolean };
}

/**
 * Base class with common provider functionality
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly availableModels: ModelTier[];
  abstract readonly defaultModel: ModelTier;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream(request: ChatRequest): AsyncIterable<ChatChunk>;

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  getConfig(): Omit<ProviderConfig, 'apiKey'> & { hasApiKey: boolean } {
    const { apiKey, ...rest } = this.config;
    return {
      ...rest,
      hasApiKey: Boolean(apiKey),
    };
  }

  /**
   * Resolve model tier to provider-specific model ID
   */
  protected abstract resolveModel(tier: ModelTier): string;

  /**
   * Retry with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries ?? 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth errors or other non-retryable errors
        if (
          error instanceof Error &&
          'retryable' in error &&
          !(error as { retryable: boolean }).retryable
        ) {
          throw error;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

/**
 * Provider registry for managing multiple LLM providers
 */
class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider: string | null = null;

  register(provider: LLMProvider, isDefault: boolean = false): void {
    this.providers.set(provider.name, provider);
    if (isDefault || this.providers.size === 1) {
      this.defaultProvider = provider.name;
    }
  }

  get(name?: string): LLMProvider {
    const providerName = name ?? this.defaultProvider;
    if (!providerName) {
      throw new Error('No LLM provider registered');
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`LLM provider '${providerName}' not found`);
    }

    return provider;
  }

  getDefault(): LLMProvider {
    return this.get();
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }
}

// Singleton registry instance
export const providerRegistry = new ProviderRegistry();
