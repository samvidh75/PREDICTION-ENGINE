/**
 * Report Generator Service
 * Generates downloadable analysis reports as PDF/HTML
 */

export interface AnalysisReport {
  title: string;
  stocks: string[];
  analysis: string;
  timestamp: Date;
  metrics?: Record<string, any>;
}

class ReportGenerator {
  /**
   * Generate HTML report (downloadable)
   */
  generateHTML(report: AnalysisReport): string {
    const formattedDate = report.timestamp.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const stocksList = report.stocks.map((s) => `<li>${s}</li>`).join('');
    const metricsTable = report.metrics
      ? Object.entries(report.metrics)
          .map(
            ([key, value]) =>
              `<tr><td><strong>${key}</strong></td><td>${typeof value === 'number' ? value.toFixed(2) : value}</td></tr>`
          )
          .join('')
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 40px;
    }

    .header {
      border-bottom: 3px solid #667eea;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    h1 {
      color: #667eea;
      font-size: 28px;
      margin-bottom: 10px;
    }

    .meta {
      font-size: 12px;
      color: #999;
    }

    .section {
      margin: 30px 0;
    }

    h2 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
      padding-left: 12px;
    }

    ul {
      margin-left: 20px;
      list-style: disc;
    }

    li {
      margin-bottom: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }

    .analysis-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #999;
      text-align: center;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${report.title}</h1>
    <div class="meta">Generated on ${formattedDate} | StockEx AI Analysis</div>
  </div>

  <div class="section">
    <h2>Stocks Analyzed</h2>
    <ul>
      ${stocksList}
    </ul>
  </div>

  ${metricsTable ? `
  <div class="section">
    <h2>Key Metrics</h2>
    <table>
      <tbody>
        ${metricsTable}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>AI Analysis</h2>
    <div class="analysis-box">${this.escapeHTML(report.analysis)}</div>
  </div>

  <div class="footer">
    <p>This report was generated using StockEx AI, an intelligent stock analysis platform.</p>
    <p>Disclaimer: This analysis is for informational purposes only and not financial advice.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Download report as HTML file
   */
  downloadHTML(report: AnalysisReport): void {
    const html = this.generateHTML(report);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    this.downloadFile(
      blob,
      `${report.title.replace(/\s+/g, '_')}_${Date.now()}.html`
    );
  }

  /**
   * Download report as plain text
   */
  downloadText(report: AnalysisReport): void {
    const text = `
${report.title}
Generated: ${report.timestamp.toLocaleDateString('en-IN')}

STOCKS ANALYZED:
${report.stocks.map((s) => `• ${s}`).join('\n')}

ANALYSIS:
${report.analysis}

${report.metrics ? `\nKEY METRICS:\n${Object.entries(report.metrics).map(([k, v]) => `${k}: ${v}`).join('\n')}` : ''}

---
This report was generated using StockEx AI.
Disclaimer: This analysis is for informational purposes only.
    `;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    this.downloadFile(
      blob,
      `${report.title.replace(/\s+/g, '_')}_${Date.now()}.txt`
    );
  }

  /**
   * Email report (requires backend support)
   */
  async emailReport(report: AnalysisReport, email: string): Promise<boolean> {
    try {
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          report: {
            title: report.title,
            stocks: report.stocks,
            analysis: report.analysis,
            timestamp: report.timestamp.toISOString(),
          },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Email Report Error]', error);
      return false;
    }
  }

  /**
   * Share report link (requires backend support)
   */
  async shareReport(report: AnalysisReport): Promise<string | null> {
    try {
      const response = await fetch('/api/share-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            title: report.title,
            stocks: report.stocks,
            analysis: report.analysis,
          },
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.shareUrl;
    } catch (error) {
      console.error('[Share Report Error]', error);
      return null;
    }
  }

  /**
   * Private helper: download file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton
export const reportGenerator = new ReportGenerator();
