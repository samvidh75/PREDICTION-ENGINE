# Chart Runtime Report

This report validates the visual charting component (`VOSChart`) in the browser.

## Feature Verification

1. **Zoom**: Supported. Click and drag or mousewheel zoom operates responsively without canvas tearing.
2. **Pan**: Supported. Drag to pan back in time is highly responsive.
3. **Crosshair**: Displays real-time hover metadata details (Date, Close Price, Volume, and Moving Average lines).
4. **Timeframe Changes**: Toggling between 1D, 1W, 1M, and 1Y refreshes the historical database cache queries dynamically.
5. **Live Updates**: Price feeds write to the active warehouse table, updating the chart candles.
