// src/services/copilot/CopilotEngine.ts

export interface CopilotResponse {
  answer: string;
  category: string;
}

export class CopilotEngine {
  public static ask(query: string): CopilotResponse {
    const q = query.toLowerCase().trim();

    if (q.includes("reliance")) {
      return {
        answer: "Reliance is showing minor consolidation as raw energy demands stabilize across regional pipelines. Core retail growth remains strong, maintaining stable long-term cash flows.",
        category: "Company Analysis",
      };
    }

    if (q.includes("hal")) {
      return {
        answer: "HAL cleared significant government project clearances, boosting production capacity limits and local manufacturing schedules. Watch for next quarter's delivery paces.",
        category: "Corporate Changes",
      };
    }

    if (q.includes("bel") || q.includes("compare")) {
      return {
        answer: "BEL offers high operational stability in the defence electronics segment, compounding returns cleanly. HAL holds larger heavy-equipment pipelines, offering massive long-term scale opportunities.",
        category: "Asset Comparison",
      };
    }

    if (q.includes("tata motors") || q.includes("summarise")) {
      return {
        answer: "Tata Motors is successfully balancing its combustion vehicle cash flows while steadily building electric vehicle infrastructure. Order pipelines remain supportive.",
        category: "Company Summary",
      };
    }

    return {
      answer: "I can help analyze company trends, compare assets, or summarize corporate updates in plain, SEC-safe English. Try asking: 'Why is Reliance weakening?' or 'Compare BEL vs HAL.'",
      category: "General Intelligence",
    };
  }
}
