import { useState } from 'react';
import { colors, typography, spacing } from './styles';
import { Button } from './components/ui/Button';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockPage';
import ScannerPage from './pages/ScannerPage';

type PageType = 'home' | 'stock' | 'scanner';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const navigate = (page: PageType, stock?: string) => {
    setCurrentPage(page);
    if (stock) setSelectedStock(stock);
  };

  return (
    <div style={{ background: colors.bg.primary, minHeight: '100vh' }}>
      <header style={{
        background: colors.bg.secondary,
        borderBottom: `1px solid ${colors.bg.tertiary}`,
        padding: `${spacing.sm} ${spacing.xl}`,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <span style={{ ...typography.bodyEmphasis, color: colors.text.primary, cursor: 'pointer', fontSize: '16px' }}
              onClick={() => navigate('home')}>
              StockStory
            </span>
            <nav style={{ display: 'flex', gap: spacing.xs }}>
              {(['home', 'scanner'] as PageType[]).map((p) => (
                <Button key={p} variant={currentPage === p ? 'primary' : 'ghost'} size="sm"
                  onClick={() => navigate(p)}>
                  {p === 'home' ? 'Home' : 'Scanner'}
                </Button>
              ))}
            </nav>
          </div>
          <Button variant="ghost" size="sm">Account</Button>
        </div>
      </header>

      <main>
        {currentPage === 'home' && <HomePage onSelectStock={(s) => navigate('stock', s)} />}
        {currentPage === 'stock' && selectedStock && <StockDetailPage symbol={selectedStock} />}
        {currentPage === 'scanner' && <ScannerPage onSelectStock={(s) => navigate('stock', s)} />}
      </main>

      <footer style={{
        background: colors.bg.secondary,
        padding: `${spacing.xl} ${spacing.xl}`,
        borderTop: `1px solid ${colors.bg.tertiary}`,
      }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...typography.caption, color: colors.text.secondary, margin: 0 }}>
            &copy; 2025 StockStory India. Not SEBI-registered. Not investment advice.
          </p>
          <p style={{ ...typography.caption, color: colors.text.secondary, margin: 0 }}>
            StockStory
          </p>
        </div>
      </footer>
    </div>
  );
}
