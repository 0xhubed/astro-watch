'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  GitCompare,
  Orbit,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import type { ToolExecution as ToolExecutionType } from '@/lib/agent/types';

interface ToolExecutionProps {
  execution: ToolExecutionType;
}

const toolIcons: Record<string, React.ReactNode> = {
  search_asteroids: <Search className="w-4 h-4" />,
  compare_asteroids: <GitCompare className="w-4 h-4" />,
  calculate_trajectory: <Orbit className="w-4 h-4" />,
  get_risk_analysis: <AlertTriangle className="w-4 h-4" />,
};

const toolLabels: Record<string, string> = {
  search_asteroids: 'Search Asteroids',
  compare_asteroids: 'Compare Asteroids',
  calculate_trajectory: 'Calculate Trajectory',
  get_risk_analysis: 'Risk Analysis',
};

export function ToolExecution({ execution }: ToolExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    pending: 'text-gray-400 bg-gray-800',
    running: 'text-blue-400 bg-blue-900/30 border-blue-500/30',
    success: 'text-green-400 bg-green-900/30 border-green-500/30',
    error: 'text-red-400 bg-red-900/30 border-red-500/30',
  };

  const statusIcons = {
    pending: <div className="w-3 h-3 rounded-full bg-gray-500" />,
    running: <Loader2 className="w-3 h-3 animate-spin" />,
    success: <Check className="w-3 h-3" />,
    error: <X className="w-3 h-3" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border ${statusColors[execution.status]} p-3`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}

        <span className="text-purple-400">
          {toolIcons[execution.name] ?? <Search className="w-4 h-4" />}
        </span>

        <span className="flex-1 text-left text-sm font-medium">
          {toolLabels[execution.name] ?? execution.name}
        </span>

        <span className="flex items-center gap-1">
          {statusIcons[execution.status]}
          {execution.duration && (
            <span className="text-xs text-gray-500">
              {(execution.duration / 1000).toFixed(2)}s
            </span>
          )}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/50"
          >
            {/* Arguments */}
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">Arguments:</div>
              <pre className="text-xs bg-gray-900/50 rounded p-2 overflow-x-auto">
                {JSON.stringify(execution.arguments, null, 2)}
              </pre>
            </div>

            {/* Result or Error */}
            {execution.status === 'success' && execution.result && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Result:</div>
                <pre className="text-xs bg-gray-900/50 rounded p-2 overflow-x-auto max-h-40">
                  {formatResult(execution.result)}
                </pre>
              </div>
            )}

            {execution.status === 'error' && execution.error && (
              <div>
                <div className="text-xs text-red-400 mb-1">Error:</div>
                <div className="text-xs text-red-300 bg-red-900/20 rounded p-2">
                  {execution.error}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  const str = JSON.stringify(result, null, 2);
  // Truncate if too long
  if (str.length > 1000) {
    return str.substring(0, 1000) + '\n... (truncated)';
  }
  return str;
}

// Live tool execution indicator
export function LiveToolExecution({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-blue-400 bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-500/30"
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-purple-400">
        {toolIcons[name] ?? <Search className="w-4 h-4" />}
      </span>
      <span>Running {toolLabels[name] ?? name}...</span>
    </motion.div>
  );
}
