'use client';

import { motion } from 'framer-motion';
import { User, Bot, Sparkles } from 'lucide-react';
import type { AgentMessage } from '@/lib/agent/types';
import { ThinkingTrace } from './ThinkingTrace';
import { ToolExecution } from './ToolExecution';

interface ChatMessageProps {
  message: AgentMessage;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-600'
            : 'bg-gradient-to-br from-purple-600 to-pink-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}
      >
        {/* Thinking trace (for assistant messages) */}
        {isAssistant && message.metadata?.thinking && (
          <ThinkingTrace trace={message.metadata.thinking} />
        )}

        {/* Tool executions */}
        {isAssistant &&
          message.metadata?.toolExecutions &&
          message.metadata.toolExecutions.length > 0 && (
            <div className="mb-2 space-y-2">
              {message.metadata.toolExecutions.map((execution) => (
                <ToolExecution key={execution.id} execution={execution} />
              ))}
            </div>
          )}

        {/* Main message bubble */}
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-gray-800/80 text-gray-100 rounded-tl-md border border-gray-700'
          }`}
        >
          <MessageContent content={message.content} />
        </div>

        {/* Metadata footer */}
        {isAssistant && message.metadata && (
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            {message.metadata.modelUsed && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {message.metadata.modelUsed}
              </span>
            )}
            {message.metadata.latencyMs && (
              <span>{(message.metadata.latencyMs / 1000).toFixed(1)}s</span>
            )}
            {message.metadata.citations && message.metadata.citations.length > 0 && (
              <span>{message.metadata.citations.length} citations</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const parts = content.split(/(\[.*?\]\(asteroid:.*?\))/g);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        // Check for asteroid citation pattern
        const match = part.match(/\[(.*?)\]\(asteroid:(.*?)\)/);
        if (match) {
          return (
            <button
              key={index}
              className="text-purple-400 hover:text-purple-300 underline decoration-dotted"
              onClick={() => {
                // Could integrate with store to select asteroid
                console.log('Asteroid citation clicked:', match[2]);
              }}
            >
              {match[1]}
            </button>
          );
        }

        // Handle bold text
        const boldParts = part.split(/(\*\*.*?\*\*)/g);
        return boldParts.map((boldPart, boldIndex) => {
          if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
            return (
              <strong key={`${index}-${boldIndex}`} className="font-semibold">
                {boldPart.slice(2, -2)}
              </strong>
            );
          }
          return <span key={`${index}-${boldIndex}`}>{boldPart}</span>;
        });
      })}
    </div>
  );
}
