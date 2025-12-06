#!/usr/bin/env node

/**
 * Asteroid Risk Prediction Model Training Script
 * 
 * This script trains a TensorFlow.js model for asteroid risk prediction
 * and saves it for use in the web application.
 * 
 * Usage: node scripts/train-model.js [options]
 * Options:
 *   --samples <number>    Number of training samples (default: 10000)
 *   --epochs <number>     Number of training epochs (default: 150)
 *   --balanced           Use balanced dataset generation
 *   --output <path>       Output directory for model (default: public/models)
 */

const fs = require('fs');
const path = require('path');

// TensorFlow.js setup for Node.js
require('@tensorflow/tfjs-node');

// Import our ML modules from compiled JS (run `npm run ml:build` first)
// Compiled output is in `dist/lib/ml/*` via tsconfig.build.json
let generateTrainingData, generateBalancedTrainingData;
let trainModel, evaluateModel, saveModel, optimizeModelForProduction, generatePerformanceReport;
try {
  ({ generateTrainingData, generateBalancedTrainingData } = require('../dist/lib/ml/data-generator'));
  ({ trainModel, evaluateModel, saveModel, optimizeModelForProduction, generatePerformanceReport } = require('../dist/lib/ml/model-trainer'));
} catch (e) {
  console.error('\n❌ Could not load compiled ML modules.');
  console.error('➡️  Please run: npm run ml:build');
  console.error('   (This compiles TypeScript in lib/ml to dist/)\n');
  throw e;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    samples: 10000,
    epochs: 150,
    balanced: false,
    output: path.join(__dirname, '../public/models'),
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--samples':
        options.samples = parseInt(args[++i]);
        break;
      case '--epochs':
        options.epochs = parseInt(args[++i]);
        break;
      case '--balanced':
        options.balanced = true;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.warn(`Unknown option: ${args[i]}`);
    }
  }

  return options;
}

// Display help information
function showHelp() {
  console.log(`
Asteroid Risk Prediction Model Training Script

Usage: node scripts/train-model.js [options]

Options:
  --samples <number>    Number of training samples (default: 10000)
  --epochs <number>     Number of training epochs (default: 150)
  --balanced           Use balanced dataset generation
  --output <path>       Output directory for model (default: public/models)
  --help, -h           Show this help message

Examples:
  node scripts/train-model.js
  node scripts/train-model.js --samples 15000 --epochs 200 --balanced
  node scripts/train-model.js --output ./models --samples 5000
`);
}

// Split dataset into training and test sets
function splitDataset(data, testSplit = 0.15) {
  const totalSamples = data.features.length;
  const testSize = Math.floor(totalSamples * testSplit);
  const trainSize = totalSamples - testSize;

  // Shuffle indices
  const indices = Array.from({ length: totalSamples }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const trainIndices = indices.slice(0, trainSize);
  const testIndices = indices.slice(trainSize);

  return {
    train: {
      features: trainIndices.map(i => data.features[i]),
      labels: trainIndices.map(i => data.labels[i])
    },
    test: {
      features: testIndices.map(i => data.features[i]),
      labels: testIndices.map(i => data.labels[i])
    }
  };
}

// Main training function
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🚀 Starting Asteroid Risk Prediction Model Training');
  console.log('================================================');
  console.log(`Samples: ${options.samples.toLocaleString()}`);
  console.log(`Epochs: ${options.epochs}`);
  console.log(`Balanced dataset: ${options.balanced ? 'Yes' : 'No'}`);
  console.log(`Output directory: ${options.output}`);
  console.log('');
  console.log('📦 Using compiled modules from dist/. If this fails, run `npm run ml:build`.');

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true });
      console.log(`Created output directory: ${options.output}`);
    }

    // Step 1: Generate training data
    console.log('📊 Generating training data...');
    const data = options.balanced 
      ? generateBalancedTrainingData(options.samples)
      : generateTrainingData(options.samples);

    console.log(`Generated ${data.features.length} samples with ${data.features[0].length} features each`);

    // Step 2: Split into train/test sets
    console.log('🔀 Splitting dataset...');
    const { train, test } = splitDataset(data, 0.15);
    console.log(`Training samples: ${train.features.length}`);
    console.log(`Test samples: ${test.features.length}`);

    // Step 3: Train the model
    console.log('🧠 Training neural network...');
    const trainingConfig = {
      epochs: options.epochs,
      batchSize: 32,
      learningRate: 0.001,
      validationSplit: 0.2,
      earlyStopping: true,
      patience: 20
    };

    const trainingResults = await trainModel({
      features: train.features,
      labels: train.labels,
      metadata: data.metadata
    }, trainingConfig);

    // Step 4: Evaluate the model
    console.log('📈 Evaluating model performance...');
    const evaluationResults = await evaluateModel(
      trainingResults.model,
      test.features,
      test.labels
    );

    // Step 5: Optimize for production
    console.log('⚡ Optimizing model for production...');
    const optimizedModel = await optimizeModelForProduction(trainingResults.model);

    // Step 6: Save the model
    console.log('💾 Saving model...');
    const modelPath = path.join(options.output, 'asteroid-risk-model');
    await saveModel(optimizedModel, modelPath);

    // Step 7: Save model metadata
    const metadata = {
      version: '1.0.0',
      trainedAt: new Date().toISOString(),
      trainingConfig,
      performance: {
        loss: evaluationResults.loss,
        mae: evaluationResults.mae,
        correlations: evaluationResults.correlations
      },
      datasetInfo: {
        totalSamples: options.samples,
        trainingSamples: train.features.length,
        testSamples: test.features.length,
        balanced: options.balanced
      },
      modelArchitecture: {
        inputFeatures: 6,
        hiddenLayers: [16, 8],
        outputs: 2,
        totalParameters: optimizedModel.countParams()
      }
    };

    const metadataPath = path.join(options.output, 'model-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Step 8: Generate performance report
    const report = generatePerformanceReport(trainingResults, evaluationResults);
    const reportPath = path.join(options.output, 'training-report.md');
    fs.writeFileSync(reportPath, report);

    console.log('');
    console.log('✅ Training completed successfully!');
    console.log('================================');
    console.log(`Model saved to: ${modelPath}`);
    console.log(`Metadata saved to: ${metadataPath}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log('');
    console.log('📊 Final Performance:');
    console.log(`  Test Loss: ${evaluationResults.loss.toFixed(4)}`);
    console.log(`  Test MAE: ${evaluationResults.mae.toFixed(4)}`);
    console.log(`  Risk Correlation: ${evaluationResults.correlations.risk.toFixed(3)}`);
    console.log(`  Confidence Correlation: ${evaluationResults.correlations.confidence.toFixed(3)}`);
    console.log('');
    
    if (evaluationResults.correlations.risk > 0.9) {
      console.log('🎉 Excellent model performance! Ready for production.');
    } else if (evaluationResults.correlations.risk > 0.8) {
      console.log('✅ Good model performance. Consider additional training for improvement.');
    } else {
      console.log('⚠️  Model performance could be improved. Consider more data or different architecture.');
    }

  } catch (error) {
    console.error('❌ Training failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the training script
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, splitDataset };
