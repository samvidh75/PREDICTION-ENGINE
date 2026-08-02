import { CovarianceEngine } from '../../services/portfolio/CovarianceEngine';

// Note: a standalone MarkowitzOptimizer used to live at
// services/portfolio/MarkowitzOptimizer.ts, but src/engines/MarkowitzOptimizer.ts
// is the real, already-wired implementation (feeding no live route directly,
// but sharing an interface with other engines under src/engines/). Rather than
// maintain two parallel optimizers, that file's real bugs (Math.random() in
// covariance estimation, a non-convergent heuristic optimizer) were fixed in
// place — see src/engines/__tests__/MarkowitzOptimizer.test.ts for its coverage.
describe('CovarianceEngine', () => {
  const engine = new CovarianceEngine();

  it('computes known covariance for a simple 2-asset case', () => {
    const returns = [
      [0.01, 0.02, -0.01, 0.03],
      [0.02, 0.04, -0.02, 0.06],
    ];
    const { matrix } = engine.computeCovariance(['A', 'B'], returns, false);
    // B = 2*A exactly, so cov(A,B) = 2*var(A) and var(B) = 4*var(A)
    expect(matrix[0][1]).toBeCloseTo(2 * matrix[0][0], 12);
    expect(matrix[1][1]).toBeCloseTo(4 * matrix[0][0], 12);
    expect(matrix[0][1]).toBeCloseTo(matrix[1][0], 12); // symmetry
  });

  it('correlation of perfectly correlated assets is 1', () => {
    const returns = [
      [0.01, 0.02, -0.01, 0.03],
      [0.02, 0.04, -0.02, 0.06],
    ];
    const { matrix } = engine.computeCorrelation(['A', 'B'], returns);
    expect(matrix[0][1]).toBeCloseTo(1, 10);
  });

  it('rejects mismatched or degenerate input', () => {
    expect(() => engine.computeCovariance([], [], false)).toThrow();
    expect(() => engine.computeCovariance(['A'], [[0.01]], false)).toThrow(); // 1 obs
    expect(() => engine.computeCovariance(['A', 'B'], [[0.01, 0.02], [0.01]], false)).toThrow();
    expect(() => engine.computeCovariance(['A'], [[0.01, NaN]], false)).toThrow();
  });
});
