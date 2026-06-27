import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { color, radius, space, layout, elevation } from '../../design/tokens';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface CardProps {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

const PADDING = {
  sm: space[3],
  md: space[4],
  lg: space[6],
} as const;

export function Card({ children, padding = 'md', onClick, style, className }: CardProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isClickable = Boolean(onClick);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: color.bgAlt,
        border: `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding: PADDING[padding],
        boxShadow: elevation.card,
        cursor: isClickable ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = color.bg;
      } : undefined}
      onMouseLeave={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = color.bgAlt;
      } : undefined}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: '12px',
      fontWeight: 500,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: space[3],
    }}>
      {children}
    </div>
  );
}

export default Card;
