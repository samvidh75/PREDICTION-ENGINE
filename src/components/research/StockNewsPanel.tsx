import React, { useMemo, useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";

export interface StockNewsItem {
  id: string;
  symbol: string;
  headline: string;
  publisher?: string;
  publishedAt: string;
  summary?: string;
  whyItMatters?: string;
  url?: string;
  category?: "company" | "results" | "brokerage" | "sector" | "corporate_action" | "market";
}

interface StockNewsPanelProps {
  items: StockNewsItem[];
  loading?: boolean;
  refreshedAt?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function StockNewsPanel({ items, loading, refreshedAt }: StockNewsPanelProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const uniqueItems = useMemo(() => [...new Map(items.map((item) => [item.url || item.headline.trim().toLowerCase(), item])).values()], [items]);
  if (loading) {
    return (
      <ProductPanel className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[var(--color-border)] p-4">
                <div className="h-3 w-3/4 rounded bg-slate-200" />
                <div className="h-2 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </ProductPanel>
    );
  }

  if (uniqueItems.length === 0) {
    return (
      <ProductPanel className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Newspaper className="h-3.5 w-3.5" /> News & context
        </div>
        <div className="mt-3 flex flex-col items-center justify-center py-6 text-center">
          <Newspaper className="h-5 w-5 text-[var(--color-text-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">No major recent story to review yet.</p>
          {refreshedAt && (
            <span className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              Refreshed {timeAgo(refreshedAt)}
            </span>
          )}
        </div>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Newspaper className="h-3.5 w-3.5" /> News & context
        </div>
        {refreshedAt && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Refreshed {timeAgo(refreshedAt)}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {uniqueItems.map((item, index) => (
          <article
            key={item.id}
            className={`${!showAll && index >= 3 ? "hidden md:block" : "block"} group rounded-xl border border-[var(--color-border)] bg-white p-4 transition hover:border-blue-200 hover:shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#2962FF] transition-colors"
                    >
                      {item.headline}
                      <ExternalLink className="ml-1 inline h-3 w-3 text-[var(--color-text-muted)]" />
                    </a>
                  ) : (
                    item.headline
                  )}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                  {item.publisher && <span>{item.publisher}</span>}
                  <span>{timeAgo(item.publishedAt)}</span>
                  {item.category && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium capitalize">
                      {item.category.replace("_", " ")}
                    </span>
                  )}
                </div>
                {item.summary && (
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{item.summary}</p>
                )}
                {item.whyItMatters && (
                  <p className="mt-1.5 text-[11px] font-medium text-[#2962FF]">
                    Why it matters: {item.whyItMatters}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {uniqueItems.length > 3 && (
        <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] md:hidden">
          {showAll ? "Show fewer stories" : `View all ${uniqueItems.length} stories`}
        </button>
      )}
    </ProductPanel>
  );
}
