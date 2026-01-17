/**
 * ReAct Executor
 * Core agent loop implementing ReAct-style reasoning with tool execution
 */

import type { ChatMessage, TokenUsage, ModelTier, ChatChunk } from '../llm/types';
import { getGeminiProvider } from '../llm/gemini';
import { getModelRouter } from '../llm/router';
import type {
  ExecutorConfig,
  ExecutorState,
  ExecutorResult,
  ToolContext,
  ToolExecution,
  ThinkingStep,
  ThinkingTrace,
  Citation,
  StreamEvent,
  AgentMessage,
} from './types';
import { buildSystemPrompt } from './prompts';
import {
  parseReActOutput,
  extractThinkingSteps,
  formatObservation,
  isValidToolName,
  extractCitations,
} from './parser';
import { executeTool, getToolFunctions, getTool } from './tools';

// Default executor configuration
const DEFAULT_CONFIG: ExecutorConfig = {
  maxIterations: 5,
  maxToolCalls: 10,
  timeoutMs: 60000,
  model: undefined, // Will use router
};

/**
 * ReAct Agent Executor
 * Manages the reasoning loop, tool execution, and response generation
 */
export class AgentExecutor {
  private config: ExecutorConfig;
  private provider = getGeminiProvider();
  private router = getModelRouter();

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute agent loop (non-streaming)
   */
  async execute(
    userMessage: string,
    context: ToolContext,
    history: AgentMessage[] = []
  ): Promise<ExecutorResult> {
    const startTime = Date.now();
    const state = this.initializeState();

    // Build conversation messages
    const messages = this.buildMessages(userMessage, history);

    // Determine model tier
    const routingDecision = this.router.route(messages, this.config.model);
    const modelTier = routingDecision.model;

    let totalUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    try {
      // Execute ReAct loop
      let currentMessages = [...messages];
      let finalResponse = '';

      while (
        state.currentIteration < this.config.maxIterations &&
        state.toolCallCount < this.config.maxToolCalls
      ) {
        state.currentIteration++;
        state.status = 'thinking';

        // Get LLM response
        const response = await this.provider.chat({
          messages: currentMessages,
          tools: getToolFunctions(),
          model: modelTier,
          temperature: 0.7,
        });

        // Update usage
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;

        // Handle tool calls (native Gemini function calling)
        if (response.toolCalls && response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            const toolExecution = await this.executeToolCall(
              toolCall.id,
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments),
              context,
              state
            );

            // Add assistant message with tool call
            currentMessages.push({
              role: 'assistant',
              content: response.content ?? '',
            });

            // Add tool result message
            currentMessages.push({
              role: 'tool',
              content: JSON.stringify(toolExecution.result ?? { error: toolExecution.error }),
              name: toolCall.function.name,
              toolCallId: toolCall.id,
            });
          }
          continue;
        }

        // Parse ReAct-style output if no native tool calls
        const content = response.content ?? '';
        const parsed = parseReActOutput(content);

        // Extract thinking steps
        const thinkingSteps = extractThinkingSteps(content);
        thinkingSteps.forEach((step) => {
          state.thinkingTrace.steps.push(step);
        });

        // Handle ReAct action
        if (parsed.action && !parsed.isComplete) {
          const { name, input } = parsed.action;

          if (isValidToolName(name)) {
            const toolExecution = await this.executeToolCall(
              `react_${Date.now()}`,
              name,
              input,
              context,
              state
            );

            const observation = formatObservation(
              name,
              toolExecution.result,
              toolExecution.error
            );

            // Add to messages for next iteration
            currentMessages.push({
              role: 'assistant',
              content: content,
            });
            currentMessages.push({
              role: 'user',
              content: observation,
            });
            continue;
          }
        }

        // Response is complete
        finalResponse = parsed.finalAnswer ?? content;

        // Extract citations
        const citationRefs = extractCitations(finalResponse);
        citationRefs.forEach((ref) => {
          const asteroid = context.asteroids.find((a) => a.id === ref.id);
          if (asteroid) {
            state.citations.push({
              id: `cite_${ref.id}`,
              text: ref.name,
              source: 'asteroid',
              asteroidId: asteroid.id,
              asteroidName: asteroid.name,
            });
          }
        });

        break;
      }

      // Finalize state
      state.status = 'complete';
      state.thinkingTrace.isComplete = true;
      state.thinkingTrace.totalDuration = Date.now() - startTime;

      return {
        response: finalResponse,
        state,
        messages: this.convertToAgentMessages(currentMessages),
        usage: totalUsage,
        modelUsed: modelTier,
        totalLatencyMs: Date.now() - startTime,
      };
    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : String(error);

      return {
        response: `I encountered an error while processing your request: ${state.error}`,
        state,
        messages: [],
        usage: totalUsage,
        modelUsed: modelTier,
        totalLatencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute agent loop with streaming
   */
  async *executeStream(
    userMessage: string,
    context: ToolContext,
    history: AgentMessage[] = []
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();
    const state = this.initializeState();

    yield {
      type: 'thinking_start',
      timestamp: new Date(),
    };

    // Build conversation messages
    const messages = this.buildMessages(userMessage, history);

    // Determine model tier
    const routingDecision = this.router.route(messages, this.config.model);
    const modelTier = routingDecision.model;

    let totalUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    try {
      let currentMessages = [...messages];
      let finalResponse = '';
      let accumulatedContent = '';

      while (
        state.currentIteration < this.config.maxIterations &&
        state.toolCallCount < this.config.maxToolCalls
      ) {
        state.currentIteration++;
        state.status = 'thinking';
        accumulatedContent = '';

        // Stream LLM response
        const stream = this.provider.chatStream({
          messages: currentMessages,
          tools: getToolFunctions(),
          model: modelTier,
          temperature: 0.7,
        });

        let pendingToolCalls: { id: string; name: string; args: string }[] = [];

        for await (const chunk of stream) {
          if (chunk.type === 'content' && chunk.content) {
            accumulatedContent += chunk.content;

            // Check for thinking in the content
            if (accumulatedContent.includes('Thought:')) {
              const steps = extractThinkingSteps(accumulatedContent);
              for (const step of steps) {
                if (!state.thinkingTrace.steps.find((s) => s.content === step.content)) {
                  state.thinkingTrace.steps.push(step);
                  yield {
                    type: 'thinking_step',
                    timestamp: new Date(),
                    step,
                  };
                }
              }
            }

            // Only yield content that's part of final answer
            if (accumulatedContent.includes('Final Answer:')) {
              const finalPart = accumulatedContent.split('Final Answer:')[1];
              if (finalPart && chunk.content) {
                yield {
                  type: 'content_delta',
                  timestamp: new Date(),
                  content: chunk.content,
                };
              }
            }
          }

          if (chunk.type === 'tool_call_start' && chunk.toolCall) {
            pendingToolCalls.push({
              id: chunk.toolCall.id ?? `tool_${Date.now()}`,
              name: chunk.toolCall.function?.name ?? '',
              args: chunk.toolCall.function?.arguments ?? '{}',
            });
          }

          if (chunk.type === 'tool_call_delta' && chunk.toolCall?.function?.arguments) {
            const lastCall = pendingToolCalls[pendingToolCalls.length - 1];
            if (lastCall) {
              lastCall.args += chunk.toolCall.function.arguments;
            }
          }

          if (chunk.type === 'done' && chunk.usage) {
            totalUsage.promptTokens += chunk.usage.promptTokens;
            totalUsage.completionTokens += chunk.usage.completionTokens;
            totalUsage.totalTokens += chunk.usage.totalTokens;
          }

          if (chunk.type === 'error') {
            yield {
              type: 'error',
              timestamp: new Date(),
              error: chunk.error ?? 'Unknown error',
              recoverable: false,
            };
            return;
          }
        }

        // Handle tool calls
        if (pendingToolCalls.length > 0) {
          for (const call of pendingToolCalls) {
            let args: Record<string, unknown>;
            try {
              args = JSON.parse(call.args);
            } catch {
              args = {};
            }

            const toolExecution = await this.executeToolCallWithEvents(
              call.id,
              call.name,
              args,
              context,
              state,
              (event) => {
                // This is a sync callback, we'll collect events instead
              }
            );

            yield {
              type: 'tool_start',
              timestamp: new Date(),
              execution: { ...toolExecution, status: 'running' },
            };

            yield {
              type: 'tool_end',
              timestamp: new Date(),
              execution: toolExecution,
            };

            // Add to messages
            currentMessages.push({
              role: 'assistant',
              content: accumulatedContent,
            });
            currentMessages.push({
              role: 'tool',
              content: JSON.stringify(toolExecution.result ?? { error: toolExecution.error }),
              name: call.name,
              toolCallId: call.id,
            });
          }

          pendingToolCalls = [];
          continue;
        }

        // Parse ReAct-style output
        const parsed = parseReActOutput(accumulatedContent);

        // Handle ReAct action
        if (parsed.action && !parsed.isComplete) {
          const { name, input } = parsed.action;

          if (isValidToolName(name)) {
            const toolExecution = await this.executeToolCall(
              `react_${Date.now()}`,
              name,
              input,
              context,
              state
            );

            yield {
              type: 'tool_start',
              timestamp: new Date(),
              execution: { ...toolExecution, status: 'running' },
            };

            yield {
              type: 'tool_end',
              timestamp: new Date(),
              execution: toolExecution,
            };

            const observation = formatObservation(
              name,
              toolExecution.result,
              toolExecution.error
            );

            currentMessages.push({
              role: 'assistant',
              content: accumulatedContent,
            });
            currentMessages.push({
              role: 'user',
              content: observation,
            });
            continue;
          }
        }

        // Response is complete
        finalResponse = parsed.finalAnswer ?? accumulatedContent;

        // If we haven't been streaming the final answer, do it now
        if (!accumulatedContent.includes('Final Answer:') && finalResponse) {
          yield {
            type: 'content_delta',
            timestamp: new Date(),
            content: finalResponse,
          };
        }

        break;
      }

      // Emit thinking end
      state.thinkingTrace.isComplete = true;
      state.thinkingTrace.totalDuration = Date.now() - startTime;

      yield {
        type: 'thinking_end',
        timestamp: new Date(),
        trace: state.thinkingTrace,
      };

      // Extract and emit citations
      const citationRefs = extractCitations(finalResponse);
      for (const ref of citationRefs) {
        const asteroid = context.asteroids.find((a) => a.id === ref.id);
        if (asteroid) {
          const citation: Citation = {
            id: `cite_${ref.id}`,
            text: ref.name,
            source: 'asteroid',
            asteroidId: asteroid.id,
            asteroidName: asteroid.name,
          };
          state.citations.push(citation);
          yield {
            type: 'citation',
            timestamp: new Date(),
            citation,
          };
        }
      }

      // Finalize
      state.status = 'complete';

      yield {
        type: 'done',
        timestamp: new Date(),
        result: {
          response: finalResponse,
          state,
          messages: this.convertToAgentMessages(currentMessages),
          usage: totalUsage,
          modelUsed: modelTier,
          totalLatencyMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : String(error);

      yield {
        type: 'error',
        timestamp: new Date(),
        error: state.error,
        recoverable: false,
      };
    }
  }

  private initializeState(): ExecutorState {
    return {
      status: 'idle',
      currentIteration: 0,
      toolCallCount: 0,
      thinkingTrace: {
        steps: [],
        totalDuration: 0,
        isComplete: false,
      },
      toolExecutions: [],
      citations: [],
    };
  }

  private buildMessages(
    userMessage: string,
    history: AgentMessage[]
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(true),
      },
    ];

    // Add history
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  private async executeToolCall(
    id: string,
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
    state: ExecutorState
  ): Promise<ToolExecution> {
    const execution: ToolExecution = {
      id,
      name,
      arguments: args,
      status: 'running',
      startTime: new Date(),
    };

    state.toolExecutions.push(execution);
    state.toolCallCount++;
    state.status = 'executing_tool';

    try {
      const result = await executeTool(name, args, context);

      execution.status = result.success ? 'success' : 'error';
      execution.result = result.data;
      execution.error = result.error;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Collect citations from tool
      if (result.citations) {
        state.citations.push(...result.citations);
      }

      return execution;
    } catch (error) {
      execution.status = 'error';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      return execution;
    }
  }

  private async executeToolCallWithEvents(
    id: string,
    name: string,
    args: Record<string, unknown>,
    context: ToolContext,
    state: ExecutorState,
    onEvent: (event: StreamEvent) => void
  ): Promise<ToolExecution> {
    return this.executeToolCall(id, name, args, context, state);
  }

  private convertToAgentMessages(messages: ChatMessage[]): AgentMessage[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m, idx) => ({
        id: `msg_${idx}`,
        role: m.role as AgentMessage['role'],
        content: m.content,
        timestamp: new Date(),
      }));
  }
}

// Singleton instance
let _executor: AgentExecutor | null = null;

export function getAgentExecutor(
  config?: Partial<ExecutorConfig>
): AgentExecutor {
  if (!_executor || config) {
    _executor = new AgentExecutor(config);
  }
  return _executor;
}
