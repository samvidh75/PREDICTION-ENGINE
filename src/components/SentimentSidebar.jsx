import React from 'react';
import { BarChart3 } from 'lucide-react';

const SentimentSidebar = ({ metrics, selectedExchange }) => {
  return (
    <div className="xl:col-span-1 bg-white border border-[#E5E5E5] rounded-none p-6 flex flex-col space-y-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-fit sticky top-8">
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-[#E5E5E5]">
        <BarChart3 className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
        <h2 className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
          Sentiment Analytics
        </h2>
      </div>

      {/* Exchange Context */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
          Active Segment
        </span>
        <span className="font-mono text-sm font-semibold text-[#0A0A0A] uppercase">
          {selectedExchange === 'ALL' ? 'All Exchanges' : selectedExchange}
        </span>
      </div>

      {/* Sentiment Distribution */}
      <div className="flex flex-col gap-4">
        <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
          Sentiment Distribution
        </span>

        {/* VERY HEALTHY */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#06B6D4] uppercase">
              Very Healthy
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
              {metrics.sentiments['VERY HEALTHY']}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#06B6D4] rounded-none transition-all duration-300"
              style={{
                width: `${
                  Object.values(metrics.sentiments).reduce((a, b) => a + b, 0) > 0
                    ? (metrics.sentiments['VERY HEALTHY'] /
                        Object.values(metrics.sentiments).reduce((a, b) => a + b, 0)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* HEALTHY */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#06B6D4] uppercase">
              Healthy
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
              {metrics.sentiments['HEALTHY']}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#06B6D4] rounded-none transition-all duration-300"
              style={{
                width: `${
                  Object.values(metrics.sentiments).reduce((a, b) => a + b, 0) > 0
                    ? (metrics.sentiments['HEALTHY'] /
                        Object.values(metrics.sentiments).reduce((a, b) => a + b, 0)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* STABLE */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#525252] uppercase">
              Stable
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
              {metrics.sentiments['STABLE']}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#A3A3A3] rounded-none transition-all duration-300"
              style={{
                width: `${
                  Object.values(metrics.sentiments).reduce((a, b) => a + b, 0) > 0
                    ? (metrics.sentiments['STABLE'] /
                        Object.values(metrics.sentiments).reduce((a, b) => a + b, 0)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* WEAKENING */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#D946EF] uppercase">
              Weakening
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
              {metrics.sentiments['WEAKENING']}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#D946EF] rounded-none transition-all duration-300"
              style={{
                width: `${
                  Object.values(metrics.sentiments).reduce((a, b) => a + b, 0) > 0
                    ? (metrics.sentiments['WEAKENING'] /
                        Object.values(metrics.sentiments).reduce((a, b) => a + b, 0)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* UNHEALTHY */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium text-[#D946EF] uppercase">
              Unhealthy
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
              {metrics.sentiments['UNHEALTHY']}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#F5F5F5] rounded-none overflow-hidden">
            <div
              className="h-full bg-[#D946EF] rounded-none transition-all duration-300"
              style={{
                width: `${
                  Object.values(metrics.sentiments).reduce((a, b) => a + b, 0) > 0
                    ? (metrics.sentiments['UNHEALTHY'] /
                        Object.values(metrics.sentiments).reduce((a, b) => a + b, 0)) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Engagement Totals */}
      <div className="flex flex-col gap-4 pt-4 border-t border-[#E5E5E5]">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
            Total Views
          </span>
          <span className="font-mono text-lg font-semibold text-[#0A0A0A]">
            {metrics.totalViews.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
            Total Discussions
          </span>
          <span className="font-mono text-lg font-semibold text-[#0A0A0A]">
            {metrics.totalDiscussions}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SentimentSidebar;
