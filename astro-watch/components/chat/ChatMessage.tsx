'use client';

import { motion } from 'framer-motion';

interface ToolCallInfo {
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallInfo[];
  /** Show an animated "thinking" placeholder instead of an empty bubble. */
  pending?: boolean;
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-100">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatContent(text: string) {
  if (!text) return null;

  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, i) => {
    if (para.includes('\n- ') || para.startsWith('- ')) {
      const items = para.split('\n').filter(l => l.startsWith('- '));
      return (
        <ul key={i} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j}>{formatInline(item.slice(2))}</li>
          ))}
        </ul>
      );
    }

    return <p key={i} className={i > 0 ? 'mt-2' : ''}>{formatInline(para)}</p>;
  });
}

export function ChatMessage({ role, content, toolCalls, pending = false }: ChatMessageProps) {
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
        {pending ? (
          <div className="flex items-center gap-1.5 py-1" aria-label="Assistant is typing">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : (
          formatContent(content)
        )}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {toolCalls.map((tc, i) => (
              <div key={i} className="text-[10px] text-gray-500 italic">
                Used {tc.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
