import React, { useState, useCallback } from "react";
import { Copy, Check, Share2, ExternalLink, FileText, Shield, AlertTriangle } from "lucide-react";
import { ProductPanel, ProductAction, ProductStatusPill } from "../product/ProductUI";
import { PRODUCT_EVENTS, trackEvent } from "../../lib/analytics/productEvents";

interface ShareData {
  ticker: string;
  companyName: string;
  thesisHeadline?: string;
  convictionLabel?: string;
  convictionTone?: "verified" | "blue" | "warning" | "muted";
  bullSummary?: string;
  bearSummary?: string;
  risksToReview?: string[];
  sector?: string | null;
}

interface ShareResearchSummaryProps {
  data: ShareData;
  onClose?: () => void;
  onOpenMethodology?: () => void;
}

export function ShareResearchSummary({ data, onClose, onOpenMethodology }: ShareResearchSummaryProps) {
  const [copied, setCopied] = useState<"summary" | "link" | null>(null);

  const buildSummaryText = useCallback(() => {
    const lines: string[] = [];
    lines.push(`${data.companyName} (${data.ticker}) — Research Summary`);
    lines.push("");
    if (data.thesisHeadline) lines.push(`Thesis: ${data.thesisHeadline}`);
    if (data.convictionLabel) lines.push(`Conviction: ${data.convictionLabel}`);
    if (data.sector) lines.push(`Sector: ${data.sector}`);
    lines.push("");
    if (data.bullSummary) {
      lines.push("Bull Case:");
      lines.push(data.bullSummary);
      lines.push("");
    }
    if (data.bearSummary) {
      lines.push("Bear Case:");
      lines.push(data.bearSummary);
      lines.push("");
    }
    if (data.risksToReview && data.risksToReview.length > 0) {
      lines.push("Risks to Review:");
      data.risksToReview.forEach((r) => lines.push(`  • ${r}`));
      lines.push("");
    }
    lines.push("Before You Invest:");
    lines.push("  • Review scores on StockStory India");
    lines.push("  • Compare with peers");
    lines.push("  • Track thesis changes");
    lines.push("  • Final execution through your broker");
    lines.push("");
    lines.push("Research only. Not investment advice.");
    lines.push("StockStory India — AI research for Indian equities");
    return lines.join("\n");
  }, [data]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopied("summary");
      trackEvent(PRODUCT_EVENTS.RESEARCH_SUMMARY_COPIED, { ticker: data.ticker });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("link");
      trackEvent(PRODUCT_EVENTS.INVITE_LINK_COPIED, { ticker: data.ticker });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.companyName} (${data.ticker}) — Research Summary`,
          text: buildSummaryText(),
          url: window.location.href,
        });
      } catch {
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4">
      <ProductPanel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">
              {data.companyName}
              <span className="ml-1.5 font-mono text-xs text-[#64748B]">{data.ticker}</span>
            </h3>
            {data.sector && (
              <p className="mt-0.5 text-xs text-[#9AA7B5]">{data.sector}</p>
            )}
          </div>
          {data.convictionLabel && (
            <ProductStatusPill tone={data.convictionTone || "blue"}>
              {data.convictionLabel}
            </ProductStatusPill>
          )}
        </div>
      </ProductPanel>

      {data.thesisHeadline && (
        <ProductPanel className="p-4">
          <h4 className="text-xs font-semibold text-[#E6EDF3]">Thesis</h4>
          <p className="mt-1 text-xs leading-relaxed text-[#9AA7B5]">{data.thesisHeadline}</p>
        </ProductPanel>
      )}

      {data.bullSummary && (
        <ProductPanel className="p-4">
          <h4 className="text-xs font-semibold text-[#E6EDF3]">Bull Case</h4>
          <p className="mt-1 text-xs leading-relaxed text-[#9AA7B5]">{data.bullSummary}</p>
        </ProductPanel>
      )}

      {data.bearSummary && (
        <ProductPanel className="p-4">
          <h4 className="text-xs font-semibold text-[#E6EDF3]">Bear Case</h4>
          <p className="mt-1 text-xs leading-relaxed text-[#9AA7B5]">{data.bearSummary}</p>
        </ProductPanel>
      )}

      {data.risksToReview && data.risksToReview.length > 0 && (
        <ProductPanel className="p-4">
          <h4 className="text-xs font-semibold text-[#E6EDF3]">Risks to Review</h4>
          <ul className="mt-2 space-y-1">
            {data.risksToReview.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#9AA7B5]">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[#F59E0B]" aria-hidden="true" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </ProductPanel>
      )}

      <ProductPanel className="p-4">
        <h4 className="text-xs font-semibold text-[#E6EDF3]">Before You Invest</h4>
        <ul className="mt-2 space-y-1">
          {[
            "Review scores on StockStory India",
            "Compare with peers",
            "Track thesis changes",
            "Final execution through your broker",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-[#9AA7B5]">
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-[#2962FF]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ProductPanel>

      <div className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
        <div className="flex items-center gap-2 text-xs text-[#9AA7B5]">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Research only. Not investment advice.</span>
        </div>
        {onOpenMethodology && (
          <button
            type="button"
            onClick={onOpenMethodology}
            className="text-xs font-medium text-[#2962FF] hover:text-[#1E53E5]"
          >
            Methodology
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopySummary}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-4 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
          aria-label={copied === "summary" ? "Summary copied" : "Copy research summary"}
        >
          {copied === "summary" ? (
            <Check className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied === "summary" ? "Copied" : "Copy summary"}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-4 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
          aria-label={copied === "link" ? "Link copied" : "Copy page link"}
        >
          {copied === "link" ? (
            <Check className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
            aria-label="Share research summary"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
