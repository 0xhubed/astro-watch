'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function AgentStatusIndicator() {
  const [briefing, setBriefing] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent-data')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setBriefing(data?.briefing || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-40"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
        <Bot className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-medium text-gray-300">
          {loading ? 'Agent Loading...' : briefing ? 'Agent Active' : 'Agent Idle'}
        </span>
        {briefing && (
          <a href="/briefings" className="text-xs text-purple-400 hover:text-purple-300 underline">
            Briefing
          </a>
        )}
      </div>
    </motion.div>
  );
}
