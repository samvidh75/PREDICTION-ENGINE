import { useEffect, useState } from "react";

interface HealthometerProps {
  score: number | null;
  factors: {
    quality: number;
    valuation: number;
    growth: number;
    riskStability: number;
    momentum: number;
  } | null;
  thesis: string | null;
  stateLabel: string | null;
  proAnalysis?: {
    strengths: string[];
    weaknesses: string[];
    watchFor: string[];
    sectorContext: string;
  };
  isPro: boolean;
  onUpgradeClick: () => void;
}

const SCORE_CONFIG: Record<string, { min: number; color: string; label: string; emoji: string }> = {
  'very-healthy': { min:80, color:'var(--green)',      label:'Very Healthy', emoji:'🟢' },
  'healthy':      { min:65, color:'var(--green)',      label:'Healthy',      emoji:'🟢' },
  'moderate':     { min:50, color:'var(--amber)',      label:'Moderate',     emoji:'🟡' },
  'attention':    { min:35, color:'var(--amber)',      label:'Needs Attention', emoji:'🟡' },
  'caution':      { min:0,  color:'var(--red)',        label:'Caution',      emoji:'🔴' },
};

const getConfig = (score: number) => {
  if (score >= 80) return SCORE_CONFIG['very-healthy'];
  if (score >= 65) return SCORE_CONFIG['healthy'];
  if (score >= 50) return SCORE_CONFIG['moderate'];
  if (score >= 35) return SCORE_CONFIG['attention'];
  return SCORE_CONFIG['caution'];
};

const STATE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'High Conviction': { bg:'var(--green-tint)',  text:'var(--green-text)' },
  'Healthy':         { bg:'var(--green-tint)',  text:'var(--green-text)' },
  'Watch':           { bg:'var(--amber-tint)',  text:'var(--amber-text)' },
  'Risk Rising':     { bg:'var(--red-tint)',    text:'var(--red-text)' },
  'Needs Review':    { bg:'var(--amber-tint)',  text:'var(--amber-text)' },
  'Avoid for Now':   { bg:'var(--red-tint)',    text:'var(--red-text)' },
  'Moderate':        { bg:'var(--amber-tint)',  text:'var(--amber-text)' },
};

export const Healthometer = ({ score, factors, thesis, stateLabel, proAnalysis, isPro, onUpgradeClick }: HealthometerProps) => {
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarsAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (score === null) return (
    <div className="skeleton" style={{ height:200, borderRadius:'var(--r-lg)' }} />
  );

  const cfg = getConfig(score);
  const badgeStyle = STATE_BADGE_COLORS[stateLabel ?? ''] ?? STATE_BADGE_COLORS['Moderate'];

  const FACTORS = [
    { label:'Business Quality', value: factors?.quality      ?? 0 },
    { label:'Valuation',        value: factors?.valuation    ?? 0 },
    { label:'Growth',           value: factors?.growth       ?? 0 },
    { label:'Risk & Stability', value: factors?.riskStability ?? 0 },
    { label:'Market Timing',    value: factors?.momentum     ?? 0 },
  ];

  return (
    <div style={{
      background:'var(--surface)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)',
      padding:'28px 28px 24px',
      margin:'12px 0',
    }}>
      <div style={{
        fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:20
      }}>
        Research Score
      </div>

      <div style={{ display:'flex', gap:32, alignItems:'flex-start', marginBottom:20 }}>

        <div style={{ flexShrink:0, minWidth:120 }}>
          <div style={{
            fontSize:'var(--sz-5xl)',
            fontWeight:800,
            letterSpacing:'-0.04em',
            lineHeight:1,
            color: cfg.color,
            marginBottom:8,
          }}>
            {score}
          </div>
          <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-300)', marginBottom:10 }}>
            out of 100
          </div>

          {stateLabel && (
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'4px 10px', borderRadius:'var(--r-pill)',
              background: badgeStyle.bg, color: badgeStyle.text,
              fontSize:'var(--sz-xs)', fontWeight:700,
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%',
                background: badgeStyle.text, flexShrink:0 }} />
              {stateLabel}
            </div>
          )}

          <div style={{ marginTop:10, fontSize:'var(--sz-sm)', fontWeight:600, color: cfg.color }}>
            {cfg.emoji} {cfg.label}
          </div>
        </div>

        <div style={{ flex:1 }}>
          {FACTORS.map(({ label, value }) => (
            <div key={label} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:'var(--sz-sm)', color:'var(--text-500)', fontWeight:500 }}>
                  {label}
                </span>
                <span style={{
                  fontSize:'var(--sz-sm)', fontWeight:700,
                  color: value >= 70 ? 'var(--green-text)' : value >= 50 ? 'var(--text-700)' : 'var(--amber-text)'
                }}>
                  {value}
                </span>
              </div>
              <div style={{
                height:6, background:'var(--chip)',
                borderRadius:'var(--r-pill)', overflow:'hidden'
              }}>
                <div style={{
                  height:'100%', borderRadius:'var(--r-pill)',
                  width: barsAnimated ? `${value}%` : '0%',
                  background: value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--brand)' : 'var(--amber)',
                  transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {thesis && (
        <div style={{
          fontSize:'var(--sz-base)', color:'var(--text-500)', lineHeight:1.6,
          borderTop:'1px solid var(--border)', paddingTop:16, marginBottom:20,
        }}>
          {thesis}
        </div>
      )}

      {!isPro ? (
        <div style={{
          background:'linear-gradient(145deg, var(--brand-tint) 0%, #F5F0FF 100%)',
          border:'1px solid #C7D9F8',
          borderRadius:'var(--r-lg)',
          padding:'20px 22px',
          marginTop:4,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>🔒</span>
            <span style={{ fontSize:'var(--sz-base)', fontWeight:700, color:'var(--text-900)' }}>
              Why {score}/100 — specific analysis
            </span>
          </div>

          <div style={{ position:'relative', marginBottom:16 }}>
            <div style={{
              filter:'blur(4.5px)',
              userSelect:'none', pointerEvents:'none',
              lineHeight:1.7,
            }}>
              <div style={{ fontSize:'var(--sz-sm)', color:'var(--red-text)', fontWeight:500, marginBottom:6 }}>
                ⚠ Dragging down: PE 28.4× vs IT sector median 22.1× — 28% premium to peers
              </div>
              <div style={{ fontSize:'var(--sz-sm)', color:'var(--red-text)', fontWeight:500, marginBottom:6 }}>
                ⚠ Revenue growth slowing: 8.3% FY25 vs 5-year average 16.2%
              </div>
              <div style={{ fontSize:'var(--sz-sm)', color:'var(--green-text)', fontWeight:500, marginBottom:6 }}>
                ✓ ROE 45.8% — top decile in Indian IT (sector avg: 24.1%)
              </div>
              <div style={{ fontSize:'var(--sz-sm)', color:'var(--green-text)', fontWeight:500 }}>
                ✓ Zero net debt — can fund growth from free cash flow
              </div>
            </div>
            <div style={{
              position:'absolute', bottom:0, left:0, right:0, height:48,
              background:'linear-gradient(transparent, var(--brand-tint))',
              pointerEvents:'none',
            }} />
          </div>

          <button
            onClick={onUpgradeClick}
            style={{
              width:'100%', height:44,
              background:'var(--brand)', color:'var(--text-inverse)',
              border:'none', borderRadius:'var(--r-md)',
              fontSize:'var(--sz-sm)', fontWeight:700, cursor:'pointer',
              letterSpacing:'0.01em', transition:'background 80ms ease',
              fontFamily:'var(--font)',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
            onMouseOut={e => (e.currentTarget.style.background = 'var(--brand)')}
          >
            Unlock deep analysis — ₹299/mo →
          </button>
          <div style={{
            fontSize:'var(--sz-xs)', color:'var(--text-300)',
            textAlign:'center', marginTop:10
          }}>
            Cancel anytime · Indian pricing · Secure
          </div>
        </div>
      ) : (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
          <div style={{ fontSize:'var(--sz-base)', fontWeight:700, color:'var(--text-900)', marginBottom:14 }}>
            Why {score}/100 — specific to this stock
          </div>
          {proAnalysis?.strengths.map(s => (
            <div key={s} style={{ fontSize:'var(--sz-sm)', color:'var(--green-text)',
              fontWeight:500, marginBottom:7, display:'flex', gap:8 }}>
              <span>✓</span><span>{s}</span>
            </div>
          ))}
          {proAnalysis?.weaknesses.map(w => (
            <div key={w} style={{ fontSize:'var(--sz-sm)', color:'var(--red-text)',
              fontWeight:500, marginBottom:7, display:'flex', gap:8 }}>
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
          {proAnalysis?.sectorContext && (
            <div style={{
              background:'var(--chip)', borderRadius:'var(--r-md)',
              padding:'12px 14px', marginTop:12,
              fontSize:'var(--sz-sm)', color:'var(--text-500)', lineHeight:1.55,
            }}>
              {proAnalysis.sectorContext}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Healthometer;
