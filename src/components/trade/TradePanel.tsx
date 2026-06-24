import { useState } from "react";
import { ArrowUpRight, Check, ExternalLink, X } from "lucide-react";
import { BROKER_PARTNERS, getBrokerUrl, trackReferralClick, BrokerPartner } from "./brokers";
import { getShareUrl } from "../../lib/referral";

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
    <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[9px] font-[600] transition-all ${
      done ? 'bg-[#0066cc] text-white' : active ? 'bg-[#0066cc] text-white' : 'bg-[#f0f0f0] text-[#bbb]'
    }`}>
      {done ? <Check size={10} /> : active ? '›' : ''}
    </div>
  );
}

export default function TradePanel({ open, onClose, symbol, companyName, price, score }: TradePanelProps) {
  const [step, setStep] = useState<"choose" | "confirm" | "done">("choose");
  const [selectedBroker, setSelectedBroker] = useState<BrokerPartner | null>(null);
  const [quantity, setQuantity] = useState(10);

  if (!open) return null;

  const estimatedCost = price ? price * quantity : 0;

  const handleBrokerSelect = (broker: BrokerPartner) => {
    setSelectedBroker(broker);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedBroker) return;
    trackReferralClick(selectedBroker.id, symbol);
    setStep("done");
    const url = getBrokerUrl(symbol, selectedBroker.id);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleReset = () => {
    setStep("choose");
    setSelectedBroker(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-[24px] shadow-xl animate-[slideUp_0.3s_ease] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-[24px] pt-4 pb-2 px-6 border-b border-[#f0f0f0] flex items-center justify-between z-10">
          <div>
            <h2 className="text-[17px] font-[600] text-[#1d1d1f] tracking-[-0.374px]">
              {step === "choose" ? "Choose a Broker" : step === "confirm" ? "Confirm Order" : "Redirecting..."}
            </h2>
            <p className="text-[12px] text-[#7a7a7a]">{symbol} · {companyName}</p>
          </div>
          <button onClick={handleClose} className="w-[28px] h-[28px] rounded-full bg-[#f0f0f0] flex items-center justify-center active:scale-[0.95]">
            <X size={14} className="text-[#7a7a7a]" />
          </button>
        </div>

        <div className="p-6">
          {/* Stock summary */}
          <div className="flex items-center justify-between bg-[#f5f5f7] rounded-[12px] p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-[8px] bg-[#0066cc] flex items-center justify-center text-white text-[12px] font-[600]">{symbol.slice(0, 2)}</div>
              <div>
                <div className="text-[15px] font-[600] text-[#1d1d1f]">{symbol}</div>
                <div className="text-[11px] text-[#7a7a7a]">{companyName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[17px] font-[600] text-[#1d1d1f] tabular">{price ? `₹${price.toFixed(2)}` : '—'}</div>
              {score && <div className="text-[10px] font-[600] text-[#0066cc]">Score: {score}</div>}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5 justify-center">
            <StepDot active={step === "choose"} done={step !== "choose"} />
            <div className="h-[2px] w-[40px] bg-[#f0f0f0] rounded-full" />
            <StepDot active={step === "confirm"} done={step === "done"} />
            <div className="h-[2px] w-[40px] bg-[#f0f0f0] rounded-full" />
            <StepDot active={step === "done"} done={false} />
            <div className="flex items-center gap-1.5 ml-2 text-[10px] text-[#7a7a7a]">
              <span className={step === "choose" ? "text-[#0066cc] font-[600]" : ""}>Choose</span>
              <span className="text-[#ccc]">·</span>
              <span className={step === "confirm" ? "text-[#0066cc] font-[600]" : ""}>Confirm</span>
              <span className="text-[#ccc]">·</span>
              <span className={step === "done" ? "text-[#0066cc] font-[600]" : ""}>Trade</span>
            </div>
          </div>

          {step === "choose" && (
            <>
              <p className="text-[12px] text-[#7a7a7a] mb-4 leading-[1.4]">
                Select your preferred broker to start investing in <strong className="text-[#1d1d1f]">{symbol}</strong>.
                You'll be redirected to open a free account. <strong className="text-[#0066cc]">StockStory earns a commission</strong> at no extra cost to you.
              </p>
              <div className="space-y-2.5">
                {BROKER_PARTNERS.map(broker => (
                  <button
                    key={broker.id}
                    onClick={() => handleBrokerSelect(broker)}
                    className="w-full flex items-center gap-3 p-3.5 border border-[#e0e0e0] rounded-[14px] hover:border-[#0066cc] hover:bg-[#f5f5f7] transition-all active:scale-[0.98] text-left"
                  >
                    <div className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-white text-[14px] font-[700] flex-shrink-0" style={{ background: broker.color }}>
                      {broker.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-[600] text-[#1d1d1f]">{broker.name}</div>
                      <div className="text-[11px] text-[#7a7a7a] line-clamp-1">{broker.description}</div>
                      <div className="flex gap-2 mt-1">
                        {broker.features.slice(0, 2).map(f => (
                          <span key={f} className="text-[9px] text-[#0066cc] bg-[#f5f5f7] px-1.5 py-0.5 rounded-[4px]">{f}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowUpRight size={15} className="text-[#ccc] flex-shrink-0" />
                  </button>
                ))}
              </div>

              <div className="mt-5 p-4 bg-[#f5f5f7] rounded-[12px]">
                <p className="text-[11px] text-[#7a7a7a] leading-[1.5]">
                  <strong className="text-[#1d1d1f]">💰 How it works:</strong> StockStory is a research platform, not a broker.
                  When you open a broker account through our links, we earn a referral commission that keeps our research free for you.
                  You get the same pricing as going directly.
                </p>
              </div>
            </>
          )}

          {step === "confirm" && selectedBroker && (
            <>
              <div className="bg-[#f5f5f7] rounded-[14px] p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white text-[12px] font-[700]" style={{ background: selectedBroker.color }}>{selectedBroker.logo}</div>
                  <div>
                    <div className="text-[14px] font-[600] text-[#1d1d1f]">{selectedBroker.name}</div>
                    <div className="text-[10px] text-[#7a7a7a]">Your selected broker</div>
                  </div>
                  <button onClick={handleReset} className="ml-auto text-[11px] text-[#0066cc] font-[500]">Change</button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#7a7a7a]">Stock</span>
                    <span className="text-[12px] font-[600] text-[#1d1d1f]">{symbol} · {companyName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#7a7a7a]">Est. Price</span>
                    <span className="text-[12px] font-[600] text-[#1d1d1f] tabular">{price ? `₹${price.toFixed(2)}` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#7a7a7a]">Qty</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 5))} className="w-[24px] h-[24px] rounded-full bg-[#e0e0e0] flex items-center justify-center text-[12px] active:scale-[0.95]">−</button>
                      <span className="text-[14px] font-[600] w-[30px] text-center">{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 5)} className="w-[24px] h-[24px] rounded-full bg-[#e0e0e0] flex items-center justify-center text-[12px] active:scale-[0.95]">+</button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#e0e0e0] flex items-center justify-between">
                    <span className="text-[13px] font-[600] text-[#1d1d1f]">Est. Investment</span>
                    <span className="text-[17px] font-[700] text-[#1d1d1f] tabular">₹{estimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  'You will be redirected to open/buy on the broker platform',
                  'Actual price may vary by a few rupees at time of execution',
                  'StockStory earns a referral commission at no extra cost to you',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check size={12} className="text-[#0066cc] mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-[#7a7a7a]">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full h-[44px] bg-[#0066cc] text-white text-[15px] font-[500] rounded-[9999px] flex items-center justify-center gap-2 active:scale-[0.97] hover:opacity-90 transition-all"
              >
                Buy {quantity} shares · ₹{estimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                <ExternalLink size={14} />
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <div className="w-[56px] h-[56px] rounded-full bg-[#ebf7f1] flex items-center justify-center mx-auto mb-4">
                <Check size={24} className="text-[#1a7f4b]" />
              </div>
              <h3 className="text-[17px] font-[600] text-[#1d1d1f] mb-1">Redirecting to {selectedBroker?.name}</h3>
              <p className="text-[12px] text-[#7a7a7a] mb-4">
                Complete your purchase on the broker's platform. Your research on <strong className="text-[#1d1d1f]">{symbol}</strong> has been saved.
              </p>
              <div className="flex items-center justify-center gap-1 text-[12px] text-[#0066cc]">
                <ExternalLink size={12} />
                <span>Opening {selectedBroker?.name} in new tab…</span>
              </div>
              <button onClick={handleClose} className="mt-4 text-[12px] text-[#7a7a7a] underline">Close</button>
            </div>
          )}

          {/* Share this stock */}
          <div className="mt-5 pt-4 border-t border-[#f0f0f0]">
            <button
              onClick={() => {
                const url = getShareUrl(symbol, companyName);
                if (navigator.share) {
                  navigator.share({ title: `${symbol} - StockStory India`, text: `${symbol}: ${companyName}`, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url).then(() => {}).catch(() => {});
                }
              }}
              className="w-full text-[12px] text-[#7a7a7a] flex items-center justify-center gap-1.5 py-2 active:scale-[0.98]"
            >
              <ArrowUpRight size={12} /> Share this stock with someone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
