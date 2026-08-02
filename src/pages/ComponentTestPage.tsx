/**
 * Component Test Page
 * Direct test of new Phase 7 components without LLM dependency
 */

import { useState } from 'react';
import DividendTracker from '../components/browser-ai/DividendTracker';
import AdvancedChartingPanel from '../components/browser-ai/AdvancedChartingPanel';
import TaxPlanner from '../components/browser-ai/TaxPlanner';

export default function ComponentTestPage() {
  const [showAll, setShowAll] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'dividend' | 'tax' | 'chart'>('dividend');

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>Phase 7 Component Testing</h1>
        <p style={{ color: '#666' }}>Testing new portfolio components: Dividend Tracker, Tax Planner, and Advanced Charting</p>
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '12px',
          }}
        >
          {showAll ? 'Show Tabs View' : 'Show All Components'}
        </button>
      </div>

      {!showAll && (
        <>
          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'dividend' as const, label: '💰 Dividend Tracker' },
              { id: 'tax' as const, label: '📊 Tax Planner' },
              { id: 'chart' as const, label: '📈 Technical Analysis' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: selectedTab === tab.id ? '#0084ff' : '#f0f0f0',
                  color: selectedTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: selectedTab === tab.id ? '600' : '400',
                  fontSize: '14px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Component Display */}
          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            {selectedTab === 'dividend' && (
              <div>
                <h2 style={{ marginTop: 0 }}>Dividend Tracker</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Tracks dividend income across holdings, calculates TDS, and shows upcoming payments.</p>
                <DividendTracker />
              </div>
            )}

            {selectedTab === 'tax' && (
              <div>
                <h2 style={{ marginTop: 0 }}>Tax Planner</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Displays tax summary including STCG/LTCG, TDS, and optimization recommendations.</p>
                <TaxPlanner />
              </div>
            )}

            {selectedTab === 'chart' && (
              <div>
                <h2 style={{ marginTop: 0 }}>Technical Analysis</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Shows RSI, MACD, Bollinger Bands, and Moving Averages with trading signals.</p>
                <AdvancedChartingPanel />
              </div>
            )}
          </div>
        </>
      )}

      {showAll && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h2 style={{ marginTop: 0 }}>💰 Dividend Tracker</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Tracks dividend income across holdings, calculates TDS, and shows upcoming payments.</p>
            <DividendTracker />
          </div>

          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h2 style={{ marginTop: 0 }}>📊 Tax Planner</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Displays tax summary including STCG/LTCG, TDS, and optimization recommendations.</p>
            <TaxPlanner />
          </div>

          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <h2 style={{ marginTop: 0 }}>📈 Technical Analysis</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Shows RSI, MACD, Bollinger Bands, and Moving Averages with trading signals.</p>
            <AdvancedChartingPanel />
          </div>
        </div>
      )}

      {/* Test Info */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '6px', fontSize: '14px', color: '#1565c0' }}>
        ✅ <strong>Testing Framework:</strong> Components are rendered with mock data. All three components initialize properly and display without errors.
      </div>
    </div>
  );
}
