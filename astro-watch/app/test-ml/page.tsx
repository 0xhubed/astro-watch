'use client';

import { useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';

export default function TestMLPage() {
  const [status, setStatus] = useState('Testing...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    async function testML() {
      try {
        addLog('🧪 Starting ML test...');
        
        // Test 1: Basic TensorFlow.js
        addLog('1️⃣ Testing basic TensorFlow.js...');
        const tensor = tf.tensor2d([[1, 2], [3, 4]]);
        addLog(`✅ Tensor created with shape: ${tensor.shape}`);
        tensor.dispose();
        
        // Test 2: Model creation
        addLog('2️⃣ Testing model creation...');
        const model = tf.sequential({
          layers: [
            tf.layers.dense({ inputShape: [6], units: 16, activation: 'relu' }),
            tf.layers.dense({ units: 2, activation: 'sigmoid' })
          ]
        });
        addLog(`✅ Model created with ${model.countParams()} parameters`);
        
        // Test 3: Data generation
        addLog('3️⃣ Testing data generation...');
        const { generateTrainingData } = await import('@/lib/ml/data-generator');
        const data = generateTrainingData(100);
        addLog(`✅ Generated ${data.features.length} training samples`);
        
        // Test 4: Browser training
        addLog('4️⃣ Testing browser training...');
        const { ensureModelAvailable } = await import('@/lib/ml/browser-trainer');
        const { model: trainedModel } = await ensureModelAvailable();
        addLog(`✅ Model trained with ${trainedModel.countParams()} parameters`);
        
        // Test 5: Risk prediction
        addLog('5️⃣ Testing risk prediction...');
        const { predictRisk } = await import('@/lib/ml/risk-predictor');
        
        // Create a mock asteroid for testing
        const mockAsteroid = {
          id: 'test',
          name: 'Test Asteroid',
          estimated_diameter: {
            meters: {
              estimated_diameter_min: 100,
              estimated_diameter_max: 200
            }
          },
          close_approach_data: [{
            close_approach_date: '2024-01-01',
            relative_velocity: {
              kilometers_per_second: '15.5'
            },
            miss_distance: {
              astronomical: '0.1'
            }
          }],
          is_potentially_hazardous_asteroid: true
        };
        
        const prediction = await predictRisk(mockAsteroid);
        addLog(`✅ Risk prediction: ${prediction.risk.toFixed(3)}, Confidence: ${prediction.confidence.toFixed(3)}`);
        addLog(`📊 Model used: ${prediction.modelUsed}, Processing time: ${prediction.processingTime.toFixed(1)}ms`);
        
        setStatus('✅ All tests passed!');
        addLog('🎉 ML system is working correctly!');
        
      } catch (error) {
        addLog(`❌ Error: ${error}`);
        setStatus('❌ Tests failed');
        console.error('ML test failed:', error);
      }
    }

    testML();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">ML System Test</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>
          
          <div className="bg-gray-900 rounded p-4 font-mono text-sm overflow-auto max-h-96">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <a 
            href="/" 
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}