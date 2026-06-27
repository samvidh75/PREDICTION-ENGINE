import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { color, radius, space } from '../../design/tokens';

interface CardProps {
  children:  ReactNode;
  padding?:  'sm' | 'md' | 'lg';
  onClick?:  () => void;
  style?:    CSSProperties;
  className?: string;
}

const PADDING = {
  sm: space[3],   // 12px
  md: space[4],   // 16px
  lg: space[6],   // 24px
} as const;

export function Card({ children, padding = 'md', onClick, style, className }: CardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background:   color.bg,
        border:       `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding:      PADDING[padding],
        cursor:       isClickable ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = color.bgAlt;
      } : undefined}
      onMouseLeave={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = color.bg;
      } : undefined}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize:       '11px',
      fontWeight:     600,
      color:          color.textMuted,
      textTransform:  'uppercase',
      letterSpacing:  '0.06em',
      marginBottom:   space[3],
    }}>
      {children}
    </div>
  );
}

export default Card;
