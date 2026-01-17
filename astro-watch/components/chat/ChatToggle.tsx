'use client';

import { motion } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';

interface ChatToggleProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatToggle({ isOpen, onClick, hasUnread = false }: ChatToggleProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                 bg-gradient-to-br from-purple-600 to-pink-600
                 shadow-lg shadow-purple-500/30 flex items-center justify-center
                 hover:shadow-purple-500/50 transition-shadow"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Unread indicator */}
      {hasUnread && !isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
                     flex items-center justify-center"
        >
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </motion.div>
      )}

      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </motion.div>
    </motion.button>
  );
}
