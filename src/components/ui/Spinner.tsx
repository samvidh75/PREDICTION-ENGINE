export const Spinner = ({ size = 20, color = 'var(--brand)' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      strokeDasharray="31.4" strokeDashoffset="10" />
  </svg>
);
