import React from "react";
import { Search, FileSearch, Eye, ShieldCheck, BarChart3 } from "lucide-react";

interface WorkflowItem {
  icon: React.ElementType;
  label: string;
  action: () => void;
  description?: string;
}

interface ResearchWorkflowRailProps {
  items?: WorkflowItem[];
  className?: string;
}

const DEFAULT_WORKFLOW: Omit<WorkflowItem, "action">[] = [
  { icon: Search, label: "Search", description: "Search symbols or companies" },
  { icon: FileSearch, label: "Inspect", description: "Open prediction explanation" },
  { icon: BarChart3, label: "Compare", description: "Compare companies" },
  { icon: Eye, label: "Track", description: "Save to watchlist" },
  { icon: ShieldCheck, label: "Audit", description: "Check data sources" },
];

function navigatePage(pageKey: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export function ResearchWorkflowRail({ items, className = "" }: ResearchWorkflowRailProps) {
  const workflowItems = items || DEFAULT_WORKFLOW.map((w) => ({
    ...w,
    action: () => {
      const pageMap: Record<string, string> = {
        Search: "search",
        Inspect: "rankings",
        Compare: "rankings",
        Track: "watchlist",
        Audit: "methodology",
      };
      navigatePage(pageMap[w.label] || "rankings");
    },
  }));

  return (
    <nav className={`space-y-1 ${className}`} aria-label="Research workflow">
      {workflowItems.map(({ icon: Icon, label, action, description }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#8B949E] hover:bg-white/[0.04] hover:text-[#E6EDF3] transition-colors"
          title={description}
        >
          <Icon className="h-4 w-4 shrink-0 text-[#484F58]" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
