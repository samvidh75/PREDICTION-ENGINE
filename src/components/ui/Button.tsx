import { color, font, radius, layout } from '../../design/tokens';
import { useMediaQuery } from '../../hooks/useMediaQuery';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: string;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, style, className, ...props }: ButtonProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const height = isDesktop ? layout.buttonHeightDesktop : layout.buttonHeightMobile;

  const base: React.CSSProperties = {
    fontFamily: font,
    borderRadius: radius.pill,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    height,
    padding: `0 20px`,
    transition: 'background 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: color.primary,
      color: color.bg,
    },
    secondary: {
      background: color.bg,
      color: color.text,
      border: `1px solid ${color.border}`,
    },
    ghost: {
      background: 'transparent',
      color: color.textMuted,
    },
  };

  return (
    <button
      className={className}
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
