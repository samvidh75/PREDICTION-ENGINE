/**
 * Unified design token classes for StockStory India.
 * Eliminates ad-hoc styling and ensures layout/typography consistency.
 */
export const tokens = {
  // Page Shell Layouts
  layout: {
    container: "mx-auto w-full max-w-6xl px-4 py-8 md:py-12 font-sans antialiased text-slate-900",
    authContainer: "mx-auto w-full max-w-md px-6 py-12 md:py-24 font-sans antialiased text-slate-900",
    grid: "grid gap-6",
    sidebarGrid: "grid gap-6 lg:grid-cols-[1fr_340px]",
    sectionSpacing: "space-y-6",
    innerSpacing: "space-y-4",
  },

  // Typography Scale
  typography: {
    pageTitle: "text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl leading-tight",
    pageSubtitle: "mt-1.5 max-w-3xl text-sm leading-6 text-slate-500",
    sectionTitle: "text-sm font-semibold text-slate-950 leading-snug",
    sectionSubtitle: "mt-0.5 text-xs leading-relaxed text-slate-500",
    bodyMuted: "text-xs leading-relaxed text-slate-500",
    tickerBold: "font-mono text-sm font-semibold text-slate-950",
    metaMuted: "text-[10px] font-semibold uppercase tracking-wider text-slate-500",
  },

  // Focus Ring Consistency
  focus: {
    ring: "focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700",
  },
};

export default tokens;
