'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { track } from '@vercel/analytics';
import { ChatMessage } from './ChatMessage';
import { useAsteroidStore } from '@/lib/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

const RATE_LIMIT_TOTAL = 30; // must match server constant

export function ChatPanel() {
  const { chatOpen, setChatOpen, selectAsteroid, setRiskFilter, setViewMode, toggleTrajectories, setCinematicTarget, asteroids } = useAsteroidStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSceneCommand = useCallback((cmd: Record<string, unknown>) => {
    switch (cmd.action) {
      case 'focus': {
        const asteroid = asteroids.find(a => a.id === cmd.asteroid_id || a.name.toLowerCase().includes(String(cmd.asteroid_id).toLowerCase()));
        if (asteroid) selectAsteroid(asteroid);
        break;
      }
      case 'set_filter':
        if (cmd.filter) setRiskFilter(cmd.filter as 'all' | 'threatening' | 'attention' | 'normal');
        break;
      case 'set_view':
        if (cmd.view) setViewMode(cmd.view as 'solar-system' | 'dashboard' | 'impact-globe');
        break;
      case 'toggle_trajectories':
        toggleTrajectories();
        break;
      case 'cinematic':
        if (cmd.asteroid_id) setCinematicTarget(cmd.asteroid_id as string);
        break;
    }
  }, [asteroids, selectAsteroid, setRiskFilter, setViewMode, toggleTrajectories, setCinematicTarget]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', toolCalls: [] };
    setMessages([...newMessages, assistantMessage]);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      track('chat_message');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      // Update remaining from response headers
      const rlRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rlRemaining !== null) setRemaining(parseInt(rlRemaining, 10));

      // Handle rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 60;
        assistantMessage.content = `You\u2019ve reached the limit of ${RATE_LIMIT_TOTAL} messages per hour. Please try again in ~${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
        setRemaining(0);
        return;
      }

      // Handle validation errors
      if (response.status === 400) {
        const err = await response.json();
        assistantMessage.content = err.error || 'Invalid request.';
        setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              assistantMessage.content += data.content;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            } else if (data.type === 'tool_call') {
              assistantMessage.toolCalls = [...(assistantMessage.toolCalls || []), { name: data.name, arguments: data.arguments }];
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            } else if (data.type === 'scene_command') {
              handleSceneCommand(data);
            } else if (data.type === 'error') {
              assistantMessage.content += `\n\nError: ${data.content}`;
              setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (error) {
      assistantMessage.content = `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      {/* FAB trigger */}
      {!chatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => { setChatOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
          className="fixed bottom-20 md:bottom-12 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-700 shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[400px] bg-gray-900/95 backdrop-blur-xl border-l border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <span className="text-sm font-semibold text-gray-200">AstroWatch AI</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8 space-y-3">
                  <p>Ask about near-Earth asteroids, hazards, or say &quot;show me the closest one&quot;.</p>
                  <p className="text-gray-600 text-xs">
                    {RATE_LIMIT_TOTAL} messages per hour &middot; max 2,000 chars per message
                  </p>
                </div>
              )}
              {messages.map(msg => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} toolCall={msg.toolCalls?.[0]} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/[0.08]">
              {remaining !== null && remaining <= 5 && (
                <div className={`text-xs mb-2 ${remaining === 0 ? 'text-red-400' : 'text-yellow-400/80'}`}>
                  {remaining === 0
                    ? 'Rate limit reached \u2014 please wait before sending more messages.'
                    : `${remaining} message${remaining !== 1 ? 's' : ''} remaining this hour`}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={remaining === 0 ? 'Rate limit reached...' : 'Ask about asteroids...'}
                  disabled={isStreaming || remaining === 0}
                  maxLength={2000}
                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming || remaining === 0}
                  className="w-9 h-9 flex items-center justify-center bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
