export const tokens = {
  layout: {
    container: "mx-auto w-full max-w-6xl px-4 py-6 font-sans antialiased text-slate-900 sm:px-6 md:py-10",
    authContainer: "mx-auto w-full max-w-md px-5 py-10 md:py-20 font-sans antialiased text-slate-900",
    grid: "grid gap-5",
    sidebarGrid: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]",
    sectionSpacing: "space-y-6",
    innerSpacing: "space-y-4",
  },
  typography: {
    pageTitle: "text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem] leading-tight",
    pageSubtitle: "mt-1.5 max-w-2xl text-sm leading-6 text-slate-500",
    sectionTitle: "text-sm font-semibold text-slate-900 leading-snug",
    sectionSubtitle: "mt-0.5 text-xs leading-5 text-slate-500",
    bodyMuted: "text-sm leading-relaxed text-slate-500",
    tickerBold: "font-mono text-sm font-semibold text-slate-900",
    metaMuted: "text-[10px] font-medium uppercase tracking-wider text-slate-400",
    cardTitle: "text-sm font-semibold text-slate-900",
    cardValue: "text-xl font-semibold text-slate-900 tracking-tight",
    statLabel: "text-[11px] font-medium uppercase tracking-wider text-slate-400",
  },
  focus: {
    ring: "focus:outline-none focus:ring-2 focus:ring-accent-primary/15 focus:border-accent-primary",
  },
};

export default tokens;
