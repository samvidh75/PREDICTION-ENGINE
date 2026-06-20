import React, { useMemo } from "react";
import { Activity, ShieldAlert, Sparkles, TrendingUp, GitCompare, Eye, Bookmark } from "lucide-react";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import TopNav from "../components/navigation/TopNav";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { ProductAction, ProductFormPanel, ProductPage, ProductPanel, ProductShell, ProductStatusPill, productNavigate } from "../components/product/ProductUI";

const DIM_BAR_COLORS: Record<string, string> = {
  quality: "#3B82F6", financial: "#22C55E", valuation: "#A78BFA",
  growth: "#14B8A6", stability: "#64748B", risk: "#F59E0B", momentum: "#38BDF8",
};

function MiniCard({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#0D1117]/90 p-4"><div className="mb-3 flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-[#3B66F6]" /><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{label}</span></div>{children}</div>;
}

export const SignupPage: React.FC = () => {
  const returnToParam = useMemo(() => new URLSearchParams(window.location.search).get("returnTo"), []);
  const safeReturnTo = useMemo(() => sanitizeReturnTo(returnToParam), [returnToParam]);
  const contextMessage = useMemo(() => getReturnToContext(returnToParam, true), [returnToParam]);

  const onAuthed = () => {
    if (safeReturnTo) {
      window.history.replaceState({}, "", safeReturnTo);
    } else {
      productNavigate("dashboard");
      return;
    }
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <ProductShell>
      <TopNav />
      <ProductPage className="grid min-h-[calc(100vh-4rem)] items-center gap-6 md:grid-cols-[1fr_420px]" as="section">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Get started</div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#E8EDF2] md:text-3xl">Build your equity research workspace.</h2>
            <p className="max-w-lg text-sm leading-6 text-[#9AA7B5]">Structured research, company comparisons, and thesis tracking. One workspace for Indian equities.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCard icon={Activity} label="Healthometer">
              <div className="flex items-center justify-between"><span className="text-xs text-[#9AA7B5]">Company health at a glance</span><ProductStatusPill tone="verified">Healthy</ProductStatusPill></div>
              <div className="mt-3 space-y-2">{[{ id: 'quality', label: 'Business quality', score: 68 }, { id: 'financial', label: 'Financial strength', score: 85 }, { id: 'growth', label: 'Growth', score: 72 }].map((d) => <div key={d.id}><div className="mb-0.5 flex justify-between text-[11px]"><span className="text-[#9AA7B5]">{d.label}</span><span className="font-mono tabular-nums text-[#CDD5DF]">{d.score}</span></div><div className="h-1 overflow-hidden rounded-full bg-[#161B22]"><div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: DIM_BAR_COLORS[d.id] || "#3B66F6" }} /></div></div>)}</div>
            </MiniCard>
            <MiniCard icon={ShieldAlert} label="Research context">
              <div className="text-sm font-semibold text-[#E6EDF3]">Multi-factor scoring across 7 dimensions.</div>
              <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">Every company gets structured analysis — quality, growth, valuation, risk, momentum, and stability.</p>
              <div className="mt-3 flex gap-1.5"><span className="rounded-lg border border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.08)] px-2 py-1 text-[10px] text-[#B8C8FF]">7 dimensions</span><span className="rounded-lg border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.08)] px-2 py-1 text-[10px] text-[#86D89A]">Algorithmic thesis</span></div>
            </MiniCard>
            <MiniCard icon={GitCompare} label="Compare">
              <div className="space-y-2">{[{ symbol: 'RELIANCE', label: 'Healthy' }, { symbol: 'TCS', label: 'Stable' }, { symbol: 'ITC', label: 'Needs review' }].map((c) => <div key={c.symbol} className="flex items-center justify-between border-b border-[rgba(148,163,184,0.08)] pb-1.5 last:border-0"><span className="font-mono text-xs font-semibold text-[#CDD5DF]">{c.symbol}</span><span className="text-[10px] text-[#64748B]">{c.label}</span></div>)}</div>
            </MiniCard>
            <MiniCard icon={Eye} label="Track thesis">
              <div className="flex items-center gap-2"><Bookmark className="h-3.5 w-3.5 text-[#3B66F6]" /><span className="text-sm font-semibold text-[#E6EDF3]">Monitor what matters</span></div>
              <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">Save companies to watchlists and review research changes over time.</p>
            </MiniCard>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-[#64748B]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Research-first</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#3B66F6]" /> Broker handoff</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#64748B]" /> No trading calls</span></div>
        </div>
        <ProductFormPanel title="Create your account" body={contextMessage || "Create an account to continue your research."}>
          <CinematicAuthGateway onAuthed={onAuthed} initialStage="signup" restoreOnMount={false} contextMessage={contextMessage} />
          <div className="mt-4 flex justify-center">
            <ProductAction variant="ghost" onClick={() => productNavigate("login")}>Already have an account? Sign in</ProductAction>
          </div>
        </ProductFormPanel>
      </ProductPage>
    </ProductShell>
  );
};

export default SignupPage;
