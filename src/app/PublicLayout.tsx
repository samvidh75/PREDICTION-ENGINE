import { useNavigate } from 'react-router-dom';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #FF6B6B, #b0151e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, color: '#fff'
          }}>S</div>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>StockEx</span>
        </div>
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Empty - removed pricing and trust buttons */}
        </nav>
      </header>
      <main>{children}</main>
      <footer style={{
        padding: '24px', borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center', fontSize: '12px', color: '#666',
      }}>
        StockEx India — Research platform for Indian equities. Not SEBI-registered. Not investment advice.
      </footer>
    </div>
  );
}
