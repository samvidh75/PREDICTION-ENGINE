import type { ReactNode } from "react";

type BadgeVariant = 'default' | 'brand' | 'green' | 'red' | 'amber';

const styles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--bg-chip)', color: 'var(--text-secondary)' },
  brand:   { background: 'var(--brand-light)', color: 'var(--brand)' },
  green:   { background: 'var(--green-light)', color: 'var(--green)' },
  red:     { background: 'var(--red-light)', color: 'var(--red)' },
  amber:   { background: 'var(--amber-light)', color: 'var(--amber)' },
};

export const Badge = ({ children, variant = 'default', style }: {
  children: ReactNode; variant?: BadgeVariant; style?: React.CSSProperties;
}) => (
  <span style={{
    ...styles[variant],
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600,
    letterSpacing: '0.01em', whiteSpace: 'nowrap',
    ...style,
  }}>
    {children}
  </span>
);
