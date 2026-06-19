import React, { useMemo } from "react";
import { BookOpen, FileText, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { WorkspaceStateEngine } from "../../services/workspace/WorkspaceStateEngine";
import { computeFreshness } from "../../lib/workspace/workspaceModels";

export const WorkspaceSummary: React.FC = () => {
  const summary = useMemo(() => WorkspaceStateEngine.getWorkspaceSummary(), []);

  const items = [
    { icon: Eye, label: "Tracked companies", value: summary.trackedCompanies },
    { icon: FileText, label: "Research notes", value: summary.notesCount },
    { icon: TrendingUp, label: "Portfolio positions", value: summary.portfolioPositions },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-3.5 w-3.5 text-[#2962FF]" aria-hidden="true" />
            <span className="text-[10px] font-medium text-[#9AA7B5]">{label}</span>
          </div>
          <span className="text-lg font-bold tabular-nums text-[#E6EDF3]">{value}</span>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceSummary;
