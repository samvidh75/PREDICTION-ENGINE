export default function Logo() {
  return (
    <a href="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', padding:'4px 0' }}>
      <span style={{
        fontSize: 17,
        fontWeight: 700,
        color: '#1D1D1F',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
      }}>
        StockStory
      </span>
    </a>
  );
}
