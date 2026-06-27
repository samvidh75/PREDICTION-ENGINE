import { Home, Search, Star, GitCompare, ArrowLeft } from 'lucide-react';
import { color, font, space, radius, layout } from '../design/tokens';

type PageType = 'home' | 'scanner' | 'watchlist' | 'compare';

interface NavItem {
  to: PageType;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { to: 'home',      label: 'Home',      icon: Home },
  { to: 'scanner',   label: 'Scanner',   icon: Search },
  { to: 'watchlist', label: 'Watchlist', icon: Star },
  { to: 'compare',   label: 'Compare',   icon: GitCompare },
];

interface AppShellProps {
  children: React.ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  title?: string;
  onBack?: () => void;
}

export function AppShell({ children, currentPage, onNavigate, title, onBack }: AppShellProps) {
  return (
    <div style={{ fontFamily: font, color: color.text, background: color.bg, minHeight: '100vh' }}>
      {/* Desktop left rail — hidden on mobile */}
      <aside className="rail">
        <div
          style={{ fontWeight: 700, fontSize: '16px', color: color.text, cursor: 'pointer', marginBottom: space[8] }}
          onClick={() => onNavigate('home')}
        >
          StockStory
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
          {NAV.map((item) => {
            const active = currentPage === item.to;
            return (
              <button
                key={item.to}
                onClick={() => onNavigate(item.to)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space[3],
                  padding: `${space[2]} ${space[3]}`,
                  borderRadius: radius.sm,
                  border: 'none',
                  background: active ? color.bgAlt : 'transparent',
                  color: active ? color.primary : color.textMuted,
                  fontWeight: active ? 600 : 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <item.icon size={18} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top bar — visible only on mobile */}
      <header className="mobile-header">
        {onBack ? (
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: space[2],
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: color.text, padding: 0,
            }}
          >
            <ArrowLeft size={18} />
            <span style={{ fontWeight: 600, fontSize: '16px' }}>StockStory</span>
          </button>
        ) : (
          <span style={{ fontWeight: 700, fontSize: '16px' }}>StockStory</span>
        )}
      </header>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="tabbar">
        {NAV.map((item) => {
          const active = currentPage === item.to;
          return (
            <button
              key={item.to}
              onClick={() => onNavigate(item.to)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, border: 'none', background: 'transparent', cursor: 'pointer',
                color: active ? color.primary : color.textMuted,
                flex: 1, padding: `${space[1]} 0`,
              }}
            >
              <item.icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content area */}
      <main className="content">
        {title && (
          <h1 style={{ fontSize: '28px', fontWeight: 600, lineHeight: '1.2', margin: `0 0 ${space[6]} 0` }}>
            {title}
          </h1>
        )}
        {children}
      </main>

      {/* Desktop footer */}
      <footer className="desktop-footer">
        <p style={{ fontSize: '12px', color: color.textMuted, margin: 0 }}>
          &copy; 2025 StockStory India. Not SEBI-registered. Not investment advice.
        </p>
        <p style={{ fontSize: '12px', color: color.textMuted, margin: 0 }}>StockStory</p>
      </footer>
    </div>
  );
}
