// src/components/dashboard/DashboardSkeleton.tsx
import React from "react";

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col space-y-8 select-none p-6 md:p-8 bg-[#0f0f0f] text-white min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div className="space-y-2 w-1/3">
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-8 bg-white/20 rounded w-full" />
        </div>
        <div className="h-8 bg-white/10 rounded-full w-24" />
      </div>

      {/* Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white/5 border border-white/5 rounded-[18px] p-6 space-y-3">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-6 bg-white/20 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Large Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[400px] bg-white/5 border border-white/5 rounded-[18px] p-6 space-y-4">
          <div className="h-6 bg-white/20 rounded w-1/4" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-48 bg-white/5 rounded w-full" />
        </div>
        <div className="col-span-1 h-[400px] bg-white/5 border border-white/5 rounded-[18px]" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
