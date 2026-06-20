import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceData {
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  week52High: number | null;
  week52Low: number | null;
  marketCap: number | null;
  halted: boolean;
  delisted: boolean;
  lastTradedAt: string | null;
}

interface DynamicPriceBannerProps {
  symbol: string;
  companyName?: string;
  priceData: PriceData | null;
  loading?: boolean;
}

function formatPrice(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLarge(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "-";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export const DynamicPriceBanner: React.FC<DynamicPriceBannerProps> = ({ symbol, companyName, priceData, loading }) => {
  if (loading) {
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse"><div className="h-6 w-48 bg-[var(--color-surface-elevated)] rounded" /><div className="mt-2 h-8 w-32 bg-[var(--color-surface-elevated)] rounded" /></div>;
  }

  if (!priceData) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-xs text-[var(--color-text-muted)]">Price context is not yet available.</span>
      </div>
    );
  }

  if (priceData.delisted) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-2"><Minus className="h-4 w-4 text-[var(--color-text-muted)]" /><span className="text-xs font-semibold text-[var(--color-text-muted)]">Delisted</span></div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">This security is no longer listed for trading.</p>
      </div>
    );
  }

  const changeColor = priceData.change === null ? "text-[var(--color-text-muted)]" : priceData.change >= 0 ? "text-[#16A34A]" : "text-[#EF4444]";
  const ChangeIcon = priceData.change === null ? Minus : priceData.change >= 0 ? TrendingUp : TrendingDown;
  const weekHigh = priceData.week52High ?? 0;
  const weekLow = priceData.week52Low ?? 0;
  const price = priceData.price ?? 0;
  const rangeProgress = weekHigh > weekLow ? ((price - weekLow) / (weekHigh - weekLow)) * 100 : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">{symbol}</h2>
          {companyName && <p className="text-xs text-[var(--color-text-secondary)]">{companyName}</p>}
        </div>
        {priceData.halted && <span className="rounded-md bg-[rgba(245,158,11,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#F59E0B]">Halted</span>}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)]">{formatPrice(priceData.price)}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${changeColor}`}>
          <ChangeIcon className="h-4 w-4" aria-hidden="true" />
          {priceData.change !== null ? `${priceData.change >= 0 ? "+" : ""}${priceData.change.toFixed(2)}` : "-"}
          {priceData.changePercent !== null ? ` (${priceData.changePercent >= 0 ? "+" : ""}${priceData.changePercent.toFixed(2)}%)` : ""}
        </span>
      </div>

      {weekHigh > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
            <span>52W Low: {formatPrice(weekLow)}</span>
            <span>52W High: {formatPrice(weekHigh)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
            <div className="h-full rounded-full bg-[#2962FF] transition-all" style={{ width: `${Math.max(0, Math.min(100, rangeProgress))}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {priceData.volume !== null && (
          <div><span className="text-[var(--color-text-muted)]">Volume</span><p className="font-semibold text-[var(--color-text-primary)]">{priceData.volume.toLocaleString("en-IN")}</p></div>
        )}
        {priceData.marketCap !== null && (
          <div><span className="text-[var(--color-text-muted)]">Market Cap</span><p className="font-semibold text-[var(--color-text-primary)]">{formatLarge(priceData.marketCap)}</p></div>
        )}
        {priceData.previousClose !== null && (
          <div><span className="text-[var(--color-text-muted)]">Prev Close</span><p className="font-semibold text-[var(--color-text-primary)]">{formatPrice(priceData.previousClose)}</p></div>
        )}
        {priceData.lastTradedAt && (
          <div><span className="text-[var(--color-text-muted)]">Last Updated</span><p className="font-semibold text-[var(--color-text-primary)]">{new Date(priceData.lastTradedAt).toLocaleString("en-IN")}</p></div>
        )}
      </div>
    </div>
  );
};

export default DynamicPriceBanner;
