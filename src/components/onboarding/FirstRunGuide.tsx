import React, { useState, useEffect } from "react";
import {
  Search,
  BookOpen,
  BarChart3,
  Bookmark,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

const GUIDE_KEY = "ss_onboarding_completed";

const STEPS = [
  {
    icon: Search,
    title: "Search a company",
    description: "Find a company you want to research. Look up by name, symbol, or sector.",
  },
  {
    icon: BookOpen,
    title: "Read the thesis",
    description: "Understand the research view, conviction score, and what drives the rating.",
  },
  {
    icon: BarChart3,
    title: "Compare with peers",
    description: "Use the Compare view to see how it stacks up against peers.",
  },
  {
    icon: Bookmark,
    title: "Track the thesis",
    description: "Add to your watchlist to monitor changes and stay updated.",
  },
  {
    icon: ShieldCheck,
    title: "Review before investing",
    description: "Use the Invest handoff flow to review the full picture before making a decision.",
  },
];

function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(GUIDE_KEY) === "true";
}

function completeOnboarding() {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUIDE_KEY, "true");
}

export function FirstRunGuide() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOnboardingCompleted()) setVisible(true);
  }, []);

  const handleDismiss = () => {
    completeOnboarding();
    setVisible(false);
  };

  const navigate = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
    handleDismiss();
  };

  if (!visible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#0D1117] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2962FF]/10">
            <Icon className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-[#8B949E] tracking-wide uppercase">
              Step {currentStep + 1} of {STEPS.length}
            </p>
            <h2 className="mt-0.5 text-[13px] font-semibold text-[#E6EDF3] truncate">
              {step.title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-[#484F58] hover:text-[#E6EDF3]"
          aria-label="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-3 text-[11px] text-[#8B949E] leading-relaxed">
        {step.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "w-4 bg-[#2962FF]" : "w-1.5 bg-[#484F58]"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              onClick={() => navigate("search")}
              className="rounded-lg bg-[#2962FF] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2962FF]/90 transition-colors"
            >
              Start exploring
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              aria-label="Next step"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
