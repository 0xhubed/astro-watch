'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Bot, Minimize2, Maximize2 } from 'lucide-react';
import {
  useAsteroidStore,
  useChatMessages,
  useChatLoading,
  useChatStatus,
  useActiveTools,
  useCurrentThinking,
} from '@/lib/store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToggle } from './ChatToggle';
import { LiveThinking } from './ThinkingTrace';
import { LiveToolExecution } from './ToolExecution';

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useChatMessages();
  const isLoading = useChatLoading();
  const status = useChatStatus();
  const activeTools = useActiveTools();
  const currentThinking = useCurrentThinking();
  const sendMessage = useAsteroidStore((state) => state.sendMessage);
  const clearHistory = useAsteroidStore((state) => state.clearHistory);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTools, currentThinking]);

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <>
      {/* Toggle button */}
      <ChatToggle
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        hasUnread={messages.length > 0 && !isOpen}
      />

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 60 : 'auto',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-96 max-w-[calc(100vw-3rem)]
                       bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50
                       shadow-2xl shadow-purple-500/10 overflow-hidden flex flex-col"
            style={{ maxHeight: isMinimized ? '60px' : 'calc(100vh - 200px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    AstroWatch Assistant
                  </h3>
                  <p className="text-xs text-gray-500">
                    {status === 'idle'
                      ? 'Ready'
                      : status === 'thinking'
                        ? 'Thinking...'
                        : status === 'executing_tool'
                          ? 'Running tool...'
                          : status === 'generating'
                            ? 'Generating...'
                            : status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearHistory}
                  className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
                  {messages.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isLatest={index === messages.length - 1}
                        />
                      ))}

                      {/* Live indicators */}
                      {status === 'thinking' && currentThinking && (
                        <LiveThinking />
                      )}

                      {status === 'executing_tool' &&
                        activeTools
                          .filter((t) => t.status === 'running')
                          .map((tool) => (
                            <LiveToolExecution key={tool.id} name={tool.name} />
                          ))}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-800">
                  <ChatInput onSend={handleSend} isLoading={isLoading} />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-purple-400" />
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">
        Welcome to AstroWatch Assistant
      </h4>
      <p className="text-sm text-gray-400 max-w-xs">
        Ask me anything about near-Earth asteroids, their trajectories, risk assessments, and more.
      </p>
    </div>
  );
}

export default ChatPanel;
