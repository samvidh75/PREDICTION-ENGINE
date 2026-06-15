import React from "react";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/20">
      <table className={`w-full text-left text-xs border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/60">
            {headers.map((h, i) => (
              <th key={i} className="p-4 uppercase tracking-wider font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 bg-transparent text-slate-300">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
