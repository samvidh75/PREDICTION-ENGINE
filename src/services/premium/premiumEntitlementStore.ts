export type PremiumTier = "free" | "premium" | "institutional";

export type PremiumEntitlement = {
  tier: PremiumTier;
  hasPremium: boolean;
  hasInstitutional: boolean;
};

const STORAGE_KEY = "premium_tier_v1";

function getTierFromStorage(): PremiumTier {
  if (typeof window === "undefined") return "free";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return "free";

  if (raw === "premium" || raw === "institutional" || raw === "free") return raw;
  return "free";
}

export function readPremiumEntitlement(): PremiumEntitlement {
  const tier = getTierFromStorage();
  return {
    tier,
    hasPremium: tier === "premium" || tier === "institutional",
    hasInstitutional: tier === "institutional",
  };
}

export function writePremiumTier(tier: PremiumTier): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, tier);
}

export function clearPremiumTier(): void {
  writePremiumTier("free");
}
