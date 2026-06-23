import React from "react";
import { Check, Sparkles } from "lucide-react";
import { ProductPage, ProductShell, ProductAction } from "../components/product/ProductUI";

const FEATURES = [
  { name: "Stock scanner", free: true, premium: true },
  { name: "Basic scans", free: true, premium: true },
  { name: "Detailed stock research", free: true, premium: true },
  { name: "Healthometer overview", free: true, premium: true },
  { name: "Price history chart", free: true, premium: true },
  { name: "Premium scans (15+)", free: false, premium: true },
  { name: "Advanced scan filters", free: false, premium: true },
  { name: "Thesis change alerts", free: false, premium: true },
  { name: "Watchlist intelligence", free: false, premium: true },
  { name: "Financial history charts", free: false, premium: true },
  { name: "Brokerage commentary", free: false, premium: true },
  { name: "News intelligence", free: false, premium: true },
];

export default function PricingPage(): JSX.Element {
  return (
    <ProductShell>
      <ProductPage>
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-semibold text-[#2962FF] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Premium research
            </div>
            <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[42px]">
              Research that works as hard as you do
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-6 text-[var(--color-text-secondary)]">
              StockStory provides research context, not guaranteed returns. Upgrade for deeper scans, financial history, and thesis tracking.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Free</h2>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-[var(--color-text-primary)]">₹0</span>
                <span className="ml-1 text-sm text-[var(--color-text-secondary)]">/month</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">Essential research tools to get started.</p>
              <div className="mt-6 space-y-3">
                {FEATURES.filter((f) => f.free).map((f) => (
                  <div key={f.name} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f.name}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <span className="block rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--color-text-secondary)]">
                  Current plan
                </span>
              </div>
            </div>

            {/* Premium Monthly */}
            <div className="relative rounded-2xl border-2 border-[#2962FF] bg-white p-6 shadow-[0_20px_60px_rgba(41,98,255,.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2962FF] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Most popular
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Premium Monthly</h2>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-[var(--color-text-primary)]">₹99</span>
                <span className="ml-1 text-sm text-[var(--color-text-secondary)]">/month</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">Full research suite with premium scans and insights.</p>
              <div className="mt-6 space-y-3">
                {FEATURES.map((f) => (
                  <div key={f.name} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                    {f.premium ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--color-border)]" />
                    )}
                    {f.name}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ProductAction variant="primary" className="w-full justify-center">
                  Premium coming soon
                </ProductAction>
                <p className="mt-2 text-[10px] text-center text-[var(--color-text-muted)]">
                  Payment not live yet · Join the waitlist
                </p>
              </div>
            </div>

            {/* Premium Annual */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Save with annual
              </div>
              <h2 className="mt-3 text-lg font-semibold text-[var(--color-text-primary)]">Premium Annual</h2>
              <div className="mt-3">
                <span className="text-3xl font-semibold text-[var(--color-text-primary)]">₹999</span>
                <span className="ml-1 text-sm text-[var(--color-text-secondary)]">/year</span>
              </div>
              <div className="mt-1 text-xs text-emerald-600 font-medium">
                Save ₹189 compared to monthly
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">Best value for serious researchers.</p>
              <div className="mt-6 space-y-3">
                {FEATURES.map((f) => (
                  <div key={f.name} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
                    {f.premium ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--color-border)]" />
                    )}
                    {f.name}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ProductAction variant="primary" className="w-full justify-center">
                  Premium coming soon
                </ProductAction>
                <p className="mt-2 text-[10px] text-center text-[var(--color-text-muted)]">
                  Payment not live yet · Join the waitlist
                </p>
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <p className="mt-8 text-center text-[11px] text-[var(--color-text-muted)]">
            StockStory provides research context, not guaranteed returns. All research is for informational purposes and does not constitute financial advice.
          </p>
        </div>
      </ProductPage>
    </ProductShell>
  );
}
