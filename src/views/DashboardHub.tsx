import React from 'react';
import { DashboardHub as CommandCentre } from '../components/dashboard/DashboardHub';
import MarketActionBoard from '../components/dashboard/MarketActionBoard';
import { RecentSearchStore } from '../services/search/RecentSearchStore';

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  const params = new URLSearchParams(window.location.search);
  params.set('page', 'stock');
  params.set('id', symbol);
  params.delete('symbol');
  window.history.pushState({}, '', `?${params.toString()}`);
  window.dispatchEvent(new Event('urlchange'));
}

export const DashboardHub: React.FC = () => {
  return (
    <>
      <CommandCentre />
      <div className="mx-auto w-full max-w-7xl px-4 pb-16">
        <MarketActionBoard onOpenCompany={openCompany} />
      </div>
    </>
  );
};

export default DashboardHub;
