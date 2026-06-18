/**
 * TRACK-50 AGENT D — First-Time User Experience
 * 
 * Explains Health, Future Health, Risk, Narrative, Prediction History
 * in under 60 seconds. Most users will not understand these concepts initially.
 */
import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Brain, CheckCircle2, Clock, Heart,
  History, Shield, Sparkles, TrendingUp, Zap,
} from 'lucide-react';

const STEPS = [
  {
    icon: <Heart className="h-8 w-8 text-rose-400" />,
    title: 'Health Score',
    description: 'Every company gets a Health Score from 0-100. It combines 7 engines: Growth, Quality, Stability, Valuation, Momentum, Risk, and Confidence.',
    detail: 'Think of it like a credit score — but for company quality.',
  },
  {
    icon: <Sparkles className="h-8 w-8 text-fuchsia-400" />,
    title: 'Future Health',
    description: 'We project how the Health Score may evolve over 3, 6, and 12 months. Based on trends, not predictions.',
    detail: 'Improving, Stable, or Weakening — the trajectory matters more than the point score.',
  },
  {
    icon: <Shield className="h-8 w-8 text-rose-400" />,
    title: 'Risk Assessment',
    description: 'Red flags, volatility patterns, debt stress, and cash flow concerns are detected automatically. Lower is safer.',
    detail: 'We scan for accounting anomalies and structural risks that traditional screeners miss.',
  },
  {
    icon: <Brain className="h-8 w-8 text-violet-400" />,
    title: 'Narrative',
    description: 'Numbers alone are hard to interpret. We tell you what improved, what deteriorated, and what matters most.',
    detail: 'You get the story behind the scores — in plain English.',
  },
  {
    icon: <History className="h-8 w-8 text-amber-400" />,
    title: 'Prediction History',
    description: 'Every health assessment we make is recorded before outcomes. You can verify our accuracy yourself.',
    detail: 'No cherry-picking. No survivorship bias. Full transparency.',
  },
];

interface WelcomeExperienceProps {
  onComplete?: () => void;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem('ssi_welcome_completed') === 'true';
  });

  useEffect(() => {
    if (hasCompleted) return;
    // Auto-advance after 12 seconds (total: ~60s for 5 steps)
    const timer = setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [currentStep, hasCompleted]);

  const handleComplete = () => {
    localStorage.setItem('ssi_welcome_completed', 'true');
    setHasCompleted(true);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (hasCompleted) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0f] p-8 shadow-2xl">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-6">
          {currentStep + 1} of {STEPS.length}
        </div>

        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 mb-6">
          {step.icon}
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-white mb-3">{step.title}</h2>
        <p className="text-sm text-white/60 leading-relaxed mb-4">{step.description}</p>
        <div className="rounded-lg bg-white/[0.02] border border-white/5 px-4 py-3 text-xs text-white/40 italic">
          {step.detail}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handleSkip}
            className="text-[10px] font-bold uppercase tracking-wider text-white/20 hover:text-white/50 transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="text-[10px] font-bold uppercase tracking-wider text-white/30 disabled:opacity-20 disabled:cursor-not-allowed hover:text-white/60"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(prev => prev + 1);
                } else {
                  handleComplete();
                }
              }}
              className="flex h-9 items-center gap-2 rounded-lg bg-white/[0.05] border border-white/10 px-4 text-xs font-bold text-white hover:border-white/30 transition-colors"
            >
              {currentStep < STEPS.length - 1 ? (
                <>Next <ArrowRight className="h-3 w-3" /></>
              ) : (
                <>Get Started <CheckCircle2 className="h-3 w-3 text-emerald-400" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeExperience;
