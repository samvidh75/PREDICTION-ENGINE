import { loadTrendlyneConfig, type TrendlyneConfig } from "./TrendlyneConfig";

export type TrendlyneWidgetKind = "technicals" | "checklist" | "ipo";

export type TrendlyneStatusCode =
  | "TRENDLYNE_READY"
  | "TRENDLYNE_DISABLED"
  | "TRENDLYNE_EMBED_NOT_ALLOWED"
  | "TRENDLYNE_INVALID_CONFIG"
  | "TRENDLYNE_WIDGET_URL_INVALID"
  | "TRENDLYNE_API_KEY_MISSING"
  | "TRENDLYNE_OFFICIAL_ACCESS_REQUIRED";

export interface TrendlyneWidgetInfo {
  kind: TrendlyneWidgetKind;
  widgetUrl: string;
  embeddable: boolean;
  needsSymbol: boolean;
}

export interface TrendlyneStatus {
  ok: boolean;
  enabled: boolean;
  widgetMode: string;
  statusCode: TrendlyneStatusCode;
  availableWidgets: TrendlyneWidgetInfo[];
  error?: TrendlyneStatusCode;
}

export interface TrendlyneWidgetResult {
  available: boolean;
  kind: TrendlyneWidgetKind;
  symbol: string | null;
  widgetMode: string;
  widgetUrl: string | null;
  statusCode: TrendlyneStatusCode;
  updatedAt: string;
}

const KNOWN_WIDGETS: Record<TrendlyneWidgetKind, { path: string; needsSymbol: boolean }> = {
  technicals: { path: "technical-widget", needsSymbol: true },
  checklist: { path: "checklist-widget", needsSymbol: true },
  ipo: { path: "ipo-widget", needsSymbol: false },
};

function sanitizeSymbol(symbol?: string): string {
  const raw = (symbol || "APIS").trim().toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9._-]/g, "");
  return cleaned || "APIS";
}

function widgetBase(config: TrendlyneConfig): string {
  return `${config.baseUrl.replace(/\/$/, "")}/web-widget`;
}

function buildWidgetUrl(config: TrendlyneConfig, kind: TrendlyneWidgetKind, symbol?: string): string {
  const item = KNOWN_WIDGETS[kind];
  const base = widgetBase(config);
  if (kind === "ipo") {
    return `${base}/${item.path}/Poppins/?activeCol=006AFF&linksCol=006CFF&primary=202020&secondary=666666&positive=00a25b&negative=ff4e54`;
  }
  const s = encodeURIComponent(sanitizeSymbol(symbol));
  return `${base}/${item.path}/Poppins/${s}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`;
}

function safeWidgets(config: TrendlyneConfig, symbol?: string): TrendlyneWidgetInfo[] {
  return (Object.keys(KNOWN_WIDGETS) as TrendlyneWidgetKind[]).map((kind) => ({
    kind,
    widgetUrl: buildWidgetUrl(config, kind, symbol),
    embeddable: true,
    needsSymbol: KNOWN_WIDGETS[kind].needsSymbol,
  }));
}

export class TrendlyneAdapter {
  private config: TrendlyneConfig;

  constructor(config?: TrendlyneConfig) {
    this.config = config ?? loadTrendlyneConfig();
  }

  validateWidgetUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" &&
        (parsed.hostname === "trendlyne.com" || parsed.hostname.endsWith(".trendlyne.com")) &&
        parsed.pathname.startsWith("/web-widget/");
    } catch {
      return false;
    }
  }

  getAvailableWidgets(symbol?: string): TrendlyneWidgetInfo[] {
    return safeWidgets(this.config, symbol).filter((widget) => this.validateWidgetUrl(widget.widgetUrl));
  }

  getStatus(): TrendlyneStatus {
    if (this.config.invalidConfigReason) {
      return {
        ok: false,
        enabled: false,
        widgetMode: "disabled",
        statusCode: "TRENDLYNE_INVALID_CONFIG",
        availableWidgets: [],
        error: "TRENDLYNE_INVALID_CONFIG",
      };
    }

    if (!this.config.enabled || this.config.widgetMode === "disabled") {
      return {
        ok: false,
        enabled: false,
        widgetMode: "disabled",
        statusCode: "TRENDLYNE_DISABLED",
        availableWidgets: [],
        error: "TRENDLYNE_DISABLED",
      };
    }

    const availableWidgets = this.getAvailableWidgets();
    if (!this.config.embedAllowed) {
      return {
        ok: false,
        enabled: true,
        widgetMode: this.config.widgetMode,
        statusCode: "TRENDLYNE_EMBED_NOT_ALLOWED",
        availableWidgets: [],
        error: "TRENDLYNE_EMBED_NOT_ALLOWED",
      };
    }

    if (availableWidgets.length === 0) {
      return {
        ok: false,
        enabled: true,
        widgetMode: this.config.widgetMode,
        statusCode: "TRENDLYNE_WIDGET_URL_INVALID",
        availableWidgets: [],
        error: "TRENDLYNE_WIDGET_URL_INVALID",
      };
    }

    return {
      ok: true,
      enabled: true,
      widgetMode: this.config.widgetMode,
      statusCode: "TRENDLYNE_READY",
      availableWidgets,
    };
  }

  getWidget(kind: TrendlyneWidgetKind, symbol?: string): TrendlyneWidgetResult {
    const status = this.getStatus();
    const normalizedSymbol = KNOWN_WIDGETS[kind].needsSymbol ? sanitizeSymbol(symbol) : null;
    if (!status.ok) {
      return {
        available: false,
        kind,
        symbol: normalizedSymbol,
        widgetMode: status.widgetMode,
        widgetUrl: null,
        statusCode: status.statusCode,
        updatedAt: new Date().toISOString(),
      };
    }

    const widgetUrl = buildWidgetUrl(this.config, kind, normalizedSymbol ?? undefined);
    if (!this.validateWidgetUrl(widgetUrl)) {
      return {
        available: false,
        kind,
        symbol: normalizedSymbol,
        widgetMode: this.config.widgetMode,
        widgetUrl: null,
        statusCode: "TRENDLYNE_WIDGET_URL_INVALID",
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      available: true,
      kind,
      symbol: normalizedSymbol,
      widgetMode: this.config.widgetMode,
      widgetUrl,
      statusCode: "TRENDLYNE_READY",
      updatedAt: new Date().toISOString(),
    };
  }
}

export const trendlyneAdapter = new TrendlyneAdapter();
