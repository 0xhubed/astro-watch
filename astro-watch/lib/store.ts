import { create } from 'zustand';
import { EnhancedAsteroid } from './nasa-api';
import type {
  AgentMessage,
  ToolExecution,
  ThinkingTrace,
  ExecutorStatus,
  ChatState,
  ChatActions,
} from './agent/types';

// =============================================================================
// Asteroid Store Types
// =============================================================================

interface AsteroidState {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid: EnhancedAsteroid | null;
  riskFilter: 'all' | 'threatening' | 'attention' | 'normal';
  timeRange: 'day' | 'week' | 'month';
  viewMode: 'solar-system' | 'dashboard' | 'impact-globe';
  showTrajectories: boolean;
}

interface AsteroidActions {
  setAsteroids: (asteroids: EnhancedAsteroid[]) => void;
  selectAsteroid: (asteroid: EnhancedAsteroid | null) => void;
  setRiskFilter: (filter: 'all' | 'threatening' | 'attention' | 'normal') => void;
  setTimeRange: (range: 'day' | 'week' | 'month') => void;
  setViewMode: (mode: 'solar-system' | 'dashboard' | 'impact-globe') => void;
  toggleTrajectories: () => void;
  getFilteredAsteroids: () => EnhancedAsteroid[];
}

// =============================================================================
// Combined Store
// =============================================================================

type AsteroidStore = AsteroidState & AsteroidActions & ChatState & ChatActions;

// Generate unique session ID
const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useAsteroidStore = create<AsteroidStore>((set, get) => ({
  // =========================================================================
  // Asteroid State
  // =========================================================================
  asteroids: [],
  selectedAsteroid: null,
  riskFilter: 'all',
  timeRange: 'week',
  viewMode: 'solar-system',
  showTrajectories: false,

  setAsteroids: (asteroids) => set({ asteroids }),
  selectAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),
  setRiskFilter: (filter) => set({ riskFilter: filter }),
  setTimeRange: (range) => set({ timeRange: range }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrajectories: () =>
    set((state) => ({ showTrajectories: !state.showTrajectories })),

  getFilteredAsteroids: () => {
    const { asteroids, riskFilter } = get();

    if (riskFilter === 'all') return asteroids;

    return asteroids.filter((asteroid) => {
      switch (riskFilter) {
        case 'threatening':
          return asteroid.torinoScale >= 5;
        case 'attention':
          return asteroid.torinoScale >= 2 && asteroid.torinoScale < 5;
        case 'normal':
          return asteroid.torinoScale < 2;
        default:
          return true;
      }
    });
  },

  // =========================================================================
  // Chat State
  // =========================================================================
  messages: [],
  isLoading: false,
  currentStatus: 'idle' as ExecutorStatus,
  activeToolExecutions: [],
  currentThinking: null,
  sessionId: generateSessionId(),
  error: null,

  // =========================================================================
  // Chat Actions
  // =========================================================================
  sendMessage: async (content: string) => {
    const { sessionId, asteroids } = get();

    // Create user message
    const userMessage: AgentMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      currentStatus: 'thinking' as ExecutorStatus,
      error: null,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          asteroids: asteroids.map((a) => ({
            id: a.id,
            name: a.name,
            risk: a.risk,
            torinoScale: a.torinoScale,
            size: a.size,
            velocity: a.velocity,
            missDistance: a.missDistance,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage: AgentMessage | null = null;

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
            const event = JSON.parse(data);

            switch (event.type) {
              case 'thinking_start':
                set({
                  currentStatus: 'thinking',
                  currentThinking: {
                    steps: [],
                    totalDuration: 0,
                    isComplete: false,
                  },
                });
                break;

              case 'thinking_step':
                set((state) => ({
                  currentThinking: state.currentThinking
                    ? {
                        ...state.currentThinking,
                        steps: [...state.currentThinking.steps, event.step],
                      }
                    : null,
                }));
                break;

              case 'thinking_end':
                set({ currentThinking: event.trace });
                break;

              case 'tool_start':
                set((state) => ({
                  currentStatus: 'executing_tool',
                  activeToolExecutions: [
                    ...state.activeToolExecutions,
                    event.execution,
                  ],
                }));
                break;

              case 'tool_end':
                set((state) => ({
                  activeToolExecutions: state.activeToolExecutions.map((t) =>
                    t.id === event.execution.id ? event.execution : t
                  ),
                }));
                break;

              case 'content_delta':
                if (!assistantMessage) {
                  assistantMessage = {
                    id: `msg_${Date.now()}_assistant`,
                    role: 'assistant',
                    content: event.content,
                    timestamp: new Date(),
                    metadata: {},
                  };
                  set((state) => ({
                    messages: [...state.messages, assistantMessage!],
                    currentStatus: 'generating',
                  }));
                } else {
                  assistantMessage.content += event.content;
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantMessage!.id ? { ...assistantMessage! } : m
                    ),
                  }));
                }
                break;

              case 'done':
                if (assistantMessage && event.result) {
                  assistantMessage.metadata = {
                    thinking: get().currentThinking ?? undefined,
                    toolExecutions: get().activeToolExecutions,
                    citations: event.result.state?.citations,
                    modelUsed: event.result.modelUsed,
                    latencyMs: event.result.totalLatencyMs,
                    tokenUsage: event.result.usage,
                  };
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantMessage!.id ? { ...assistantMessage! } : m
                    ),
                  }));
                }
                set({
                  isLoading: false,
                  currentStatus: 'complete',
                  activeToolExecutions: [],
                  currentThinking: null,
                });
                break;

              case 'error':
                set({
                  error: event.error,
                  isLoading: false,
                  currentStatus: 'error',
                });
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        currentStatus: 'error',
      });
    }
  },

  clearHistory: () =>
    set({
      messages: [],
      error: null,
      currentStatus: 'idle',
      activeToolExecutions: [],
      currentThinking: null,
      sessionId: generateSessionId(),
    }),

  cancelRequest: () => {
    // AbortController would be used here in a real implementation
    set({
      isLoading: false,
      currentStatus: 'idle',
      activeToolExecutions: [],
      currentThinking: null,
    });
  },

  setStatus: (status: ExecutorStatus) => set({ currentStatus: status }),

  addMessage: (message: AgentMessage) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id: string, updates: Partial<AgentMessage>) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  setThinking: (trace: ThinkingTrace | null) =>
    set({ currentThinking: trace }),

  addToolExecution: (execution: ToolExecution) =>
    set((state) => ({
      activeToolExecutions: [...state.activeToolExecutions, execution],
    })),

  updateToolExecution: (id: string, updates: Partial<ToolExecution>) =>
    set((state) => ({
      activeToolExecutions: state.activeToolExecutions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setError: (error: string | null) => set({ error }),
}));

// Export chat-specific selector hooks for convenience
export const useChatMessages = () =>
  useAsteroidStore((state) => state.messages);
export const useChatLoading = () =>
  useAsteroidStore((state) => state.isLoading);
export const useChatStatus = () =>
  useAsteroidStore((state) => state.currentStatus);
export const useChatError = () => useAsteroidStore((state) => state.error);
export const useActiveTools = () =>
  useAsteroidStore((state) => state.activeToolExecutions);
export const useCurrentThinking = () =>
  useAsteroidStore((state) => state.currentThinking);