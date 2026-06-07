import React from 'react';

export const TelemetrySkeleton: React.FC = () => {
  return (
    <div 
      className="w-full bg-white/[0.02] border border-white/5 backdrop-blur-2xl rounded-[28px] p-6 animate-pulse flex flex-col gap-6"
      style={{ height: '320px' }}
    >
      <div className="flex flex-col gap-2">
        <div className="h-3 w-1/3 bg-white/10 rounded-full" />
        <div className="h-8 w-2/3 bg-white/10 rounded-full mt-2" />
      </div>
      
      <div className="h-px bg-white/5 w-full mt-2" />
      
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-1/2 bg-white/10 rounded-full" />
          <div className="h-5 w-3/4 bg-white/10 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3 w-1/2 bg-white/10 rounded-full" />
          <div className="h-5 w-3/4 bg-white/10 rounded-full" />
        </div>
      </div>
      
      <div className="h-12 bg-white/5 border border-dashed border-white/5 rounded-xl flex items-center justify-center mt-auto" />
    </div>
  );
};

export default TelemetrySkeleton;
