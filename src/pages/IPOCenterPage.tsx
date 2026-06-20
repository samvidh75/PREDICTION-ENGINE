import React from "react";
import { TrendingUp, FileText, ShieldCheck } from "lucide-react";
import { TrendlyneWidget } from "../components/external/TrendlyneWidget";
import { ProductPage, ProductPanel, ProductShell } from "../components/product/ProductUI";

export default function IPOCenterPage(): JSX.Element {
  return (
    <ProductShell>
      <ProductPage className="max-w-[900px] !py-5 md:!py-8">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            <TrendingUp className="h-4 w-4" /> IPO Center
          </div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[var(--color-text-primary)] md:text-[32px]">
            Track current and upcoming IPO activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Review subscription, allotment and listing context before making decisions.
          </p>
        </header>

        <div className="space-y-6">
          <ProductPanel className="p-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-[#2962FF]" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  How to use this page
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                  IPO data is provided for review purposes only. Track current and upcoming offerings,
                  review subscription context and allotment details. Always read the RHP and consult
                  your financial advisor before applying.
                </p>
              </div>
            </div>
          </ProductPanel>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <ShieldCheck className="h-5 w-5 text-[#16A34A]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                Review before applying
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Check subscription and peer valuation before applying.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <TrendingUp className="h-5 w-5 text-[#2962FF]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                Track instead
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Follow listing performance before making an entry decision.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <FileText className="h-5 w-5 text-[#64748B]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                Research context
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                IPO research context is based on available data.
              </p>
            </div>
          </div>

          <TrendlyneWidget
            kind="ipo"
            lazy={false}
          />
        </div>
      </ProductPage>
    </ProductShell>
  );
}
