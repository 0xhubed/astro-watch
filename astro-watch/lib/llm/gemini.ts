/**
 * Google Gemini LLM Provider
 * Implements streaming and non-streaming chat with Gemini 2.5 Flash models
 */

import { BaseLLMProvider, providerRegistry } from './provider';
import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ChatMessage,
  ToolFunction,
  ToolCall,
  TokenUsage,
  ModelTier,
  ProviderConfig,
} from './types';
import {
  LLMError,
  LLMAuthError,
  LLMRateLimitError,
  LLMTimeoutError,
} from './types';

// Gemini API types
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
  toolConfig?: {
    functionCallingConfig: {
      mode: 'AUTO' | 'NONE' | 'ANY';
      allowedFunctionNames?: string[];
    };
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    candidateCount?: number;
  };
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Model ID mapping
const MODEL_MAP: Record<ModelTier, string> = {
  'flash-lite': 'gemini-2.0-flash-lite',
  'flash-thinking': 'gemini-2.5-flash-preview-05-20',
};

export class GeminiProvider extends BaseLLMProvider {
  readonly name = 'gemini';
  readonly availableModels: ModelTier[] = ['flash-lite', 'flash-thinking'];
  readonly defaultModel: ModelTier = 'flash-lite';

  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: ProviderConfig) {
    super(config);
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  protected resolveModel(tier: ModelTier): string {
    return MODEL_MAP[tier] || MODEL_MAP['flash-lite'];
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const modelTier = request.model ?? this.defaultModel;
    const modelId = this.resolveModel(modelTier);

    const geminiRequest = this.convertRequest(request);
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.config.apiKey}`;

    const response = await this.withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeout ?? 30000
      );

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequest),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          await this.handleError(res);
        }

        return (await res.json()) as GeminiResponse;
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new LLMTimeoutError(
            `Request timed out after ${this.config.timeout}ms`
          );
        }
        throw error;
      }
    });

    return this.convertResponse(response, modelTier, Date.now() - startTime);
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const modelTier = request.model ?? this.defaultModel;
    const modelId = this.resolveModel(modelTier);

    const geminiRequest = this.convertRequest(request);
    const url = `${this.baseUrl}/models/${modelId}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? 30000
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        await this.handleError(res);
      }

      if (!res.body) {
        throw new LLMError('No response body', 'NO_BODY', false);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalUsage: TokenUsage | undefined;
      const toolCalls = new Map<number, Partial<ToolCall>>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data) as GeminiResponse;

            if (chunk.usageMetadata) {
              totalUsage = {
                promptTokens: chunk.usageMetadata.promptTokenCount,
                completionTokens: chunk.usageMetadata.candidatesTokenCount,
                totalTokens: chunk.usageMetadata.totalTokenCount,
              };
            }

            const candidate = chunk.candidates?.[0];
            if (!candidate?.content?.parts) continue;

            for (const part of candidate.content.parts) {
              if (part.text) {
                yield { type: 'content', content: part.text };
              }

              if (part.functionCall) {
                const index = toolCalls.size;
                const toolCall: ToolCall = {
                  id: `call_${Date.now()}_${index}`,
                  type: 'function',
                  function: {
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args),
                  },
                };

                yield { type: 'tool_call_start', toolCall, toolCallId: toolCall.id };
                yield { type: 'tool_call_end', toolCallId: toolCall.id };
                toolCalls.set(index, toolCall);
              }
            }

            if (candidate.finishReason) {
              const finishReason = this.mapFinishReason(candidate.finishReason);
              yield {
                type: 'done',
                finishReason,
                usage: totalUsage,
              };
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        yield {
          type: 'error',
          error: `Request timed out after ${this.config.timeout}ms`,
        };
      } else if (error instanceof LLMError) {
        yield { type: 'error', error: error.message };
      } else {
        yield { type: 'error', error: String(error) };
      }
    }
  }

  private convertRequest(request: ChatRequest): GeminiGenerateRequest {
    const geminiRequest: GeminiGenerateRequest = {
      contents: [],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192,
      },
    };

    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    if (systemMessage) {
      geminiRequest.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    // Convert messages to Gemini format
    for (const msg of request.messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        // Tool response - find the last model message and append
        const lastContent = geminiRequest.contents[geminiRequest.contents.length - 1];
        if (lastContent?.role === 'model') {
          // Add tool response as user message
          geminiRequest.contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: msg.name ?? 'tool',
                  response: this.safeParseJson(msg.content),
                },
              },
            ],
          });
        }
        continue;
      }

      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
      geminiRequest.contents.push({
        role: geminiRole,
        parts: [{ text: msg.content }],
      });
    }

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      geminiRequest.tools = [
        {
          functionDeclarations: request.tools.map((tool) =>
            this.convertTool(tool)
          ),
        },
      ];

      // Set tool config
      if (request.toolChoice === 'none') {
        geminiRequest.toolConfig = {
          functionCallingConfig: { mode: 'NONE' },
        };
      } else if (
        request.toolChoice &&
        typeof request.toolChoice === 'object'
      ) {
        geminiRequest.toolConfig = {
          functionCallingConfig: {
            mode: 'ANY',
            allowedFunctionNames: [request.toolChoice.function.name],
          },
        };
      } else {
        geminiRequest.toolConfig = {
          functionCallingConfig: { mode: 'AUTO' },
        };
      }
    }

    return geminiRequest;
  }

  private convertTool(tool: ToolFunction): GeminiFunctionDeclaration {
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  private convertResponse(
    response: GeminiResponse,
    modelTier: ModelTier,
    latencyMs: number
  ): ChatResponse {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new LLMError('No response candidate', 'NO_CANDIDATE', false);
    }

    let content: string | null = null;
    const toolCalls: ToolCall[] = [];

    for (const part of candidate.content?.parts ?? []) {
      if (part.text) {
        content = (content ?? '') + part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          },
        });
      }
    }

    const finishReason = this.mapFinishReason(candidate.finishReason);

    return {
      id: `gemini_${Date.now()}`,
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
      modelUsed: modelTier,
      latencyMs,
    };
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'tool_calls' | 'length' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        return 'error';
      default:
        return 'stop';
    }
  }

  private async handleError(res: Response): Promise<never> {
    const body = await res.text();
    let message = `Gemini API error: ${res.status}`;

    try {
      const error = JSON.parse(body);
      message = error.error?.message ?? message;
    } catch {
      // Use default message
    }

    if (res.status === 401 || res.status === 403) {
      throw new LLMAuthError(message);
    }
    if (res.status === 429) {
      throw new LLMRateLimitError(message);
    }
    if (res.status >= 500) {
      throw new LLMError(message, 'SERVER_ERROR', true, res.status);
    }
    throw new LLMError(message, 'API_ERROR', false, res.status);
  }

  private safeParseJson(content: string): Record<string, unknown> {
    try {
      return JSON.parse(content);
    } catch {
      return { result: content };
    }
  }
}

/**
 * Create and register the Gemini provider
 */
export function createGeminiProvider(apiKey?: string): GeminiProvider {
  const key = apiKey ?? process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.warn('GOOGLE_AI_API_KEY not set - Gemini provider will not work');
  }

  const provider = new GeminiProvider({
    apiKey: key ?? '',
    timeout: 60000,
    maxRetries: 3,
  });

  providerRegistry.register(provider, true);
  return provider;
}

// Export singleton instance for convenience
let _instance: GeminiProvider | null = null;

export function getGeminiProvider(): GeminiProvider {
  if (!_instance) {
    _instance = createGeminiProvider();
  }
  return _instance;
}
