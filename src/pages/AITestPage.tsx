/**
 * AI Test Page - Test Local LLM and Stock Analysis
 * Route: /ai-test
 */

import { useState } from 'react';
import { Loader } from 'lucide-react';
import { colors, space } from '../design/tokens';
import { localLLMService } from '../services/ai/LocalLLMService';
import { stockExAI } from '../services/ai/StockExAI';

export default function AITestPage() {
  const [activeTab, setActiveTab] = useState<'local-llm' | 'stock-ex'>('local-llm');
  const [llmPrompt, setLlmPrompt] = useState('');
  const [llmResult, setLlmResult] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockQuery, setStockQuery] = useState('Analyze HDFC');
  const [stockResult, setStockResult] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const handleLLMTest = async () => {
    if (!llmPrompt.trim()) return;

    setLlmLoading(true);
    setLlmResult('Initializing model...');

    try {
      const result = await localLLMService.generateStockAnalysis(
        'HDFC',
        { pe: 20, roe: 15 },
        llmPrompt
      );

      setLlmResult(`✅ Generated in ${result.timeMs}ms\n\n${result.text}`);
      const info = localLLMService.getModelInfo();
      setModelInfo(info);
    } catch (error) {
      setLlmResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure Transformers.js is installed:\nnpm install @xenova/transformers`);
    } finally {
      setLlmLoading(false);
    }
  };

  const handleStockExTest = async () => {
    if (!stockQuery.trim()) return;

    setStockLoading(true);
    setStockResult('🤔 Thinking...');

    try {
      const result = await stockExAI.chat(stockQuery);
      setStockResult(`✅ Generated in ${result.thinkingTime}ms (Confidence: ${(result.confidence * 100).toFixed(0)}%)\n\n${result.response}`);
    } catch (error) {
      setStockResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setStockLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: space[6],
        display: 'grid',
        gap: space[6],
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: '700', color: colors.ink }}>
          🧠 AI Engine Testing
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: colors.body }}>
          Test StockEx AI capabilities and local LLM integration
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: space[2] }}>
        {(['local-llm', 'stock-ex'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: `${space[2]} ${space[4]}`,
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab ? colors.primary : 'rgba(255,255,255,0.04)',
              color: activeTab === tab ? '#fff' : colors.body,
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'local-llm' ? '🦾 Local LLM' : '🤖 StockEx AI'}
          </button>
        ))}
      </div>

      {/* Local LLM Test */}
      {activeTab === 'local-llm' && (
        <div style={{ display: 'grid', gap: space[4] }}>
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: space[4],
              display: 'grid',
              gap: space[3],
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.body, marginBottom: space[2] }}>
                Test Prompt
              </label>
              <textarea
                value={llmPrompt}
                onChange={(e) => setLlmPrompt(e.target.value)}
                placeholder="Enter a question for the local LLM..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: space[3],
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.canvas,
                  color: colors.ink,
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={handleLLMTest}
              disabled={llmLoading}
              style={{
                padding: `${space[2]} ${space[4]}`,
                borderRadius: '8px',
                border: 'none',
                background: llmLoading ? 'rgba(255,107,107,0.5)' : 'linear-gradient(135deg, #FF6B6B, #b0151e)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: llmLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space[2],
              }}
            >
              {llmLoading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {llmLoading ? 'Generating...' : 'Test Local LLM'}
            </button>
          </div>

          {llmResult && (
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: space[4],
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: colors.body,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}
              >
                {llmResult}
              </pre>
            </div>
          )}

          {modelInfo && (
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                padding: space[4],
              }}
            >
              <h3 style={{ margin: '0 0 12px', color: '#22c55e', fontSize: '14px', fontWeight: '600' }}>
                ✅ Model Info
              </h3>
              <div style={{ fontSize: '12px', color: colors.body, lineHeight: '1.8' }}>
                <div>Model: {modelInfo.name}</div>
                <div>Size: {modelInfo.size}</div>
                <div>Status: {modelInfo.isLoaded ? '✅ Loaded' : modelInfo.isLoading ? '⏳ Loading' : '❌ Not loaded'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* StockEx AI Test */}
      {activeTab === 'stock-ex' && (
        <div style={{ display: 'grid', gap: space[4] }}>
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: space[4],
              display: 'grid',
              gap: space[3],
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.body, marginBottom: space[2] }}>
                Stock Query
              </label>
              <input
                type="text"
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                placeholder="E.g., Analyze HDFC, Best stocks to buy, Market update..."
                style={{
                  width: '100%',
                  padding: space[3],
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.canvas,
                  color: colors.ink,
                  fontSize: '13px',
                }}
              />
              <div style={{ marginTop: space[2], fontSize: '11px', color: colors.body }}>
                Try: "Analyze HDFC", "Best stocks to buy", "Market update", "Explain P/E ratio"
              </div>
            </div>

            <button
              onClick={handleStockExTest}
              disabled={stockLoading}
              style={{
                padding: `${space[2]} ${space[4]}`,
                borderRadius: '8px',
                border: 'none',
                background: stockLoading ? 'rgba(255,107,107,0.5)' : 'linear-gradient(135deg, #FF6B6B, #b0151e)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: stockLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space[2],
              }}
            >
              {stockLoading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {stockLoading ? 'Analyzing...' : 'Test StockEx AI'}
            </button>
          </div>

          {stockResult && (
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: space[4],
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: colors.body,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}
              >
                {stockResult}
              </pre>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
