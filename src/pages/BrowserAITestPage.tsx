/**
 * Browser AI Chat Test Page
 * Test new portfolio features: DividendTracker, TaxPlanner, AdvancedChartingPanel
 */

import { useEffect } from 'react';
import BrowserAiChat from '../components/browser-ai/BrowserAiChat';
import { portfolioStorage, type Portfolio } from '../utils/portfolioStorage';

export default function BrowserAITestPage() {
  // Initialize portfolio with test holdings on mount
  useEffect(() => {
    const initTestPortfolio = async () => {
      await portfolioStorage.init();

      // Check if portfolio already exists
      const existing = await portfolioStorage.getPortfolio('default');
      if (existing && existing.holdings.length > 0) {
        return; // Already has holdings
      }

      // Create test portfolio with holdings
      const testPortfolio: Portfolio = {
        userId: 'default',
        holdings: [
          {
            id: 'holding-1',
            ticker: 'HDFC',
            quantity: 10,
            buyPrice: 1500,
            buyDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
            notes: 'Test holding',
          },
          {
            id: 'holding-2',
            ticker: 'INFY',
            quantity: 25,
            buyPrice: 1800,
            buyDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago
            notes: 'Test holding',
          },
          {
            id: 'holding-3',
            ticker: 'TCS',
            quantity: 5,
            buyPrice: 3200,
            buyDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1 month ago
            notes: 'Test holding',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInvested: 10 * 1500 + 25 * 1800 + 5 * 3200,
      };

      await portfolioStorage.savePortfolio(testPortfolio);
    };

    initTestPortfolio().catch(console.error);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Testing Portfolio Components</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Below you can test the DividendTracker, TaxPlanner, and AdvancedChartingPanel components.
      </p>
      <BrowserAiChat ticker="TCS" />
    </div>
  );
}
