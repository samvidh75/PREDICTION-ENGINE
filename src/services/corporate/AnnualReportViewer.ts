export interface AnnualReport {
  symbol: string;
  companyName: string;
  fiscalYear: string;
  reportType: 'annual' | 'quarterly' | 'standalone' | 'consolidated';
  filingDate: string;
  periodEndDate: string;
  pdfUrl: string;
  bseUrl: string;
  nseUrl: string;
  size: string;
}

export class AnnualReportViewer {
  private reports: AnnualReport[] = this.seedReports();

  private seedReports(): AnnualReport[] {
    const reports: AnnualReport[] = [];
    const companies: [string, string][] = [
      ['RELIANCE', 'Reliance Industries Ltd'],
      ['TCS', 'Tata Consultancy Services'],
      ['HDFCBANK', 'HDFC Bank Ltd'],
      ['INFY', 'Infosys Ltd'],
      ['ICICIBANK', 'ICICI Bank Ltd'],
      ['SBIN', 'State Bank of India'],
      ['BHARTIARTL', 'Bharti Airtel Ltd'],
      ['ITC', 'ITC Ltd'],
      ['WIPRO', 'Wipro Ltd'],
      ['TATAMOTORS', 'Tata Motors Ltd'],
    ];
    for (const [symbol, companyName] of companies) {
      for (let year = 2024; year >= 2020; year--) {
        const fy = `FY${String(year).slice(2)}-${String(year + 1).slice(2)}`;
        const periodEnd = `${year + 1}-03-31`;
        const filingDate = this.randomDate(new Date(year + 1, 4, 1), new Date(year + 1, 6, 30));
        reports.push({
          symbol,
          companyName,
          fiscalYear: fy,
          reportType: 'annual',
          filingDate,
          periodEndDate: periodEnd,
          pdfUrl: `https://www.bseindia.com/bseplus/AnnualReport/${symbol}/${fy}/annual_report.pdf`,
          bseUrl: `https://www.bseindia.com/stock-info/${symbol}/annual-reports`,
          nseUrl: `https://www.nseindia.com/company-info/${symbol}/annual-reports`,
          size: `${(3 + Math.random() * 8).toFixed(1)} MB`,
        });
        reports.push({
          symbol,
          companyName,
          fiscalYear: fy,
          reportType: 'consolidated',
          filingDate: this.randomDate(new Date(year + 1, 5, 1), new Date(year + 1, 7, 15)),
          periodEndDate: periodEnd,
          pdfUrl: `https://www.bseindia.com/bseplus/AnnualReport/${symbol}/${fy}/consolidated_report.pdf`,
          bseUrl: `https://www.bseindia.com/stock-info/${symbol}/annual-reports`,
          nseUrl: `https://www.nseindia.com/company-info/${symbol}/annual-reports`,
          size: `${(4 + Math.random() * 10).toFixed(1)} MB`,
        });
      }
      for (let q = 1; q <= 4; q++) {
        const quarterStr = `Q${q}FY25`;
        const qEndMonth = q * 3;
        const periodEnd = `2024-${String(qEndMonth).padStart(2, '0')}-31`;
        const filingDate = this.randomDate(new Date(2024, qEndMonth, 1), new Date(2024, qEndMonth + 2, 15));
        reports.push({
          symbol,
          companyName,
          fiscalYear: 'FY25',
          reportType: 'quarterly',
          filingDate,
          periodEndDate: periodEnd,
          pdfUrl: `https://www.bseindia.com/bseplus/QuarterlyReport/${symbol}/${quarterStr}.pdf`,
          bseUrl: `https://www.bseindia.com/stock-info/${symbol}/quarterly-results`,
          nseUrl: `https://www.nseindia.com/company-info/${symbol}/quarterly-results`,
          size: `${(1 + Math.random() * 3).toFixed(1)} MB`,
        });
      }
    }
    return reports.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
  }

  private randomDate(start: Date, end: Date): string {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return d.toISOString().split('T')[0];
  }

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
