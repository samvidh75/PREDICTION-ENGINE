import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: boolean;
  className?: string;
}

export default function Skeleton({ width, height, rounded, className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-[#F1F5F9] animate-pulse ${rounded ? "rounded-full" : "rounded-lg"} ${className}`}
      style={{ width: width ?? "100%", height: height ?? "20px" }}
    />
  );
}

export function StockCardSkeleton() {
  return (
    <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded />
        <div className="space-y-2 flex-1">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="80px" height="12px" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton width="70px" height="16px" />
          <Skeleton width="50px" height="12px" />
        </div>
      </div>
      <Skeleton width="100%" height="8px" />
      <div className="flex gap-2">
        <Skeleton width="60px" height="24px" rounded />
        <Skeleton width="80px" height="24px" rounded />
        <Skeleton width="50px" height="24px" rounded />
      </div>
    </div>
  );
}

export function StockDetailSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3">
            <Skeleton width="96px" height="96px" rounded />
            <Skeleton width="100px" height="20px" rounded />
            <Skeleton width="140px" height="12px" />
          </div>
          <div className="space-y-3">
            <Skeleton width="120px" height="14px" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width="80px" height="12px" />
                <Skeleton width="100%" height="6px" />
                <Skeleton width="30px" height="12px" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton width="120px" height="14px" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton width="16px" height="16px" rounded />
                <Skeleton width="120px" height="12px" />
                <Skeleton width="40px" height="12px" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Tab skeleton */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
        <div className="flex border-b border-[#E2E8F0] p-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} width="80px" height="32px" />
          ))}
        </div>
        <div className="p-5 space-y-4">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="90%" height="16px" />
          <Skeleton width="95%" height="16px" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border border-[#E2E8F0] rounded-2xl space-y-2">
                <Skeleton width="60px" height="14px" />
                <Skeleton width="40px" height="24px" />
                <Skeleton width="100%" height="6px" />
                <Skeleton width="80%" height="10px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScannerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] rounded-xl">
      <Skeleton width="32px" height="32px" rounded />
      <div className="flex-1 space-y-1.5">
        <Skeleton width="100px" height="14px" />
        <Skeleton width="60px" height="10px" />
      </div>
      <div className="text-right space-y-1.5">
        <Skeleton width="70px" height="14px" />
        <Skeleton width="50px" height="10px" />
      </div>
      <Skeleton width="80px" height="22px" rounded />
    </div>
  );
}
