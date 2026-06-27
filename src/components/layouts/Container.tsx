import type { ReactNode, CSSProperties } from 'react';

interface ContainerProps {
  children:  ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  style?:    CSSProperties;
}

const MAX_WIDTHS = {
  sm:   '640px',
  md:   '900px',
  lg:   '1280px',
  xl:   '1440px',
  full: '100%',
} as const;

/**
 * Stripe-spec content container.
 * Desktop: max 1280px, horizontal padding clamps 16px→40px.
 */
export function Container({ children, maxWidth = 'lg', style }: ContainerProps) {
  return (
    <div
      style={{
        maxWidth: MAX_WIDTHS[maxWidth],
        margin:   '0 auto',
        padding:  'clamp(16px, 4vw, 40px)',
        width:    '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Container;
