interface TimeframeButtonsProps {
  selected: string;
  onSelect: (tf: string) => void;
}

const TIMEFRAMES = ['1W', '1M', '3M', '1Y', '5Y'];

export function TimeframeButtons({ selected, onSelect }: TimeframeButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
      {TIMEFRAMES.map(tf => (
        <button
          key={tf}
          onClick={() => onSelect(tf)}
          style={{
            padding: '6px 16px',
            border: 'none',
            borderRadius: 6,
            background: selected === tf ? '#1A56DB' : '#F5F5F5',
            color: selected === tf ? '#FFFFFF' : '#666',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
