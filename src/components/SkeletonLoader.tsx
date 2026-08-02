/**
 * Skeleton Loaders for Perceived Performance
 * Shows animated placeholders while data loads
 * Makes <500ms actual load feel instant
 */

import { colors } from '../design/tokens';

const skeletonAnimation = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`;

export function PriceSkeleton() {
  return (
    <div style={{
      background: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '20px'
    }}>
      <div style={{
        height: '24px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        marginBottom: '12px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <div style={{
        height: '48px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        marginBottom: '8px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <div style={{
        height: '20px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        width: '60%',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <style>{skeletonAnimation}</style>
    </div>
  );
}

export function HealthometerSkeleton() {
  return (
    <div style={{
      background: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <style>{skeletonAnimation}</style>
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div style={{
      background: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        height: '20px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        marginBottom: '12px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <div style={{
        height: `${height}px`,
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      <style>{skeletonAnimation}</style>
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div style={{
      background: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        height: '20px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        marginBottom: '12px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      {Array(5).fill(0).map((_, i) => (
        <div key={i} style={{
          height: '16px',
          background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
          borderRadius: '4px',
          marginBottom: '8px',
          animation: 'skeleton-pulse 1.5s infinite'
        }} />
      ))}
      <style>{skeletonAnimation}</style>
    </div>
  );
}

export function NewsSkeleton() {
  return (
    <div style={{
      background: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        height: '20px',
        background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
        borderRadius: '4px',
        marginBottom: '12px',
        animation: 'skeleton-pulse 1.5s infinite'
      }} />
      {Array(3).fill(0).map((_, i) => (
        <div key={i}>
          <div style={{
            height: '16px',
            background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'skeleton-pulse 1.5s infinite'
          }} />
          <div style={{
            height: '12px',
            background: `linear-gradient(90deg, ${colors.surface} 0%, rgba(255,255,255,0.1) 50%, ${colors.surface} 100%)`,
            borderRadius: '4px',
            marginBottom: '12px',
            width: '70%',
            animation: 'skeleton-pulse 1.5s infinite'
          }} />
        </div>
      ))}
      <style>{skeletonAnimation}</style>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: colors.canvas,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: `4px solid ${colors.border}`,
        borderTop: `4px solid ${colors.primary || '#3b82f6'}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
