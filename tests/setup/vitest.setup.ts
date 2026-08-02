// Global jsdom polyfills for browser APIs that jsdom doesn't implement.
// jsdom has no ResizeObserver, so any component using a resize-aware chart
// library (ApexCharts, etc.) throws "ResizeObserver is not defined" the
// moment it mounts in a test.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
