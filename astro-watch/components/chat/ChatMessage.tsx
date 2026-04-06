'use client';

import { motion } from 'framer-motion';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
}

export function ChatMessage({ role, content, toolCall }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-purple-600/20 border border-purple-500/30 text-gray-200 rounded-br-sm'
            : 'bg-white/[0.04] border border-white/[0.08] text-gray-300 rounded-bl-sm'
        }`}
      >
        {content}
        {toolCall && (
          <div className="mt-2 px-2 py-1 bg-blue-500/[0.08] border border-blue-500/20 rounded text-xs font-mono text-blue-400">
            → {toolCall.name}({Object.keys(toolCall.arguments).length > 0
              ? JSON.stringify(toolCall.arguments).slice(0, 60)
              : ''
            })
          </div>
        )}
      </div>
    </motion.div>
  );
}
