import { useState } from 'react';
import { Filter, Download } from 'lucide-react';
import { ExportUtils } from '../services/export/ExportUtils';
import { corporateActionsService } from '../services/corporate-actions/CorporateActionsService';

type DealFilter = 'all' | 'bulk' | 'block';
type SortField = 'value' | 'date' | 'quantity' | 'price';
type SortDir = 'asc' | 'desc';

export function BulkDealsTracker() {
  const [filter, setFilter] = useState<DealFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  let deals = corporateActionsService.getRecentBulkDeals(30);

  if (filter !== 'all') {
    deals = deals.filter(d => d.dealType === filter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    deals = deals.filter(d =>
      d.symbol.toLowerCase().includes(q) ||
      d.buyer.toLowerCase().includes(q) ||
      d.seller.toLowerCase().includes(q) ||
      d.companyName.toLowerCase().includes(q)
    );
  }

  deals.sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1;
    if (sortField === 'value') return (a.value - b.value) * dir;
    if (sortField === 'date') return new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime() * dir;
    if (sortField === 'quantity') return (a.quantity - b.quantity) * dir;
    return (a.price - b.price) * dir;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    ExportUtils.toCSV(
      ['Date', 'Symbol', 'Company', 'Type', 'Buyer', 'Seller', 'Quantity', 'Price', 'Value'],
      deals.map(d => [
        new Date(d.tradeDate).toLocaleDateString('en-PH'),
        d.symbol, d.companyName, d.dealType.toUpperCase(),
        d.buyer, d.seller, d.quantity, d.price, d.value,
      ]),
      'bulk_deals'
    );
  };

  const formatValue = (v: number) => {
    if (v >= 1_000_000_000) return '₱' + (v / 1_000_000_000).toFixed(1) + 'B';
    if (v >= 1_000_000) return '₱' + (v / 1_000_000).toFixed(1) + 'M';
    return '₱' + v.toLocaleString('en-PH');
  };

  const formatQuantity = (q: number) => {
    if (q >= 1_000_000_000) return (q / 1_000_000_000).toFixed(1) + 'B';
    if (q >= 1_000_000) return (q / 1_000_000).toFixed(1) + 'M';
    return q.toLocaleString('en-PH');
  };

  const totalValue = deals.reduce((s, d) => s + d.value, 0);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'desc' ? ' \u2193' : ' \u2191';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Block &amp; Bulk Deals</h2>
          <p style={{ fontSize: '13px', color: '#a0a0a0', margin: '4px 0 0 0' }}>
            {deals.length} deals in last 30 days {'\u2022'} Total value: {formatValue(totalValue)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExport} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '12px', background: 'transparent', color: '#a0a0a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2px' }}>
          {(['all', 'bulk', 'block'] as DealFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: filter === f ? 600 : 400,
                background: filter === f ? '#3b82f6' : 'transparent',
                color: filter === f ? '#fff' : '#a0a0a0',
                textTransform: 'capitalize',
              }}
            >{f === 'all' ? 'All' : f}</button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
          <Filter size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by symbol, buyer, seller..."
            style={{
              width: '100%', padding: '6px 12px 6px 32px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
              color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th onClick={() => handleSort('date')} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 500, fontSize: '11px', color: sortField === 'date' ? '#60a5fa' : '#a0a0a0', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>Date{sortIndicator('date')}</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 500, fontSize: '11px', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Symbol</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 500, fontSize: '11px', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 500, fontSize: '11px', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buyer</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 500, fontSize: '11px', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seller</th>
              <th onClick={() => handleSort('quantity')} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 500, fontSize: '11px', color: sortField === 'quantity' ? '#60a5fa' : '#a0a0a0', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>Qty{sortIndicator('quantity')}</th>
              <th onClick={() => handleSort('price')} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 500, fontSize: '11px', color: sortField === 'price' ? '#60a5fa' : '#a0a0a0', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>Price{sortIndicator('price')}</th>
              <th onClick={() => handleSort('value')} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 500, fontSize: '11px', color: sortField === 'value' ? '#60a5fa' : '#a0a0a0', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', userSelect: 'none', whiteSpace: 'nowrap' }}>Value{sortIndicator('value')}</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No deals found</td>
              </tr>
            ) : deals.map(deal => (
              <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 8px', color: '#a0a0a0', whiteSpace: 'nowrap' }}>
                  {new Date(deal.tradeDate).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}
                </td>
                <td style={{ padding: '10px 8px', fontWeight: 600, color: '#fff' }}>{deal.symbol}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                    background: deal.dealType === 'block' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                    color: deal.dealType === 'block' ? '#f59e0b' : '#3b82f6',
                    textTransform: 'uppercase',
                  }}>
                    {deal.dealType}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: '#22c55e', fontSize: '12px' }}>{deal.buyer}</td>
                <td style={{ padding: '10px 8px', color: '#ef4444', fontSize: '12px' }}>{deal.seller}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fff' }}>{formatQuantity(deal.quantity)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fff' }}>{'₱'}{deal.price.toFixed(1)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatValue(deal.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: '#a0a0a0' }}>
        <p style={{ margin: 0 }}>
          <strong>About Block &amp; Bulk Deals:</strong> A block sale involves a minimum of {'₱'}10M or 100,000 shares traded in a single transaction. Bulk deals are disclosed by the exchange when {'>'}0.5% of equity changes hands.
        </p>
      </div>
    </div>
  );
}
