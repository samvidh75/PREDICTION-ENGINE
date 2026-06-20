import React from "react";
import { useResponsiveDevice } from "../../lib/product/useResponsiveDevice";
import type { DeviceTier } from "../../lib/product/device";

interface ResponsiveProps {
  children: React.ReactNode;
}

export const MobileOnly: React.FC<ResponsiveProps> = ({ children }) => {
  const { isMobile } = useResponsiveDevice();
  return isMobile ? <>{children}</> : null;
};

export const DesktopOnly: React.FC<ResponsiveProps> = ({ children }) => {
  const { isDesktop } = useResponsiveDevice();
  return isDesktop ? <>{children}</> : null;
};

export const TabletOnly: React.FC<ResponsiveProps> = ({ children }) => {
  const { isTablet } = useResponsiveDevice();
  return isTablet ? <>{children}</> : null;
};

interface AdaptiveContainerProps extends ResponsiveProps {
  mobileClassName?: string;
  tabletClassName?: string;
  laptopClassName?: string;
  desktopClassName?: string;
  className?: string;
}

export const AdaptiveContainer: React.FC<AdaptiveContainerProps> = ({
  children,
  mobileClassName = "px-4 py-4 space-y-4",
  tabletClassName = "px-6 py-6 space-y-6",
  laptopClassName = "px-6 py-6 space-y-6 max-w-[1120px]",
  desktopClassName = "px-8 py-8 space-y-8 max-w-[1280px]",
  className = "",
}) => {
  const { tier } = useResponsiveDevice();

  let tierClass = mobileClassName;
  if (tier === "tablet") tierClass = tabletClassName;
  else if (tier === "laptop") tierClass = laptopClassName;
  else if (tier === "desktop" || tier === "wide") tierClass = desktopClassName;

  return <div className={`${tierClass} ${className}`}>{children}</div>;
};
