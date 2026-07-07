// useScrollReveal.ts
// Global IntersectionObserver driver for .raycast-reveal elements.
// Adds .is-visible when an element enters the viewport (once).
// Anchored to the same cubic-bezier(0.34, 1.56, 0.64, 1) easing as the CSS.

import { useEffect, useRef } from "react";

const REVEAL_SELECTOR = ".raycast-reveal";
const OPSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: "0px 0px -40px 0px", // Trigger slightly after element enters viewport
  threshold: 0.1,
};

export function useScrollReveal(scopeRef?: React.RefObject<HTMLElement | null>) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Disconnect previous observer if re-running
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          // Once revealed, stop observing that element
          observerRef.current?.unobserve(entry.target);
        }
      }
    }, OPSERVER_OPTI);

    const root = scopeRef?.current ?? document.documentElement;
    const elements = root.querySelectorAll(REVEAL_SELECTOR);

    // Observe existing elements
    elements.forEach((el) => observerRef.current!.observe(el));

    // Also watch for dynamically added elements via MutationObserver
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check the node itself
            if (node.matches?.(REVEAL_SELECTOR)) {
              observerRef.current?.observe(node);
            }
            // Check descendants
            node.querySelectorAll?.(REVEAL_SELECTOR).forEach((el) => {
              observerRef.current?.observe(el);
            });
          }
        }
      }
    });

    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
    };
  }, [scopeRef]);
}
