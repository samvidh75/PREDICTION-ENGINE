import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X, Home, Search, LayoutGrid, Star, TrendingUp, MessageCircle, Shield, DollarSign } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/scanner', label: 'Scanner', icon: Search },
  { to: '/technical-scanner', label: 'AI Scanner', icon: TrendingUp },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
  { to: '/chat', label: 'AI Chat', icon: MessageCircle },
  { to: '/sectors', label: 'Sectors', icon: LayoutGrid },
  { to: '/pricing', label: 'Pricing', icon: DollarSign },
  { to: '/trust', label: 'Trust & Safety', icon: Shield },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', display: 'flex' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? '240px' : '0',
        background: 'rgba(20,20,20,0.9)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: sidebarOpen ? '24px 0' : '0',
        transition: 'width 0.3s ease, padding 0.3s ease',
        overflow: 'hidden',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 1000,
      }}>
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #FF6B6B, #b0151e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: '#fff'
            }}>S</div>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap' }}>StockEx</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '14px',
                borderRadius: '8px',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* SIDEBAR BACKDROP */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
            >
              <Menu size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #FF6B6B, #b0151e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, color: '#fff'
              }}>S</div>
              <span style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>StockEx</span>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Navigation items */}
          </nav>
        </header>
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
        <footer style={{
          padding: '24px', borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center', fontSize: '12px', color: '#666',
        }}>
          StockEx India — Research platform for Indian equities. Not SEBI-registered. Not investment advice.
        </footer>
      </div>
    </div>
  );
}
