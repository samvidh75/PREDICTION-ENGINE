import { useEffect, useMemo, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const getMatches = () => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const initial = useMemo(() => getMatches(), []);
  const [matches, setMatches] = useState<boolean>(initial);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return;

    const mql = window.matchMedia(query);

    const onChange = () => {
      setMatches(mql.matches);
    };

    // Safari fallback
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
