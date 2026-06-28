# Phase 20 — Accessibility & Responsive QA

## Current State

### Accessibility Features Found

| Component | Attribute | Value |
|-----------|-----------|-------|
| ResearchProfileModal (wrapper) | `aria-label` | "Research profile settings" |
| ResearchProfileModal (close btn) | `aria-label` | "Close settings" |
| WatchlistPage (watchlist items) | `role` | "link" |
| HomePage (search input) | `aria-label` | "Search stocks" |

### Missing Accessibility Features

- **No `sr-only` class usage** — Screen reader only text not found
- **No focus management** — Modal focus trapping not verified
- **No keyboard navigation** — `tabIndex`, `onKeyDown` not consistently used
- **No color contrast verification** — Not tested against WCAG AA standards
- **No reduced-motion support** — `prefers-reduced-motion` media query not found
- **No form error announcements** — `aria-live` / `aria-describedby` on form validation

### Responsive Design

- Vite config doesn't specify responsive breakpoints
- Pages use standard CSS/React patterns

## Assessment

The app has minimal accessibility infrastructure. This is acceptable for a B2C stock research MVP launch but should be addressed for broader accessibility compliance.

## Recommendations

1. **Add `sr-only` utility class** for screen-reader-only content (already may exist in design system)
2. **Add `aria-live="polite"`** to dynamic content regions (search results, watchlist updates)
3. **Implement focus trapping** in modals (ResearchProfileModal)
4. **Add keyboard event handlers** to interactive elements (Enter/Space on custom buttons)
5. **Test with a screen reader** (VoiceOver on macOS) for critical flows
