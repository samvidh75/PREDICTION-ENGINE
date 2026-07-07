export function SEBIComplianceBanner() {
  return (
    <div style={{
      padding: '12px 16px',
      background: '#fff8e1',
      border: '1px solid #ffe082',
      borderRadius: '8px',
      fontSize: '13px',
      lineHeight: 1.5,
      color: '#6d4c00',
    }}>
      <strong style={{ fontSize: '14px' }}>ⓘ Research Analysis</strong>
      <p style={{ margin: '4px 0 0' }}>
        This analysis is for educational purposes only and not investment advice.
        StockStory India is not a PSE-listed investment advisor.
        Always consult a qualified financial advisor before making investment decisions.
      </p>
      <details style={{ marginTop: '8px', cursor: 'pointer' }}>
        <summary style={{ fontWeight: 500 }}>Research Limitations & Disclosures</summary>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          <li>Data sources: Yahoo Finance, NSE, BSE, Screener.in</li>
          <li>Price data is near real-time (REST polling, not true live streaming)</li>
          <li>Fundamental data updated daily with ~2 hour lag</li>
          <li>Scoring models may exhibit sector bias</li>
          <li>No broker relationships or conflicts of interest</li>
          <li>No personalized advice based on individual portfolio</li>
        </ul>
      </details>
    </div>
  );
}
