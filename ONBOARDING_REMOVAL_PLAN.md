# Onboarding Removal Plan

This document identifies all current onboarding experiences, preference setup forms, and technical calibration flows, recommending their removal to reduce user friction.

## Onboarding & Setup Component Audit

| Onboarding Component / Flow | File / Location | Purpose | Status | Recommendation & Replacement |
| :--- | :--- | :--- | :--- | :--- |
| **Initialize Session / Auth Modal** | `src/components/auth/AuthModal.tsx` | Legacy modal overlay triggering sign-in/up configurations. | **REPLACE** | Replace with clean, standalone `/login` and `/signup` pages with zero configuration questions. |
| **Experience Calibration** | `src/hooks/useBeginnerIntelligenceCalibration.ts` | Tracks user experience levels and ticks "sessions seen". | **REMOVE** | Switch to a single toggle (e.g., "Beginner Mode: On/Off") located directly on the dashboard hub. |
| **Sector Selection** | `src/services/onboarding/onboardingProgressMemory.ts` | Asks users which sectors (IT, Energy, Banking, etc.) they want to watch. | **REMOVE** | Interests will be inferred dynamically based on global searches and watchlist additions. |
| **Investment Style Preferences** | `src/services/onboarding/onboardingFirstRunMemory.ts` | Questionnaire asking for investment horizon, style (Growth, Value), and risk tolerance. | **REMOVE** | Remove the setup flow entirely. Default to a "Balanced" baseline profile; allow manual changes in Settings. |
| **Holographic Calibration Screens** | `src/components/CalibrationPlaceholder.tsx` | Placeholder view simulating telemetry calibration checks. | **REMOVE** | Delete the placeholder component and remove any references. |
| **Watchlist Seeding (Market Setup)** | `src/services/onboarding/dashboardSeedingEngine.ts` | Preset lists based on style selections. | **REMOVE** | Default the watchlist to active Nifty 50 large-caps (Reliance, TCS, HDFC Bank) so the dashboard has immediate data. |
| **Factor Weights Customization** | `src/services/auth/userProfile.ts` | Allows users to manually adjust "lenses" or weights for value, growth, and quality factors. | **REMOVE** | Display standardized institutional factor weights. Advanced weighting can live in Settings, not onboarding. |
