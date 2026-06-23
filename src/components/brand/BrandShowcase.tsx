import React from "react";
import StockStoryLogo from "./StockStoryLogo";

export default function BrandShowcase(): JSX.Element {
  return (
    <div className="space-y-8 p-8">
      <h2 className="text-lg font-semibold">Brand System — StockStory India</h2>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Lockup (light)</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <StockStoryLogo variant="lockup" size="sm" />
          <StockStoryLogo variant="lockup" size="md" />
          <StockStoryLogo variant="lockup" size="lg" />
        </div>
      </section>

      <section className="dark bg-[#0D1117] p-6 rounded-xl">
        <h3 className="text-sm font-semibold text-[#94A3B8] mb-3">Lockup (dark)</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <StockStoryLogo variant="lockup" size="sm" tone="dark" />
          <StockStoryLogo variant="lockup" size="md" tone="dark" />
          <StockStoryLogo variant="lockup" size="lg" tone="dark" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Mark only</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <StockStoryLogo variant="mark" size="sm" />
          <StockStoryLogo variant="mark" size="md" />
          <StockStoryLogo variant="mark" size="lg" />
          <StockStoryLogo variant="mark" size="hero" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Wordmark</h3>
        <div className="flex flex-wrap gap-6 items-center">
          <StockStoryLogo variant="wordmark" size="sm" />
          <StockStoryLogo variant="wordmark" size="md" />
          <StockStoryLogo variant="wordmark" size="lg" />
        </div>
      </section>
    </div>
  );
}
