interface AskAdvisoryButtonProps {
  symbol: string;
}

export function AskAdvisoryButton({ symbol }: AskAdvisoryButtonProps) {
  return (
    <button style={{
      margin: '16px 20px',
      padding: '14px 20px',
      width: 'calc(100% - 40px)',
      background: 'linear-gradient(135deg, #E91E63, #FF5722)',
      border: 'none',
      borderRadius: 10,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 700,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <span>🎯</span>
      <span>Want buy/sell advice on {symbol}? Ask StockStory</span>
      <span>›</span>
    </button>
  );
}
