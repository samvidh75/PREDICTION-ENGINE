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
            ticker: 'BDO',
            quantity: 10,
            buyPrice: 150,
            buyDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago,
            notes: 'Test holding',
          },
          {
            id: 'holding-2',
            ticker: 'JFC',
            quantity: 25,
            buyPrice: 180,
            buyDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago,
            notes: 'Test holding',
          },
          {
            id: 'holding-3',
            ticker: 'ALI',
            quantity: 5,
            buyPrice: 32,
            buyDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1 month ago,
            notes: 'Test holding',
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInvested: 10 * 150 + 25 * 180 + 5 * 32,
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
      <BrowserAiChat ticker="BDO" />
    </div>
  );
}
