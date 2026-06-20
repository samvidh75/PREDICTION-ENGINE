import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
  glass?: boolean;
  compact?: boolean;
}

export const Table: React.FC<TableProps> = ({ headers, children, glass = false, compact = false, className = "", ...props }) => {
  const containerStyles = glass
    ? "w-full overflow-x-auto rounded-xl glass-panel"
    : "w-full overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.16)] bg-[var(--color-surface)] shadow-[0_18px_48px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)]";
  const cellPadding = compact ? "px-3 py-2.5" : "px-6 py-4";
  return (
    <div className={containerStyles}>
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)]">
            {headers.map((h, i) => (
              <th key={i} scope="col" className={`${cellPadding} text-[11px] font-bold uppercase tracking-wider text-[#8B949E]`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(148,163,184,0.06)] text-[var(--color-text-primary)]">{children}</tbody>
      </table>
    </div>
  );
};

export default Table;
