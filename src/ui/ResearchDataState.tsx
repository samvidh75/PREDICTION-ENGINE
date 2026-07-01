/**
 * ResearchDataState.tsx — Safe loading, empty, partial, and error states
 * for research data across all pages.
 *
 * These states are user-facing safe — no provider/API/backend/cache/quota
 * terminology is exposed.
 *
 * States:
 *  - Loading:     Skeleton placeholder while data is being prepared
 *  - Empty:       No data available yet (not an error)
 *  - Partial:     Some data available, some unavailable
 *  - Error:       Data could not be loaded
 */

import React from 'react';
import { colors, typography, radius, space } from '../design/tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DataStateKind = 'loading' | 'empty' | 'partial' | 'error';

export interface DataStateProps {
  kind: DataStateKind;
  /** Title for empty/partial/error. Default: derived from kind */
  title?: string;
  /** Message body */
  message?: string;
  /** Action label (e.g. "Retry"). Omit to hide action. */
  actionLabel?: string;
  /** Callback when action is clicked */
  onAction?: () => void;
  /** Accessibility label */
  label?: string;
}

/* ------------------------------------------------------------------ */
/*  Style helpers                                                     */
/* ------------------------------------------------------------------ */

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: space.lg,
  minHeight: 120,
  textAlign: 'center',
  gap: space.sm,
};

const skeletonBar: React.CSSProperties = {
  height: 12,
  borderRadius: radius.sm,
  background: colors.border,
  animation: `pulse 1.5s ease-in-out infinite`,
  width: '100%',
  maxWidth: 320,
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div style={containerStyle} role="status" aria-label="Loading research data">
      <div style={{ ...skeletonBar, width: '60%' }} />
      <div style={skeletonBar} />
      <div style={{ ...skeletonBar, width: '45%' }} />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}

function EmptyState({ title, message, actionLabel, onAction }: Partial<DataStateProps>) {
  return (
    <div style={containerStyle} role="status" aria-label={title ?? 'No data available'}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <div style={{ color: colors.textSecondary, fontSize: typography.bodyMd.size, fontWeight: typography.bodyMd.weight }}>
        {title ?? 'No data available'}
      </div>
      {message && (
        <div style={{ color: colors.textTertiary, fontSize: typography.bodySm.size }}>
          {message}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: space.xs,
            padding: '8px 20px',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: typography.bodySm.size,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function PartialState({ title, message }: Partial<DataStateProps>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.xs,
        padding: `${space.xs} ${space.sm}`,
        borderRadius: radius.sm,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        fontSize: typography.bodySm.size,
        color: colors.warning,
      }}
      role="status"
      aria-label={title ?? 'Some data unavailable'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>{title ?? 'Some data is temporarily unavailable'}</span>
      {message && <span style={{ color: colors.textTertiary }}>— {message}</span>}
    </div>
  );
}

function ErrorState({ title, message, actionLabel, onAction }: Partial<DataStateProps>) {
  return (
    <div style={containerStyle} role="alert" aria-label={title ?? 'Error loading data'}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.marketRed} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div style={{ color: colors.marketRed, fontSize: typography.bodyMd.size, fontWeight: typography.bodyMd.weight }}>
        {title ?? 'Unable to load data'}
      </div>
      {message && (
        <div style={{ color: colors.textTertiary, fontSize: typography.bodySm.size }}>
          {message}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: space.xs,
            padding: '8px 20px',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: typography.bodySm.size,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function ResearchDataState(props: DataStateProps) {
  switch (props.kind) {
    case 'loading':
      return <LoadingSkeleton />;
    case 'empty':
      return <EmptyState {...props} />;
    case 'partial':
      return <PartialState {...props} />;
    case 'error':
      return <ErrorState {...props} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers                                              */
/* ------------------------------------------------------------------ */

export function DataLoading({ label = 'Loading research data' }: { label?: string }) {
  return <ResearchDataState kind="loading" label={label} />;
}

export function DataEmpty({
  title,
  message,
  actionLabel,
  onAction,
}: Omit<DataStateProps, 'kind'>) {
  return (
    <ResearchDataState
      kind="empty"
      title={title}
      message={message}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

export function DataPartialWarning({
  title,
  message,
}: Omit<DataStateProps, 'kind' | 'actionLabel' | 'onAction'>) {
  return <ResearchDataState kind="partial" title={title} message={message} />;
}

export function DataError({
  title,
  message,
  actionLabel,
  onAction,
}: Omit<DataStateProps, 'kind'>) {
  return (
    <ResearchDataState
      kind="error"
      title={title}
      message={message}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
