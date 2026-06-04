// src/components/charts/VOSChart.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChartDataCoordinator, ChartTimeframe, ChartPoint } from "../../services/charting/ChartDataCoordinator";
import { ChartEngine, ChartViewport } from "../../services/charting/ChartEngine";
import { ChartThemeMapper } from "../../services/charting/ChartThemeMapper";

interface VOSChartProps {
  ticker: string;
  basePrice?: number;
  mood?: "bullish" | "bearish" | "stable";
}

export const VOSChart: React.FC<VOSChartProps> = ({
  ticker,
  basePrice = 1450,
  mood = "stable",
}) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1M");
  const [viewport, setViewport] = useState<ChartViewport>(() => ChartEngine.getDefaultViewport());
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startDragX = useRef(0);

  // Generate historical data points
  const points = useMemo(() => {
    return ChartDataCoordinator.generatePoints(timeframe, basePrice);
  }, [timeframe, basePrice]);

  // Analyze trend, support, and resistance
  const trendAnalysis = useMemo(() => {
    return ChartEngine.analyzeTrend(points);
  }, [points]);

  const theme = useMemo(() => {
    return ChartThemeMapper.mapTheme(mood);
  }, [mood]);

  // Render static line path, grid, and gradient under the line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    // Scale for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Apply strict Level 1 Background color
    ctx.fillStyle = "#020304";
    ctx.fillRect(0, 0, w, h);

    if (points.length === 0) return;

    const prices = points.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceDiff = maxPrice - minPrice || 1;

    // Grid System
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Mapping function from point indices to coordinates
    const toCoords = (idx: number, price: number) => {
      // Incorporate zoom and pan offsets
      const totalPoints = points.length;
      const spacing = w / (totalPoints - 1 || 1);
      const rawX = idx * spacing * viewport.zoomFactor + viewport.panOffset;
      
      const priceT = (price - minPrice) / priceDiff;
      const pad = 24;
      const rawY = pad + (1 - priceT) * (h - pad * 2);

      return { x: rawX, y: rawY };
    };

    // Draw historical line path
    ctx.strokeStyle = theme.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const { x, y } = toCoords(i, points[i].price);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill under line with premium HSL gradients
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.gradientStart);
    grad.addColorStop(1, theme.gradientStop);
    ctx.fillStyle = grad;

    ctx.lineTo(toCoords(points.length - 1, minPrice).x, h);
    ctx.lineTo(toCoords(0, minPrice).x, h);
    ctx.closePath();
    ctx.fill();
  }, [points, viewport, theme]);

  // Render crosshairs dynamically on a transparent overlay canvas to prevent full curve redraws
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (crosshairPos) {
      ctx.strokeStyle = theme.crosshairColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Vertical cross
      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, h);
      ctx.stroke();

      // Horizontal cross
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(w, crosshairPos.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [crosshairPos, theme]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging.current) {
      const deltaX = x - startDragX.current;
      setViewport((prev) => ({
        ...prev,
        panOffset: prev.panOffset + deltaX,
      }));
      startDragX.current = x;
      return;
    }

    setCrosshairPos({ x, y });

    // Map X coordinate to nearest point index
    const totalPoints = points.length;
    const spacing = rect.width / (totalPoints - 1 || 1);
    
    // Reverse scale/offset formula to map to correct index
    const idx = Math.round((x - viewport.panOffset) / (spacing * viewport.zoomFactor));
    if (idx >= 0 && idx < points.length) {
      setHoveredPoint(points[idx]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      startDragX.current = e.clientX - rect.left;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomMultiplier = e.deltaY < 0 ? 1.05 : 0.95;
    setViewport((prev) => ({
      ...prev,
      zoomFactor: Math.max(0.5, Math.min(4.0, prev.zoomFactor * zoomMultiplier)),
    }));
  };

  const timeframes: ChartTimeframe[] = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"];

  return (
    <div ref={containerRef} className="w-full flex flex-col space-y-4">
      {/* Chart Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-vos-interface">
        <div>
          <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
            Performance Trend // Trend: {trendAnalysis.trend}
          </span>
          <div className="flex items-center gap-3">
            <h4 className="vos-sec-title font-bold text-white font-vos-display">{ticker}</h4>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase font-vos-display border ${
              trendAnalysis.trend === "Uptrend" || trendAnalysis.trend === "Recovery"
                ? "bg-[#00d17a]/10 text-[#00d17a] border-[#00d17a]/20"
                : "bg-[#ff5b6e]/10 text-[#ff5b6e] border-[#ff5b6e]/20"
            }`}>
              {trendAnalysis.trend}
            </span>
          </div>
        </div>

        {/* Live Hover Tracker */}
        {hoveredPoint && (
          <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-[12px] text-xs font-vos-interface flex items-center gap-4">
            <div>
              <span className="text-gray-500 uppercase tracking-wider text-[9px] block">Price</span>
              <span className="text-white font-bold font-vos-display">₹{hoveredPoint.price.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-gray-500 uppercase tracking-wider text-[9px] block">Timeline</span>
              <span className="text-white font-bold">{hoveredPoint.time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actual Chart Canvas Wrapper */}
      <div className="relative w-full overflow-hidden rounded-[18px] border border-white/5">
        <canvas
          ref={canvasRef}
          className="w-full h-[280px] md:h-[420px] block"
        />
        <canvas
          ref={overlayCanvasRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setCrosshairPos(null);
            setHoveredPoint(null);
          }}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none block"
        />
      </div>

      {/* Dynamic Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 font-vos-interface pt-1">
        <div className="flex flex-wrap gap-1.5 bg-white/5 p-1 rounded-full border border-white/5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setViewport(ChartEngine.getDefaultViewport());
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                timeframe === tf
                  ? "bg-white text-[#020304] shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Support & Resistance Info */}
        <div className="text-[11px] text-gray-500 flex items-center gap-4 font-vos-interface">
          <div>
            <span>Support: </span>
            <span className="text-emerald-400 font-bold font-vos-display">₹{trendAnalysis.support.toFixed(1)}</span>
          </div>
          <div>
            <span>Resistance: </span>
            <span className="text-amber-400 font-bold font-vos-display">₹{trendAnalysis.resistance.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default VOSChart;
