export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: string[];
  trafficFraction: number;
}

export const EXPERIMENTS: ExperimentConfig[] = [
  {
    id: "exp-home-layout",
    name: "Home Page Layout Variant",
    description: "Test alternative hero section and discovery layout on the home page.",
    enabled: false,
    variants: ["control", "variant-a"],
    trafficFraction: 0,
  },
  {
    id: "exp-scanner-preset-order",
    name: "Scanner Preset Ordering",
    description: "Test different preset orderings on the scanner page to improve discovery.",
    enabled: false,
    variants: ["default", "usage-ranked"],
    trafficFraction: 0,
  },
  {
    id: "exp-share-cta-placement",
    name: "Share CTA Placement",
    description: "Test share button placement on stock pages (top, bottom, sticky).",
    enabled: false,
    variants: ["control", "top", "bottom", "sticky"],
    trafficFraction: 0,
  },
  {
    id: "exp-tour-flow",
    name: "Product Tour Flow",
    description: "Test different tour sequences for first-time visitors.",
    enabled: false,
    variants: ["welcome-screen", "step-by-step", "self-guided"],
    trafficFraction: 0,
  },
  {
    id: "exp-trust-signals",
    name: "Trust Signals Placement",
    description: "Test placement and styling of trust and disclosure elements on key pages.",
    enabled: false,
    variants: ["footer-only", "page-banner", "inline-disclosure"],
    trafficFraction: 0,
  },
  {
    id: "exp-invite-flow",
    name: "Invite Flow Conversion",
    description: "Test different invite page designs and CTAs to improve referral conversion.",
    enabled: false,
    variants: ["simple-form", "social-share", "email-invite"],
    trafficFraction: 0,
  },
];

export function getExperiment(id: string): ExperimentConfig | undefined {
  return EXPERIMENTS.find((e) => e.id === id);
}

export function isExperimentActive(id: string): boolean {
  const exp = getExperiment(id);
  return exp?.enabled === true && exp.trafficFraction > 0;
}
