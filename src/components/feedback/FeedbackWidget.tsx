/**
 * TRACK-50 AGENT B — Beta Feedback Widget
 * Collects: confused, useful, missing, incorrect feedback per page.
 */
import React, { useState } from 'react';
import { MessageCircle, X, HelpCircle, Star, AlertCircle, FileWarning } from 'lucide-react';
import { analytics } from '../../analytics/EventAnalyticsEngine';

type FeedbackType = 'confusing' | 'useful' | 'missing' | 'incorrect';

interface FeedbackWidgetProps {
  page: string;
  component?: string;
  symbol?: string;
}

const OPTIONS: { type: FeedbackType; icon: JSX.Element; label: string }[] = [
  { type: 'useful', icon: <Star className="h-3 w-3" />, label: 'Useful' },
  { type: 'confusing', icon: <HelpCircle className="h-3 w-3" />, label: 'Confusing' },
  { type: 'missing', icon: <FileWarning className="h-3 w-3" />, label: 'Missing' },
  { type: 'incorrect', icon: <AlertCircle className="h-3 w-3" />, label: 'Incorrect' },
];

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ page, component, symbol }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (type: FeedbackType) => {
    analytics.submitFeedback({
      page,
      component,
      symbol,
      feedback_type: type,
      comment: comment || undefined,
    });
    setSelectedType(type);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
      setSelectedType(null);
      setComment('');
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 backdrop-blur-md">
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 backdrop-blur-md transition-colors hover:border-white/30 hover:text-white"
        aria-label="Send feedback"
      >
        {isOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-72 rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Feedback</span>
            <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white" aria-label="Close feedback">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2 mb-3">
            {OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => handleSubmit(opt.type)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  selectedType === opt.type
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/5 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Optional detail... (never attributed)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white placeholder-white/20 outline-none resize-none h-14 focus:border-cyan-400"
            aria-label="Optional feedback details"
          />

          <div className="mt-2 text-[8px] text-white/20 italic">
            Anonymous feedback helps us improve the product.
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
