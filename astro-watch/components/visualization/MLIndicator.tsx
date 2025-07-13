import { motion } from 'framer-motion';
import { Brain, AlertCircle } from 'lucide-react';

interface MLIndicatorProps {
  isMLReady: boolean;
  mlStats: {
    modelUsed: 'ml' | 'fallback';
    processingTime: number;
    predictionsCount: number;
  };
}

export function MLIndicator({ isMLReady, mlStats }: MLIndicatorProps) {
  const isUsingML = isMLReady && mlStats.modelUsed === 'ml';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md
        ${isUsingML 
          ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
          : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
        }
      `}>
        {isUsingML ? (
          <>
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">ML Model Active</span>
            <span className="text-xs opacity-70">
              ({mlStats.processingTime.toFixed(0)}ms)
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Rule-Based Mode</span>
          </>
        )}
      </div>
    </motion.div>
  );
}