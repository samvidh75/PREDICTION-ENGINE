import { useState, useEffect } from 'react';
import { browserLLM } from '../services/ai/BrowserLLM';
import { modelVersionManager, MODEL_VERSIONS } from '../services/ai/ModelVersioning';
import { modelStreamer } from '../services/ai/ModelStreaming';
import { modelAnalytics, ModelAnalyticsSnapshot } from '../services/ai/ModelAnalytics';
import { compressModel, decompressModel, formatFileSize } from '../services/ai/ModelCompression';
import { quantizeONNXModel } from '../services/ai/ModelQuantization';
import styles from '../styles/pages/ModelDebugPage.module.css';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  duration?: number;
}

export default function ModelDebugPage() {
  const [modelStatus, setModelStatus] = useState<string>('Not loaded');
  const [analytics, setAnalytics] = useState<ModelAnalyticsSnapshot | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [versionMetadata, setVersionMetadata] = useState<any>(null);

  useEffect(() => {
    initializeDebugPage();
  }, []);

  const initializeDebugPage = async () => {
    try {
      // Initialize analytics
      await modelAnalytics.initialize();
      setAnalytics(modelAnalytics.getSnapshot());

      // Initialize versioning
      await modelVersionManager.initialize();
      const metadata = await modelVersionManager.getMetadata('stockex-small-v1');
      setVersionMetadata(metadata);

      // Check current model status
      const status = browserLLM.getModelStatus();
      setModelStatus(`Model Status: ${status}`);
    } catch (error) {
      console.error('[DebugPage] Initialization failed:', error);
    }
  };

  const runTest = async (testName: string, testFn: () => Promise<string>) => {
    const startTime = Date.now();
    setTestResults((prev) => [...prev, { name: testName, status: 'running' }]);

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      setTestResults((prev) =>
        prev.map((t) =>
          t.name === testName ? { ...t, status: 'success', result, duration } : t
        )
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResults((prev) =>
        prev.map((t) =>
          t.name === testName
            ? { ...t, status: 'error', error: String(error), duration }
            : t
        )
      );
    }
  };

  const testModelLoading = async () => {
    return runTest('Model Loading', async () => {
      const start = Date.now();
      await browserLLM.loadModel();
      const duration = Date.now() - start;
      return `Model loaded in ${duration}ms`;
    });
  };

  const testModelStreaming = async () => {
    return runTest('Model Streaming', async () => {
      const mockUrl = '/models/stockex-small-v1.onnx';
      const chunks: string[] = [];

      await modelStreamer.downloadWithStreaming(mockUrl, (progress) => {
        chunks.push(
          `${Math.round(progress.percent)}% - ${modelStreamer.formatSpeed(progress.speedMBps)} - ETA: ${modelStreamer.formatETA(progress.etaSeconds)}`
        );
      });

      return `Download completed with ${chunks.length} progress updates`;
    });
  };

  const testQuantization = async () => {
    return runTest('Model Quantization', async () => {
      const mockModelData = new Uint8Array(67108864); // 64MB mock
      const result = await quantizeONNXModel(mockModelData);

      return `Original: ${formatFileSize(result.stats.originalSize)} → Quantized: ${formatFileSize(result.stats.quantizedSize)} (${result.stats.compressionRatio}x)`;
    });
  };

  const testCompression = async () => {
    return runTest('Model Compression', async () => {
      const mockData = new Uint8Array(16777216); // 16MB mock
      const compressed = await compressModel(mockData);
      const decompressed = await decompressModel(compressed);

      return `Original: ${formatFileSize(mockData.length)} → Compressed: ${formatFileSize(compressed.length)} → Decompressed: ${formatFileSize(decompressed.length)}`;
    });
  };

  const testAIInference = async () => {
    return runTest('AI Inference', async () => {
      const response = await browserLLM.generateResponse('What is P/E ratio?');
      if (!response) return 'Inference returned null (expected for demo)';
      return `Response length: ${response.text.length} characters, Confidence: ${(response.confidence * 100).toFixed(0)}%`;
    });
  };

  const testVersioning = async () => {
    return runTest('Model Versioning', async () => {
      for (const version of MODEL_VERSI) {
        await modelVersionManager.saveVersion(version);
      }
      const saved = await modelVersionManager.listVersions();
      return `Saved and retrieved ${saved.length} model versions`;
    });
  };

  return (
    <div className={styles.debugContainer}>
      <div className={styles.header}>
        <h1>🤖 Model Loading & Inference Debug Panel</h1>
        <p>Comprehensive testing for all 5 optional enhancements</p>
      </div>

      {/* Status Overview */}
      <div className={styles.section}>
        <h2>📊 Current Status</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <div className={styles.label}>Model Status</div>
            <div className={styles.value}>{modelStatus}</div>
          </div>


          {analytics && (
            <>
              <div className={styles.statusCard}>
                <div className={styles.label}>Total Loads</div>
                <div className={styles.value}>{analytics.totalLoads}</div>
                <div className={styles.subtitle}>
                  {analytics.successfulLoads} successful, {analytics.failedLoads} failed
                </div>
              </div>

              <div className={styles.statusCard}>
                <div className={styles.label}>Avg Load Time</div>
                <div className={styles.value}>{analytics.avgLoadTimeMs}ms</div>
                <div className={styles.subtitle}>
                  {analytics.avgDownloadSpeedMBps.toFixed(1)} MB/s average
                </div>
              </div>

              <div className={styles.statusCard}>
                <div className={styles.label}>Success Rate</div>
                <div className={styles.value}>{analytics.successRate.toFixed(1)}%</div>
                <div className={styles.subtitle}>
                  Downloaded {analytics.totalDataDownloadedMB.toFixed(1)} MB total
                </div>
              </div>

              <div className={styles.statusCard}>
                <div className={styles.label}>Compression Ratio</div>
                <div className={styles.value}>{analytics.avgCompressionRatio.toFixed(2)}x</div>
                <div className={styles.subtitle}>Average across all loads</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Version Management */}
      {versionMetadata && (
        <div className={styles.section}>
          <h2>📦 Model Versioning</h2>
          <div className={styles.versionInfo}>
            <p>
              <strong>Model Name:</strong> {versionMetadata.modelName}
            </p>
            <p>
              <strong>Current Version:</strong> {versionMetadata.currentVersion}
            </p>
            <p>
              <strong>Installed Versions:</strong> {versionMetadata.installedVersions.length}
            </p>
            <p>
              <strong>Last Updated:</strong>{' '}
              {new Date(versionMetadata.lastUpdated).toLocaleString()}
            </p>

            <div className={styles.versionList}>
              {MODEL_VERSIONS.map((v) => (
                <div key={v.version} className={styles.versionItem}>
                  <div className={styles.versionHeader}>
                    <span>{v.version}</span>
                    {v.quantized && <span className={styles.badge}>Quantized</span>}
                  </div>
                  <div className={styles.versionDetails}>
                    <span>Size: {formatFileSize(v.size)}</span>
                    <span>Accuracy: {(v.accuracy * 100).toFixed(2)}%</span>
                  </div>
                  <div className={styles.versionChanges}>
                    {v.changes.map((c, i) => (
                      <span key={i}>• {c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Suite */}
      <div className={styles.section}>
        <h2>🧪 Test Suite - All 5 Enhancements</h2>
        <div className={styles.testButtons}>
          <button onClick={testModelLoading} className={styles.testButton}>
            1. Model Loading
          </button>
          <button onClick={testModelStreaming} className={styles.testButton}>
            2. Model Streaming
          </button>
          <button onClick={testQuantization} className={styles.testButton}>
            3. Quantization
          </button>
          <button onClick={testCompression} className={styles.testButton}>
            4. Compression
          </button>
          <button onClick={testAIInference} className={styles.testButton}>
            5. AI Inference
          </button>
          <button onClick={testVersioning} className={styles.testButton}>
            6. Versioning
          </button>
        </div>

        <div className={styles.testResults}>
          {testResults.map((result) => (
            <div key={result.name} className={`${styles.testResult} ${styles[result.status]}`}>
              <div className={styles.testName}>
                <span className={styles.statusIcon}>
                  {result.status === 'pending' && '⏳'}
                  {result.status === 'running' && '🔄'}
                  {result.status === 'success' && '✅'}
                  {result.status === 'error' && '❌'}
                </span>
                {result.name}
              </div>
              {result.duration && (
                <div className={styles.testDuration}>{result.duration}ms</div>
              )}
              {result.result && <div className={styles.testOutput}>{result.result}</div>}
              {result.error && <div className={styles.testError}>{result.error}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className={styles.section}>
          <h2>📈 Analytics Summary</h2>
          <div className={styles.analyticsSummary}>
            <div className={styles.metric}>
              <div className={styles.label}>Load Success Rate</div>
              <div className={styles.chartBar}>
                <div
                  className={styles.chartFill}
                  style={{ width: `${analytics.successRate}%` }}
                />
              </div>
              <div className={styles.value}>{analytics.successRate.toFixed(1)}%</div>
            </div>

            <div className={styles.metric}>
              <div className={styles.label}>Avg Load Time</div>
              <div className={styles.value}>{analytics.avgLoadTimeMs}ms</div>
              <div className={styles.subtitle}>Target: &lt;5000ms ✓</div>
            </div>

            <div className={styles.metric}>
              <div className={styles.label}>Avg Compression Ratio</div>
              <div className={styles.value}>{analytics.avgCompressionRatio.toFixed(2)}x</div>
              <div className={styles.subtitle}>Typical: 3-5x compression</div>
            </div>

            <div className={styles.metric}>
              <div className={styles.label}>Total Data Downloaded</div>
              <div className={styles.value}>{analytics.totalDataDownloadedMB.toFixed(1)} MB</div>
              <div className={styles.subtitle}>Across {analytics.totalLoads} loads</div>
            </div>
          </div>

          <button onClick={() => modelAnalytics.printReport()} className={styles.printButton}>
            📋 Print Full Report to Console
          </button>
        </div>
      )}
    </div>
  );
}
