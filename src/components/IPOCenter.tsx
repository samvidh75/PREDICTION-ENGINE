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
  { id: 'ipo1', name: 'Jio Finance Ltd', symbol: 'JIOFIN', logo: '', status: 'upcoming', priceBand: '₹250–265', lotSize: 56, minInvestment: 14840, openDate: '2026-08-10', closeDate: '2026-08-13', listingDate: null, issueSize: 8500, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 85, analystRating: 'positive', registrar: 'Link Intime', leadManagers: ['Kotak', 'DAM Capital', 'ICICI Securities'], sector: 'Financial Services' },
  { id: 'ipo2', name: 'Ola Electric Mobility', symbol: 'OLAELEC', logo: '', status: 'upcoming', priceBand: '₹72–76', lotSize: 195, minInvestment: 14820, openDate: '2026-08-02', closeDate: '2026-08-05', listingDate: null, issueSize: 5500, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 12, analystRating: 'positive', registrar: 'KFintech', leadManagers: ['Goldman Sachs', 'Kotak', 'Citi'], sector: 'Automotive (EV)' },
  { id: 'ipo3', name: 'Flipkart India Ltd', symbol: 'FLIPKART', logo: '', status: 'upcoming', priceBand: '₹1,800–1,950', lotSize: 7, minInvestment: 13650, openDate: '2026-09-15', closeDate: '2026-09-18', listingDate: null, issueSize: 35000, listingGains: null, subscription: { qib: 0, nii: 0, retail: 0, total: 0 }, gmp: 150, analystRating: 'neutral', registrar: 'Link Intime', leadManagers: ['Morgan Stanley', 'JM Financial', 'Goldman Sachs'], sector: 'E-commerce' },
];

const ACTIVE_IPOS: IPO[] = [
  { id: 'ipo4', name: 'IndiGo Logistics Ltd', symbol: 'INDIGOLOG', logo: '', status: 'open', priceBand: '₹480–505', lotSize: 30, minInvestment: 15150, openDate: '2026-07-26', closeDate: '2026-07-30', listingDate: null, issueSize: 4200, listingGains: null, subscription: { qib: 3.2, nii: 5.8, retail: 2.1, total: 3.5 }, gmp: 45, analystRating: 'positive', registrar: 'KFintech', leadManagers: ['ICICI Securities', 'Axis Capital', 'SBI Caps'], sector: 'Logistics' },
  { id: 'ipo5', name: 'Greenko Energy Ltd', symbol: 'GREENKO', logo: '', status: 'open', priceBand: '₹640–680', lotSize: 22, minInvestment: 14960, openDate: '2026-07-25', closeDate: '2026-07-29', listingDate: null, issueSize: 6800, listingGains: null, subscription: { qib: 1.8, nii: 3.2, retail: 1.5, total: 2.1 }, gmp: 62, analystRating: 'positive', registrar: 'Link Intime', leadManagers: ['Kotak', 'Morgan Stanley', 'CLSA'], sector: 'Renewable Energy' },
  { id: 'ipo6', name: 'Bharti Hexacom Ltd', symbol: 'BHARTIHEX', logo: '', status: 'open', priceBand: '₹520–550', lotSize: 27, minInvestment: 14850, openDate: '2026-07-24', closeDate: '2026-07-28', listingDate: null, issueSize: 3800, listingGains: null, subscription: { qib: 4.5, nii: 6.2, retail: 3.8, total: 4.8 }, gmp: 38, analystRating: 'neutral', registrar: 'KFintech', leadManagers: ['Axis Capital', 'BOB Caps', 'IDBI Capital'], sector: 'Telecom Infrastructure' },
];

const LISTED_IPOS: IPO[] = [
  { id: 'ipo7', name: 'MobiKwik Ltd', symbol: 'MOBIKWIK', logo: '', status: 'listed', priceBand: '₹265–279', lotSize: 53, minInvestment: 14787, openDate: '2026-06-15', closeDate: '2026-06-18', listingDate: '2026-06-28', issueSize: 2800, listingGains: 32, subscription: { qib: 42.5, nii: 68.3, retail: 38.2, total: 51.8 }, gmp: 55, analystRating: 'positive', registrar: 'Link Intime', leadManagers: ['SBI Caps', 'DAM Capital'], sector: 'Fintech' },
  { id: 'ipo8', name: 'Swiggy Ltd', symbol: 'SWIGGY', logo: '', status: 'listed', priceBand: '₹350–380', lotSize: 40, minInvestment: 15200, openDate: '2026-05-20', closeDate: '2026-05-23', listingDate: '2026-06-03', issueSize: 12000, listingGains: 18, subscription: { qib: 15.8, nii: 22.5, retail: 8.6, total: 15.2 }, gmp: 28, analystRating: 'positive', registrar: 'Link Intime', leadManagers: ['Kotak', 'Morgan Stanley', 'Goldman Sachs'], sector: 'Food Tech' },
  { id: 'ipo9', name: 'Vishal Mega Mart Ltd', symbol: 'VISHAL', logo: '', status: 'listed', priceBand: '₹72–78', lotSize: 190, minInvestment: 14820, openDate: '2026-04-10', closeDate: '2026-04-13', listingDate: '2026-04-23', issueSize: 4200, listingGains: 42, subscription: { qib: 35.2, nii: 48.6, retail: 52.3, total: 46.1 }, gmp: 35, analystRating: 'positive', registrar: 'KFintech', leadManagers: ['ICICI Securities', 'Axis Capital'], sector: 'Retail' },
];

function formatIssueSize(cr: number): string {
  return `₹${cr >= 1000 ? (cr / 1000).toFixed(1) + 'K' : cr} Cr`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
          <div style={{ fontSize: '22px', fontWeight: 700, color: ipo.gmp ? '#f59e0b' : '#666' }}>{ipo.gmp ? `₹${ipo.gmp}` : '—'}</div>
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Min: ₹{ipo.minInvestment.toLocaleString('en-IN')}</span>
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
                { label: 'QIB', value: ipo.subscription.qib, color: '#3b82f6' },
                { label: 'NII', value: ipo.subscription.nii, color: '#f59e0b' },
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
