import React, { useState } from "react";
import { Copy, Check, Users, Mail, Shield } from "lucide-react";
import { ProductPanel, ProductAction, productNavigate } from "../product/ProductUI";

export function EarlyAccessPanel() {
  const [copied, setCopied] = useState(false);

  const inviteLink = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProductPanel className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(41,98,255,0.1)] shrink-0">
            <Users className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E6EDF3]">Share StockStory</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#9AA7B5]">
              Invite early users to review StockStory. Share the research workflow with someone who invests in Indian equities.
              No trading rewards. No investment promises.
            </p>
          </div>
        </div>
      </ProductPanel>

      <ProductPanel className="p-5">
        <h4 className="text-xs font-semibold text-[#E6EDF3]">Share the link</h4>
        <p className="mt-1 text-xs text-[#9AA7B5]">
          For now, share StockStory with the link below.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 truncate rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.025)] px-3 py-2 text-xs text-[#9AA7B5]">
            {inviteLink}
          </div>
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-4 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors shrink-0"
            aria-label={copied ? "Link copied" : "Copy invite link"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </ProductPanel>

      <ProductPanel className="p-5">
        <h4 className="text-xs font-semibold text-[#E6EDF3]">What to expect</h4>
        <ul className="mt-3 space-y-2">
          {[
            "Request access is not connected yet — for now, share the link",
            "No trading rewards or referral bonuses",
            "No investment promises or guarantees",
            "StockStory is research-only, not a brokerage",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-[#9AA7B5]">
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-[#2962FF]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ProductPanel>

      <div className="flex flex-wrap gap-2">
        <ProductAction onClick={() => productNavigate("signup")}>
          Create free account
        </ProductAction>
        <ProductAction variant="secondary" onClick={() => productNavigate("methodology")}>
          Read methodology
        </ProductAction>
      </div>
    </div>
  );
}
