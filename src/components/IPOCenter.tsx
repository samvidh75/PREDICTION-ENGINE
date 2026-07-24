import { useState } from 'react';
import { Calendar, Building2, TrendingUp, Users, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';

type IPOStatus = 'open' | 'upcoming' | 'listed' | 'withdrawn';

interface IPO {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  status: IPOStatus;
  priceBand: string;
  lotSize: number;
  minInvestment: number;
  openDate: string;
  closeDate: string;
  listingDate: string | null;
  issueSize: number;
  listingGains: number | null;
  subscription: {
    qib: number;
    nii: number;
    retail: number;
    total: number;
  };
  gmp: number | null;
  analystRating: 'positive' | 'neutral' | 'avoid' | null;
  registrar: string;
  leadManagers: string[];
  sector: string;
}

const UPCOMING_IPOS: IPO[] = [
  { id: 'ipo1', name: 'Citicore Renewable Energy Corp', symbol: 'CREC', logo: '', status: 'upcoming', priceBand: '₱2.50–2.65', lotSize: 5000, minInvestment: 13250, openDate: '2026-08-10', closeDate: '2026-08-13', listingDate: null, issueSize: 8500, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 0.18, analystRating: 'positive', registrar: 'BDO Capital', leadManagers: ['BDO Capital', 'First Metro Investment', 'BPI Capital'], sector: 'Renewable Energy' },
  { id: 'ipo2', name: 'Figaro Coffee Group', symbol: 'FIGARO', logo: '', status: 'upcoming', priceBand: '₱2.50–2.80', lotSize: 5000, minInvestment: 14000, openDate: '2026-08-02', closeDate: '2026-08-05', listingDate: null, issueSize: 2200, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 0.15, analystRating: 'positive', registrar: 'RCBC Trust', leadManagers: ['China Bank Capital', 'RCBC Capital'], sector: 'Food & Beverage' },
  { id: 'ipo3', name: 'MerryMart Consumer Corp', symbol: 'MMRT', logo: '', status: 'upcoming', priceBand: '₱4.10–4.50', lotSize: 2000, minInvestment: 9000, openDate: '2026-09-15', closeDate: '2026-09-18', listingDate: null, issueSize: 3500, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 0.30, analystRating: 'neutral', registrar: 'BDO Capital', leadManagers: ['PNB Capital', 'First Metro Investment'], sector: 'Retail' },
];

const ACTIVE_IPOS: IPO[] = [
  { id: 'ipo4', name: 'AllHome Property Holdings', symbol: 'AHPH', logo: '', status: 'open', priceBand: '₱6.80–7.20', lotSize: 1000, minInvestment: 7200, openDate: '2026-07-26', closeDate: '2026-07-30', listingDate: null, issueSize: 4200, listingGains: null, subscription: { qib: 3.2, nii: 5.8, retail: 2.1, total: 3.5 }, gmp: 0.45, analystRating: 'positive', registrar: 'BPI Capital', leadManagers: ['BPI Capital', 'China Bank Capital', 'BDO Capital'], sector: 'Real Estate' },
  { id: 'ipo5', name: 'Solar Philippines Power', symbol: 'SPNEC2', logo: '', status: 'open', priceBand: '₱1.90–2.10', lotSize: 10000, minInvestment: 19000, openDate: '2026-07-25', closeDate: '2026-07-29', listingDate: null, issueSize: 6800, listingGains: null, subscription: { qib: 1.8, nii: 3.2, retail: 1.5, total: 2.1 }, gmp: 0.12, analystRating: 'positive', registrar: 'RCBC Trust', leadManagers: ['First Metro Investment', 'BDO Capital'], sector: 'Renewable Energy' },
  { id: 'ipo6', name: 'DITO CME Holdings', symbol: 'DITO2', logo: '', status: 'open', priceBand: '₱3.20–3.50', lotSize: 3000, minInvestment: 10500, openDate: '2026-07-24', closeDate: '2026-07-28', listingDate: null, issueSize: 3800, listingGains: null, subscription: { qib: 4.5, nii: 6.2, retail: 3.8, total: 4.8 }, gmp: 0.20, analystRating: 'neutral', registrar: 'BDO Capital', leadManagers: ['PNB Capital', 'China Bank Capital'], sector: 'Telecom' },
];

const LISTED_IPOS: IPO[] = [
  { id: 'ipo7', name: 'Season Tech Holdings', symbol: 'SEASON', logo: '', status: 'listed', priceBand: '₱1.80–1.95', lotSize: 10000, minInvestment: 19000, openDate: '2026-06-15', closeDate: '2026-06-18', listingDate: '2026-06-28', issueSize: 2800, listingGains: 32, subscription: { qib: 42.5, nii: 68.3, retail: 38.2, total: 51.8 }, gmp: 0.25, analystRating: 'positive', registrar: 'BDO Capital', leadManagers: ['BDO Capital', 'RCBC Trust'], sector: 'Technology' },
  { id: 'ipo8', name: 'GoTyme Financial Corp', symbol: 'GOTYME', logo: '', status: 'listed', priceBand: '₱3.50–3.80', lotSize: 3000, minInvestment: 11400, openDate: '2026-05-20', closeDate: '2026-05-23', listingDate: '2026-06-03', issueSize: 12000, listingGains: 18, subscription: { qib: 15.8, nii: 22.5, retail: 8.6, total: 15.2 }, gmp: 0.28, analystRating: 'positive', registrar: 'BPI Capital', leadManagers: ['BPI Capital', 'First Metro Investment', 'BDO Capital'], sector: 'Fintech' },
  { id: 'ipo9', name: 'Metro Retail Stores Group', symbol: 'MRSGI2', logo: '', status: 'listed', priceBand: '₱0.72–0.78', lotSize: 20000, minInvestment: 15600, openDate: '2026-04-10', closeDate: '2026-04-13', listingDate: '2026-04-23', issueSize: 4200, listingGains: 42, subscription: { qib: 35.2, nii: 48.6, retail: 52.3, total: 46.1 }, gmp: 0.10, analystRating: 'positive', registrar: 'RCBC Trust', leadManagers: ['China Bank Capital', 'PNB Capital'], sector: 'Retail' },
];

function formatIssueSize(millions: number): string {
  return `₱${millions >= 1000 ? (millions / 1000).toFixed(1) + 'B' : millions + 'M'}`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: IPOStatus }) {
  const config: Record<IPOStatus, { label: string; color: string; bg: string }> = {
    open: { label: 'Open', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    upcoming: { label: 'Upcoming', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    listed: { label: 'Listed', color: '#a0a0a0', bg: 'rgba(160,160,160,0.15)' },
    withdrawn: { label: 'Withdrawn', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  };
  const c = config[status];
  return (
    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

function IPOCard({ ipo }: { ipo: IPO }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        padding: '16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Building2 size={16} color="#3b82f6" />
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{ipo.name}</span>
            <StatusBadge status={ipo.status} />
          </div>
          <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
            {ipo.sector} • {ipo.symbol}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>{ipo.priceBand}</div>
          <div style={{ fontSize: '11px', color: '#a0a0a0' }}>Price Band</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{ipo.subscription.total.toFixed(1)}x</div>
          <div style={{ fontSize: '10px', color: '#a0a0a0', textTransform: 'uppercase' }}>Total Subscription</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: ipo.gmp ? '#f59e0b' : '#666' }}>{ipo.gmp ? `₱${ipo.gmp}` : '—'}</div>
          <div style={{ fontSize: '10px', color: '#a0a0a0', textTransform: 'uppercase' }}>GMP (Grey Market)</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: ipo.listingGains ? '#22c55e' : '#666' }}>
            {ipo.listingGains ? `+${ipo.listingGains}%` : '—'}
          </div>
          <div style={{ fontSize: '10px', color: '#a0a0a0', textTransform: 'uppercase' }}>Listing Gains</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{formatIssueSize(ipo.issueSize)}</div>
          <div style={{ fontSize: '10px', color: '#a0a0a0', textTransform: 'uppercase' }}>Issue Size</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#a0a0a0', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> Lot: {ipo.lotSize} shares</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Min: ₱{ipo.minInvestment.toLocaleString('en-PH')}</span>
        {ipo.analystRating && (
          <span style={{
            padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
            color: ipo.analystRating === 'positive' ? '#22c55e' : ipo.analystRating === 'neutral' ? '#f59e0b' : '#ef4444',
            background: ipo.analystRating === 'positive' ? 'rgba(34,197,94,0.15)' : ipo.analystRating === 'neutral' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
            fontWeight: 600,
          }}>
            {ipo.analystRating === 'positive' ? 'Subscribe' : ipo.analystRating === 'neutral' ? 'Neutral' : 'Avoid'}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#a0a0a0' }}>
            <div><strong style={{ color: '#ccc' }}>Registrar:</strong> {ipo.registrar}</div>
            <div><strong style={{ color: '#ccc' }}>Lead Managers:</strong> {ipo.leadManagers.join(', ')}</div>
            {ipo.listingDate && <div><strong style={{ color: '#ccc' }}>Listing Date:</strong> {formatDate(ipo.listingDate)}</div>}
          </div>

          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ccc', marginBottom: '6px' }}>Subscription Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {[
                { label: 'Institutional', value: ipo.subscription.qib, color: '#3b82f6' },
                { label: 'High Net Worth', value: ipo.subscription.nii, color: '#f59e0b' },
                { label: 'Retail', value: ipo.subscription.retail, color: '#10b981' },
                { label: 'Total', value: ipo.subscription.total, color: '#8b5cf6' },
              ].map(s => (
                <div key={s.label} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: s.color }}>{s.value.toFixed(1)}x</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function IPOCenter() {
  const [activeTab, setActiveTab] = useState<'open' | 'upcoming' | 'listed'>('open');

  const tabs: { id: typeof activeTab; label: string; count: number }[] = [
    { id: 'open', label: 'Open', count: ACTIVE_IPOS.length },
    { id: 'upcoming', label: 'Upcoming', count: UPCOMING_IPOS.length },
    { id: 'listed', label: 'Recently Listed', count: LISTED_IPOS.length },
  ];

  const currentIPOs = activeTab === 'open' ? ACTIVE_IPOS : activeTab === 'upcoming' ? UPCOMING_IPOS : LISTED_IPOS;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>IPO Center</h2>
          <p style={{ fontSize: '13px', color: '#a0a0a0', margin: '4px 0 0 0' }}>Track, analyze, and decide on IPOs</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400,
              background: activeTab === tab.id ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : '#a0a0a0',
              transition: 'all 0.15s',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {currentIPOs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>No {activeTab} IPOs at this time</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {currentIPOs.map(ipo => (
            <IPOCard key={ipo.id} ipo={ipo} />
          ))}
        </div>
      )}
    </div>
  );
}
