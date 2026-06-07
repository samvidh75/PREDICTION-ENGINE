// src/services/XGBoostBenchmark.ts
// Benchmark pipeline mimicking XGBoost configuration (Depth-wise growth, learning rate 0.08, nEstimators=80).

import { GBDTModel } from "./GBDTModel";
import { BenchmarkMetrics } from "./LightGBMBenchmark";

export class XGBoostBenchmark {
  /**
   * Runs the XGBoost-style benchmark model.
   * Train/Test split: 80% training, 20% validation.
   */
  async runBenchmark(
    X: number[][],
    y: number[]
  ): Promise<BenchmarkMetrics> {
    const n = X.length;
    if (n < 20) {
      return { mae: 0, rmse: 0, directional_accuracy: 0.5, precision: 0, recall: 0 };
    }

    const trainSize = Math.floor(n * 0.8);
    const X_train = X.slice(0, trainSize);
    const y_train = y.slice(0, trainSize);
    const X_test = X.slice(trainSize);
    const y_test = y.slice(trainSize);

    // XGBoost configuration proxy: GBDT with nEstimators=80, learningRate=0.08, maxDepth=3
    const model = new GBDTModel({
      nEstimators: 80,
      learningRate: 0.08,
      maxDepth: 3,
      loss: "mse"
    });

    model.fit(X_train, y_train);
    const preds = model.predict(X_test);

    // Calculate metrics
    let sumAbsError = 0;
    let sumSqError = 0;
    let correctDirection = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;

    for (let i = 0; i < preds.length; i++) {
      const pred = preds[i];
      const actual = y_test[i];

      sumAbsError += Math.abs(pred - actual);
      sumSqError += Math.pow(pred - actual, 2);

      // Directional Accuracy
      const predDirection = pred >= 0 ? 1 : -1;
      const actualDirection = actual >= 0 ? 1 : -1;
      if (predDirection === actualDirection) {
        correctDirection++;
      }

      // Classification metrics for binary classification proxy (Up/Down)
      const pLabel = pred >= 0 ? 1 : 0;
      const aLabel = actual >= 0 ? 1 : 0;

      if (pLabel === 1 && aLabel === 1) truePositives++;
      else if (pLabel === 1 && aLabel === 0) falsePositives++;
      else if (pLabel === 0 && aLabel === 1) falseNegatives++;
      else if (pLabel === 0 && aLabel === 0) trueNegatives++;
    }

    const testN = preds.length;
    const mae = sumAbsError / testN;
    const rmse = Math.sqrt(sumSqError / testN);
    const directional_accuracy = correctDirection / testN;
    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0;

    return {
      mae: Math.round(mae * 10000) / 10000,
      rmse: Math.round(rmse * 10000) / 10000,
      directional_accuracy: Math.round(directional_accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
    };
  }
}

export const xGBoostBenchmark = new XGBoostBenchmark();
export default xGBoostBenchmark;
