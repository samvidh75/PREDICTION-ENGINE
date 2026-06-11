# Prompt 9 Calendar Sourcing Report

## Removed Static Samples

- Removed hard-coded `RELIANCE` earnings on `June 12`.
- Removed hard-coded `INFY` dividend on `June 18`.
- Removed hard-coded `HAL` results on `June 25`.
- Removed hard-coded `BEL` split on `July 02`.

## Implemented

- Replaced static `MarketCalendar` samples with `/api/intelligence/calendar`.
- Added backend sourcing from `corporate_timeline`.
- Added loading, sourced, empty, and error states.
- Calendar cards display source evidence and `asOf` where supplied.

## Regression Coverage

- `src/components/portfolio/MarketCalendar.test.tsx` verifies sourced events render with lineage and that old sample events do not render after API failure.
