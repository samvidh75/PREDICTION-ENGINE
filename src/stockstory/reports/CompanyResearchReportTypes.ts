export interface CompanyReportSection {
  title: string;
  content: string;
  type: "text" | "score" | "table" | "risk" | "thesis";
}

export interface CompanyResearchReport {
  symbol: string;
  companyName: string;
  sector: string;
  generatedAt: string;
  sections: CompanyReportSection[];
  disclaimer: string;
}
