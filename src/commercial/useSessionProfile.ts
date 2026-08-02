/**
 * commercial/useSessionProfile — React hook for user session + tier info.
 *
 * Fetches /api/v1/user/session-profile (backend route) to get the
 * authenticated user's uid, tier, plan, and subscription status.
 *
 * Handles the full fetch lifecycle: loading, error, and the eventual
 * session profile payload. Re-fetches when auth state changes by
 * observing the "ss:auth-session-changed" custom event.
 *
 * Usage:
 *   const { profile, loading, error } = useSessionProfile();
 *   if (loading) return <Spinner />;
 *   if (profile) {
 *     console.log(profile.tier); // "free" | "plus" | "pro" | "premium_lens"
 *   }
 */

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionProfile {
  authenticated: boolean;
  uid: string;
  tier: string;
  planId: string | null;
  status: string | null;
  expiresAt: string | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSessionProfile() {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/user/session-profile");
      if (!res.ok) {
        throw new Error(`Failed to fetch session profile: ${res.status}`);
      }
      const data: SessionProfile = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Re-fetch when auth session changes (sign-in / sign-out)
    const handler = () => fetchProfile();
    window.addEventListener("ss:auth-session-changed", handler);
    return () => window.removeEventListener("ss:auth-session-changed", handler);
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

export default useSessionProfile;
