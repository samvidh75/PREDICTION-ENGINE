/**
 * Unified design token classes for StockStory India.
 * Eliminates ad-hoc styling and ensures layout/typography consistency.
 */
export const tokens = {
  // Page Shell Layouts
  layout: {
    container: "mx-auto w-full max-w-6xl px-4 py-6 font-sans antialiased text-slate-900 sm:px-6 md:py-10",
    authContainer: "mx-auto w-full max-w-md px-5 py-10 md:py-20 font-sans antialiased text-slate-900",
    grid: "grid gap-5",
    sidebarGrid: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]",
    sectionSpacing: "space-y-5",
    innerSpacing: "space-y-4",
  },

  // Typography Scale
  typography: {
    pageTitle: "text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem] leading-tight",
    pageSubtitle: "mt-2 max-w-2xl text-sm leading-6 text-slate-500",
    sectionTitle: "text-sm font-semibold text-slate-950 leading-snug",
    sectionSubtitle: "mt-1 text-xs leading-5 text-slate-500",
    bodyMuted: "text-xs leading-relaxed text-slate-500",
    tickerBold: "font-mono text-sm font-semibold text-slate-950",
    metaMuted: "text-[10px] font-semibold uppercase tracking-wider text-slate-500",
  },

  // Focus Ring Consistency
  focus: {
    ring: "focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700",
  },
};

export default tokens;
