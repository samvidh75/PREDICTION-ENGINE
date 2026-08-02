import type { ReferralCode, ReferralStats } from "./ReferralTypes";

export function generateReferralCode(userId?: string): ReferralCode {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    code: `SS${random}`,
    userId,
    createdAt: new Date().toISOString(),
    usedCount: 0,
    maxUses: 10,
  };
}

export function buildReferralUrl(code: string): string {
  return `/invite?ref=${code}`;
}

export async function getReferralStats(code: string): Promise<ReferralStats | null> {
  try {
    const resp = await fetch(`/api/referral/${code}/stats`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
