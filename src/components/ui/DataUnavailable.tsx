import React from "react";

interface DataUnavailableProps {
  tooltip?: string;
}

export function DataUnavailable({ tooltip }: DataUnavailableProps) {
  return (
    <span
      className="text-[#94A3B8] select-none"
      title={tooltip}
      aria-label={tooltip ?? "Data unavailable"}
    >
      —
    </span>
  );
}

export default DataUnavailable;
