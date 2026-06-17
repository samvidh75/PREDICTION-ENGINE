import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
  glass?: boolean;
}

export const Table: React.FC<TableProps> = ({ headers, children, glass = false, className = "", ...props }) => {
  const containerStyles = glass
    ? "w-full overflow-x-auto rounded-xl glass-panel"
    : "w-full overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm";
  return (
    <div className={containerStyles}>
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-white/20">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/50 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
};

export default Table;
