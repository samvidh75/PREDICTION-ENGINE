export default function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0' }}>
      <img src="/logo-mark.svg" alt="StockStory" style={{ width:32, height:32, flexShrink:0 }} />
      <div>
        <div style={{
          fontSize:15, fontWeight:800, color:'var(--text-900)',
          letterSpacing:'-0.02em', lineHeight:1.1
        }}>
          StockStory
        </div>
        <div style={{
          fontSize:10, fontWeight:600, color:'var(--text-300)',
          letterSpacing:'0.08em', textTransform:'uppercase', lineHeight:1
        }}>
          India · Research
        </div>
      </div>
    </div>
  );
}
