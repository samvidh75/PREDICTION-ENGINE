import React from 'react';

const CalibrationPlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-500/40 bg-slate-950/80 p-8 text-center text-slate-400">
    <div className="mb-3 text-sm uppercase tracking-[0.25em] text-amber-500 font-bold">
      Live market data is currently refreshing
    </div>
    <div className="max-w-sm text-sm leading-6 mb-2">
      Displaying last verified intelligence snapshot.
    </div>
    <div className="text-[10px] text-slate-600">
      Snapshot Timestamp: {new Date().toISOString()}
    </div>
  </div>
);

export default CalibrationPlaceholder;
