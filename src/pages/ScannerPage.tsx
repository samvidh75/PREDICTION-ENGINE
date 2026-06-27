import { useState, useMemo } from 'react';
import { spacing, typography, colors } from '../styles';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { scanByType, type ScanType, type FactorScores } from '../services/scanner/scoringEngine';

interface ScanResult extends FactorScores {
  rank: number;
  symbol: string;
  name: string;
}

interface ScannerPageProps {
  onSelectStock?: (symbol: string) => void;
}

const SCAN_OPTIONS: { value: ScanType; label: string }[] = [
  { value: 'quality', label: 'Quality' },
  { value: 'value', label: 'Value' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'stable', label: 'Stable' },
];

function convictionColor(conviction: number): string {
  if (conviction >= 75) return colors.success;
  if (conviction >= 60) return colors.primary;
  if (conviction >= 45) return colors.warning;
  return colors.error;
}

export default function ScannerPage({ onSelectStock }: ScannerPageProps) {
  const [scanType, setScanType] = useState<ScanType>('quality');
  const [search, setSearch] = useState('');

  const results: ScanResult[] = useMemo(() => {
    return scanByType(scanType).map((s, i) => ({
      rank: i + 1,
      symbol: s.symbol,
      name: s.name,
      quality: s.quality,
      valuation: s.valuation,
      growth: s.growth,
      risk: s.risk,
      technical: s.technical,
      overall: s.overall,
    }));
  }, [scanType]);

  const filtered = results.filter((r) =>
    r.symbol.toLowerCase().includes(search.toLowerCase()) ||
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: colors.bg.secondary, minHeight: '100vh', paddingTop: spacing.xl, paddingBottom: spacing.xxl }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', paddingLeft: spacing.xl, paddingRight: spacing.xl }}>
        <div style={{ marginBottom: spacing.xl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.base }}>
            <h1 style={{ ...typography.pageTitle, color: colors.text.primary, margin: 0 }}>
              Scanner
            </h1>
            <div style={{ display: 'flex', gap: spacing.sm }}>
              {SCAN_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={scanType === opt.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setScanType(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: '360px' }}>
            <Input
              placeholder="Search symbol or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card padding="sm">
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <p style={{ ...typography.bodyText, color: colors.text.secondary }}>No results found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.bg.tertiary}` }}>
                    {['#', 'Company', 'Quality', 'Val.', 'Growth', 'Risk', 'Tech', 'Conviction'].map((h) => (
                      <th key={h} style={{
                        ...typography.caption, padding: `${spacing.sm} ${spacing.sm}`,
                        textAlign: h === '#' || h === 'Company' ? 'left' : 'right',
                        color: colors.text.secondary, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.symbol} style={{
                      borderBottom: `1px solid ${colors.bg.tertiary}`,
                      transition: 'background 150ms ease', cursor: 'pointer',
                    }}
                      onClick={() => onSelectStock?.(r.symbol)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg.primary; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...typography.caption, padding: spacing.sm, color: colors.text.secondary }}>{r.rank}</td>
                      <td style={{ padding: spacing.sm }}>
                        <div style={{ ...typography.bodyEmphasis, color: colors.text.primary, fontSize: '14px' }}>{r.symbol}</div>
                        <div style={{ ...typography.caption, color: colors.text.secondary }}>{r.name}</div>
                      </td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, color: colors.text.primary }}>{r.quality}</td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, color: colors.text.primary }}>{r.valuation}</td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, color: colors.text.primary }}>{r.growth}</td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, color: colors.text.primary }}>{r.risk}</td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, color: colors.text.primary }}>{r.technical}</td>
                      <td style={{ padding: spacing.sm, textAlign: 'right', ...typography.caption, fontWeight: 600, color: convictionColor(r.overall) }}>{r.overall}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
