import { useState, useEffect } from "react";
import { getDeviceTier, isTouchLike, type DeviceTier } from "./device";

export interface ResponsiveDevice {
  width: number;
  height: number;
  tier: DeviceTier;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isTouch: boolean;
}

export function useResponsiveDevice(): ResponsiveDevice {
  const [state, setState] = useState<ResponsiveDevice>(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;
    const tier = getDeviceTier(w);
    return {
      width: w,
      height: h,
      tier,
      isMobile: tier === "mobile" || tier === "largeMobile",
      isTablet: tier === "tablet",
      isLaptop: tier === "laptop",
      isDesktop: tier === "desktop" || tier === "wide",
      isTouch: false, // will update on client
    };
  });

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const tier = getDeviceTier(w);
      setState({
        width: w,
        height: h,
        tier,
        isMobile: tier === "mobile" || tier === "largeMobile",
        isTablet: tier === "tablet",
        isLaptop: tier === "laptop",
        isDesktop: tier === "desktop" || tier === "wide",
        isTouch: isTouchLike(),
      });
    }

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return state;
}
