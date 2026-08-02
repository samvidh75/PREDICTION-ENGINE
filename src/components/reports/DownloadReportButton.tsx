import { useState } from "react";
import { Button } from "../../ui/Button";
import { buildResearchReport, reportToMarkdown } from "../../stockstory/reports/CompanyResearchReportBuilder";
import type { CompanyReportSection } from "../../stockstory/reports/CompanyResearchReportTypes";

interface DownloadReportButtonProps {
  symbol: string;
  companyName: string;
  sector: string;
  sections: CompanyReportSection[];
}

export function DownloadReportButton({ symbol, companyName, sector, sections }: DownloadReportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    try {
      const report = buildResearchReport(symbol, companyName, sector, sections);
      const markdown = reportToMarkdown(report);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol.toLowerCase()}-research-report.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    }
    setDownloading(false);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleDownload} disabled={downloading}>
      {downloading ? "Downloading..." : "Download Report"}
    </Button>
  );
}
