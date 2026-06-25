import React from "react";
import { Check, Sparkles, Lock, ArrowUpRight } from "lucide-react";
import { ProductPage, ProductShell, ProductAction } from "../components/product/ProductUI";
import Logo from "../components/brand/Logo";

interface PlanFeature {
  name: string;
  free: boolean;
  investor: boolean;
  pro: boolean;
  professional: boolean;
}

const FEATURES: PlanFeature[] = [
  { name: "Stock scanner", free: true, investor: true, pro: true, professional: true },
  { name: "Basic scans", free: true, investor: true, pro: true, professional: true },
  { name: "Detailed stock research", free: true, investor: true, pro: true, professional: true },
  { name: "Healthometer overview", free: true, investor: true, pro: true, professional: true },
  { name: "Price history chart", free: true, investor: true, pro: true, professional: true },
  { name: "Financial history charts", free: false, investor: true, pro: true, professional: true },
  { name: "Healthometer detailed breakdown", free: false, investor: true, pro: true, professional: true },
  { name: "Premium scanner presets", free: false, investor: true, pro: true, professional: true },
  { name: "Thesis explanations", free: false, investor: true, pro: true, professional: true },
  { name: "Watchlist review prompts", free: false, investor: true, pro: true, professional: true },
  { name: "Advanced scanner filters", free: false, investor: false, pro: true, professional: true },
  { name: "Compare workflows", free: false, investor: false, pro: true, professional: true },
  { name: "Thesis-change tracking", free: false, investor: false, pro: true, professional: true },
  { name: "Deeper alerts", free: false, investor: false, pro: true, professional: true },
  { name: "Portfolio thesis monitor", free: false, investor: false, pro: false, professional: true },
  { name: "Professional-grade workflow", free: false, investor: false, pro: false, professional: true },
];

function PlanCard({ name, price, period, tagline, features, level, highlighted, cta }: {
  name: string; price: string; period: string; tagline: string;
  features: PlanFeature[]; level: keyof Omit<PlanFeature, 'name'>;
  highlighted?: boolean; cta: string;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${highlighted ? 'border-2 border-[#10A37F] bg-white shadow-[0_20px_60px_rgba(16,163,127,.15)]' : 'border-[var(--color-border)] bg-white shadow-sm'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#10A37F] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Most popular
        </div>
      )}
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{name}</h2>
      <div className="mt-3">
        <span className="text-3xl font-semibold text-[var(--color-text-primary)]">{price}</span>
        <span className="ml-1 text-sm text-[var(--color-text-secondary)]">{period}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{tagline}</p>
      <div className="mt-6 space-y-3">
        {features.filter((f) => f[level]).map((f) => (
          <div key={f.name} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10A37F]" />
            {f.name}
          </div>
        ))}
      </div>
      <div className={`mt-6 ${highlighted ? 'relative' : ''}`}>
        {highlighted ? (
          <>
            <ProductAction variant="primary" className="w-full justify-center bg-[#10A37F] hover:bg-[#087A61]">
              <Sparkles className="h-3.5 w-3.5" /> {cta}
            </ProductAction>
            <p className="mt-2 text-[10px] text-center text-[var(--color-text-muted)]">Payment not live yet · Join waitlist</p>
          </>
        ) : (
          <span className={`block rounded-xl border px-4 py-3 text-center text-sm font-semibold ${level === 'free' ? 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
            {cta}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PricingPage(): JSX.Element {
  return (
    <ProductShell>
      <ProductPage>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="flex justify-center">
              <Logo />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-semibold text-[#10A37F] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Premium research
            </div>
            <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[42px]">
              Research that works as hard as you do
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-[var(--color-text-secondary)]">
              StockStory provides research context to inform your decisions. Upgrade for deeper scans, Healthometer breakdown, and thesis tracking.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            <PlanCard
              name="Free" price="₹0" period="/month"
              tagline="Essential research tools to get started."
              features={FEATURES} level="free"
              cta="Current plan"
            />
            <PlanCard
              name="Investor" price="₹99" period="/month"
              tagline="Detailed Healthometer breakdown, premium scans, and deeper thesis context."
              features={FEATURES} level="investor"
              highlighted cta="Investor ₹99"
            />
            <PlanCard
              name="Pro" price="₹299" period="/month"
              tagline="Advanced scanner, compare workflows, thesis-change tracking."
              features={FEATURES} level="pro"
              cta="Pro ₹299"
            />
            <PlanCard
              name="Professional" price="₹999" period="/month"
              tagline="Portfolio thesis monitor and professional-grade workflow."
              features={FEATURES} level="professional"
              cta="Professional ₹999"
            />
          </div>

          <p className="mt-8 text-center text-[11px] text-[var(--color-text-muted)]">
            StockStory provides research context to inform your decisions. All research is for informational purposes and does not constitute financial advice.
          </p>
        </div>
      </ProductPage>
    </ProductShell>
  );
}
