import React from 'react';

export const ComplianceBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
      <strong>Research Platform:</strong> Scores, rankings, and observations are model outputs based on historical data. 
      This is not investment advice. No buy/sell recommendations. 
      Past performance does not guarantee future results. 
      Consult a SEBI-registered investment adviser before investing.
    </div>
  );
};

export default ComplianceBanner;
