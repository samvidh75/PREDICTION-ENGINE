import React from 'react';
import { BookOpen, Newspaper, ShieldCheck } from 'lucide-react';

export type TrustWorkflowTarget = 'daily-feed' | 'academy' | 'trust';

interface WorkflowLink {
  id: TrustWorkflowTarget;
  label: string;
  icon: React.ReactNode;
}

const LINKS: WorkflowLink[] = [
  { id: 'daily-feed', label: 'Daily feed', icon: <Newspaper className="h-3.5 w-3.5" /> },
  { id: 'academy', label: 'Academy', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'trust', label: 'Trust centre', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
];

export function navigateTrustWorkflow(pageKey: TrustWorkflowTarget): void {
  const params = new URLSearchParams(window.location.search);
  params.set('page', pageKey);
  params.delete('id');
  params.delete('symbol');
  params.delete('ticker');
  params.delete('companyId');
  params.delete('tab');
  window.history.pushState({}, '', `?${params.toString()}`);
  window.dispatchEvent(new Event('urlchange'));
}

export default function ResearchTrustLinks({ context = 'Research workflow', compact = false }: { context?: string; compact?: boolean }) {
  return (
    <section
      aria-label="Research and trust links"
      className={`rounded-xl border border-white/[0.07] bg-white/[0.018] ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{context}</div>
          {!compact && <p className="mt-1 text-[10px] leading-relaxed text-white/35">Use source-backed signals, educational context and Trust Centre caveats together before acting.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => navigateTrustWorkflow(link.id)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
