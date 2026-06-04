import React, { useEffect, useMemo, useRef, useState } from "react";

function shallowDepsEqual(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

export type RenderIsolationBoundaryProps = {
  /**
   * Children to render. They will only be replaced when deps change.
   */
  children: React.ReactNode;

  /**
   * Array of values that define when this boundary should update.
   * If deps are shallow-equal, the previous children reference is preserved.
   */
  deps: readonly unknown[];

  /**
   * Optional debug label: adds `data-ss-render-isolation`.
   */
  debugLabel?: string;
};

export default function RenderIsolationBoundary({
  children,
  deps,
  debugLabel,
}: RenderIsolationBoundaryProps): JSX.Element {
  const prevDepsRef = useRef<readonly unknown[] | undefined>(undefined);

  const [rendered, setRendered] = useState<React.ReactNode>(() => children);

  const depsSnapshot = useMemo(() => deps, deps);

  useEffect(() => {
    const prev = prevDepsRef.current;
    const next = depsSnapshot;

    if (shallowDepsEqual(prev, next)) return;

    prevDepsRef.current = next;
    setRendered(children);
  }, [children, depsSnapshot]);

  // If deps don't change, rendered stays referentially stable.
  return (
    <div data-ss-render-isolation={debugLabel ?? undefined}>
      {rendered}
    </div>
  );
}
