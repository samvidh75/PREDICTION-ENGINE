import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({ lines = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="skeleton h-5 w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${Math.max(40, 80 - i * 15)}%` }} />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-[#0D1117]/70 backdrop-blur-sm border border-white/40 p-5 space-y-3">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-6 w-1/2" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}
