import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SectorData {
  name: string;
  slug: string;
  return1D: number;
  return1W: number;
  return1M: number;
  return3M: number;
  return1Y: number;
  avgPE: number;
  avgROE: number;
  advDecline: { advances: number; declines: number; unchanged: number };
  companyCount: number;
}

const SECTOR_DATA: SectorData[] = [
  { name: 'Information Technology', slug: 'information-technology', return1D: 1.2, return1W: 2.8, return1M: 5.1, return3M: 8.3, return1Y: 22.4, avgPE: 28, avgROE: 25, advDecline: { advances: 85, declines: 32, unchanged: 5 }, companyCount: 122 },
  { name: 'Banking & Finance', slug: 'banking-finance', return1D: -0.3, return1W: 0.5, return1M: 2.1, return3M: 4.2, return1Y: 18.6, avgPE: 18, avgROE: 15, advDecline: { advances: 142, declines: 78, unchanged: 12 }, companyCount: 232 },
  { name: 'Pharma & Healthcare', slug: 'pharma-healthcare', return1D: 0.8, return1W: 1.5, return1M: 3.2, return3M: 6.8, return1Y: 28.3, avgPE: 32, avgROE: 18, advDecline: { advances: 45, declines: 22, unchanged: 4 }, companyCount: 71 },
  { name: 'Consumer Goods', slug: 'consumer-goods', return1D: -0.5, return1W: -0.8, return1M: 1.5, return3M: 2.1, return1Y: 12.5, avgPE: 45, avgROE: 20, advDecline: { advances: 52, declines: 41, unchanged: 6 }, companyCount: 99 },
  { name: 'Energy & Oil', slug: 'energy-oil', return1D: 1.5, return1W: 3.2, return1M: 6.5, return3M: 10.2, return1Y: 35.8, avgPE: 12, avgROE: 22, advDecline: { advances: 28, declines: 12, unchanged: 3 }, companyCount: 43 },
  { name: 'Automotive', slug: 'automotive', return1D: -0.8, return1W: -1.2, return1M: 0.8, return3M: -2.5, return1Y: 8.2, avgPE: 22, avgROE: 14, advDecline: { advances: 18, declines: 25, unchanged: 2 }, companyCount: 45 },
  { name: 'Construction & Engineering', slug: 'construction-engineering', return1D: 2.1, return1W: 4.5, return1M: 8.2, return3M: 15.6, return1Y: 42.3, avgPE: 20, avgROE: 16, advDecline: { advances: 35, declines: 15, unchanged: 2 }, companyCount: 52 },
  { name: 'Materials & Mining', slug: 'materials-mining', return1D: 1.8, return1W: 3.5, return1M: 7.2, return3M: 12.8, return1Y: 38.5, avgPE: 14, avgROE: 19, advDecline: { advances: 22, declines: 10, unchanged: 1 }, companyCount: 33 },
  { name: 'Telecom', slug: 'telecom', return1D: 0.2, return1W: 1.0, return1M: 2.8, return3M: 5.5, return1Y: 15.2, avgPE: 16, avgROE: 12, advDecline: { advances: 8, declines: 5, unchanged: 1 }, companyCount: 14 },
  { name: 'Insurance', slug: 'insurance', return1D: -0.1, return1W: 0.3, return1M: 1.8, return3M: 3.5, return1Y: 14.8, avgPE: 15, avgROE: 13, advDecline: { advances: 12, declines: 8, unchanged: 1 }, companyCount: 21 },
  { name: 'Media & Entertainment', slug: 'media-entertainment', return1D: 0.5, return1W: 1.2, return1M: 4.5, return3M: 7.8, return1Y: 25.6, avgPE: 25, avgROE: 11, advDecline: { advances: 15, declines: 10, unchanged: 2 }, companyCount: 27 },
];

function getReturnColor(value: number): string {
  if (value > 5) return '#16a34a';
  if (value > 2) return '#22c55e';
  if (value > 0) return '#86efac';
  if (value > -2) return '#fca5a5';
  return '#dc2626';
}

function getHeatColor(value: number, max: number): string {
  const intensity = Math.min(Math.abs(value) / max, 1);
  if (value >= 0) {
    const r = Math.round(220 * (1 - intensity));
    const g = Math.round(220 + 35 * intensity);
    const b = Math.round(220 * (1 - intensity));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const r = Math.round(220 + 35 * intensity);
  const g = Math.round(220 * (1 - intensity));
  const b = Math.round(220 * (1 - intensity));
  return `rgb(${r}, ${g}, ${b})`;
}

export function SectorHeatmap() {
  const navigate = useNavigate();
  const maxReturn = useMemo(() => Math.max(...SECTOR_DATA.map(s => Math.abs(s.return1M))), []);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Sector Heatmap</h2>
          <p style={{ fontSize: '13px', color: '#a0a0a0', margin: '4px 0 0 0' }}>1-month performance by sector — bubble size = company count</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#a0a0a0' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgb(220, 240, 220)', display: 'inline-block' }} /> Strong</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgb(240, 220, 220)', display: 'inline-block' }} /> Weak</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {SECTOR_DATA.map(sector => {
          const size = Math.max(120, Math.min(280, sector.companyCount * 2.5));
          return (
            <div
              key={sector.slug}
              onClick={() => navigate(`/sectors/${sector.slug}`)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: getHeatColor(sector.return1M, maxReturn),
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                minHeight: `${size * 0.5}px`,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a1a', marginBottom: '2px' }}>{sector.name}</div>
                  <div style={{ fontSize: '11px', color: '#4a4a4a' }}>{sector.companyCount} companies</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '18px', color: sector.return1M >= 0 ? '#166534' : '#991b1b' }}>
                    {sector.return1M >= 0 ? '+' : ''}{sector.return1M}%
                  </div>
                  <div style={{ fontSize: '10px', color: '#4a4a4a' }}>1M return</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', fontSize: '11px', color: '#333' }}>
                <span>PE: {sector.avgPE}</span>
                <span style={{ color: '#999' }}>|</span>
                <span>ROE: {sector.avgROE}%</span>
                {sector.return1M >= 0
                  ? <TrendingUp size={12} color="#166534" style={{ marginLeft: 'auto' }} />
                  : <TrendingDown size={12} color="#991b1b" style={{ marginLeft: 'auto' }} />
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                {[sector.return1D, sector.return1W, sector.return1M, sector.return3M, sector.return1Y].map((ret, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: ret >= 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>{ret >= 0 ? '+' : ''}{ret}%</div>
                    <div style={{ fontSize: '8px', color: '#4a4a4a', textTransform: 'uppercase' }}>{['1D', '1W', '1M', '3M', '1Y'][i]}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', fontSize: '10px', color: '#333' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>{sector.advDecline.advances}A</span>
                <span style={{ color: '#991b1b', fontWeight: 600 }}>{sector.advDecline.declines}D</span>
                <span style={{ color: '#666' }}>{sector.advDecline.unchanged}U</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
