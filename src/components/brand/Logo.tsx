export default function Logo() {
  return (
    <a href="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', padding:'4px 0' }}>
      <span style={{
        fontSize: 16,
        fontWeight: 800,
        color: 'var(--text-900)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        fontFamily: 'var(--font)',
      }}>
        StockStory
      </span>
    </a>
  );
}
