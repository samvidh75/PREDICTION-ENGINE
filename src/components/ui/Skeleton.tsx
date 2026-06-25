export function Skeleton({ w = '100%', h = 16, r = 6, className = '' }: { w?: string | number; h?: number | string; r?: number | string; className?: string }) {
  return (
    <div style={{
      width: w as any, height: h as any, borderRadius: r as any,
      background: 'linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} className={className}/>
  )
}
