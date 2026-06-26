import { useState } from "react";
import { ArrowUpRight, Check, ExternalLink, X } from "lucide-react";
import { BROKER_PARTNERS, getBrokerUrl, trackReferralClick, BrokerPartner } from "./brokers";

interface TradePanelProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  price: number | null;
  score: number | null;
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-[400] transition-all ${
      done ? 'bg-[var(--brand)] text-white' : active ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface)] text-[var(--text-300)]'
    }`}>
      {done ? <Check size={9} /> : active ? '›' : ''}
    </div>
  );
}

export default function TradePanel({ open, onClose, symbol, companyName, price, score }: TradePanelProps) {
  const [step, setStep] = useState<"choose" | "confirm" | "done">("choose");
  const [selectedBroker, setSelectedBroker] = useState<BrokerPartner | null>(null);
  const [quantity, setQuantity] = useState(10);

  if (!open) return null;
  const estimatedCost = price ? price * quantity : 0;
  const handleBrokerSelect = (broker: BrokerPartner) => { setSelectedBroker(broker); setStep("confirm"); };
  const handleConfirm = () => {
    if (!selectedBroker) return;
    trackReferralClick(selectedBroker.id, symbol);
    setStep("done");
    window.open(getBrokerUrl(symbol, selectedBroker.id), "_blank", "noopener,noreferrer");
  };
  const handleReset = () => { setStep("choose"); setSelectedBroker(null); };
  const handleClose = () => { handleReset(); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative w-full max-w-[440px] bg-white rounded-t-[16px] shadow-[var(--sh-float)] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-[16px] pt-4 pb-2 px-5 border-b border-[var(--border)] flex items-center justify-between z-10">
          <div>
            <h2 className="text-[15px] font-[300] text-[var(--text-900)] tracking-[-0.2px]">{step === "choose" ? "Choose Broker" : step === "confirm" ? "Confirm Order" : "Redirecting..."}</h2>
            <p className="text-[10px] text-[var(--text-500)]">{symbol} · {companyName}</p>
          </div>
          <button onClick={handleClose} className="w-[26px] h-[26px] rounded-full bg-[var(--surface)] flex items-center justify-center active:scale-[0.97]"><X size={12} className="text-[var(--text-500)]" /></button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between bg-[var(--surface)] rounded-[8px] p-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-[32px] h-[32px] rounded-[6px] bg-[var(--brand)] flex items-center justify-center text-white text-[11px] font-[400]">{symbol.slice(0,2)}</div>
              <div>
                <div className="text-[13px] font-[400] text-[var(--text-900)] tracking-[-0.2px]">{symbol}</div>
                <div className="text-[10px] text-[var(--text-500)]">{companyName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-[400] text-[var(--text-900)] tabular">{price ? `₹${price.toFixed(2)}` : '—'}</div>
              {score && <div className="text-[8px] text-[var(--brand)]">Score: {score}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 justify-center">
            <StepDot active={step==="choose"} done={step!=="choose"} /><div className="h-[1px] w-[32px] bg-[var(--border)]" />
            <StepDot active={step==="confirm"} done={step==="done"} /><div className="h-[1px] w-[32px] bg-[var(--border)]" />
            <StepDot active={step==="done"} done={false} />
            <div className="flex items-center gap-1 ml-2 text-[9px] text-[var(--text-500)]">
              <span className={step==="choose"?"text-[var(--brand)]":""}>Choose</span><span className="text-[var(--text-300)]">·</span>
              <span className={step==="confirm"?"text-[var(--brand)]":""}>Confirm</span><span className="text-[var(--text-300)]">·</span>
              <span className={step==="done"?"text-[var(--brand)]":""}>Trade</span>
            </div>
          </div>

          {step === "choose" && (
            <>
              <p className="text-[11px] text-[var(--text-500)] mb-3 leading-[1.4]">Select a broker to invest in <strong className="text-[var(--text-900)]">{symbol}</strong>. You'll be redirected to open a free account.</p>
              <div className="space-y-2">
                {BROKER_PARTNERS.map(broker => (
                  <button key={broker.id} onClick={() => handleBrokerSelect(broker)}
                    className="w-full flex items-center gap-3 p-3 border border-[var(--border)] rounded-[10px] hover:border-[var(--brand)] hover:bg-[var(--surface)] transition-all active:scale-[0.98] text-left">
                    <div className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center text-white text-[12px] font-[400] flex-shrink-0" style={{background:broker.color}}>{broker.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-[400] text-[var(--text-900)]">{broker.name}</div>
                      <div className="text-[9px] text-[var(--text-500)] line-clamp-1">{broker.description}</div>
                    </div>
                    <ArrowUpRight size={13} className="text-[var(--text-300)] flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="mt-3 p-3 bg-[var(--surface)] rounded-[8px]">
                <p className="text-[9px] text-[var(--text-500)] leading-[1.5]"><strong className="text-[var(--text-900)]">💡</strong> StockStory earns a referral commission when you open an account through our links — at no extra cost to you.</p>
              </div>
            </>
          )}

          {step === "confirm" && selectedBroker && (
            <>
              <div className="bg-[var(--surface)] rounded-[10px] p-3 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-white text-[11px] font-[400]" style={{background:selectedBroker.color}}>{selectedBroker.logo}</div>
                  <div><div className="text-[12px] font-[400] text-[var(--text-900)]">{selectedBroker.name}</div></div>
                  <button onClick={handleReset} className="ml-auto text-[10px] text-[var(--brand)]">Change</button>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-[var(--text-500)]">Stock</span><span className="text-[var(--text-900)] tabular">{symbol}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-500)]">Est. Price</span><span className="text-[var(--text-900)] tabular">{price ? `₹${price.toFixed(2)}` : '—'}</span></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-500)]">Qty</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setQuantity(q => Math.max(1,q-5))} className="w-[22px] h-[22px] rounded-full bg-[var(--border)] flex items-center justify-center text-[10px] active:scale-[0.95]">−</button>
                      <span className="text-[12px] font-[400] tabular w-[28px] text-center text-[var(--text-900)]">{quantity}</span>
                      <button onClick={() => setQuantity(q => q+5)} className="w-[22px] h-[22px] rounded-full bg-[var(--border)] flex items-center justify-center text-[10px] active:scale-[0.95]">+</button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-900)]">Est. Investment</span>
                    <span className="text-[16px] font-[400] text-[var(--text-900)] tabular">₹{estimatedCost.toLocaleString("en-IN",{minimumFractionDigits:2})}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleConfirm}
                className="w-full h-[40px] bg-[var(--brand)] text-white text-[14px] font-[400] rounded-[9999px] flex items-center justify-center gap-2 active:scale-[0.97] hover:bg-[var(--brand-hover)] transition-colors">
                Open {selectedBroker?.name} <ExternalLink size={13} />
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-5">
              <div className="w-[48px] h-[48px] rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-3"><Check size={20} className="text-[var(--brand)]" /></div>
              <h3 className="text-[14px] font-[400] text-[var(--text-900)] mb-1">Opening {selectedBroker?.name}…</h3>
              <p className="text-[10px] text-[var(--text-500)]">Complete your purchase on the broker's platform.</p>
              <button onClick={handleClose} className="mt-3 text-[10px] text-[var(--brand)] underline">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
