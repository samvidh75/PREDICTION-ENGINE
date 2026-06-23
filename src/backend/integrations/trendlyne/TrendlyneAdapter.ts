import { loadTrendlyneConfig, type TrendlyneConfig } from "./TrendlyneConfig";

export interface TrendlyneWidgetInfo {
  kind: "technicals" | "checklist" | "ipo";
  widgetUrl: string;
  embeddable: boolean;
  needsSymbol: boolean;
}

export interface TrendlyneStatus {
  ok: boolean;
  enabled: boolean;
  widgetMode: string;
  availableWidgets: TrendlyneWidgetInfo[];
  error?: string;
}

const WIDGET_BASE = "https://trendlyne.com/web-widget";

function getWidgetUrl(kind: string, symbol?: string): string {
  const s = symbol ? encodeURIComponent(symbol) : "APIS";
  switch (kind) {
    case "technicals":
      return `${WIDGET_BASE}/technical-widget/Poppins/${s}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`;
    case "checklist":
      return `${WIDGET_BASE}/checklist-widget/Poppins/${s}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`;
    case "ipo":
      return `${WIDGET_BASE}/ipo-widget/Poppins/?activeCol=006AFF&linksCol=006CFF&primary=202020&secondary=666666&positive=00a25b&negative=ff4e54`;
    default:
      return "";
  }
}

function getAvailableWidgets(): TrendlyneWidgetInfo[] {
  return [
    { kind: "technicals", widgetUrl: getWidgetUrl("technicals"), embeddable: true, needsSymbol: true },
    { kind: "checklist", widgetUrl: getWidgetUrl("checklist"), embeddable: true, needsSymbol: true },
    { kind: "ipo", widgetUrl: getWidgetUrl("ipo"), embeddable: true, needsSymbol: false },
  ];
}

export class TrendlyneAdapter {
  private config: TrendlyneConfig;

  constructor(config?: TrendlyneConfig) {
    this.config = config ?? loadTrendlyneConfig();
  }

  getStatus(): TrendlyneStatus {
    if (!this.config.enabled) {
      return {
        ok: false,
        enabled: false,
        widgetMode: "disabled",
        availableWidgets: [],
        error: "TRENDLYNE_DISABLED",
      };
    }

    if (!this.config.embedAllowed) {
      return {
        ok: true,
        enabled: true,
        widgetMode: this.config.widgetMode,
        availableWidgets: getAvailableWidgets(),
        error: "TRENDLYNE_EMBED_NOT_ALLOWED",
      };
    }

    return {
      ok: true,
      enabled: true,
      widgetMode: this.config.widgetMode,
      availableWidgets: getAvailableWidgets(),
    };
  }
}

export const trendlyneAdapter = new TrendlyneAdapter();
