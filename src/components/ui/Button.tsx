import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from 'react';
import { colors, radius, transition } from '../../styles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  fullWidth?: boolean;
  children:   ReactNode;
}

const BASE: CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '8px',
  fontFamily:     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontWeight:     600,
  border:         'none',
  borderRadius:   radius.sm,      // 6px — Stripe standard
  cursor:         'pointer',
  transition:     `background ${transition.base}, box-shadow ${transition.base}, opacity ${transition.fast}`,
  whiteSpace:     'nowrap',
  textDecoration: 'none',
  lineHeight:     1,
};

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: colors.primary,
    color:      colors.text.inverse,
  },
  secondary: {
    background: colors.bg.primary,
    color:      colors.text.primary,
    border:     `1px solid ${colors.bg.tertiary}`,
  },
  ghost: {
    background: 'transparent',
    color:      colors.primary,
  },
  danger: {
    background: colors.tint.error,
    color:      colors.on.error,
    border:     `1px solid rgba(245,34,45,0.20)`,
  },
};

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { fontSize: '14px', padding: '8px 16px',  height: '36px' },
  md: { fontSize: '16px', padding: '12px 24px', height: '44px' },   // Apple HIG touch min
  lg: { fontSize: '16px', padding: '16px 32px', height: '52px' },
};

export function Button({
  variant   = 'secondary',
  size      = 'md',
  fullWidth = false,
  disabled  = false,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const hoverBg: Record<ButtonVariant, string> = {
    primary:   colors.on.primary,       // #0051CC
    secondary: colors.bg.secondary,     // #F5F5F5
    ghost:     colors.bg.secondary,
    danger:    'rgba(245,34,45,0.14)',
  };

  return (
    <button
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        width:   fullWidth ? '100%' : undefined,
        opacity: disabled  ? 0.45  : 1,
        cursor:  disabled  ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) e.currentTarget.style.background = hoverBg[variant];
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        if (!disabled) e.currentTarget.style.background = (VARIANTS[variant].background as string) ?? 'transparent';
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
