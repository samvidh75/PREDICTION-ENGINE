type MiniSparklineProps = {
  values: number[];
  width: number;
  height: number;
  color: string;
};

const indices = [
  { name: "NIFTY 50", value: "25,342.30", change: 0.42, history: [40, 42, 41, 44, 45, 47, 46, 49] },
  { name: "SENSEX", value: "83,105.12", change: 0.36, history: [35, 36, 38, 37, 39, 42, 41, 43] },
  { name: "BANK NIFTY", value: "56,824.75", change: -0.18, history: [48, 47, 49, 45, 44, 43, 42, 41] },
  { name: "NIFTY IT", value: "38,902.60", change: 0.64, history: [30, 32, 34, 33, 35, 37, 39, 40] },
];

export function MiniSparkline({ values, width, height, color }: MiniSparklineProps) {
  const safeValues = values.length > 1 ? values : [1, 1];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const span = max - min || 1;
  const points = safeValues
    .map((value, index) => {
      const x = (index / (safeValues.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polygon points={area} fill={color} opacity="0.08" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const totalMin = h * 60 + m;
  return day >= 1 && day <= 5 && totalMin >= 555 && totalMin <= 930;
}

export default function MarketTicker() {
  const open = isMarketOpen();
  return (
    <div className="no-scrollbar flex h-[48px] overflow-x-auto border-b border-[#e8e8e8] bg-white">
      {indices.map((idx, index) => (
        <div
          key={idx.name}
          className={`flex min-w-[170px] flex-shrink-0 items-center gap-3 px-5 md:flex-1 ${
            index < indices.length - 1 ? "border-r border-[#e8e8e8]" : ""
          }`}
        >
          <div>
            <div className="mb-0.5 text-[10px] font-[600] leading-none tracking-[0.04em] text-[#888]">{idx.name}</div>
            <div className="tabular text-[14px] font-[700] leading-none text-[#0a0a0a]">{idx.value ?? "—"}</div>
          </div>
          <span className={`flex-shrink-0 text-[12px] font-[600] ${idx.change >= 0 ? "text-[#1a7f4b]" : "text-[#c0392b]"}`}>
            {idx.change >= 0 ? "+" : ""}
            {(idx.change ?? 0).toFixed(2)}%
          </span>
          <MiniSparkline values={idx.history.length ? idx.history : [1, 1]} width={60} height={24} color={idx.change >= 0 ? "#1a7f4b" : "#c0392b"} />
        </div>
      ))}
      <div className="hidden flex-shrink-0 items-center gap-2.5 border-l border-[#e8e8e8] px-5 sm:flex">
        <div className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${open ? "bg-[#22c55e]" : "bg-[#ccc]"}`} />
        <div>
          <div className={`mb-0.5 text-[12px] font-[600] leading-none ${open ? "text-[#1a7f4b]" : "text-[#888]"}`}>
            {open ? "Market is Open" : "Market Closed"}
          </div>
          <div className="text-[11px] text-[#888]">Closes 3:30 PM</div>
        </div>
      </div>
    </div>
  );
}
