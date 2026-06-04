# Mobile Runtime Audit

This document audits page renderings inside simulated browser mobile viewports (e.g. 390px width for iPhone layouts).

## Viewport Layout Audits

### 1. Dashboard
- **Layout Behavior**: Two-column widgets successfully collapse into single-column vertical stacks.
- **Navigation Controls**: Desktop menu bar folds into a sliding overlay menu panel.
- **Overlap Issues**: None. Text wraps cleanly.

### 2. Company Page
- **Layout Behavior**: Sidebar sections collapse below the interactive chart viewport.
- **Navigation Controls**: Tickers list scrolls horizontally with touch gestures.
- **Overlap Issues**: Font sizes for telemetry labels automatically scale down, preventing truncation.

### 3. Portfolio
- **Layout Behavior**: Factor matrix transforms into swipe-to-view tab segments.
- **Navigation Controls**: Input forms remain responsive.
- **Overlap Issues**: None.

### 4. Search
- **Layout Behavior**: Focus triggers native mobile keyboards without breaking screen dimensions.
- **Navigation Controls**: Tapping recommendations instantly routes to company pages.
- **Overlap Issues**: None.

### 5. Sector Explorer
- **Layout Behavior**: Heatmap grid scales down with flex wrap controls.
- **Navigation Controls**: Quick-filter tags are easily tapable.
- **Overlap Issues**: None.
