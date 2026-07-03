import { useState, useMemo, useCallback } from 'react';
import { Plus, X, Search, Equal, ArrowUpDown } from 'lucide-react';

type FilterOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'contains';
type FilterFieldType = 'number' | 'percent' | 'ratio' | 'text' | 'select';

interface FilterField {
  id: string;
  label: string;
  type: FilterFieldType;
  options?: string[];
  description: string;
}

interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string;
  value2?: string;
}

interface FilterBuilderProps {
  onFiltersChange?: (filters: FilterCondition[]) => void;
  compact?: boolean;
}

const FILTER_FIELDS: FilterField[] = [
  { id: 'marketCap', label: 'Market Cap (Cr)', type: 'number', description: 'Market capitalization in crores' },
  { id: 'peRatio', label: 'P/E Ratio', type: 'ratio', description: 'Price to Earnings ratio' },
  { id: 'pbRatio', label: 'P/B Ratio', type: 'ratio', description: 'Price to Book ratio' },
  { id: 'evEbitda', label: 'EV/EBITDA', type: 'ratio', description: 'Enterprise Value to EBITDA' },
  { id: 'roe', label: 'ROE (%)', type: 'percent', description: 'Return on Equity' },
  { id: 'roce', label: 'ROCE (%)', type: 'percent', description: 'Return on Capital Employed' },
  { id: 'debtToEquity', label: 'Debt/Equity', type: 'ratio', description: 'Debt to Equity ratio' },
  { id: 'currentRatio', label: 'Current Ratio', type: 'ratio', description: 'Current Assets / Current Liabilities' },
  { id: 'interestCoverage', label: 'Interest Coverage', type: 'ratio', description: 'EBIT / Interest Expense' },
  { id: 'revenueGrowth', label: 'Revenue Growth (%)', type: 'percent', description: 'YoY revenue growth' },
  { id: 'profitGrowth', label: 'Profit Growth (%)', type: 'percent', description: 'YoY profit growth' },
  { id: 'epsGrowth', label: 'EPS Growth (%)', type: 'percent', description: 'YoY EPS growth' },
  { id: 'netMargin', label: 'Net Margin (%)', type: 'percent', description: 'Net profit margin' },
  { id: 'operatingMargin', label: 'Operating Margin (%)', type: 'percent', description: 'Operating profit margin' },
  { id: 'dividendYield', label: 'Dividend Yield (%)', type: 'percent', description: 'Annual dividend yield' },
  { id: 'fcfYield', label: 'FCF Yield (%)', type: 'percent', description: 'Free Cash Flow yield' },
  { id: 'rsi', label: 'RSI (14)', type: 'number', description: 'Relative Strength Index' },
  { id: 'priceChange1M', label: '1M Return (%)', type: 'percent', description: '1-month price return' },
  { id: 'priceChange1Y', label: '1Y Return (%)', type: 'percent', description: '1-year price return' },
  { id: 'volatility30', label: 'Volatility (%)', type: 'percent', description: '30-day annualized volatility' },
  { id: 'promoterHolding', label: 'Promoter Holding (%)', type: 'percent', description: 'Promoter shareholding' },
  { id: 'fiiHolding', label: 'FII Holding (%)', type: 'percent', description: 'FII shareholding' },
  { id: 'sales', label: 'Sales (Cr)', type: 'number', description: 'Annual sales/revenue' },
  { id: 'profit', label: 'Net Profit (Cr)', type: 'number', description: 'Annual net profit' },
  { id: 'eps', label: 'EPS', type: 'number', description: 'Earnings Per Share' },
  { id: 'sector', label: 'Sector', type: 'text', description: 'Sector name' },
];

const OPERATORS: { id: FilterOperator; label: string; symbol: string }[] = [
  { id: 'gt', label: 'Greater than', symbol: '>' },
  { id: 'gte', label: 'Greater than or equal', symbol: '≥' },
  { id: 'lt', label: 'Less than', symbol: '<' },
  { id: 'lte', label: 'Less than or equal', symbol: '≤' },
  { id: 'eq', label: 'Equals', symbol: '=' },
  { id: 'between', label: 'Between', symbol: '∈' },
];

function FilterOperatorIcon({ op }: { op: FilterOperator }) {
  const icons: Record<FilterOperator, React.ReactNode> = {
    gt: <span style={{ fontWeight: 700 }}>&gt;</span>,
    gte: <span style={{ fontWeight: 700 }}>≥</span>,
    lt: <span style={{ fontWeight: 700 }}>&lt;</span>,
    lte: <span style={{ fontWeight: 700 }}>≤</span>,
    eq: <Equal size={14} />,
    between: <ArrowUpDown size={14} />,
    contains: <Search size={14} />,
  };
  return icons[op] || null;
}

export function FilterBuilder({ onFiltersChange, compact = false }: FilterBuilderProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchField, setSearchField] = useState('');

  const filteredFields = useMemo(() => {
    if (!searchField) return FILTER_FIELDS;
    const q = searchField.toLowerCase();
    return FILTER_FIELDS.filter(f =>
      f.label.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  }, [searchField]);

  const selectedFieldIds = useMemo(() => new Set(conditions.map(c => c.fieldId)), [conditions]);

  const addCondition = useCallback((fieldId: string) => {
    setConditions(prev => [...prev, {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fieldId,
      operator: 'gt',
      value: '',
    }]);
    setShowAddPanel(false);
    setSearchField('');
  }, []);

  const updateCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setConditions([]);
  }, []);

  const getField = (fieldId: string) => FILTER_FIELDS.find(f => f.id === fieldId);

  const formatCondition = (c: FilterCondition): string => {
    const field = getField(c.fieldId);
    if (!field) return 'Unknown';
    const op = OPERATORS.find(o => o.id === c.operator);
    const val = c.operator === 'between' ? `${c.value} – ${c.value2 || '?'}` : c.value;
    const suffix = field.type === 'percent' ? '%' : '';
    return `${field.label} ${op?.symbol || '?'} ${val}${suffix}`;
  };

  const filterCount = conditions.length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '8px' : '12px' }}>
        <div style={{ fontSize: compact ? '13px' : '14px', color: '#a0a0a0' }}>
          {filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? 's' : ''} applied` : 'No filters applied'}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {filterCount > 0 && (
            <button
              onClick={clearAll}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '11px', background: 'transparent', color: '#ef4444' }}
            >Clear all</button>
          )}
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, background: '#3b82f6', color: '#fff',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          ><Plus size={14} /> Add Filter</button>
        </div>
      </div>

      {conditions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {conditions.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '20px',
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                fontSize: '12px', color: '#93c5fd',
              }}
            >
              <span>{formatCondition(c)}</span>
              <button onClick={() => removeCondition(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', padding: '0', display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddPanel && (
        <div style={{
          marginBottom: '12px', padding: '16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', pointerEvents: 'none' }} />
            <input
              value={searchField}
              onChange={e => setSearchField(e.target.value)}
              placeholder="Search fields..."
              autoFocus
              style={{
                width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)',
                color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
            {filteredFields.map(field => (
              <button
                key={field.id}
                onClick={() => addCondition(field.id)}
                disabled={selectedFieldIds.has(field.id)}
                style={{
                  padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                  cursor: selectedFieldIds.has(field.id) ? 'not-allowed' : 'pointer',
                  fontSize: '12px', textAlign: 'left', background: selectedFieldIds.has(field.id) ? 'rgba(255,255,255,0.02)' : 'transparent',
                  color: selectedFieldIds.has(field.id) ? '#555' : '#ccc', opacity: selectedFieldIds.has(field.id) ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selectedFieldIds.has(field.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 500 }}>{field.label}</div>
                <div style={{ fontSize: '10px', color: '#666' }}>{field.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {conditions.map(c => {
        const field = getField(c.fieldId);
        if (!field) return null;
        return (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
            padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', minWidth: '140px' }}>{field.label}</span>

            <select
              value={c.operator}
              onChange={e => updateCondition(c.id, { operator: e.target.value as FilterOperator })}
              style={{
                padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', cursor: 'pointer',
              }}
            >
              {OPERATORS.map(op => (
                <option key={op.id} value={op.id}>{op.symbol} {op.label}</option>
              ))}
            </select>

            <input
              type="number"
              value={c.value}
              onChange={e => updateCondition(c.id, { value: e.target.value })}
              placeholder="Value"
              style={{
                padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', width: '100px',
                outline: 'none',
              }}
            />

            {c.operator === 'between' && (
              <>
                <span style={{ color: '#666', fontSize: '12px' }}>and</span>
                <input
                  type="number"
                  value={c.value2 || ''}
                  onChange={e => updateCondition(c.id, { value2: e.target.value })}
                  placeholder="Max"
                  style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', width: '100px',
                    outline: 'none',
                  }}
                />
              </>
            )}

            {field.type === 'percent' && <span style={{ color: '#666', fontSize: '12px' }}>%</span>}

            <button
              onClick={() => removeCondition(c.id)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
            ><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
