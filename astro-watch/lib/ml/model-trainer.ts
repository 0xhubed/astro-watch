import * as tf from '@tensorflow/tfjs';
import { TrainingData } from './data-generator';

export interface ModelTrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
  earlyStopping: boolean;
  patience: number;
}

export interface TrainingResults {
  model: tf.LayersModel;
  history: {
    loss: number[];
    val_loss: number[];
    mae: number[];
    val_mae: number[];
  };
  finalMetrics: {
    loss: number;
    val_loss: number;
    mae: number;
    val_mae: number;
  };
  trainingTime: number;
}

/**
 * Create the neural network architecture for asteroid risk prediction
 */
export function createRiskModel(): tf.LayersModel {
  const model = tf.sequential({
    layers: [
      // Input layer: 6 features
      tf.layers.dense({
        inputShape: [6],
        units: 16,
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: 'dense_1'
      }),
      
      // Dropout for regularization
      tf.layers.dropout({
        rate: 0.2,
        name: 'dropout_1'
      }),
      
      // Hidden layer
      tf.layers.dense({
        units: 8,
        activation: 'relu',
        kernelInitializer: 'heNormal',
        name: 'dense_2'
      }),
      
      // Light dropout
      tf.layers.dropout({
        rate: 0.1,
        name: 'dropout_2'
      }),
      
      // Output layer: 2 outputs (risk, confidence)
      tf.layers.dense({
        units: 2,
        activation: 'sigmoid',
        kernelInitializer: 'glorotNormal',
        name: 'output'
      })
    ]
  });

  return model;
}

/**
 * Configure and compile the model for training
 */
export function compileModel(model: tf.LayersModel, config: ModelTrainingConfig): tf.LayersModel {
  const optimizer = tf.train.adam(config.learningRate);
  
  model.compile({
    optimizer: optimizer,
    loss: 'meanSquaredError',
    metrics: ['mae'] // Mean Absolute Error for interpretability
  });

  // Log model architecture
  console.log('Model Architecture:');
  model.summary();
  
  return model;
}

/**
 * Train the asteroid risk prediction model
 */
export async function trainModel(
  trainingData: TrainingData, 
  config: ModelTrainingConfig = {
    epochs: 150,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStopping: true,
    patience: 20
  }
): Promise<TrainingResults> {
  
  console.log('Starting model training...');
  console.log(`Training samples: ${trainingData.features.length}`);
  console.log(`Features per sample: ${trainingData.features[0].length}`);
  console.log(`Config:`, config);

  const startTime = Date.now();

  // Create and compile model
  const model = createRiskModel();
  compileModel(model, config);

  // Convert training data to tensors
  const xs = tf.tensor2d(trainingData.features);
  const ys = tf.tensor2d(trainingData.labels);

  console.log(`Input tensor shape: ${xs.shape}`);
  console.log(`Output tensor shape: ${ys.shape}`);

  // Setup callbacks
  const callbacks: tf.Callback[] = [];

  // Early stopping callback
  if (config.earlyStopping) {
    callbacks.push(tf.callbacks.earlyStopping({
      monitor: 'val_loss',
      patience: config.patience,
      restoreBestWeights: true
    }));
  }

  // Training progress callback
  callbacks.push({
    onEpochEnd: (epoch, logs) => {
      if (epoch % 10 === 0 || epoch < 5) {
        console.log(`Epoch ${epoch + 1}/${config.epochs}`);
        console.log(`  Loss: ${logs?.loss?.toFixed(4)}, Val Loss: ${logs?.val_loss?.toFixed(4)}`);
        console.log(`  MAE: ${logs?.mae?.toFixed(4)}, Val MAE: ${logs?.val_mae?.toFixed(4)}`);
      }
    }
  });

  try {
    // Train the model
    const history = await model.fit(xs, ys, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: config.validationSplit,
      callbacks: callbacks,
      shuffle: true,
      verbose: 0 // We handle logging in callbacks
    });

    const trainingTime = Date.now() - startTime;

    // Get final metrics
    const finalMetrics = {
      loss: history.history.loss[history.history.loss.length - 1] as number,
      val_loss: history.history.val_loss[history.history.val_loss.length - 1] as number,
      mae: history.history.mae[history.history.mae.length - 1] as number,
      val_mae: history.history.val_mae[history.history.val_mae.length - 1] as number
    };

    console.log('\nTraining completed!');
    console.log(`Training time: ${(trainingTime / 1000).toFixed(1)}s`);
    console.log(`Final metrics:`, finalMetrics);

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    return {
      model,
      history: {
        loss: history.history.loss as number[],
        val_loss: history.history.val_loss as number[],
        mae: history.history.mae as number[],
        val_mae: history.history.val_mae as number[]
      },
      finalMetrics,
      trainingTime
    };

  } catch (error) {
    // Clean up tensors in case of error
    xs.dispose();
    ys.dispose();
    throw error;
  }
}

/**
 * Evaluate model performance on test data
 */
export async function evaluateModel(
  model: tf.LayersModel, 
  testFeatures: number[][], 
  testLabels: number[][]
): Promise<{
  loss: number;
  mae: number;
  predictions: number[][];
  correlations: { risk: number; confidence: number };
}> {
  
  console.log('Evaluating model performance...');

  const xs = tf.tensor2d(testFeatures);
  const ys = tf.tensor2d(testLabels);

  try {
    // Calculate loss and metrics
    const evaluation = await model.evaluate(xs, ys) as tf.Scalar[];
    const loss = await evaluation[0].data();
    const mae = await evaluation[1].data();

    // Get predictions
    const predictionTensor = model.predict(xs) as tf.Tensor2D;
    const predictions = await predictionTensor.data();
    
    // Reshape predictions
    const reshapedPredictions: number[][] = [];
    for (let i = 0; i < predictions.length; i += 2) {
      reshapedPredictions.push([predictions[i], predictions[i + 1]]);
    }

    // Calculate correlations
    const riskActual = testLabels.map(label => label[0]);
    const riskPredicted = reshapedPredictions.map(pred => pred[0]);
    const confidenceActual = testLabels.map(label => label[1]);
    const confidencePredicted = reshapedPredictions.map(pred => pred[1]);

    const riskCorrelation = calculateCorrelation(riskActual, riskPredicted);
    const confidenceCorrelation = calculateCorrelation(confidenceActual, confidencePredicted);

    console.log(`Test Loss: ${loss[0].toFixed(4)}`);
    console.log(`Test MAE: ${mae[0].toFixed(4)}`);
    console.log(`Risk Correlation: ${riskCorrelation.toFixed(3)}`);
    console.log(`Confidence Correlation: ${confidenceCorrelation.toFixed(3)}`);

    // Clean up tensors
    xs.dispose();
    ys.dispose();
    predictionTensor.dispose();
    evaluation.forEach(tensor => tensor.dispose());

    return {
      loss: loss[0],
      mae: mae[0],
      predictions: reshapedPredictions,
      correlations: {
        risk: riskCorrelation,
        confidence: confidenceCorrelation
      }
    };

  } catch (error) {
    xs.dispose();
    ys.dispose();
    throw error;
  }
}

/**
 * Save trained model to filesystem
 */
export async function saveModel(model: tf.LayersModel, modelPath: string): Promise<void> {
  console.log(`Saving model to ${modelPath}...`);
  
  try {
    await model.save(`file://${modelPath}`);
    console.log('Model saved successfully!');
  } catch (error) {
    console.error('Failed to save model:', error);
    throw error;
  }
}

/**
 * Load pre-trained model from filesystem
 */
export async function loadModel(modelPath: string): Promise<tf.LayersModel> {
  console.log(`Loading model from ${modelPath}...`);
  
  try {
    const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
    console.log('Model loaded successfully!');
    return model;
  } catch (error) {
    console.error('Failed to load model:', error);
    throw error;
  }
}

/**
 * Create a lightweight model optimized for production
 * Note: Quantization is not available in browser TensorFlow.js
 */
export async function optimizeModelForProduction(model: tf.LayersModel): Promise<tf.LayersModel> {
  console.log('Optimizing model for production...');
  
  // In browser environment, quantization is not available
  // Instead, we just return the original model
  if (typeof window !== 'undefined') {
    console.log('Browser environment detected - skipping quantization');
    const originalSize = model.countParams();
    console.log(`Model optimization complete (browser mode):`);
    console.log(`  Parameters: ${originalSize.toLocaleString()}`);
    return model;
  }
  
  // In Node.js environment, we could use quantization if available
  try {
    // Check if quantization is available (Node.js with tfjs-node)
    if ((tf as any).quantization) {
      const optimizedModel = await (tf as any).quantization.quantize(model);
      
      const originalSize = model.countParams();
      const optimizedSize = optimizedModel.countParams();
      
      console.log(`Model optimization complete (Node.js):`);
      console.log(`  Original parameters: ${originalSize.toLocaleString()}`);
      console.log(`  Optimized parameters: ${optimizedSize.toLocaleString()}`);
      console.log(`  Size reduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);
      
      return optimizedModel;
    }
  } catch (error) {
    console.warn('Quantization not available, using original model:', error);
  }
  
  // Fallback: return original model
  const originalSize = model.countParams();
  console.log(`Model optimization complete (fallback mode):`);
  console.log(`  Parameters: ${originalSize.toLocaleString()}`);
  
  return model;
}

/**
 * Calculate correlation coefficient between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generate model performance report
 */
export function generatePerformanceReport(
  trainingResults: TrainingResults,
  evaluationResults: any
): string {
  const report = `
# Asteroid Risk Prediction Model - Performance Report

## Model Architecture
- Input Features: 6
- Hidden Layers: 2 (16 → 8 neurons)
- Output: 2 (risk, confidence)
- Total Parameters: ${trainingResults.model.countParams().toLocaleString()}

## Training Results
- Training Time: ${(trainingResults.trainingTime / 1000).toFixed(1)}s
- Final Training Loss: ${trainingResults.finalMetrics.loss.toFixed(4)}
- Final Validation Loss: ${trainingResults.finalMetrics.val_loss.toFixed(4)}
- Final Training MAE: ${trainingResults.finalMetrics.mae.toFixed(4)}
- Final Validation MAE: ${trainingResults.finalMetrics.val_mae.toFixed(4)}

## Test Performance
- Test Loss: ${evaluationResults.loss.toFixed(4)}
- Test MAE: ${evaluationResults.mae.toFixed(4)}
- Risk Prediction Correlation: ${evaluationResults.correlations.risk.toFixed(3)}
- Confidence Prediction Correlation: ${evaluationResults.correlations.confidence.toFixed(3)}

## Model Quality Assessment
${evaluationResults.correlations.risk > 0.9 ? '✅' : evaluationResults.correlations.risk > 0.8 ? '⚠️' : '❌'} Risk Prediction Quality: ${
  evaluationResults.correlations.risk > 0.9 ? 'Excellent' : 
  evaluationResults.correlations.risk > 0.8 ? 'Good' : 'Needs Improvement'
}
${evaluationResults.correlations.confidence > 0.8 ? '✅' : evaluationResults.correlations.confidence > 0.7 ? '⚠️' : '❌'} Confidence Prediction Quality: ${
  evaluationResults.correlations.confidence > 0.8 ? 'Excellent' : 
  evaluationResults.correlations.confidence > 0.7 ? 'Good' : 'Needs Improvement'
}

Generated: ${new Date().toISOString()}
`;

  return report;
}