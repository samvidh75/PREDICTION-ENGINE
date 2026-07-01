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
    disclaimer: "This research report is for informational purposes only. It does not constitute investment advice. Lensory India does not provide buy/sell recommendations. Consult a SEBI-registered investment advisor before making investment decisions.",
  };
}

/** Append analyst memo sections when analyst output is available */
export function appendAnalystMemoSections(
  sections: CompanyReportSection[],
  analyst?: {
    brief?: string;
    deepDive?: string;
    earningsNote?: string;
    filingSummary?: string;
    limitations?: string[];
  },
): CompanyReportSection[] {
  const result = [...sections];
  if (analyst?.brief) {
    result.push({ title: 'Analyst Brief', content: analyst.brief, type: 'text' });
  }
  if (analyst?.deepDive) {
    result.push({ title: 'Company Deep Dive', content: analyst.deepDive, type: 'text' });
  }
  if (analyst?.earningsNote) {
    result.push({ title: 'Results Note', content: analyst.earningsNote, type: 'text' });
  }
  if (analyst?.filingSummary) {
    result.push({ title: 'Filing Summary', content: analyst.filingSummary, type: 'text' });
  }
  if (analyst?.limitations?.length) {
    result.push({
      title: 'Evidence & Limitations',
      content: analyst.limitations.join(' '),
      type: 'text',
    });
  }
  return result;
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
