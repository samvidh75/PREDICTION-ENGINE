import React, { useMemo } from "react";

type Props = {
  selected: string[];
  options: string[];
  maxSelected?: number; // default 2
  onChange: (next: string[]) => void;

  onSkip?: () => void;
  compact?: boolean;
};

function clampSelected(next: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of next) {
    const v = x.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

export default function OnboardingSectorPreferencePicker({
  selected,
  options,
  maxSelected = 2,
  onChange,
  onSkip,
  compact = false,
}: Props): JSX.Element {
  const safeSelected = useMemo(() => clampSelected(selected, maxSelected), [selected, maxSelected]);
  const selectedSet = useMemo(() => new Set(safeSelected.map((x) => x.toLowerCase())), [safeSelected]);

  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Sectors to explore first</div>
          <div className="mt-2 text-[16px] font-semibold text-white/92 leading-[1.3]">
            Optional — pick up to {maxSelected}
          </div>
          <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
            This helps us order your first calm discovery steps. You can change it anytime.
          </div>
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={() => onChange([])}
            className={[
              "h-[40px] px-[14px] rounded-full border border-white/10 bg-black/30 text-white/70 transition ss-focus-outline",
              "hover:text-white/95 hover:border-white/16",
              compact ? "hidden" : "",
            ].join(" ")}
          >
            Skip
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedSet.has(opt.toLowerCase());
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onChange(safeSelected.filter((x) => x.toLowerCase() !== opt.toLowerCase()));
                  return;
                }

                if (safeSelected.length >= maxSelected) return;
                onChange(clampSelected([...safeSelected, opt], maxSelected));
              }}
              aria-pressed={isSelected}
              className={[
                "h-[44px] px-[16px] rounded-full border bg-black/30 text-[11px] uppercase tracking-[0.18em] transition ss-focus-outline",
                isSelected ? "border-white/16 text-white/92" : "border-white/10 text-white/70 hover:border-white/16 hover:text-white/92",
                safeSelected.length >= maxSelected && !isSelected ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
        Selected: {safeSelected.length}/{maxSelected}
      </div>
    </div>
  );
}
