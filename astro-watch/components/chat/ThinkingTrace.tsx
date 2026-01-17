'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { ThinkingTrace as ThinkingTraceType } from '@/lib/agent/types';

interface ThinkingTraceProps {
  trace: ThinkingTraceType;
  isLive?: boolean;
}

export function ThinkingTrace({ trace, isLive = false }: ThinkingTraceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (trace.steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-2"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Brain className="w-4 h-4 text-purple-400" />
        <span>
          {isLive && !trace.isComplete ? (
            <span className="flex items-center gap-1">
              Thinking
              <Loader2 className="w-3 h-3 animate-spin" />
            </span>
          ) : (
            `${trace.steps.length} reasoning step${trace.steps.length === 1 ? '' : 's'}`
          )}
        </span>
        {trace.totalDuration > 0 && (
          <span className="text-gray-500">
            ({(trace.totalDuration / 1000).toFixed(1)}s)
          </span>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pl-4 border-l-2 border-purple-500/30"
          >
            {trace.steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="mb-2 last:mb-0"
              >
                <div className="text-xs text-gray-500 mb-1">
                  Step {index + 1}
                  {step.duration && (
                    <span className="ml-2">
                      ({(step.duration / 1000).toFixed(2)}s)
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-300 bg-gray-800/50 rounded px-3 py-2">
                  {step.content}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Live thinking indicator for streaming
export function LiveThinking() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-sm text-purple-400 mb-2"
    >
      <Brain className="w-4 h-4" />
      <span>Thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-purple-400 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
