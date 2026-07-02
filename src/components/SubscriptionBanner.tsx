import React from 'react';
import { useSessionProfile } from '../commercial/useSessionProfile';

interface SubscriptionBannerProps {
  /** Optional override tier. If omitted, fetches from session-profile endpoint. */
  currentTier?: string;
}

export default function SubscriptionBanner({ currentTier: propTier }: SubscriptionBannerProps) {
  const { profile, loading } = useSessionProfile();
  const effectiveTier = propTier ?? profile?.tier ?? "free";

  if (loading) return null;
  if (effectiveTier === 'PRO' || effectiveTier === 'PREMIUM_LENS') return null;

  return (
    <div style={{
      backgroundColor: '#0f172a', border: '1px solid #1e293b',
      padding: '12px 20px', borderRadius: '8px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8',
      margin: '16px 0'
    }}>
      <span>🔒 SYSTEM PROFILE RESTRICTED: You are accessing StockEX over limited free tickers. Complete UPI AutoPay registration to clear caps.</span>
      <button
        onClick={() => window.location.href = '/pricing'}
        style={{
          backgroundColor: '#4f46e5', color: '#ffffff', fontWeight: 'bold',
          border: 'none', padding: '8px 16px', borderRadius: '6px',
          cursor: 'pointer', fontSize: '10px', transition: 'all 0.2s'
        }}
      >
        UPGRADE MEMBERSHIPS
      </button>
    </div>
  );
}
