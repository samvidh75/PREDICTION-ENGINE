import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { navigateTrustWorkflow } from './ResearchTrustLinks';

/**
 * Academy content includes market-process and regulatory references that can
 * change over time. Until each lesson is attached to an authoritative source and
 * review timestamp, the UI must show an explicit review-required state.
 */
export default function AcademyReviewNotice() {
  return (
    <section aria-label="Academy content review status" className="mb-5 w-full rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Educational content · source review required</div>
            <p className="mt-1 max-w-4xl text-[11px] leading-relaxed text-white/55">
              Academy lessons are educational context, not investment advice. Market processes, tax treatment and regulatory references may change. Verify current rules with authoritative sources before acting.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigateTrustWorkflow('trust')}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-300/20"
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Trust centre
        </button>
      </div>
    </section>
  );
}
