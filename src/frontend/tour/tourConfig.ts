export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export interface TourConfig {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  dismissible: boolean;
}

const WELCOME_TOUR: TourConfig = {
  id: "welcome",
  name: "Welcome to Equity Lens",
  description: "A quick tour of the research platform.",
  dismissible: true,
  steps: [
    { target: "#hero-section", title: "Research-Driven Analysis", content: "Equity Lens helps you research Indian equities with structured scorecards, not tips or recommendations.", placement: "bottom" },
    { target: ".scanner-section", title: "Research Scanner", content: "Screen companies by research criteria — quality, value, momentum, and more.", placement: "top" },
    { target: ".sector-section", title: "Sector Research", content: "Explore companies by sector with score distributions and peer comparisons.", placement: "top" },
  ],
};

const RESEARCH_TOUR: TourConfig = {
  id: "research",
  name: "Research Scorecard Tour",
  description: "Learn how to read a company scorecard.",
  dismissible: true,
  steps: [
    { target: ".scorecard-header", title: "Scorecard Overview", content: "Each company gets a six-dimension scorecard. Scores are for research, not recommendations.", placement: "bottom" },
    { target: ".quality-section", title: "Quality Score", content: "Measures business strength through ROE, margins, and earnings consistency.", placement: "left" },
    { target: ".valuation-section", title: "Valuation Score", content: "Shows how current multiples compare to historical and sector ranges.", placement: "right" },
    { target: ".risk-section", title: "Risk Radar", content: "A structured view of financial, governance, and regulatory risk factors.", placement: "top" },
    { target: ".thesis-section", title: "Thesis Tracking", content: "Record your research thesis and track how events change your view over time.", placement: "top" },
  ],
};

export const TOURS: Record<string, TourConfig> = {
  welcome: WELCOME_TOUR,
  research: RESEARCH_TOUR,
};

export function getTour(id: string): TourConfig | undefined {
  return TOURS[id];
}
