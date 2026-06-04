// src/components/dashboard/DashboardLayout.tsx
import React from 'react';
import IntelligenceNavigationRail from '../navigation/IntelligenceNavigationRail';
import { DashboardHub } from './DashboardHub';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#020304] text-white">
      {/* 22nd-century Navigation Control Rail */}
      <IntelligenceNavigationRail />
      
      {/* Primary Workspace Content */}
      <main className="flex-1 pl-28 p-8 md:p-12 z-10 relative">
        <header className="mb-8 border-b border-white/5 pb-6">
          <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-cyan-400 block mb-1">
            Secure Node // Active Shell
          </span>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Market Intelligence Workspace</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time non-advisory synthesis of NSE/BSE health metrics.</p>
        </header>
        <DashboardHub />
      </main>
    </div>
  );
};

export default DashboardLayout;
