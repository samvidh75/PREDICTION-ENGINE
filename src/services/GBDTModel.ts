// src/services/GBDTModel.ts
// Dependency-free, pure TypeScript Gradient Boosted Decision Tree (GBDT) implementation.
// Supports regression (MSE loss) and binary classification (Log Loss).

export interface GBDTOpts {
  nEstimators: number;
  learningRate: number;
  maxDepth: number;
  minSamplesSplit: number;
  loss: "mse" | "logloss";
}

class DecisionTreeNode {
  featureIdx: number = -1;
  splitVal: number = -1;
  left: DecisionTreeNode | null = null;
  right: DecisionTreeNode | null = null;
  value: number = 0; // Leaf value
  isLeaf: boolean = false;
}

export class DecisionTree {
  private root: DecisionTreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;
  private loss: "mse" | "logloss";

  constructor(maxDepth: number = 3, minSamplesSplit: number = 5, loss: "mse" | "logloss" = "mse") {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.loss = loss;
  }

  fit(X: number[][], y: number[]) {
    this.root = this.buildTree(X, y, 0);
  }

  predictRow(row: number[]): number {
    return this.traverse(this.root, row);
  }

  private traverse(node: DecisionTreeNode | null, row: number[]): number {
    if (!node) return 0;
    if (node.isLeaf) return node.value;
    if (row[node.featureIdx] <= node.splitVal) {
      return this.traverse(node.left, row);
    } else {
      return this.traverse(node.right, row);
    }
  }

  private buildTree(X: number[][], y: number[], depth: number): DecisionTreeNode {
    const nSamples = X.length;
    const nFeatures = nSamples > 0 ? X[0].length : 0;
    const node = new DecisionTreeNode();

    // Base cases
    if (depth >= this.maxDepth || nSamples < this.minSamplesSplit || this.isHomogeneous(y)) {
      node.isLeaf = true;
      node.value = y.reduce((a, b) => a + b, 0) / Math.max(1, nSamples);
      return node;
    }

    // Find the best split
    let bestGain = -1;
    let bestFeatureIdx = -1;
    let bestSplitVal = -1;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const currentImpurity = this.calculateImpurity(y);

    for (let f = 0; f < nFeatures; f++) {
      const featureVals = X.map(row => row[f]);
      
      // Determine split candidates using percentiles (histogram binning proxy)
      const splitCandidates: number[] = [];
      const sortedVals = [...featureVals].sort((a, b) => a - b);
      const numBins = 15;
      
      for (let b = 1; b < numBins; b++) {
        const idx = Math.floor((sortedVals.length * b) / numBins);
        if (idx < sortedVals.length) {
          splitCandidates.push(sortedVals[idx]);
        }
      }

      // Remove duplicates
      const uniqueSplits = Array.from(new Set(splitCandidates));

      for (const splitVal of uniqueSplits) {
        const leftIndices: number[] = [];
        const rightIndices: number[] = [];

        for (let i = 0; i < nSamples; i++) {
          if (X[i][f] <= splitVal) {
            leftIndices.push(i);
          } else {
            rightIndices.push(i);
          }
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(idx => y[idx]);
        const rightY = rightIndices.map(idx => y[idx]);

        const leftImpurity = this.calculateImpurity(leftY);
        const rightImpurity = this.calculateImpurity(rightY);

        const gain = currentImpurity - (leftIndices.length / nSamples) * leftImpurity - (rightIndices.length / nSamples) * rightImpurity;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeatureIdx = f;
          bestSplitVal = splitVal;
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    if (bestFeatureIdx === -1 || bestGain <= 0) {
      node.isLeaf = true;
      node.value = y.reduce((a, b) => a + b, 0) / Math.max(1, nSamples);
      return node;
    }

    node.featureIdx = bestFeatureIdx;
    node.splitVal = bestSplitVal;

    const leftX = bestLeftIndices.map(idx => X[idx]);
    const leftY = bestLeftIndices.map(idx => y[idx]);
    node.left = this.buildTree(leftX, leftY, depth + 1);

    const rightX = bestRightIndices.map(idx => X[idx]);
    const rightY = bestRightIndices.map(idx => y[idx]);
    node.right = this.buildTree(rightX, rightY, depth + 1);

    return node;
  }

  private isHomogeneous(y: number[]): boolean {
    if (y.length === 0) return true;
    const first = y[0];
    for (let i = 1; i < y.length; i++) {
      if (y[i] !== first) return false;
    }
    return true;
  }

  private calculateImpurity(y: number[]): number {
    const n = y.length;
    if (n === 0) return 0;
    const mean = y.reduce((a, b) => a + b, 0) / n;
    // Mean Squared Error as impurity measure
    return y.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  }
}

export class GBDTModel {
  private opts: GBDTOpts;
  private trees: DecisionTree[] = [];
  private baseValue: number = 0;

  constructor(opts: Partial<GBDTOpts> = {}) {
    this.opts = {
      nEstimators: opts.nEstimators ?? 50,
      learningRate: opts.learningRate ?? 0.1,
      maxDepth: opts.maxDepth ?? 3,
      minSamplesSplit: opts.minSamplesSplit ?? 5,
      loss: opts.loss ?? "mse",
    };
  }

  fit(X: number[][], y: number[]) {
    const n = X.length;
    this.trees = [];

    if (this.opts.loss === "logloss") {
      // Classification init
      const p = y.reduce((a, b) => a + b, 0) / Math.max(1, n);
      this.baseValue = Math.log(p / Math.max(1e-15, 1 - p));
    } else {
      // Regression init
      this.baseValue = y.reduce((a, b) => a + b, 0) / Math.max(1, n);
    }

    let F = new Array(n).fill(this.baseValue);

    for (let m = 0; m < this.opts.nEstimators; m++) {
      let residuals: number[];

      if (this.opts.loss === "logloss") {
        // Classification gradient (y - p)
        residuals = new Array(n);
        for (let i = 0; i < n; i++) {
          const p = 1 / (1 + Math.exp(-F[i]));
          residuals[i] = y[i] - p;
        }
      } else {
        // Regression residuals (y - F)
        residuals = new Array(n);
        for (let i = 0; i < n; i++) {
          residuals[i] = y[i] - F[i];
        }
      }

      const tree = new DecisionTree(this.opts.maxDepth, this.opts.minSamplesSplit, "mse");
      tree.fit(X, residuals);
      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        F[i] += this.opts.learningRate * tree.predictRow(X[i]);
      }
    }
  }

  predict(X: number[][]): number[] {
    return X.map(row => this.predictRow(row));
  }

  private predictRow(row: number[]): number {
    let val = this.baseValue;
    for (const tree of this.trees) {
      val += this.opts.learningRate * tree.predictRow(row);
    }
    if (this.opts.loss === "logloss") {
      // Return probability (Sigmoid)
      return 1 / (1 + Math.exp(-val));
    }
    return val;
  }
}
