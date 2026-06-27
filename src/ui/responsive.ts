import { useMediaQuery } from "../hooks/useMediaQuery";

export function useResponsiveValue<T, U>(mobile: T, desktop: U): T | U {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? desktop : mobile;
}
