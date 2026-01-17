'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useAsteroidStore,
  useChatMessages,
  useChatLoading,
  useChatStatus,
  useChatError,
  useActiveTools,
  useCurrentThinking,
} from '@/lib/store';
import type { AgentMessage, ExecutorStatus, ToolExecution, ThinkingTrace } from '@/lib/agent/types';

interface UseChatAgentReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  status: ExecutorStatus;
  error: string | null;
  activeTools: ToolExecution[];
  currentThinking: ThinkingTrace | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  cancelRequest: () => void;
}

/**
 * Hook for managing chat agent interactions
 * Provides reactive state and actions for the chat interface
 */
export function useChatAgent(): UseChatAgentReturn {
  const messages = useChatMessages();
  const isLoading = useChatLoading();
  const status = useChatStatus();
  const error = useChatError();
  const activeTools = useActiveTools();
  const currentThinking = useCurrentThinking();

  const sendMessage = useAsteroidStore((state) => state.sendMessage);
  const clearHistory = useAsteroidStore((state) => state.clearHistory);
  const cancelRequest = useAsteroidStore((state) => state.cancelRequest);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Create new abort controller
      abortRef.current = new AbortController();

      try {
        await sendMessage(content);
      } catch (err) {
        console.error('Chat error:', err);
      }
    },
    [sendMessage, isLoading]
  );

  const handleClearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    clearHistory();
  }, [clearHistory]);

  const handleCancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    cancelRequest();
  }, [cancelRequest]);

  return {
    messages,
    isLoading,
    status,
    error,
    activeTools,
    currentThinking,
    sendMessage: handleSendMessage,
    clearHistory: handleClearHistory,
    cancelRequest: handleCancelRequest,
  };
}

export default useChatAgent;
