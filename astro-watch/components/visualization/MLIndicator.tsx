import { motion } from 'framer-motion';
import { Brain, AlertCircle, Loader2 } from 'lucide-react';

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
  const isLoading = !isMLReady && mlStats.processingTime === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md transition-colors duration-300
        ${isLoading
          ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
          : isUsingML 
          ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
          : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
        }
      `}>
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading ML Model...</span>
          </>
        ) : isUsingML ? (
          <>
            <Brain className="w-5 h-5" />
            <span className="text-sm font-medium">ML Enhanced</span>
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
      
      {/* Progress bar for ML loading */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20 rounded-b-lg overflow-hidden"
        >
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}