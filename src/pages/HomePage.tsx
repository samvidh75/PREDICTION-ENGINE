import { useState } from 'react';
import { Search, BarChart3, GitCompare, Bookmark, Shield, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { NIFTY50_SYMBOLS } from '../services/universe/StockUniverse';
import { navigate } from '../components/product/routeConfig';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { colors, typography, spacing, radius, shadow } from '../styles';

/* ─── static data ─────────────────────────────────────────────────────────── */

const DISCOVER = [
  { icon: '📊', title: 'Quality Compounders',  desc: 'High ROE · Low debt · Consistent growth'     },
  { icon: '💎', title: 'Undervalued Gems',      desc: 'Trading below intrinsic value'               },
  { icon: '⚡', title: 'Momentum Movers',       desc: 'RSI strength · MACD crossover signal'        },
  { icon: '🛡', title: 'Stable Defenders',      desc: 'Debt-free · Low volatility · Steady returns' },
] as const;

const QUICK_ACTIONS = [
  { label: 'Scanner',     icon: BarChart3,  page: 'scanner'     },
  { label: 'Compare',     icon: GitCompare, page: 'compare'     },
  { label: 'Watchlist',   icon: Bookmark,   page: 'watchlist'   },
  { label: 'Methodology', icon: Shield,     page: 'methodology' },
] as const;

function getRecent():  string[] { try { return JSON.parse(localStorage.getItem('stockstory-recent')  || '[]') as string[]; } catch { return []; } }
function getTracked(): string[] { try { return JSON.parse(localStorage.getItem('stockstory-tracked') || '[]') as string[]; } catch { return []; } }

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [query,   setQuery]   = useState('');
  const [recent]              = useState<string[]>(getRecent);
  const [tracked]             = useState<string[]>(getTracked);

  const handleSearch = () => {
    const q = query.trim().toUpperCase();
    if (q) navigate('stock', q);
  };

  const popular = (recent.length > 0 ? recent : NIFTY50_SYMBOLS).slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.primary }}>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{
        paddingTop:    spacing.xxxl,
        paddingBottom: spacing.xl,
        textAlign:     'center',
        borderBottom:  `1px solid ${colors.bg.tertiary}`,
        marginBottom:  spacing.xl,
      }}>
        <h1 style={{ ...typography.sectionTitle, color: colors.text.primary, margin: 0 }}>
          Research Indian stocks
        </h1>
        <p style={{ ...typography.bodyText, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.lg }}>
          Institutional-grade analysis on Nifty 50 companies
        </p>

        {/* Search bar */}
        <div style={{
          maxWidth:     '560px',
          margin:       '0 auto',
          display:      'flex',
          border:       `1px solid ${colors.bg.tertiary}`,
          borderRadius: '8px',
          overflow:     'hidden',
          boxShadow:    shadow.card,
          background:   colors.bg.primary,
        }}>
          <Search size={16} style={{ color: colors.text.tertiary, flexShrink: 0, margin: '14px 0 0 14px' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="TCS, HDFC Bank, Reliance…"
            style={{
              flex:       1,
              border:     'none',
              background: 'transparent',
              color:      colors.text.primary,
              fontSize:   '16px',
              outline:    'none',
              padding:    `${spacing.sm} ${spacing.sm}`,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              minWidth:   0,
            }}
          />
          <Button variant="primary" size="md" onClick={handleSearch}
            style={{ borderRadius: 0, height: '48px', flexShrink: 0 }}>
            Research
          </Button>
        </div>

        {/* Quick action pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.page}
              onClick={() => navigate(action.page)}
              style={{
                display:      'inline-flex', alignItems: 'center', gap: '6px',
                height:       '34px', padding: `0 ${spacing.base}`,
                borderRadius: '9999px', border: `1px solid ${colors.bg.tertiary}`,
                background:   colors.bg.primary, color: colors.text.secondary,
                fontSize:     '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                transition:   'background 150ms ease',
                fontFamily:   '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = colors.bg.secondary)}
              onMouseLeave={e => (e.currentTarget.style.background = colors.bg.primary)}
            >
              <action.icon size={13} style={{ color: colors.primary }} />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Discover opportunities ─────────────────────────────────────── */}
      <section style={{ marginBottom: spacing.xl }}>
        <h2 style={{ ...typography.cardTitle, color: colors.text.primary, margin: `0 0 ${spacing.base}` }}>
          Discover opportunities
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing.base }}>
          {DISCOVER.map(lens => (
            <Card key={lens.title} onClick={() => navigate('scanner')} padding="md">
              <div style={{ fontSize: '24px', marginBottom: spacing.sm }}>{lens.icon}</div>
              <div style={{ ...typography.bodyEmphasis, color: colors.text.primary, marginBottom: spacing.xs }}>
                {lens.title}
              </div>
              <div style={{ ...typography.caption, color: colors.text.secondary, lineHeight: 1.4 }}>
                {lens.desc}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${colors.bg.tertiary}`, marginBottom: spacing.xl }} />

      {/* ── Recent / Popular ───────────────────────────────────────────── */}
      <section style={{ marginBottom: spacing.xl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base }}>
          {recent.length > 0
            ? <><Clock size={14} style={{ color: colors.text.tertiary }} /><h2 style={{ ...typography.bodyEmphasis, color: colors.text.primary, margin: 0 }}>Recently viewed</h2></>
            : <><TrendingUp size={14} style={{ color: colors.text.tertiary }} /><h2 style={{ ...typography.bodyEmphasis, color: colors.text.primary, margin: 0 }}>Popular stocks</h2></>
          }
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
          {popular.map(sym => (
            <button
              key={sym}
              onClick={() => navigate('stock', sym)}
              style={{
                padding: `${spacing.sm} ${spacing.base}`, borderRadius: radius.md,
                border: `1px solid ${colors.bg.tertiary}`, background: colors.bg.primary,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'background 150ms ease, box-shadow 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.bg.secondary; e.currentTarget.style.boxShadow = shadow.raised; }}
              onMouseLeave={e => { e.currentTarget.style.background = colors.bg.primary;   e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ ...typography.bodyEmphasis, color: colors.text.primary }}>{sym}</div>
              <div style={{ ...typography.caption, color: colors.text.tertiary, marginTop: '2px' }}>Research →</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Tracked ────────────────────────────────────────────────────── */}
      {tracked.length > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${colors.bg.tertiary}`, marginBottom: spacing.xl }} />
          <section style={{ marginBottom: spacing.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base }}>
              <Bookmark size={14} style={{ color: colors.text.tertiary }} />
              <h2 style={{ ...typography.bodyEmphasis, color: colors.text.primary, margin: 0 }}>Tracked</h2>
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: spacing.sm, overflowX: 'auto' }}>
              {tracked.map(sym => (
                <button key={sym} onClick={() => navigate('stock', sym)} style={{
                  flexShrink: 0, padding: `${spacing.sm} ${spacing.base}`,
                  borderRadius: radius.md, border: `1px solid ${colors.bg.tertiary}`,
                  background: colors.bg.primary, cursor: 'pointer', textAlign: 'left', minWidth: '90px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = colors.bg.secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = colors.bg.primary)}>
                  <div style={{ ...typography.bodyEmphasis, color: colors.text.primary }}>{sym}</div>
                  <div style={{ ...typography.caption, color: colors.text.tertiary, marginTop: '2px' }}>Tracked</div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Differentiators ────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${colors.bg.tertiary}`, marginBottom: spacing.xl }} />
      <section style={{ marginBottom: spacing.xl }}>
        <h2 style={{ ...typography.bodyEmphasis, color: colors.text.secondary, margin: `0 0 ${spacing.base}`, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What makes StockStory different
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.base }}>
          {[
            { icon: <AlertCircle size={14} style={{ color: colors.primary  }} />, title: 'Smart Alerts',    desc: 'Get notified when ROE drops or PE dips below peers'    },
            { icon: <TrendingUp  size={14} style={{ color: colors.success  }} />, title: 'Thesis Timeline', desc: 'Track how a stock\'s conviction score changed over time' },
            { icon: <BarChart3   size={14} style={{ color: colors.warning  }} />, title: 'Sector Compare',  desc: 'Auto-compare against 5 closest peers in sector'         },
            { icon: <Shield      size={14} style={{ color: colors.error    }} />, title: 'Risk-Adj Score',  desc: 'Score adjusted for volatility, not just returns'        },
          ].map(d => (
            <div key={d.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: spacing.sm,
              padding: spacing.base, borderRadius: radius.md, border: `1px solid ${colors.bg.tertiary}`,
            }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}>{d.icon}</div>
              <div>
                <div style={{ ...typography.caption, fontWeight: 600, color: colors.text.primary }}>{d.title}</div>
                <div style={{ ...typography.caption, color: colors.text.secondary, marginTop: '2px', lineHeight: 1.4 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${colors.bg.tertiary}`, padding: `${spacing.lg} 0` }}>
        <p style={{ ...typography.caption, color: colors.text.tertiary, margin: 0 }}>
          {'© 2025 StockStory India · Not SEBI-registered · Not investment advice · Educational purposes only'}
        </p>
      </div>

    </div>
  );
}
