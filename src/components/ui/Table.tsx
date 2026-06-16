import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <table className={`w-full text-left text-xs border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60">
            {headers.map((h, i) => (
              <th
                key={i}
                className="p-4 text-[10px] font-medium uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
