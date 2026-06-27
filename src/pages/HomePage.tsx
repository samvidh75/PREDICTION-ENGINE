import { useState } from 'react';
import { Search, BarChart3, GitCompare, Bookmark, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { NIFTY50_SYMBOLS } from '../services/universe/StockUniverse';
import { navigate } from '../components/product/routeConfig';

/* ─── constants ───────────────────────────────────────────────────────────── */

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const DISCOVER = [
  {
    title: 'Quality Compounders',
    desc: 'High ROE, low debt, consistent earnings growth year over year.',
    sub: 'Filter by fundamentals',
    page: 'scanner',
  },
  {
    title: 'Undervalued Gems',
    desc: 'Stocks trading below fair value PE with strong balance sheets.',
    sub: 'Value screening',
    page: 'scanner',
  },
  {
    title: 'Momentum Movers',
    desc: 'Strong RSI with positive MACD crossover signals.',
    sub: 'Technical signals',
    page: 'scanner',
  },
  {
    title: 'Stable Defenders',
    desc: 'Debt-free businesses with low volatility and steady dividends.',
    sub: 'Low-risk picks',
    page: 'scanner',
  },
] as const;

const FEATURES = [
  {
    label: 'Score',
    title: 'Conviction score.',
    desc: 'Every stock gets a 0–100 score across quality, growth, valuation, risk, and momentum.',
    href: 'scanner',
    linkText: 'Browse stocks',
  },
  {
    label: 'Compare',
    title: 'Side-by-side analysis.',
    desc: 'Compare any two Nifty 50 companies across all five dimensions instantly.',
    href: 'compare',
    linkText: 'Compare now',
  },
  {
    label: 'Track',
    title: 'Watchlist intelligence.',
    desc: 'Track the stocks you care about and monitor thesis changes over time.',
    href: 'watchlist',
    linkText: 'Open watchlist',
  },
] as const;

function getRecent():  string[] { try { return JSON.parse(localStorage.getItem('stockstory-recent')  || '[]') as string[]; } catch { return []; } }

/* ─── components ──────────────────────────────────────────────────────────── */

function FeatureCard({ item }: { item: (typeof FEATURES)[number] }) {
  return (
    <div
      style={{
        background: '#F5F5F7',
        borderRadius: '18px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
        transition: 'transform 250ms ease, box-shadow 250ms ease',
      }}
      onClick={() => navigate(item.href)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#6E6E73', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>{item.label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: '#1D1D1F', lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: FONT }}>{item.title}</div>
      <p style={{ fontSize: '15px', color: '#6E6E73', lineHeight: 1.5, fontFamily: FONT, margin: 0 }}>{item.desc}</p>
      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <span style={{
          fontSize: '15px',
          fontWeight: 400,
          color: '#0066CC',
          fontFamily: FONT,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {item.linkText} <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [recent]          = useState<string[]>(getRecent);

  const handleSearch = () => {
    const q = query.trim().toUpperCase();
    if (q) navigate('stock', q);
  };

  const popular = (recent.length > 0 ? recent : NIFTY50_SYMBOLS).slice(0, 8);

  return (
    <div style={{ fontFamily: FONT, color: '#1D1D1F' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        textAlign: 'center',
        padding: '80px 0 64px',
        borderBottom: '1px solid #D2D2D7',
        marginBottom: '64px',
      }}>
        <p style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#6E6E73',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '16px',
          fontFamily: FONT,
        }}>
          AI-Powered Stock Research
        </p>

        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 64px)',
          fontWeight: 600,
          color: '#1D1D1F',
          lineHeight: 1.05,
          letterSpacing: '-0.005em',
          margin: '0 auto 20px',
          maxWidth: '720px',
          fontFamily: FONT,
        }}>
          Research Indian stocks.<br />Understand before you invest.
        </h1>

        <p style={{
          fontSize: '19px',
          fontWeight: 400,
          color: '#6E6E73',
          lineHeight: 1.47,
          letterSpacing: '-0.022em',
          margin: '0 auto 40px',
          maxWidth: '520px',
          fontFamily: FONT,
        }}>
          Institutional-grade analysis on Nifty 50 companies — scores, charts, financials, and news in one place.
        </p>

        {/* Search bar — Apple style */}
        <div style={{
          maxWidth: '520px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #D2D2D7',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          height: '50px',
        }}>
          <Search size={16} style={{ color: '#AEAEB2', flexShrink: 0, marginLeft: '16px' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search TCS, HDFC Bank, Reliance…"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: '#1D1D1F',
              fontSize: '15px',
              outline: 'none',
              padding: '0 12px',
              fontFamily: FONT,
              letterSpacing: '-0.016em',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              height: '50px',
              padding: '0 24px',
              background: '#1D1D1F',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: FONT,
              letterSpacing: '-0.016em',
              flexShrink: 0,
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3A3A3C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1D1D1F')}
          >
            Research
          </button>
        </div>

        {/* Quick nav pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Scanner', icon: BarChart3, page: 'scanner' },
            { label: 'Compare', icon: GitCompare, page: 'compare' },
            { label: 'Watchlist', icon: Bookmark,  page: 'watchlist' },
          ].map(action => (
            <button
              key={action.page}
              onClick={() => navigate(action.page)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '30px',
                padding: '0 14px',
                borderRadius: '9999px',
                border: '1px solid #D2D2D7',
                background: 'transparent',
                color: '#6E6E73',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: FONT,
                letterSpacing: '-0.01em',
                transition: 'border-color 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#1D1D1F';
                e.currentTarget.style.color = '#1D1D1F';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#D2D2D7';
                e.currentTarget.style.color = '#6E6E73';
              }}
            >
              <action.icon size={12} />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Discover section ───────────────────────────────────────────────── */}
      <section style={{ marginBottom: '80px' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#1D1D1F',
          letterSpacing: '-0.01em',
          margin: '0 0 32px',
          fontFamily: FONT,
        }}>
          Discover opportunities.
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {DISCOVER.map(item => (
            <div
              key={item.title}
              onClick={() => navigate(item.page)}
              style={{
                background: '#F5F5F7',
                borderRadius: '18px',
                padding: '28px 24px',
                cursor: 'pointer',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: FONT }}>{item.sub}</div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F', marginBottom: '8px', lineHeight: 1.2, fontFamily: FONT }}>{item.title}</div>
              <p style={{ fontSize: '14px', color: '#6E6E73', lineHeight: 1.5, fontFamily: FONT, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature highlight cards ────────────────────────────────────────── */}
      <section style={{ marginBottom: '80px' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#1D1D1F',
          letterSpacing: '-0.01em',
          margin: '0 0 32px',
          fontFamily: FONT,
        }}>
          Everything you need to research a stock.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {FEATURES.map(item => <FeatureCard key={item.label} item={item} />)}
        </div>
      </section>

      {/* ── Recently viewed / Popular ──────────────────────────────────────── */}
      <section style={{
        borderTop: '1px solid #D2D2D7',
        paddingTop: '48px',
        marginBottom: '80px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          {recent.length > 0
            ? <><Clock size={14} style={{ color: '#AEAEB2' }} /><h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F', margin: 0, fontFamily: FONT }}>Recently viewed</h2></>
            : <><TrendingUp size={14} style={{ color: '#AEAEB2' }} /><h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F', margin: 0, fontFamily: FONT }}>Popular stocks</h2></>
          }
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {popular.map(sym => (
            <button
              key={sym}
              onClick={() => navigate('stock', sym)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #D2D2D7',
                background: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: FONT,
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F5F5F7';
                e.currentTarget.style.borderColor = '#AEAEB2';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = '#D2D2D7';
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.016em' }}>{sym}</div>
              <div style={{ fontSize: '12px', color: '#AEAEB2', marginTop: '2px' }}>Research →</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #D2D2D7',
        padding: '24px 0',
      }}>
        <p style={{ fontSize: '12px', color: '#AEAEB2', margin: 0, fontFamily: FONT, lineHeight: 1.6 }}>
          Copyright &copy; 2025 StockStory India. Not SEBI-registered. Not investment advice. For educational purposes only.
        </p>
        <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
          {[['Terms', '/terms'], ['About', '/about'], ['Methodology', '/methodology'], ['Pricing', '/pricing']].map(([label, href]) => (
            <a key={href} href={href} style={{ fontSize: '12px', color: '#6E6E73', textDecoration: 'none', fontFamily: FONT }}>
              {label}
            </a>
          ))}
        </div>
      </footer>

    </div>
  );
}
