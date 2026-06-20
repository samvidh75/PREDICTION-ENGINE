import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Eye, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { productNavigate } from "../product/ProductUI";

const SEEN_KEY = "stockstory_feature_welcome_v1";

const features = [
  { icon: Search, tone: "blue", label: "Discover", copy: "Find the company. We organise the evidence." },
  { icon: BarChart3, tone: "violet", label: "Understand", copy: "See quality, valuation and risk in context." },
  { icon: Eye, tone: "emerald", label: "Revisit", copy: "Track the thesis—not another noisy watchlist." },
] as const;

export default function FeatureWelcomeTour(): JSX.Element | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SEEN_KEY) !== "seen") setOpen(true);
    } catch { setOpen(true); }
  }, []);

  const close = useCallback(() => {
    try { window.localStorage.setItem(SEEN_KEY, "seen"); } catch { /* non-critical */ }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-xl sm:items-center" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[920px] overflow-y-auto rounded-[30px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,.98),rgba(242,246,255,.96))] p-5 shadow-[0_40px_120px_rgba(15,23,42,.30),0_2px_10px_rgba(15,23,42,.08)] sm:rounded-[34px] sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-400/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-400/20 blur-[80px]" />
        <button type="button" onClick={close} aria-label="Close feature introduction" className="absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"><X className="h-4 w-4" /></button>

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-blue-700 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Your research workspace</span>
          <h2 id="welcome-title" className="mt-5 text-balance text-[32px] font-semibold leading-[1.05] tracking-[-.045em] text-slate-950 sm:text-[44px]">A calmer way to understand a stock.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">StockStory turns scattered market data into a research trail you can understand, compare and revisit.</p>
        </div>

        <div className="relative mt-8 grid gap-4 md:grid-cols-3 [perspective:1200px]">
          {features.map(({ icon: Icon, tone, label, copy }, index) => (
            <div key={label} className={`group relative min-h-[190px] overflow-hidden rounded-[26px] border border-white bg-white/82 p-5 shadow-[0_24px_55px_rgba(30,64,175,.12),inset_0_1px_0_white] transition duration-300 hover:-translate-y-2 hover:rotate-0 ${index === 0 ? "md:-rotate-2" : index === 2 ? "md:rotate-2" : "md:-translate-y-2"}`}>
              <div className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent ${tone === "blue" ? "via-blue-500" : tone === "violet" ? "via-violet-500" : "via-emerald-500"} to-transparent opacity-70`} />
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === "blue" ? "bg-blue-50 text-blue-600" : tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"} shadow-[inset_0_0_0_1px_rgba(255,255,255,.8),0_8px_20px_rgba(15,23,42,.08)]`}><Icon className="h-5 w-5" /></div>
              <div className="mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">0{index + 1}</div>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{label}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-7 flex flex-col items-center justify-between gap-4 rounded-[22px] border border-slate-200/70 bg-white/70 px-5 py-4 shadow-sm sm:flex-row">
          <div className="flex items-center gap-3 text-xs leading-5 text-slate-600"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span><span><strong className="text-slate-900">Research first.</strong> Your money and broker credentials remain with your broker.</span></div>
          <button type="button" onClick={() => { close(); productNavigate("signup"); }} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,.22)] transition hover:-translate-y-0.5 hover:bg-blue-600">Enter StockStory <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
