import type { ReactNode } from "react";

export const Card = ({ children, className = '', onClick, style }: {
  children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties;
}) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.5rem',
      cursor: onClick ? 'pointer' : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);
