import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;flex-direction:column;gap:12px">
    <div style="font-size:24px;font-weight:700">StockEx</div>
    <div style="color:#a0a0a0">Application failed to initialize</div>
  </div>`;
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  } catch (e) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;flex-direction:column;gap:12px">
      <div style="font-size:24px;font-weight:700">StockEx</div>
      <div style="color:#a0a0a0">${e instanceof Error ? e.message : 'Application failed to initialize'}</div>
    </div>`;
  }
}

// Performance monitoring
if (typeof window !== "undefined" && "performance" in window) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (perf) {
        console.log(`[Perf] DOM Interactive: ${Math.round(perf.domInteractive)}ms, Load: ${Math.round(perf.loadEventEnd)}ms`);
      }
    }, 0);
  });
}
