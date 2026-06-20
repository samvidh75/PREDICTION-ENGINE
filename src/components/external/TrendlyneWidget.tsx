import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import type { TrendlyneWidgetProps } from "./TrendlyneWidget.types";
import {
  TRENDLYNE_SCRIPT_SRC,
  getWidgetUrl,
} from "./TrendlyneWidget.types";

const SCRIPT_LOADED_KEY = "__trendlyneWidgetLoaded";

function isScriptAlreadyLoaded(): boolean {
  return !!(window as any)[SCRIPT_LOADED_KEY];
}

function loadTrendlyneScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isScriptAlreadyLoaded()) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TRENDLYNE_SCRIPT_SRC}"]`
    );
    if (existing) {
      (window as any)[SCRIPT_LOADED_KEY] = true;
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Trendlyne script load failed")));
      if ((existing as any).readyState === "complete" || (existing as any).readyState === "loaded") {
        resolve();
      }
      return;
    }
    const script = document.createElement("script");
    script.src = TRENDLYNE_SCRIPT_SRC;
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => {
      (window as any)[SCRIPT_LOADED_KEY] = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Trendlyne script load failed"));
    document.body.appendChild(script);
  });
}

export function TrendlyneWidget({
  kind,
  symbol,
  className = "",
  title,
  description,
  fallback,
  lazy = true,
}: TrendlyneWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockquoteRef = useRef<HTMLQuoteElement>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [visible, setVisible] = useState(!lazy);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const url = getWidgetUrl(kind, symbol);
  const needsSymbol = kind === "technicals" || kind === "checklist";
  const showFallback = needsSymbol && !symbol;

  useEffect(() => {
    if (!lazy || !containerRef.current) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!visible || showFallback) return;
    setLoadState("loading");
    loadTrendlyneScript()
      .then(() => {
        setLoadState("loaded");
        if (blockquoteRef.current) {
          blockquoteRef.current.setAttribute("data-get-url", url);
          blockquoteRef.current.className = "trendlyne-widgets";
          const widgets = (window as any).TrendlyneWidgets;
          if (typeof widgets?.init === "function") {
            widgets.init();
          }
        }
      })
      .catch(() => {
        setLoadState("error");
      });
  }, [visible, url, showFallback, kind]);

  const fallbackContent = fallback ?? (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-[#F59E0B]" />
      <p className="text-sm text-[var(--color-text-secondary)]">
        External research panel unavailable.
      </p>
      <a
        href="https://trendlyne.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2962FF] hover:underline"
      >
        Open on Trendlyne <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );

  const loadingContent = (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
      <span className="text-xs text-[var(--color-text-muted)]">Loading external panel...</span>
    </div>
  );

  const defaultTitle =
    kind === "technicals"
      ? "External technical snapshot"
      : kind === "checklist"
        ? "External checklist view"
        : "IPO activity";

  const defaultDescription =
    kind === "technicals"
      ? "Supplementary technical indicators provided by Trendlyne."
      : kind === "checklist"
        ? "Supplementary stock checklist from Trendlyne."
        : "Track current and upcoming IPO activity.";

  if (showFallback) {
    return (
      <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}>
        {title !== null && (
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {title ?? defaultTitle}
            </h3>
          </div>
        )}
        <div className="p-4">{fallbackContent}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${className}`}
    >
      {title !== null && (
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {title ?? defaultTitle}
          </h3>
          {(description ?? defaultDescription) && (
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {description ?? defaultDescription}
            </p>
          )}
        </div>
      )}
      <div className="p-4">
        {!visible ? (
          <div className="h-24" />
        ) : loadState === "loading" ? (
          loadingContent
        ) : loadState === "error" ? (
          fallbackContent
        ) : (
          <blockquote
            ref={blockquoteRef}
            className="trendlyne-widgets"
            data-get-url={url}
            data-theme="light"
          />
        )}
      </div>
    </div>
  );
}
