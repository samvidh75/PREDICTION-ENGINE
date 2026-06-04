// src/components/subscriptions/FeatureGate.tsx
import React, { useState, useEffect } from "react";
import { FeatureGateEngine } from "../../services/subscriptions/FeatureGateEngine";
import { EntitlementFeature } from "../../services/subscriptions/EntitlementEngine";
import { SubscriptionEngine, SubscriptionPlan } from "../../services/subscriptions/SubscriptionEngine";
import { BillingCoordinator } from "../../services/subscriptions/BillingCoordinator";

interface FeatureGateProps {
  feature: EntitlementFeature;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallbackMessage = "Unlock premium analytics with higher subscription tiers.",
}) => {
  const [hasAccess, setHasAccess] = useState(() => FeatureGateEngine.checkFeature(feature));
  const [activePlan, setActivePlan] = useState(() => SubscriptionEngine.getActivePlan());

  useEffect(() => {
    const handlePlanChange = () => {
      setHasAccess(FeatureGateEngine.checkFeature(feature));
      setActivePlan(SubscriptionEngine.getActivePlan());
    };
    return SubscriptionEngine.subscribe(handlePlanChange);
  }, [feature]);

  const handleUpgradeToPro = () => {
    BillingCoordinator.processUpgrade("Pro");
  };

  const handleUpgradeToPlus = () => {
    BillingCoordinator.processUpgrade("Plus");
  };

  const handleUpgradeToInst = () => {
    BillingCoordinator.processUpgrade("Institutional");
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  // Get target plan requirement
  let targetTier: SubscriptionPlan = "Plus";
  if (["advancedTelemetry", "aiCopilot", "unlimitedAlerts", "advancedDiscovery", "portfolioDiagnostics"].includes(feature)) {
    targetTier = "Pro";
  } else if (["researchExports", "teamSpaces", "collaboration", "customScreens"].includes(feature)) {
    targetTier = "Institutional";
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/5 bg-[#020304]/80 p-6 font-vos-interface min-h-[220px] flex items-center justify-center">
      {/* Blurred mock children preview in background */}
      <div className="absolute inset-0 filter blur-[12px] opacity-25 pointer-events-none select-none">
        <div className="w-full h-full flex flex-col space-y-4 p-8">
          <div className="h-6 bg-white/20 rounded w-1/3" />
          <div className="h-24 bg-white/10 rounded w-full" />
          <div className="h-6 bg-white/20 rounded w-1/4" />
        </div>
      </div>

      {/* Lock HUD */}
      <div className="relative z-10 max-w-md text-center flex flex-col items-center space-y-4 p-4 bg-black/60 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
          🔒
        </div>
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-vos-display">
            Premium Feature Gate // Unlocked at {targetTier}
          </h4>
          <p className="text-xs text-gray-400 mt-1 font-vos-reading">
            {fallbackMessage}
          </p>
        </div>

        {/* Dynamic CTA upgrade buttons */}
        <div className="flex gap-2">
          {targetTier === "Plus" && (
            <button
              onClick={handleUpgradeToPlus}
              className="px-4 py-2 bg-cyan-400 text-[#020304] text-xs font-bold rounded-full hover:bg-cyan-300 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              Upgrade to Plus
            </button>
          )}
          {targetTier === "Pro" && (
            <button
              onClick={handleUpgradeToPro}
              className="px-4 py-2 bg-emerald-400 text-[#020304] text-xs font-bold rounded-full hover:bg-emerald-300 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              Upgrade to Pro
            </button>
          )}
          {targetTier === "Institutional" && (
            <button
              onClick={handleUpgradeToInst}
              className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-full hover:bg-purple-400 active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              Upgrade to Institutional
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureGate;
