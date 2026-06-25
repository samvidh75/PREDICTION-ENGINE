import { useState } from "react";
import { COMPANY_PROFILES, type CompanyProfile } from "../../data/companyProfiles";

interface CompanyInfoProps {
  symbol: string;
  snapshot?: {
    companyName?: string;
    about?: string;
  } | null;
}

export const CompanyInfo = ({ symbol, snapshot }: CompanyInfoProps) => {
  const profile = COMPANY_PROFILES[symbol];
  const [expanded, setExpanded] = useState(false);

  const about = profile?.about ?? snapshot?.about ?? 
    `${snapshot?.companyName ?? symbol} is a publicly listed Indian company on the NSE and BSE.`;
  
  const truncated = about.length > 300 && !expanded;
  const displayText = truncated ? about.slice(0, 300) + '...' : about;

  const facts: { label: string; value: string | number | null; isLink?: boolean }[] = [
    { label:'Founded',        value: profile?.founded?.toString() ?? '—' },
    { label:'CEO / MD',       value: profile?.ceo ?? '—' },
    { label:'Headquarters',   value: profile?.hq ?? '—' },
    { label:'Employees',      value: profile?.employees ?? '—' },
    { label:'Listed since',   value: profile?.listingDate ?? '—' },
    { label:'NSE Symbol',     value: symbol },
    { label:'BSE Code',       value: profile?.bseCode ?? '—' },
    { label:'Website',        value: profile?.website ?? null, isLink: true },
  ].filter(f => f.value !== '—');

  return (
    <div style={{ 
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding:'24px', margin:'12px 0',
    }}>
      <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
        About {profile?.fullName ?? snapshot?.companyName ?? symbol}
      </div>
      
      <p style={{ fontSize:'var(--sz-base)', color:'var(--text-500)', 
        lineHeight:1.7, marginBottom:4 }}>
        {displayText}
      </p>
      {about.length > 300 && (
        <button onClick={() => setExpanded(!expanded)} style={{
          background:'none', border:'none', cursor:'pointer', padding:0,
          fontSize:'var(--sz-sm)', fontWeight:600, color:'var(--brand-text)',
          fontFamily:'var(--font)',
        }}>
          {expanded ? 'Show less' : 'Read more →'}
        </button>
      )}

      <div style={{ height:1, background:'var(--border)', margin:'20px 0' }} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px' }}>
        {facts.map(fact => (
          <div key={fact.label} style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
              textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {fact.label}
            </div>
            {fact.isLink && fact.value ? (
              <a href={`https://${fact.value}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'var(--sz-sm)', fontWeight:500, color:'var(--brand-text)' }}>
                {fact.value} ↗
              </a>
            ) : (
              <div style={{ fontSize:'var(--sz-sm)', fontWeight:600, color:'var(--text-900)' }}>
                {fact.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {profile?.sectors && (
        <>
          <div style={{ height:1, background:'var(--border)', margin:'20px 0 14px' }} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {profile.sectors.map(s => (
              <span key={s} style={{
                padding:'4px 10px', borderRadius:'var(--r-pill)',
                background:'var(--chip)', color:'var(--text-500)',
                fontSize:'var(--sz-xs)', fontWeight:600,
              }}>
                {s}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyInfo;
