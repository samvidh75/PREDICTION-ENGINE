import React from "react";
import { LucideIcon, TrendingUp, AlertTriangle, Info, CheckCircle2, ArrowRight, BookOpen, Target, BarChart3, Shield, Eye, GitCompare, Sparkles, Activity, Briefcase } from "lucide-react";
import { ProductPanel, ProductAction, ProductStatusPill } from "../product/ProductUI";

export function ProductShellHeader({ title, subtitle, actions, status }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  status?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.04] pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-[#9AA7B5]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status}
        {actions}
      </div>
    </div>
  );
}

export function ProductPageFrame({ children, className = "" }: { children: React.ReactNode; className?: string }): JSX.Element {
  return <div className={`mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function ProductSectionHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-[#E6EDF3]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#9AA7B5]">{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function ResearchActionBar({ actions }: { actions: Array<{ label: string; icon: LucideIcon; onClick: () => void; variant?: "primary" | "secondary" | "ghost"; disabled?: boolean; }> }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <ProductAction
            key={index}
            onClick={action.onClick}
            variant={action.variant}
            disabled={action.disabled}
          >
            <Icon className="h-3.5 w-3.5" /> {action.label}
          </ProductAction>
        );
      })}
    </div>
  );
}

export function ResearchWorkflowCard({
  title,
  description,
  icon,
  status = "pending",
  onClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  status?: "pending" | "active" | "completed";
  onClick?: () => void;
}): JSX.Element {
  const statusColors = {
    pending: "border-[rgba(148,163,184,0.16)] bg-[rgba(148,163,184,0.04)] text-[#9AA7B5]",
    active: "border-[#2962FF]/40 bg-[#2962FF]/10 text-[#2962FF]",
    completed: "border-[#16A34A]/40 bg-[#16A34A]/10 text-[#16A34A]",
  };

  const statusLabels = {
    pending: "Awaiting",
    active: "Active",
    completed: "Completed",
  };

  return (
    <ProductPanel
      className={`w-full p-4 text-left transition-all hover:border-[#2962FF]/40 hover:bg-[rgba(255,255,255,0.03)] ${statusColors[status]} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div
        className="flex items-start gap-3"
        onClick={onClick}
      >
        <div className="mt-0.5">
          {React.createElement(icon, { className: "h-4 w-4" })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
            <span className="text-[10px] font-medium">{statusLabels[status]}</span>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">{description}</p>
        </div>
        {onClick && <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />}
      </div>
    </ProductPanel>
  );
}

export function ThesisStatusBadge({
  status,
  label,
  icon,
}: {
  status: "needs-review" | "improving" | "risk-rising" | "stable" | "pending";
  label: string;
  icon?: LucideIcon;
}): JSX.Element {
  const Icon = icon || AlertTriangle;

  const getStatusStyles = () => {
    switch (status) {
      case "needs-review":
        return "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]";
      case "improving":
        return "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]";
      case "risk-rising":
        return "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]";
      case "stable":
        return "border-[#2962FF]/30 bg-[#2962FF]/10 text-[#2962FF]";
      case "pending":
        return "border-[#64748B]/30 bg-[#64748B]/10 text-[#64748B]";
      default:
        return "border-[#64748B]/30 bg-[#64748B]/10 text-[#64748B]";
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${getStatusStyles()}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export function MetricContextStrip({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; tone?: "positive" | "negative" | "neutral"; }>;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className="text-[#9AA7B5]">{metric.label}:</span>
          <span className={`font-semibold ${metric.tone === "positive" ? "text-[#16A34A]" : metric.tone === "negative" ? "text-[#EF4444]" : "text-[#E6EDF3]"}`}>{metric.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReviewChecklistPanel({
  items,
  onComplete,
}: {
  items: Array<{ id: string; text: string; completed: boolean; }>;
  onComplete?: (id: string) => void;
}): JSX.Element {
  return (
    <ProductPanel className="p-4">
      <div className="text-xs font-semibold text-[#E6EDF3] mb-3">Review Checklist</div>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onComplete?.(item.id)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-[rgba(148,163,184,0.32)] text-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20"
            />
            <span className={`text-xs ${item.completed ? "line-through text-[#64748B]" : "text-[#E6EDF3]"}`}>{item.text}</span>
          </label>
        ))}
      </div>
    </ProductPanel>
  );
}

export function InvestReviewPanel({
  company,
  thesis,
  risks,
  onProceed,
}: {
  company: { symbol: string; name: string; };
  thesis: string;
  risks: string[];
  onProceed: () => void;
}): JSX.Element {
  return (
    <ProductPanel className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#E6EDF3] mb-2">Investment Review: {company.symbol} - {company.name}</h3>
        <div className="space-y-3">
          <div>
            <span className="text-[11px] font-semibold text-[#9AA7B5]">Thesis:</span>
            <p className="mt-1 text-xs text-[#E6EDF3]">{thesis}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#9AA7B5]">Key Risks:</span>
            <ul className="mt-1 space-y-1">
              {risks.map((risk, index) => (
                <li key={index} className="text-xs text-[#E6EDF3] flex items-start gap-1.5">
                  <span className="text-[#EF4444] mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <ProductAction variant="secondary" onClick={onProceed} className="flex-1">
          Review with broker
        </ProductAction>
        <ProductAction variant="ghost" onClick={onProceed} className="flex-1">
          Track instead
        </ProductAction>
      </div>
    </ProductPanel>
  );
}

export function CompareDecisionPanel({
  companies,
  factors,
}: {
  companies: Array<{ symbol: string; name: string; }>;
  factors: Array<{ name: string; winner: string | null; explanation: string; }>;
}): JSX.Element {
  return (
    <ProductPanel className="overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[rgba(148,163,184,0.12)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Decision comparison</div>
      </div>
      <div className="p-4 space-y-3">
        {factors.map((factor, index) => (
          <div key={index} className="rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(255,255,255,0.02)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#E6EDF3]">{factor.name}</span>
              {factor.winner && (
                <span className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20">
                  {factor.winner}
                </span>
              )}
            </div>
            <p className="text-[11px] leading-4 text-[#9AA7B5]">{factor.explanation}</p>
          </div>
        ))}
        <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.08)]">
          <div className="text-[10px] text-[#64748B]">Compare {companies.length} companies to make informed research decisions.</div>
        </div>
      </div>
    </ProductPanel>
  );
}

export function WhatChangedPanel({
  changes,
}: {
  changes: Array<{ symbol: string; type: string; severity: "critical" | "important" | "monitor"; explanation: string; }>;
}): JSX.Element {
  return (
    <ProductPanel className="overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[rgba(148,163,184,0.12)]">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#2962FF]" />
          <div className="text-xs font-semibold text-[#E6EDF3]">What changed</div>
        </div>
      </div>
      <div className="divide-y divide-[rgba(148,163,184,0.1)]">
        {changes.map((change, index) => (
          <div key={index} className="p-4 hover:bg-white/[0.03] transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{change.symbol}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: change.severity === "critical" ? "#EF4444" : change.severity === "important" ? "#F59E0B" : "#64748B", backgroundColor: change.severity === "critical" ? "#EF4444/15" : change.severity === "important" ? "#F59E0B/15" : "#64748B/15", color: change.severity === "critical" ? "#EF4444" : change.severity === "important" ? "#F59E0B" : "#64748B" }}>
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: change.severity === "critical" ? "#EF4444" : change.severity === "important" ? "#F59E0B" : "#64748B" }} />
                    {change.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#9AA7B5] line-clamp-2">{change.explanation}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </ProductPanel>
  );
}
