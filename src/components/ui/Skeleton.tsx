export const Skeleton = ({ width = '100%', height = 16, radius = 6 }: {
  width?: number | string; height?: number; radius?: number;
}) => (
  <>
    <style>{`@keyframes shimmer{0%{background-position:-200% 0}to{background-position:200% 0}}`}</style>
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #1A1A1A 25%, #252525 50%, #1A1A1A 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
    }} />
  </>
);
