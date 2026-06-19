import React, { useState, useCallback } from "react";
import { Copy, Check, Share2, ArrowLeftRight, Scale } from "lucide-react";
import { ProductPanel, ProductAction, productNavigate } from "../product/ProductUI";
import { PRODUCT_EVENTS, trackEvent } from "../../lib/analytics/productEvents";

interface ComparedCompany {
  symbol: string;
  companyName?: string;
  score?: number | null;
}

interface CompareShareRecapProps {
  companyA: ComparedCompany;
  companyB: ComparedCompany;
  decisionLabels?: string[];
}

export function CompareShareRecap({ companyA, companyB, decisionLabels }: CompareShareRecapProps) {
  const [copied, setCopied] = useState(false);

  const aName = companyA.companyName || companyA.symbol;
  const bName = companyB.companyName || companyB.symbol;

  const buildRecapText = useCallback(() => {
    const lines: string[] = [];
    lines.push(`Comparison Recap: ${aName} vs ${bName}`);
    lines.push("");
    if (decisionLabels && decisionLabels.length > 0) {
      lines.push("Decision Summary:");
      decisionLabels.forEach((label) => lines.push(`  • ${label}`));
      lines.push("");
    }
    lines.push("Before You Invest:");
    lines.push("  • Review each company on StockStory India");
    lines.push("  • Track thesis changes over time");
    lines.push("  • Final execution through your broker");
    lines.push("");
    lines.push("Research only. Not investment advice.");
    lines.push("StockStory India — AI research for Indian equities");
    return lines.join("\n");
  }, [aName, bName, decisionLabels]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildRecapText());
      setCopied(true);
      trackEvent(PRODUCT_EVENTS.COMPARE_SUMMARY_COPIED, { companyA: companyA.symbol, companyB: companyB.symbol });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Comparison Recap: ${aName} vs ${bName}`,
          text: buildRecapText(),
          url: window.location.href,
        });
      } catch {
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <div className="flex-1 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] p-3 text-center">
          <p className="text-xs font-semibold text-[#E6EDF3]">{aName}</p>
          {companyA.score != null && (
            <p className="mt-1 text-[11px] text-[#9AA7B5]">Score: {companyA.score}</p>
          )}
        </div>
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
        <div className="flex-1 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] p-3 text-center">
          <p className="text-xs font-semibold text-[#E6EDF3]">{bName}</p>
          {companyB.score != null && (
            <p className="mt-1 text-[11px] text-[#9AA7B5]">Score: {companyB.score}</p>
          )}
        </div>
      </div>

      {decisionLabels && decisionLabels.length > 0 && (
        <ProductPanel className="p-4">
          <h4 className="text-xs font-semibold text-[#E6EDF3]">Decision Summary</h4>
          <ul className="mt-2 space-y-1">
            {decisionLabels.map((label, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#9AA7B5]">
                <Scale className="mt-0.5 h-3 w-3 shrink-0 text-[#2962FF]" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </ProductPanel>
      )}

      <ProductPanel className="p-4">
        <h4 className="text-xs font-semibold text-[#E6EDF3]">Before You Invest</h4>
        <ul className="mt-2 space-y-1">
          {[
            "Review each company on StockStory India",
            "Track thesis changes over time",
            "Final execution through your broker",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-[#9AA7B5]">
              <span className="h-1 w-1 rounded-full bg-[#2962FF] mt-1.5 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ProductPanel>

      <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-center text-xs text-[#9AA7B5]">
        Research only. Not investment advice.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-4 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
          aria-label={copied ? "Comparison copied" : "Copy comparison summary"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy comparison"}
        </button>
        <ProductAction variant="secondary" onClick={() => productNavigate("company", companyA.symbol)}>
          Research {companyA.symbol}
        </ProductAction>
        <ProductAction variant="secondary" onClick={() => productNavigate("company", companyB.symbol)}>
          Research {companyB.symbol}
        </ProductAction>
        <ProductAction onClick={() => productNavigate("methodology")}>
          Open methodology
        </ProductAction>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
            aria-label="Share comparison"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
