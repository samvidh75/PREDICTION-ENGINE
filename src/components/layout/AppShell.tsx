import { useEffect, useState, type ReactNode } from "react";
import { navigate } from "../product/routeConfig";
import Logo from "../brand/Logo";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function currentPage(): string {
  return new URLSearchParams(window.location.search).get('page') || '';
}

const NAV_ITEMS = [
  { page: '', label: 'Home', icon: '⌂' },
  { page: 'scanner', label: 'Scanner', icon: '≡' },
  { page: 'search', label: 'Search', icon: '⌕' },
  { page: 'compare', label: 'Compare', icon: '⇄' },
  { page: 'watchlist', label: 'Watchlist', icon: '◈' },
  { page: 'methodology', label: 'Methodology', icon: '?' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [, setKey] = useState(0);

  useEffect(() => {
    const sync = () => setKey(k => k + 1);
    window.addEventListener("popstate", sync);
    window.addEventListener("urlchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("urlchange", sync);
    };
  }, []);

  const active = currentPage();

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
        {/* Mobile top bar for navigation context */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'rgba(249, 249, 247, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          height: 52,
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          zIndex: 90,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            StockStory
          </div>
        </div>
        
        <div style={{ padding: '16px 16px 0' }}>
          {children}
        </div>

        {/* Bottom nav */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
          background: '#FFFFFF', borderTop: '1px solid var(--border)',
          zIndex: 50, display: 'flex', alignItems: 'center',
          justifyContent: 'space-around',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              aria-label={item.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer', minWidth: 44, height: 44,
                fontSize: 10, fontWeight: 600,
                color: active === item.page ? 'var(--brand)' : 'var(--text-muted)',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Desktop sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: '#FFFFFF',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 12px', borderBottom: '1px solid var(--border)' }}>
          <Logo />
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.page;
            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 20px', border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--brand)' : '3px solid transparent',
                  background: isActive ? 'var(--brand-light)' : 'transparent',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ 
          padding: '16px 12px', 
          borderTop: '1px solid var(--border)', 
          fontSize: 11, 
          color: 'var(--text-muted)', 
          lineHeight: 1.4,
          textAlign: 'center',
        }}>
          © 2025 StockStory India · Not SEBI-registered
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: '24px', maxWidth: 1080 }}>
        {children}
      </main>
    </div>
  );
}
