/**
 * Portfolio Export Service
 * Generates CSV, JSON, and HTML reports for download
 */

export interface ExportFormat {
  format: 'csv' | 'json' | 'html';
  filename: string;
  content: string;
  mimeType: string;
}

class PortfolioExportService {
  /**
   * Export to CSV format
   */
  exportToCSV(holdings: Array<{ ticker: string; quantity: number; buyPrice: number; currentPrice: number; allocation: number; gain: number; gainPercent: number }>, totals: { invested: number; value: number; return: number; returnPercent: number }): ExportFormat {
    let csv = 'Ticker,Quantity,Buy Price (₱),Current Price (₱),Investment (₱),Current Value (₱),Gain/Loss (₱),Return %,Allocation %\n';

    holdings.forEach((h) => {
      const investment = h.quantity * h.buyPrice;
      csv += `${h.ticker},${h.quantity},${h.buyPrice.toFixed(2)},${h.currentPrice.toFixed(2)},${investment.toFixed(2)},${h.quantity * h.currentPrice},${h.gain.toFixed(2)},${h.gainPercent.toFixed(2)},${h.allocation.toFixed(2)}\n`;
    });

    csv += '\nPortfolio Summary\n';
    csv += `Total Invested,${totals.invested.toFixed(2)}\n`;
    csv += `Current Value,${totals.value.toFixed(2)}\n`;
    csv += `Total Gain/Loss,${totals.return.toFixed(2)}\n`;
    csv += `Total Return,%,${totals.returnPercent.toFixed(2)}\n`;
    csv += `Export Date,${new Date().toISOString().split('T')[0]}\n`;

    return {
      format: 'csv',
      filename: `portfolio_${new Date().toISOString().split('T')[0]}.csv`,
      content: csv,
      mimeType: 'text/csv',
    };
  }

  /**
   * Export to JSON format
   */
  exportToJSON(holdings: any, totals: any, metadata: any = {}): ExportFormat {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedFrom: 'StockEX Portfolio',
        ...metadata,
      },
      portfolio: {
        holdings,
        totals,
      },
    };

    return {
      format: 'json',
      filename: `portfolio_${new Date().toISOString().split('T')[0]}.json`,
      content: JSON.stringify(data, null, 2),
      mimeType: 'application/json',
    };
  }

  /**
   * Export to HTML format (printable report)
   */
  exportToHTML(holdings: Array<{ ticker: string; quantity: number; buyPrice: number; currentPrice: number; allocation: number; gain: number; gainPercent: number }>, totals: { invested: number; value: number; return: number; returnPercent: number }): ExportFormat {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Portfolio Report - ${new Date().toISOString().split('T')[0]}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 { color: #0084ff; margin-bottom: 10px; }
    h2 { color: #666; font-size: 16px; margin-top: 20px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: right;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    td:first-child, th:first-child {
      text-align: left;
    }
    .positive { color: #34a853; font-weight: bold; }
    .negative { color: #ea4335; font-weight: bold; }
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .metric {
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 8px;
      border-left: 4px solid #0084ff;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 20px;
      font-weight: bold;
      color: #000;
    }
    .timestamp {
      color: #999;
      font-size: 12px;
      margin-top: 30px;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>📊 Portfolio Report</h1>

  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Invested</div>
      <div class="metric-value">₱${totals.invested.toLocaleString('en-PH')}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Current Value</div>
      <div class="metric-value">₱${totals.value.toLocaleString('en-PH')}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Gain/Loss</div>
      <div class="metric-value ${totals.return > 0 ? 'positive' : 'negative'}">
        ${totals.return > 0 ? '+' : ''}₱${totals.return.toLocaleString('en-PH')}
      </div>
    </div>
    <div class="metric">
      <div class="metric-label">Total Return</div>
      <div class="metric-value ${totals.returnPercent > 0 ? 'positive' : 'negative'}">
        ${totals.returnPercent > 0 ? '+' : ''}${totals.returnPercent.toFixed(2)}%
      </div>
    </div>
  </div>

  <h2>Holdings</h2>
  <table>
    <thead>
      <tr>
        <th>Ticker</th>
        <th>Quantity</th>
        <th>Buy Price</th>
        <th>Current Price</th>
        <th>Investment</th>
        <th>Current Value</th>
        <th>Gain/Loss</th>
        <th>Return %</th>
        <th>Allocation %</th>
      </tr>
    </thead>
    <tbody>
      ${holdings
        .map(
          (h) => `
        <tr>
          <td><strong>${h.ticker}</strong></td>
          <td>${h.quantity}</td>
          <td>₱${h.buyPrice.toFixed(2)}</td>
          <td>₱${h.currentPrice.toFixed(2)}</td>
          <td>₱${(h.quantity * h.buyPrice).toLocaleString('en-PH')}</td>
          <td>₱${(h.quantity * h.currentPrice).toLocaleString('en-PH')}</td>
          <td class="${h.gain > 0 ? 'positive' : 'negative'}">
            ${h.gain > 0 ? '+' : ''}₱${h.gain.toLocaleString('en-PH')}
          </td>
          <td class="${h.gainPercent > 0 ? 'positive' : 'negative'}">
            ${h.gainPercent > 0 ? '+' : ''}${h.gainPercent.toFixed(2)}%
          </td>
          <td>${h.allocation.toFixed(1)}%</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="timestamp">
    Report generated on ${new Date().toLocaleString('en-PH')}
  </div>
</body>
</html>
    `;

    return {
      format: 'html',
      filename: `portfolio_${new Date().toISOString().split('T')[0]}.html`,
      content: html,
      mimeType: 'text/html',
    };
  }

  /**
   * Trigger download in browser
   */
  downloadFile(format: ExportFormat): void {
    if (typeof window === 'undefined') return; // Server-side

    const blob = new Blob([format.content], { type: format.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = format.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const portfolioExportService = new PortfolioExportService();
