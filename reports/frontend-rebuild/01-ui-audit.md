# Frontend UI Audit & Refresh Roadmap

This document summarizes the audit of the current frontend interface and outlines the path to replacing the neon/cyberpunk elements with a finance-grade professional UI for **StockStory India**.

## 1. Gimmicky / Outdated Elements Identified
- **Cyberpunk / Sci-Fi Theme**: The application currently uses a stage-neon theme, with classes like `ss-tv-app`, `ss-tv-stage`, and neon border glow effects (`#00FFE0`, `#00C8FF`).
- **Decorative Fake Terminal Visuals**: Found on the landing page (a simulated stock terminal chart with live methods and glowing paths) which feels game-like rather than research-first.
- **Excessive Ambient & Motion Controls**: Components like `LivingInterfaceEngine`, `PredictiveHologram`, `MasterMotionEngine`, `SpatialEnvironmentProvider`, and `CinematicTransitionLayer` add complexity and visual noise without adding real equity research value.
- **Incomplete / Decorative Navigation Actions**: The "Intel" button and unauthenticated search inputs on public pages lead to broken or decorative states.
- **Stale Session Autoredirects**: Unauthenticated users visiting login/signup are auto-redirected by background session restoration rather than letting the user explicitly authenticate.

## 2. Target Clean UI Design System
We will introduce a clean, professional design system inside `src/components/ui/` with high contrast, minimal dark/light neutrals, clear typography (system sans-serif / Inter), and no unnecessary neon glow.

- **Backgrounds**: Slate/zinc dark shades (`bg-slate-900`, `bg-zinc-950`) or white/slate light-neutrals.
- **Typography**: Clear, responsive system-sans font stack.
- **Layout**: Clear table-first layouts for data, card-first layouts for summaries, and standard left sidebar / top nav app shell.

## 3. Preservation Guidelines
- All scoring logic in backend (`FactorEngine`, `FeatureEngine`, etc.) remains 100% untouched.
- API response models and contracts remain untouched.
- Firebase Authentication backend integration remains fully functional.
- Static scanning, repository hygiene, and other validation suites must pass.
