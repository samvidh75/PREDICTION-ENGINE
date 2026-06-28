import type { CompanyResearchReport, CompanyReportSection } from "./CompanyResearchReportTypes";

export function buildResearchReport(
  symbol: string,
  companyName: string,
  sector: string,
  sections: CompanyReportSection[],
): CompanyResearchReport {
  return {
    symbol,
    companyName,
    sector,
    generatedAt: new Date().toISOString(),
    sections,
    disclaimer: "This research report is for informational purposes only. It does not constitute investment advice. StockStory India does not provide buy/sell recommendations. Consult a SEBI-registered investment advisor before making investment decisions.",
  };
}

export function reportToMarkdown(report: CompanyResearchReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.companyName} (${report.symbol}) — Research Report`);
  lines.push(`**Sector:** ${report.sector}`);
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleDateString("en-IN")}`);
  lines.push("");
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");
  }
  lines.push("---");
  lines.push(report.disclaimer);
  return lines.join("\n");
}
