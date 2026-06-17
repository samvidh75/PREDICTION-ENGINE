import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
};

export default Table;
