export class ExportUtils {
  static toCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string): void {
    const bom = '\uFEFF';
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell => {
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static toJSON(data: unknown, filename: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
    return `₹${value.toFixed(2)}`;
  }

  static formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  static formatLargeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(2)}L`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('en-IN');
  }

  static formatRatio(value: number | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined) return '—';
    return value.toFixed(decimals);
  }

  static formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  static formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

export const exportUtils = new ExportUtils();
