import type { ReactNode } from "react";

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonAttrs = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ children, variant = 'secondary', onClick, disabled, fullWidth, size = 'md', style, type, className, title }: {
  children: ReactNode; variant?: ButtonVariant; onClick?: () => void;
  disabled?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties;
  type?: ButtonAttrs['type']; className?: string; title?: string;
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontFamily: 'var(--font-sans)', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--radius-md)', transition: 'all 0.15s ease',
    width: fullWidth ? '100%' : undefined, opacity: disabled ? 0.5 : 1,
  };
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '7px 14px', fontSize: 13 },
    md: { padding: '10px 20px', fontSize: 14 },
    lg: { padding: '13px 28px', fontSize: 15 },
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:   { background: 'var(--brand)', color: '#fff' },
    secondary: { background: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost:     { background: 'transparent', color: 'var(--text-secondary)' },
    danger:    { background: 'var(--red-light)', color: 'var(--red)' },
  };
  return (
    <button type={type} className={className} title={title} style={{ ...base, ...sizes[size], ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
