import { useMediaQuery } from "../hooks/useMediaQuery";

// DESIGN TOKEN BREAKPOINT
const TABLET = "(min-width: 768px)";

export function useResponsiveValue<T, U>(mobile: T, desktop: U): T | U {
  const isDesktop = useMediaQuery(TABLET);
  return isDesktop ? desktop : mobile;
}
