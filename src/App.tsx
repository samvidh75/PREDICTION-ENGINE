import { useState } from 'react';
import { AppShell } from './app/AppShell';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockPage';
import ScannerPage from './pages/ScannerPage';

type PageType = 'home' | 'stock' | 'scanner' | 'watchlist' | 'compare';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const navigate = (page: PageType, stock?: string) => {
    setCurrentPage(page);
    if (stock) setSelectedStock(stock);
  };

  const shellPage = currentPage === 'stock' ? 'home' : currentPage;

  return (
    <AppShell
      currentPage={shellPage as any}
      onNavigate={(p) => navigate(p as PageType)}
      title={currentPage === 'stock' ? undefined : undefined}
      onBack={currentPage === 'stock' ? () => navigate('home') : undefined}
    >
      {currentPage === 'home' && <HomePage onSelectStock={(s) => navigate('stock', s)} />}
      {currentPage === 'stock' && selectedStock && <StockDetailPage symbol={selectedStock} />}
      {currentPage === 'scanner' && <ScannerPage onSelectStock={(s) => navigate('stock', s)} />}
      {currentPage === 'watchlist' && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Watchlist — coming soon
        </div>
      )}
      {currentPage === 'compare' && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          Compare — coming soon
        </div>
      )}
    </AppShell>
  );
}
