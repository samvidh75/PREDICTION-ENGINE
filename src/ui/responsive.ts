import { useMediaQuery } from "../hooks/useMediaQuery";
import { media } from "../design/tokens";

export function useResponsiveValue<T, U>(mobile: T, desktop: U): T | U {
  const isDesktop = useMediaQuery(media.desktop);
  return isDesktop ? desktop : mobile;
}
