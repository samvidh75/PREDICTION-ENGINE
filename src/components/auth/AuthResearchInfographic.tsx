import React from "react";
import { ArrowUpRight, Bookmark, GitCompare, Orbit, ShieldCheck, Sparkles } from "lucide-react";

const indicators = [
  { label: "Quality", score: 68, color: "#4F6EF7" },
  { label: "Financial", score: 85, color: "#14A38B" },
  { label: "Growth", score: 72, color: "#7C5CE7" },
] as const;

function IndicatorRing({ label, score, color }: typeof indicators[number]): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="relative grid h-[74px] w-[74px] place-items-center rounded-full shadow-[0_10px_28px_rgba(15,23,42,.08)]" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(148,163,184,.16) 0deg)` }}>
        <div className="grid h-[60px] w-[60px] place-items-center rounded-full border border-white bg-white/95 shadow-inner">
          <span className="font-mono text-base font-semibold tabular-nums text-slate-900">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </div>
  );
}

export function AuthResearchInfographic({ mode }: { mode: "login" | "signup" }): JSX.Element {
  const isSignup = mode === "signup";
  return (
    <div data-testid="auth-research-infographic" className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(243,247,255,.82))] p-4 shadow-[0_24px_70px_rgba(30,41,59,.10)] backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-slate-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-14 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"><Orbit className="h-3.5 w-3.5 text-[#4F6EF7]" /> Research constellation</div>
          <h3 className="mt-2 text-base font-semibold tracking-tight text-slate-900">{isSignup ? "One view. Seven research dimensions." : "Your thesis, reconstructed at a glance."}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">Research ready</span>
      </div>

      <div className="relative mt-4 grid gap-3 lg:grid-cols-[1.08fr_.92fr]">
        <section className="rounded-[22px] border border-white bg-white/80 p-4 shadow-[0_14px_36px_rgba(15,23,42,.08)]">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Healthometer profile</p><p className="mt-1 text-xs font-medium text-slate-700">Reliance Industries</p></div><Sparkles className="h-4 w-4 text-[#4F6EF7]" /></div>
          <div className="mt-4 grid grid-cols-3 gap-2">{indicators.map((item) => <IndicatorRing key={item.label} {...item} />)}</div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2"><span className="text-[10px] text-slate-500">Composite research context</span><span className="text-[10px] font-semibold text-slate-800">Thesis improving</span></div>
        </section>

        <section className="relative min-h-[190px] overflow-hidden rounded-[22px] border border-white bg-white/72 p-4 shadow-[0_14px_36px_rgba(15,23,42,.07)]">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(79,110,247,.13)_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Thesis map</p><p className="mt-2 text-sm font-semibold leading-5 text-slate-900">Financial strength anchors the current research case.</p></div>
          <div className="relative mt-5 grid grid-cols-3 items-center gap-1 text-center">
            {[
              { label: "Evidence", icon: ShieldCheck, tone: "bg-blue-50 text-blue-700" },
              { label: "Compare", icon: GitCompare, tone: "bg-slate-50 text-slate-700" },
              { label: "Track", icon: Bookmark, tone: "bg-emerald-50 text-emerald-700" },
            ].map(({ label, icon: Icon, tone }, index) => <div key={label} className="relative"><div className={`mx-auto grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon className="h-4 w-4" /></div><p className="mt-2 text-[9px] font-semibold text-slate-600">{label}</p>{index < 2 && <ArrowUpRight className="absolute -right-1 top-3 h-3 w-3 text-slate-300" />}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthResearchInfographic;
