import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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

const NAV_ITEMS = [
  { path: '/',          label: 'Home',     icon: '⌂' },
  { path: '/scanner',   label: 'Scanner',  icon: '⚡' },
  { path: '/watchlist', label: 'Watchlist',icon: '♡' },
  { path: '/compare',   label: 'Compare',  icon: '⊕' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user, logout } = useAuth();

  const activePath = location.pathname;

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--page)', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
        <div style={{
          position: 'sticky', top: 0,
          background: 'rgba(248, 248, 246, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          height: 52,
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          zIndex: 90,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src="/logo-mark.svg" alt="" style={{ width:24, height:24 }} />
            <div style={{ fontSize:14, fontWeight:800, color:'var(--text-900)', letterSpacing:'-0.02em' }}>
              StockStory
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          {children}
        </div>

        <nav style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:200,
          height:60, background:'var(--surface)',
          borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'stretch',
          paddingBottom:'env(safe-area-inset-bottom)',
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', gap:2,
                color: isActive ? 'var(--brand)' : 'var(--text-300)',
                textDecoration:'none', fontSize:10, fontWeight:600,
              }}>
                <span style={{ fontSize:20 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page)' }}>
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'fixed', top: 0, left: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0' }}>
            <img src="/logo-mark.svg" alt="StockStory" style={{ width:32, height:32, flexShrink:0 }} />
            <div>
              <div style={{
                fontSize:15, fontWeight:800, color:'var(--text-900)',
                letterSpacing:'-0.02em', lineHeight:1.1
              }}>
                StockStory
              </div>
              <div style={{
                fontSize:10, fontWeight:600, color:'var(--text-300)',
                letterSpacing:'0.08em', textTransform:'uppercase', lineHeight:1
              }}>
                India · Research
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 20px',
                cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--brand)' : 'var(--text-500)',
                borderLeft: isActive ? '3px solid var(--brand)' : '3px solid transparent',
                background: isActive ? 'var(--brand-tint)' : 'transparent',
                textDecoration: 'none',
              }}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth area + Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {user ? (
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{
                  width:30, height:30, borderRadius:'50%',
                  background:'var(--brand-tint)', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--brand-text)'
                }}>
                  {(user.displayName || user.email || '?').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-900)' }}>
                    {user.displayName || user.email}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-300)' }}>
                    {(user as any).isPro ? '⭐ Pro' : 'Free'}
                  </div>
                </div>
              </div>
              <button onClick={logout} style={{
                fontSize:12, color:'var(--text-300)',
                background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font)',
              }}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              <Link to="/login" style={{ fontSize:13, fontWeight:600, color:'var(--brand-text)' }}>
                Sign in →
              </Link>
              <Link to="/register" style={{ fontSize:12, color:'var(--text-500)' }}>
                Create account
              </Link>
            </div>
          )}
          <div style={{
            fontSize:10, color:'var(--text-300)', lineHeight:1.5,
            borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4
          }}>
            Not SEBI-registered<br/>
            Not investment advice<br/>
            © 2025 StockStory India
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="content-area" style={{ marginLeft: 220, padding: 'var(--sp-8) var(--sp-10)', minHeight: '100vh', background: 'var(--page)', flex:1 }}>
        {children}
      </main>
    </div>
  );
}
