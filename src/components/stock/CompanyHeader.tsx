interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  high52w?: number | null;
  low52w?: number | null;
  open?: number | null;
}

interface SnapshotData {
  companyName?: string;
  sector?: string;
  marketCap?: number | null;
}

interface CompanyHeaderProps {
  symbol: string;
  quote: QuoteData | null;
  snapshot: SnapshotData | null;
}

function useWatchlist(symbol: string) {
  return {
    isTracked: false,
    toggleTrack: () => {},
  };
}

export const CompanyHeader = ({ symbol, quote, snapshot }: CompanyHeaderProps) => {
  const { isTracked, toggleTrack } = useWatchlist(symbol);
  const isPositive = (quote?.changePercent ?? 0) >= 0;

  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, marginBottom:12 }}>

        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{
            width:44, height:44, borderRadius:'var(--r-md)',
            background:'var(--brand-tint)', display:'flex',
            alignItems:'center', justifyContent:'center',
            fontSize:18, fontWeight:700, color:'var(--brand-text)',
            flexShrink:0,
          }}>
            {symbol.slice(0,2)}
          </div>
          <div>
            <div style={{ fontSize:'var(--sz-xl)', fontWeight:800,
              color:'var(--text-900)', letterSpacing:'-0.02em', lineHeight:1.1 }}>
              {snapshot?.companyName ?? symbol}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:5, flexWrap:'wrap' }}>
              <span style={{ fontSize:'var(--sz-sm)', color:'var(--text-500)', fontWeight:500 }}>
                NSE: {symbol}
              </span>
              {snapshot?.sector && (
                <>
                  <span style={{ color:'var(--border-strong)' }}>·</span>
                  <span style={{
                    fontSize:'var(--sz-xs)', fontWeight:700,
                    padding:'2px 8px', borderRadius:'var(--r-pill)',
                    background:'var(--chip)', color:'var(--text-500)',
                  }}>
                    {snapshot.sector}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          <button onClick={() => toggleTrack()} style={{
            height:36, padding:'0 14px', borderRadius:'var(--r-md)',
            background: isTracked ? 'var(--red-tint)' : 'var(--surface)',
            color: isTracked ? 'var(--red-text)' : 'var(--text-500)',
            border: isTracked ? '1px solid #FCA5A5' : '1px solid var(--border)',
            fontSize:'var(--sz-sm)', fontWeight:600, cursor:'pointer',
            fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:5,
          }}>
            {isTracked ? '♥' : '♡'} {isTracked ? 'Tracked' : 'Track'}
          </button>
          <a href={`/compare?stocks=${symbol}`} style={{
            height:36, padding:'0 14px', borderRadius:'var(--r-md)',
            background:'var(--surface)', color:'var(--text-500)',
            border:'1px solid var(--border)', fontSize:'var(--sz-sm)',
            fontWeight:600, display:'flex', alignItems:'center', gap:5,
            textDecoration:'none', lineHeight:1,
          }}>
            ⊕ Compare
          </a>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{
            fontSize:'var(--sz-4xl)',
            fontWeight:800,
            letterSpacing:'-0.03em',
            color:'var(--text-900)',
            lineHeight:1,
            marginBottom:6,
          }}>
            {quote ? `₹${quote.price.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : (
              <span className="skeleton" style={{ width:180, height:48, display:'inline-block', borderRadius:'var(--r-sm)' }} />
            )}
          </div>

          {quote && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{
                fontSize:'var(--sz-base)', fontWeight:700,
                color: isPositive ? 'var(--green)' : 'var(--red)',
              }}>
                {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
                ₹{Math.abs(quote.change).toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
              <span style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)' }}>
                As of {new Date(quote.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })} IST
              </span>
            </div>
          )}
        </div>

        <button onClick={() => {}} style={{
          height:44, padding:'0 22px', borderRadius:'var(--r-md)',
          background:'var(--brand)', color:'var(--text-inverse)',
          border:'none', fontSize:'var(--sz-base)', fontWeight:700,
          cursor:'pointer', fontFamily:'var(--font)',
          display:'flex', alignItems:'center', gap:6,
          transition:'background 80ms ease',
          whiteSpace:'nowrap',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
        onMouseOut={e => (e.currentTarget.style.background = 'var(--brand)')}>
          Invest via broker →
        </button>
      </div>
    </div>
  );
};

export default CompanyHeader;
