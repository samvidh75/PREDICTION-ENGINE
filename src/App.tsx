import { useState } from 'react';
import { color, font, space, radius } from './design/tokens';
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
    <div style={{ background: color.bg, minHeight: '100vh', fontFamily: font, color: color.text }}>
      <header style={{
        background: color.bgAlt,
        borderBottom: `1px solid ${color.border}`,
        padding: `${space[3]} ${space[6]}`,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[6] }}>
            <span style={{ fontWeight: 600, fontSize: '16px', color: color.text, cursor: 'pointer' }}
              onClick={() => navigate('home')}>
              StockStory
            </span>
            <nav style={{ display: 'flex', gap: space[2] }}>
              {(['home', 'scanner'] as PageType[]).map((p) => (
                <Button key={p} variant={currentPage === p ? 'primary' : 'ghost'}
                  onClick={() => navigate(p)}>
                  {p === 'home' ? 'Home' : 'Scanner'}
                </Button>
              ))}
            </nav>
          </div>
          <Button variant="ghost">Account</Button>
        </div>
      </header>

      <main>
        {currentPage === 'home' && <HomePage onSelectStock={(s) => navigate('stock', s)} />}
        {currentPage === 'stock' && selectedStock && <StockDetailPage symbol={selectedStock} />}
        {currentPage === 'scanner' && <ScannerPage onSelectStock={(s) => navigate('stock', s)} />}
      </main>

      <footer style={{
        background: color.bgAlt,
        padding: `${space[6]} ${space[6]}`,
        borderTop: `1px solid ${color.border}`,
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: color.textMuted, margin: 0 }}>
            &copy; 2025 StockStory India. Not SEBI-registered. Not investment advice.
          </p>
          <p style={{ fontSize: '12px', color: color.textMuted, margin: 0 }}>
            StockStory
          </p>
        </div>
      </footer>
    </div>
  );
}
