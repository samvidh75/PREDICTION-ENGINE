import { useCallback, useEffect, useMemo, useState } from "react";
import type { PremiumEntitlement, PremiumTier } from "./premiumEntitlementStore";
import { clearPremiumTier, readPremiumEntitlement, writePremiumTier } from "./premiumEntitlementStore";

export function usePremiumEntitlement(): PremiumEntitlement & {
  setTier: (tier: PremiumTier) => void;
  clear: () => void;
} {
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(() => readPremiumEntitlement());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "premium_tier_v1") return;
      setEntitlement(readPremiumEntitlement());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTier = useCallback((tier: PremiumTier) => {
    writePremiumTier(tier);
    setEntitlement(readPremiumEntitlement());
  }, []);

  const clear = useCallback(() => {
    clearPremiumTier();
    setEntitlement(readPremiumEntitlement());
  }, []);

  return useMemo(() => ({ ...entitlement, setTier, clear }), [entitlement, setTier, clear]);
}
