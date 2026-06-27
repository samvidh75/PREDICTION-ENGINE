import { useState } from 'react';
import { spacing, typography, colors } from '../styles';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

const DISCOVER = [
  { accent: colors.primary, title: 'Quality Compounders', desc: 'High ROE, low debt, consistent growth' },
  { accent: colors.success, title: 'Undervalued Gems', desc: 'Trading below fair value PE' },
  { accent: colors.warning, title: 'Momentum Movers', desc: 'Strong RSI, positive MACD signal' },
  { accent: colors.text.secondary, title: 'Stable Defenders', desc: 'Low volatility, steady dividends' },
] as const;

const RECENT = ['TCS', 'INFY', 'HCL', 'SBIN', 'RELIANCE', 'WIPRO', 'LT', 'BAJAJ-AUTO'];

interface HomePageProps {
  onSelectStock?: (symbol: string) => void;
}

export default function HomePage({ onSelectStock }: HomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ background: colors.bg.primary, minHeight: '100vh', paddingTop: spacing.xl, paddingBottom: spacing.xxl }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', paddingLeft: spacing.xl, paddingRight: spacing.xl }}>

        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto', marginBottom: spacing.xxl }}>
          <h1 style={{ ...typography.heroTitle, color: colors.text.primary, marginBottom: spacing.base }}>
            Research Indian stocks with clarity
          </h1>
          <p style={{ ...typography.bodyText, color: colors.text.secondary, marginBottom: spacing.xl }}>
            Institutional-grade analysis on Nifty 50 companies. Understand before you invest.
          </p>
          <div style={{ marginBottom: spacing.base }}>
            <Input
              placeholder="Search TCS, INFY, HDFC Bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="primary" size="md">Research</Button>
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <h2 style={{ ...typography.sectionTitle, color: colors.text.primary, marginBottom: spacing.lg }}>
            Discover opportunities
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.base }}>
            {DISCOVER.map((item) => (
              <Card key={item.title} padding="md">
                <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: item.accent, marginBottom: spacing.base }} />
                <h3 style={{ ...typography.cardTitle, color: colors.text.primary, marginBottom: spacing.xs }}>
                  {item.title}
                </h3>
                <p style={{ ...typography.secondaryText, color: colors.text.secondary }}>
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ ...typography.sectionTitle, color: colors.text.primary, marginBottom: spacing.lg }}>
            Recently researched
          </h2>
          <div style={{ display: 'flex', gap: spacing.sm, overflowX: 'auto', paddingBottom: spacing.base }}>
            {RECENT.map((stock) => (
              <Button key={stock} variant="secondary" size="sm"
                onClick={() => onSelectStock?.(stock)}>
                {stock}
              </Button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
