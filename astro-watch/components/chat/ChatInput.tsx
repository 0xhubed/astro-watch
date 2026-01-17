'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const SUGGESTED_QUERIES = [
  "What's the most dangerous asteroid this week?",
  'Show me potentially hazardous asteroids',
  'Compare the 3 closest asteroids',
  "What's the risk level of asteroid 2024 AA1?",
];

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Ask about asteroids...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Suggested queries (show when empty) */}
      {!message && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {SUGGESTED_QUERIES.map((query, index) => (
            <button
              key={index}
              onClick={() => setMessage(query)}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-800/50 text-gray-400
                         hover:bg-gray-700/50 hover:text-gray-300 transition-colors
                         border border-gray-700/50 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              {query.length > 35 ? query.substring(0, 35) + '...' : query}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input area */}
      <div className="relative">
        <div className="flex items-end gap-2 bg-gray-800/50 rounded-xl border border-gray-700 p-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none
                       focus:outline-none px-2 py-1 min-h-[32px] max-h-[120px]"
          />

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            className="flex-shrink-0 p-2 rounded-lg bg-purple-600 hover:bg-purple-500
                       disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Character count */}
        {message.length > 1500 && (
          <div
            className={`absolute right-14 bottom-3 text-xs ${
              message.length > 2000 ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {message.length}/2000
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="text-xs text-gray-600 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to send,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Shift+Enter</kbd> for new line
      </div>
    </div>
  );
}
