import { useState } from "react";
import { Check, Crown, X } from "lucide-react";
import { PLANS, isPremium, setSubscription, type PlanTier } from "../../lib/subscription";
import { productNavigate } from "../product/ProductUI";

export default function PremiumGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const [showPlans, setShowPlans] = useState(false);
  const premium = isPremium();

  if (premium) return <>{children}</>;

  return (
    <div className="relative group">
      <div className="blur-[2px] pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-[12px] z-10">
        <div className="text-center">
          <Crown size={24} className="text-[var(--brand)] mx-auto mb-1" />
          <p className="text-[11px] text-[var(--text-700)] font-[400] mb-2">Premium feature</p>
          <button onClick={() => setShowPlans(true)}
            className="bg-[var(--brand)] text-white text-[10px] font-[400] rounded-[9999px] px-3 py-1.5 active:scale-[0.97]">
            Upgrade
          </button>
        </div>
      </div>
      {showPlans && <PricingModal onClose={() => setShowPlans(false)} />}
    </div>
  );
}

export function PricingModal({ onClose, returnTo }: { onClose: () => void; returnTo?: string }) {
  const [selected, setSelected] = useState<PlanTier>("premium_monthly");
  const handleUpgrade = () => {
    setSubscription(selected);
    onClose();
    if (returnTo) productNavigate(returnTo);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[600px] bg-white rounded-[16px] shadow-[rgba(0,55,112,0.08)_0_8px_24px] max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-[var(--brand)]" />
            <span className="text-[18px] font-[300] text-[var(--text-900)] tracking-[-0.2px]">Upgrade to Premium</span>
          </div>
          <button onClick={onClose} className="w-[26px] h-[26px] rounded-full bg-[var(--surface)] flex items-center justify-center"><X size={12} className="text-[var(--text-500)]" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={`rounded-[12px] p-4 border text-left transition-all ${selected === plan.id ? 'border-[var(--brand)] bg-[var(--surface)]' : 'border-[var(--border)] bg-white'} ${plan.popular ? 'ring-1 ring-[var(--brand)]' : ''} ${plan.id === 'free' ? 'opacity-60' : ''}`}>
              {plan.popular && <span className="text-[8px] font-[400] text-white bg-[var(--brand)] px-2 py-0.5 rounded-[9999px] mb-1.5 inline-block">Most Popular</span>}
              <div className="text-[13px] font-[400] text-[var(--text-900)]">{plan.name}</div>
              <div className="text-[20px] font-[300] text-[var(--text-900)] tracking-[-0.2px] mt-1">{plan.priceLabel}</div>
              {plan.id === 'free' && <div className="text-[9px] text-[var(--text-500)] mt-1">Current plan</div>}
            </button>
          ))}
        </div>

        <div className="bg-[var(--surface)] rounded-[12px] p-4 mb-4">
          <div className="text-[12px] font-[400] text-[var(--text-900)] mb-2">What's included:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {PLANS.find(p => p.id === selected)?.features.map(f => (
              <div key={f.text} className="flex items-start gap-1.5">
                <Check size={10} className={`mt-0.5 ${f.included ? 'text-[#1a7f4b]' : 'text-[var(--text-300)]'}`} />
                <span className={`text-[10px] ${f.included ? 'text-[var(--text-900)]' : 'text-[var(--text-300)]'}`}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {selected !== "free" && (
          <button onClick={handleUpgrade}
            className="w-full h-[40px] bg-[var(--brand)] text-white text-[14px] font-[400] rounded-[9999px] active:scale-[0.97] hover:bg-[var(--brand-hover)] transition-colors flex items-center justify-center gap-2">
            <Crown size={14} /> Subscribe {selected === 'premium_monthly' ? '₹199/mo' : '₹9999/yr'}
          </button>
        )}
        <p className="text-[8px] text-[var(--text-300)] text-center mt-2">Cancel anytime. No lock-in contracts.</p>
      </div>
    </div>
  );
}
