import { color, font, radius, layout } from '../../design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: string;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    fontFamily: font,
    borderRadius: radius.pill,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 0.15s ease',
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
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
