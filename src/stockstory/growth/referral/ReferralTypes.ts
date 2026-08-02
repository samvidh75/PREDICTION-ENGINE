export interface ReferralCode {
  code: string;
  userId?: string;
  createdAt: string;
  usedCount: number;
  maxUses: number;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  rewardEarned: string;
}

export interface InviteContext {
  code?: string;
  source?: string;
}
