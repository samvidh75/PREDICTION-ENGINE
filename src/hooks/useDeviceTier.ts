import { useMemo } from "react";
import { useMediaQuery } from "./useMediaQuery";
import { useMotionController } from "../components/motion/MotionController";

export type DeviceTier = "mobile" | "tablet" | "desktop";

export function useDeviceTier(): DeviceTier {
  const { isMobile } = useMotionController();

  // MotionController's isMobile matches max-width: 639px already.
  // For tablet we use 640..1023.
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");

  return useMemo(() => {
    if (isMobile) return "mobile";
    if (isTablet) return "tablet";
    return "desktop";
  }, [isMobile, isTablet]);
}

export function useDeviceTierFlags(): {
  tier: DeviceTier;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const tier = useDeviceTier();
  return useMemo(
    () => ({
      tier,
      isMobile: tier === "mobile",
      isTablet: tier === "tablet",
      isDesktop: tier === "desktop",
    }),
    [tier],
  );
}
