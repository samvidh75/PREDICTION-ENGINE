import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import { colors, spacing, radius } from '../../styles';

interface CardProps {
  children:  ReactNode;
  padding?:  'sm' | 'md' | 'lg';
  onClick?:  () => void;
  style?:    CSSProperties;
  className?: string;
}

const PADDING = {
  sm: spacing.base,   // 16px
  md: spacing.lg,     // 24px
  lg: spacing.xl,     // 32px
} as const;

export function Card({ children, padding = 'md', onClick, style, className }: CardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background:   colors.bg.primary,
        border:       `1px solid ${colors.bg.tertiary}`,
        borderRadius: radius.md,           // 8px max
        padding:      PADDING[padding],
        cursor:       isClickable ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = colors.bg.secondary;
      } : undefined}
      onMouseLeave={isClickable ? (e: MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.background = colors.bg.primary;
      } : undefined}
    >
      {children}
    </div>
  );
}

/** Uppercase label used at top of each card section */
export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize:       '11px',
      fontWeight:     600,
      color:          colors.text.tertiary,
      textTransform:  'uppercase',
      letterSpacing:  '0.06em',
      marginBottom:   spacing.base,
    }}>
      {children}
    </div>
  );
}

export default Card;
