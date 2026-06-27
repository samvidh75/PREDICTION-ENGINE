import { useState } from 'react';
import { TrendingUp, Search, Zap, Shield } from 'lucide-react';
import { color, font, space, radius, typeScale, layout } from '../design/tokens';
import { Button } from '../components/ui/Button';
import { Card, CardLabel } from '../components/ui/Card';
import { useMediaQuery } from '../hooks/useMediaQuery';

const DISCOVER = [
  { icon: TrendingUp, title: 'Quality Compounders', desc: 'High ROE, low debt, consistent growth' },
  { icon: Search, title: 'Undervalued', desc: 'Trading below fair value PE' },
  { icon: Zap, title: 'Momentum', desc: 'Strong RSI, positive MACD signal' },
  { icon: Shield, title: 'Low Risk', desc: 'Low volatility, steady dividends' },
] as const;

const RECENT = ['TCS', 'INFY', 'HCL', 'SBIN', 'RELIANCE', 'WIPRO', 'LT', 'BAJAJ-AUTO'];

interface HomePageProps {
  onSelectStock?: (symbol: string) => void;
}

export default function HomePage({ onSelectStock }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const sectionGap = isDesktop ? space[12] : space[8];
  const pagePadX = isDesktop ? space[6] : space[3];

  return (
    <div style={{ background: color.bg, minHeight: '100vh' }}>
      {/* Hero band */}
      <section style={{
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
        paddingTop: isDesktop ? space[12] : space[8],
        paddingBottom: isDesktop ? space[12] : space[8],
        paddingLeft: pagePadX,
        paddingRight: pagePadX,
      }}>
        <h1 style={{
          fontFamily: font,
          fontSize: isDesktop ? typeScale.hero.desktop.size : typeScale.hero.mobile.size,
          fontWeight: isDesktop ? typeScale.hero.desktop.weight : typeScale.hero.mobile.weight,
          lineHeight: isDesktop ? typeScale.hero.desktop.line : typeScale.hero.mobile.line,
          letterSpacing: isDesktop ? typeScale.hero.desktop.track : typeScale.hero.mobile.track,
          color: color.primaryDark,
          margin: `0 0 ${space[4]} 0`,
        }}>
          Research Indian stocks before you invest.
        </h1>
        <p style={{
          fontFamily: font,
          fontSize: isDesktop ? typeScale.body.desktop.size : typeScale.body.mobile.size,
          fontWeight: typeScale.body.desktop.weight,
          lineHeight: typeScale.body.desktop.line,
          color: color.textMuted,
          margin: `0 0 ${space[6]} 0`,
        }}>
          Institutional-grade analysis on Nifty 50 companies. Understand before you invest.
        </p>
        <div style={{ display: 'flex', gap: space[3], justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search TCS, INFY, HDFC Bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontFamily: font,
              fontSize: '16px',
              padding: `${space[3]} ${space[4]}`,
              height: '52px',
              borderRadius: radius.pill,
              border: `1px solid ${color.border}`,
              background: color.bg,
              color: color.text,
              outline: 'none',
              minWidth: '240px',
              flex: '1 1 240px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = color.primary; e.currentTarget.style.boxShadow = `0 0 0 2px ${color.primary}20`; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <Button variant="primary">Research</Button>
        </div>
      </section>

      {/* Discover band */}
      <section style={{
        maxWidth: layout.maxContentWidth,
        margin: '0 auto',
        paddingLeft: pagePadX,
        paddingRight: pagePadX,
        paddingBottom: sectionGap,
      }}>
        <h2 style={{
          fontFamily: font,
          fontSize: isDesktop ? typeScale.h2.desktop.size : typeScale.h2.mobile.size,
          fontWeight: isDesktop ? typeScale.h2.desktop.weight : typeScale.h2.mobile.weight,
          lineHeight: isDesktop ? typeScale.h2.desktop.line : typeScale.h2.mobile.line,
          color: color.text,
          margin: `0 0 ${space[6]} 0`,
        }}>
          Discover opportunities
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr',
          gap: isDesktop ? space[6] : space[3],
        }}>
          {DISCOVER.map((item) => (
            <Card key={item.title} padding="md">
              <div style={{
                width: '32px',
                height: '4px',
                borderRadius: radius.sm,
                background: color.primary,
                marginBottom: space[3],
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: space[2], marginBottom: space[2] }}>
                <item.icon size={18} color={color.primary} strokeWidth={1.5} />
                <h3 style={{
                  fontFamily: font,
                  fontSize: isDesktop ? typeScale.h3.desktop.size : typeScale.h3.mobile.size,
                  fontWeight: typeScale.h3.desktop.weight,
                  lineHeight: typeScale.h3.desktop.line,
                  color: color.text,
                  margin: 0,
                }}>
                  {item.title}
                </h3>
              </div>
              <p style={{
                fontFamily: font,
                fontSize: typeScale.body.desktop.size,
                fontWeight: typeScale.body.desktop.weight,
                lineHeight: typeScale.body.desktop.line,
                color: color.textMuted,
                margin: 0,
              }}>
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Recently researched band */}
      <section style={{
        maxWidth: layout.maxContentWidth,
        margin: '0 auto',
        paddingLeft: pagePadX,
        paddingRight: pagePadX,
        paddingBottom: sectionGap,
      }}>
        <h2 style={{
          fontFamily: font,
          fontSize: isDesktop ? typeScale.h2.desktop.size : typeScale.h2.mobile.size,
          fontWeight: isDesktop ? typeScale.h2.desktop.weight : typeScale.h2.mobile.weight,
          lineHeight: isDesktop ? typeScale.h2.desktop.line : typeScale.h2.mobile.line,
          color: color.text,
          margin: `0 0 ${space[6]} 0`,
        }}>
          Recently researched
        </h2>
        <div style={{ display: 'flex', gap: space[2], overflowX: 'auto', paddingBottom: space[2] }}>
          {RECENT.map((stock) => (
            <Button key={stock} variant="secondary" onClick={() => onSelectStock?.(stock)}>
              {stock}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
