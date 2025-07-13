'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Brain, Zap, Target, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModelInfo {
  loaded: boolean;
  metadata: {
    version: string;
    trainedAt: string;
    performance: {
      loss: number;
      mae: number;
      correlations: {
        risk: number;
        confidence: number;
      };
    };
    modelArchitecture: {
      inputFeatures: number;
      hiddenLayers: number[];
      outputs: number;
      totalParameters: number;
    };
  } | null;
  cacheStatus: {
    cached: boolean;
    loadedAt: number;
    version: string;
  };
}

interface PredictionStats {
  totalPredictions: number;
  mlPredictions: number;
  fallbackPredictions: number;
  averageProcessingTime: number;
  errorRate: number;
}

export function MLModelStats() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [predictionStats, setPredictionStats] = useState<PredictionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModelInfo();
    const interval = setInterval(loadPredictionStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadModelInfo = async () => {
    try {
      const { getModelInfo } = await import('@/lib/ml/risk-predictor');
      const info = await getModelInfo();
      setModelInfo(info);
    } catch (error) {
      console.error('Failed to load model info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictionStats = async () => {
    try {
      const { getPredictionStats } = await import('@/lib/ml/risk-predictor');
      const stats = getPredictionStats();
      setPredictionStats(stats);
    } catch (error) {
      console.error('Failed to load prediction stats:', error);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">ML Model Status</h3>
        </div>
        <div className="text-gray-400">Loading model information...</div>
      </motion.div>
    );
  }

  if (!modelInfo) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-red-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h3 className="text-xl font-semibold text-white">ML Model Unavailable</h3>
        </div>
        <div className="text-gray-400">
          Machine learning model could not be loaded. Using fallback risk calculation.
        </div>
      </motion.div>
    );
  }

  const modelStatusColor = modelInfo.loaded ? 'text-green-400' : 'text-yellow-400';
  const modelStatusIcon = modelInfo.loaded ? CheckCircle : AlertTriangle;
  const ModelStatusIcon = modelStatusIcon;

  // Prepare performance data for visualization
  const performanceData = modelInfo.metadata ? [
    { metric: 'Risk Correlation', value: modelInfo.metadata.performance.correlations.risk * 100, color: '#10B981' },
    { metric: 'Confidence Correlation', value: modelInfo.metadata.performance.correlations.confidence * 100, color: '#3B82F6' },
    { metric: 'Accuracy Score', value: (1 - modelInfo.metadata.performance.mae) * 100, color: '#8B5CF6' }
  ] : [];

  // Prepare prediction distribution data
  const predictionDistributionData = predictionStats ? [
    { name: 'ML Predictions', value: predictionStats.mlPredictions, color: '#10B981' },
    { name: 'Fallback Predictions', value: predictionStats.fallbackPredictions, color: '#F59E0B' }
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Model Status Overview */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">ML Model Status</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Model Status */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ModelStatusIcon className={`w-5 h-5 ${modelStatusColor}`} />
              <span className="text-sm text-gray-400">Status</span>
            </div>
            <div className={`text-lg font-semibold ${modelStatusColor}`}>
              {modelInfo.loaded ? 'Active' : 'Loading'}
            </div>
          </div>

          {/* Model Version */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Version</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {modelInfo.metadata?.version || 'Unknown'}
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Parameters</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {modelInfo.metadata?.modelArchitecture.totalParameters.toLocaleString() || 'N/A'}
            </div>
          </div>

          {/* Processing Time */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Avg Time</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {predictionStats ? `${predictionStats.averageProcessingTime.toFixed(1)}ms` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Model Architecture */}
        {modelInfo.metadata && (
          <div className="mt-6 bg-gray-800/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Architecture</h4>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{modelInfo.metadata.modelArchitecture.inputFeatures} inputs</span>
              <span>→</span>
              {modelInfo.metadata.modelArchitecture.hiddenLayers.map((layer, i) => (
                <span key={i}>{layer} neurons{i < modelInfo.metadata!.modelArchitecture.hiddenLayers.length - 1 ? ' →' : ''}</span>
              ))}
              <span>→</span>
              <span>{modelInfo.metadata.modelArchitecture.outputs} outputs</span>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {modelInfo.metadata && (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Model Performance</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Bar Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Correlation Scores</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="metric" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Training Info */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Training Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trained:</span>
                    <span className="text-white">
                      {new Date(modelInfo.metadata.trainedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Loss:</span>
                    <span className="text-white">
                      {modelInfo.metadata.performance.loss.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">MAE:</span>
                    <span className="text-white">
                      {modelInfo.metadata.performance.mae.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Quality Assessment</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      modelInfo.metadata.performance.correlations.risk > 0.9 ? 'bg-green-400' :
                      modelInfo.metadata.performance.correlations.risk > 0.8 ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-gray-300">
                      Risk Prediction: {
                        modelInfo.metadata.performance.correlations.risk > 0.9 ? 'Excellent' :
                        modelInfo.metadata.performance.correlations.risk > 0.8 ? 'Good' : 'Needs Improvement'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      modelInfo.metadata.performance.correlations.confidence > 0.8 ? 'bg-green-400' :
                      modelInfo.metadata.performance.correlations.confidence > 0.7 ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm text-gray-300">
                      Confidence Prediction: {
                        modelInfo.metadata.performance.correlations.confidence > 0.8 ? 'Excellent' :
                        modelInfo.metadata.performance.correlations.confidence > 0.7 ? 'Good' : 'Needs Improvement'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Usage Statistics */}
      {predictionStats && predictionStats.totalPredictions > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Real-time Usage</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Distribution Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Prediction Method Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={predictionDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                  >
                    {predictionDistributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Usage Statistics */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Session Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Predictions:</span>
                    <span className="text-white">{predictionStats.totalPredictions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ML Success Rate:</span>
                    <span className="text-white">
                      {predictionStats.totalPredictions > 0 
                        ? `${((predictionStats.mlPredictions / predictionStats.totalPredictions) * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Error Rate:</span>
                    <span className="text-white">
                      {(predictionStats.errorRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Processing:</span>
                    <span className="text-white">
                      {predictionStats.averageProcessingTime.toFixed(1)}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}