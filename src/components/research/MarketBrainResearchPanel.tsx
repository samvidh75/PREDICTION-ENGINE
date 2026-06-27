import { AlertTriangle, Brain, RefreshCw, ShieldCheck } from 'lucide-react';
import { useMarketBrainResearch } from '../../hooks/useMarketBrainResearch';
import type { MarketBrainEvidenceReviewView, MarketBrainFactorView, MarketBrainResearchView } from '../../services/marketBrainResearch';

function ResearchPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 999,
      border: '1px solid rgba(15,23,42,0.10)',
      background: 'rgba(15,23,42,0.03)',
      color: '#475569',
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 8px',
    }}>
      {children}
    </span>
  );
}

function FactorRow({ factor }: { factor: MarketBrainFactorView }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 12, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 700 }}>{factor.label}</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>{Math.round(factor.score)}/100</div>
      </div>
      <div>
        <div style={{ height: 6, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ width: `${Math.max(0, Math.min(100, factor.score))}%`, height: '100%', background: '#111827' }} />
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: '#475569' }}>{factor.summary}</div>
      </div>
    </div>
  );
}

function ResearchList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceReviewStatus({ evidenceReview }: { evidenceReview: MarketBrainEvidenceReviewView }) {
  if (!evidenceReview.needsReview && !evidenceReview.summary) return null;

  return (
    <div
      aria-label="Research evidence status"
      style={{
        border: '1px solid rgba(245,158,11,0.22)',
        background: 'rgba(245,158,11,0.07)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <AlertTriangle size={15} color="#B45309" />
      <div>
        <div style={{ fontSize: 11, color: '#92400E', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
          Research evidence status
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#475569' }}>{evidenceReview.summary}</div>
      </div>
    </div>
  );
}

function formatGeneratedAt(generatedAt: string): string {
  const generatedDate = new Date(generatedAt);
  if (Number.isNaN(generatedDate.getTime())) return 'Generated time unavailable.';

  const generated = generatedDate.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Generated ${generated}.`;
}

function ResearchBody({ research }: { research: MarketBrainResearchView }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ResearchPill>{research.state}</ResearchPill>
            <ResearchPill>{research.convictionScore}/100 research score</ResearchPill>
          </div>
          <h2 style={{ color: '#0F172A', fontSize: 20, lineHeight: 1.25, margin: 0 }}>{research.headline}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 11 }}>
          <ShieldCheck size={14} /> Research output only
        </div>
      </div>

      <EvidenceReviewStatus evidenceReview={research.evidenceReview} />

      <div style={{ display: 'grid', gap: 16 }}>
        <ResearchList title="Thesis drivers" items={research.thesis} />
        <ResearchList title="Risks to review" items={research.risksToReview} />
        <ResearchList title="What to watch" items={research.whatToWatch} />
      </div>

      {research.factorViews.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Factor view
          </div>
          {research.factorViews.map((factor) => <FactorRow key={factor.key} factor={factor} />)}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(15,23,42,0.08)', paddingTop: 12, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
        {research.methodNote} {formatGeneratedAt(research.generatedAt)}
      </div>
    </div>
  );
}

export default function MarketBrainResearchPanel({ symbol }: { symbol: string }) {
  const { data, loading, error, reload } = useMarketBrainResearch(symbol);

  return (
    <section
      aria-label="Market brain research"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(15,23,42,0.10)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={18} color="#111827" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', letterSpacing: '0.02em' }}>Market Brain</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Research narrative and factor diagnostics</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          aria-label="Refresh market brain research"
          style={{
            border: '1px solid rgba(15,23,42,0.10)',
            background: 'transparent',
            borderRadius: 8,
            padding: '7px 10px',
            color: '#0F172A',
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading && !data && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ height: 16, width: '60%', background: '#F1F5F9', borderRadius: 6 }} />
          <div style={{ height: 12, width: '90%', background: '#F1F5F9', borderRadius: 6 }} />
          <div style={{ height: 12, width: '80%', background: '#F1F5F9', borderRadius: 6 }} />
        </div>
      )}

      {error && !data && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
          <AlertTriangle size={16} color="#F59E0B" />
          <span>Research narrative is temporarily unavailable. Market data sections remain available.</span>
        </div>
      )}

      {data?.research && <ResearchBody research={data.research} />}
    </section>
  );
}
