export type UserPlan = 'free' | 'investor' | 'pro' | 'professional';

const PLAN_LEVELS: Record<UserPlan, number> = {
  free: 0,
  investor: 1,
  pro: 2,
  professional: 3,
};

export function getCurrentPlan(): UserPlan {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ss_plan') : null;
    if (stored && isUserPlan(stored)) return stored;
  } catch { /* noop */ }
  return 'free';
}

function isUserPlan(v: string): v is UserPlan {
  return ['free', 'investor', 'pro', 'professional'].includes(v);
}

export function planLevel(plan: UserPlan): number {
  return PLAN_LEVELS[plan] ?? 0;
}

export function canViewHealthometerDetail(plan: UserPlan): boolean {
  return planLevel(plan) >= planLevel('investor');
}

export function canViewPremiumScans(plan: UserPlan): boolean {
  return planLevel(plan) >= planLevel('investor');
}

export function canViewAdvancedCompare(plan: UserPlan): boolean {
  return planLevel(plan) >= planLevel('pro');
}

export const UPGRADE_URL = '/?page=pricing';
