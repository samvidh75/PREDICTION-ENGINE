import React from "react";
import { BarChart3, Database, FileSearch, ShieldCheck, Workflow, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MobileNav from "../components/navigation/MobileNav";
import TopNav from "../components/navigation/TopNav";
import Button from "../components/ui/Button";
import { IntegrityStrip, PremiumPage, SectionHeader, Surface, navigatePage } from "../components/premium/PremiumUI";

const principles = [
  ["Evidence before narrative", "Scores and signals must be traceable to available provider or registry data."],
  ["Missing data stays visible", "Unavailable fundamentals, freshness, or coverage are labelled instead of filled with placeholders."],
  ["Research, not advice", "The product does not issue buy, sell, or hold recommendations."],
  ["Indian market context", "Workflows are shaped around Indian equities, provider coverage, and source reliability."],
];

const does: Array<[string, LucideIcon]> = [
  ["Structure research", FileSearch],
  ["Show coverage health", Database],
  ["Track score changes", BarChart3],
  ["Separate confidence", ShieldCheck],
];

export const PublicAboutPage: React.FC = () => (
  <PremiumPage nav={<><TopNav /><MobileNav /></>}>
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-24 sm:px-6 md:pt-32">
      <Surface dark className="ss-grid-texture relative overflow-hidden p-6 md:p-10">
        <div className="relative z-10 max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
            <Workflow className="h-3.5 w-3.5" aria-hidden="true" /> Mission
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
            Evidence-first research infrastructure for Indian equities.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">
            StockStory India exists because equity research should make source quality, freshness, and missing evidence visible. It is a workflow product for inspection, not a venue for tips.
          </p>
          <div className="mt-7"><IntegrityStrip /></div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => navigatePage("signup")} className="h-11 px-6 text-sm">Create free account</Button>
            <Button type="button" onClick={() => navigatePage("trust")} variant="secondary" className="h-11 px-6 text-sm">Open Trust Centre</Button>
          </div>
        </div>
      </Surface>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <SectionHeader eyebrow="What it does" title="A research terminal, not an advisory desk." body="The interface helps users move from company discovery to source verification while keeping limitations explicit." />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {does.map(([label, Icon]) => (
          <Surface key={label} className="ss-lift p-6">
            <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">{label}</h3>
          </Surface>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="p-6 md:p-8">
          <XCircle className="h-7 w-7 text-red-700" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">What StockStory India does not do</h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <p>No buy, sell, or hold recommendations.</p>
            <p>No fabricated user counts, testimonials, provider claims, portfolio values, or stock predictions.</p>
            <p>No hiding raw unavailability behind polished-looking numbers.</p>
          </div>
        </Surface>
        <div className="grid gap-4 sm:grid-cols-2">
          {principles.map(([title, body]) => (
            <Surface key={title} className="ss-lift p-6">
              <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </Surface>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6">
      <Surface dark className="p-6 md:p-9">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Trust and safety</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Every premium surface still tells the truth about the data.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Provider limits, fundamentals availability, historical coverage, and freshness state belong in the workflow, not in fine print.</p>
          </div>
          <Button type="button" onClick={() => navigatePage("trust")} className="h-12 px-6 text-sm">Review data policy</Button>
        </div>
      </Surface>
    </section>
  </PremiumPage>
);

export default PublicAboutPage;
