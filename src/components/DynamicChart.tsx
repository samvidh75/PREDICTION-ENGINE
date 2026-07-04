import React, { Suspense, lazy, CSSProperties } from "react";

// Lazy load recharts components to reduce bundle size
const AreaChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.AreaChart }))
);
const BarChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.BarChart }))
);
const LineChart = lazy(() =>
  import("recharts").then((m) => ({ default: m.LineChart }))
);
const Area = lazy(() =>
  import("recharts").then((m) => ({ default: m.Area }))
);
const Bar = lazy(() =>
  import("recharts").then((m) => ({ default: m.Bar }))
);
const Line = lazy(() =>
  import("recharts").then((m) => ({ default: m.Line }))
);
const CartesianGrid = lazy(() =>
  import("recharts").then((m) => ({ default: m.CartesianGrid }))
);
const XAxis = lazy(() =>
  import("recharts").then((m) => ({ default: m.XAxis }))
);
const YAxis = lazy(() =>
  import("recharts").then((m) => ({ default: m.YAxis }))
);
const Tooltip = lazy(() =>
  import("recharts").then((m) => ({ default: m.Tooltip }))
);
const ResponsiveContainer = lazy(() =>
  import("recharts").then((m) => ({ default: m.ResponsiveContainer }))
);
const Cell = lazy(() =>
  import("recharts").then((m) => ({ default: m.Cell }))
);

interface ChartLoadingProps {
  style?: CSSProperties;
}

function ChartLoading({ style }: ChartLoadingProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "300px",
        background: "rgba(255,255,255,0.01)",
        borderRadius: "8px",
        color: "#888",
        fontSize: "12px",
        ...style,
      }}
    >
      Loading chart...
    </div>
  );
}

export const LazyAreaChart = React.forwardRef((props: any, ref) => (
  <Suspense fallback={<ChartLoading style={props.style} />}>
    <AreaChart {...props} ref={ref} />
  </Suspense>
));
LazyAreaChart.displayName = "LazyAreaChart";

export const LazyBarChart = React.forwardRef((props: any, ref) => (
  <Suspense fallback={<ChartLoading style={props.style} />}>
    <BarChart {...props} ref={ref} />
  </Suspense>
));
LazyBarChart.displayName = "LazyBarChart";

export const LazyLineChart = React.forwardRef((props: any, ref) => (
  <Suspense fallback={<ChartLoading style={props.style} />}>
    <LineChart {...props} ref={ref} />
  </Suspense>
));
LazyLineChart.displayName = "LazyLineChart";

export {
  Area,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
};
