import { useEffect, useRef } from "react";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
}

export const ProUpgradeModal = ({ isOpen, onClose, symbol }: ProUpgradeModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }} style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.4)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'16px',
    }}>
      <div style={{
        background:'var(--surface)', borderRadius:'var(--r-xl)',
        boxShadow:'var(--sh-modal)', width:'100%', maxWidth:480,
        padding:'32px', position:'relative',
        animation:'modalIn 200ms ease',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:16, right:16, width:32, height:32,
          borderRadius:'50%', border:'none', background:'var(--chip)',
          cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:16, color:'var(--text-500)',
        }}>
          ✕
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <span style={{ fontSize:24 }}>⭐</span>
          <div>
            <div style={{ fontSize:'var(--sz-lg)', fontWeight:800, color:'var(--text-900)', letterSpacing:'-0.02em' }}>
              Go Pro
            </div>
            <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-500)' }}>
              {symbol ? `Unlock full analysis for ${symbol}` : 'Unlock full access'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
          {[
            'Detailed factor breakdown with peer comparison',
            'Fair value DCF estimates & target price',
            'AI analyst thesis — strengths, risks, watch items',
            '8 additional Pro metrics (EV/EBITDA, ROIC, MACD, etc.)',
            'Unlock unlimited stock reports & comparisons',
          ].map((benefit, i) => (
            <div key={i} style={{ display:'flex', gap:10, fontSize:'var(--sz-sm)', color:'var(--text-700)', lineHeight:1.5 }}>
              <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div style={{
          background:'linear-gradient(145deg, var(--brand-tint) 0%, #F5F0FF 100%)',
          borderRadius:'var(--r-lg)', padding:'20px', marginBottom:20,
          border:'1px solid #C7D9F8',
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
            <span style={{ fontSize:'var(--sz-3xl)', fontWeight:800, color:'var(--text-900)', letterSpacing:'-0.03em' }}>
              ₹299
            </span>
            <span style={{ fontSize:'var(--sz-sm)', color:'var(--text-500)' }}>/mo</span>
          </div>
          <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)' }}>
            Cancel anytime · Indian pricing · Secure payment
          </div>
        </div>

        <button style={{
          width:'100%', height:48,
          background:'var(--brand)', color:'var(--text-inverse)',
          border:'none', borderRadius:'var(--r-md)',
          fontSize:'var(--sz-base)', fontWeight:700, cursor:'pointer',
          fontFamily:'var(--font)',
        }}
        onMouseOver={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
        onMouseOut={e => (e.currentTarget.style.background = 'var(--brand)')}>
          Subscribe Now →
        </button>

        <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', textAlign:'center', marginTop:12 }}>
          7-day free trial · No commitment
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeModal;
