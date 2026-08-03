export interface AnnualReport {
  symbol: string;
  companyName: string;
  fiscalYear: string;
  reportType: 'annual' | 'quarterly' | 'standalone' | 'consolidated';
  filingDate: string;
  periodEndDate: string;
  pdfUrl: string;
  size: string;
}

/**
 * KNOWN GAP: this previously seeded fully fabricated reports (random filing
 * dates, random file sizes) and pointed real PSE tickers (BDO, TEL, BPI...)
 * at real Indian bseindia.com/nseindia.com annual-report URLs — i.e. both
 * fake data AND the wrong country's real domain. Confirmed dead (no
 * importers anywhere in src/ or api/). Rather than invent a "less wrong"
 * fake PSE dataset, this now returns no reports until a verified PSE filing
 * source (see PSEEdgeScraper.ts, which resolves real edge.pse.com.ph
 * disclosures) is wired in here.
 */
export class AnnualReportViewer {
  private reports: AnnualReport[] = [];

  getReports(symbol: string): AnnualReport[] {
    return this.reports.filter(r => r.symbol === symbol.toUpperCase()).sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
  }

  getLatestReport(symbol: string): AnnualReport | null {
    const filtered = this.reports.filter(r => r.symbol === symbol.toUpperCase()).sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
    return filtered.length > 0 ? filtered[0] : null;
  }

  getFilingCalendar(month: number, year: number): AnnualReport[] {
    return this.reports.filter(r => {
      const d = new Date(r.filingDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }).sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
  }
}

export const annualReportViewer = new AnnualReportViewer();
