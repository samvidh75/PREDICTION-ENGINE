import type { ReactNode } from "react";

export type TrendlyneWidgetKind = "technicals" | "checklist" | "ipo";

export interface TrendlyneWidgetProps {
  kind: TrendlyneWidgetKind;
  symbol?: string;
  className?: string;
  title?: string;
  description?: string;
  fallback?: ReactNode;
  lazy?: boolean;
}

export const TRENDLYNE_SCRIPT_SRC =
  "https://cdn-static.trendlyne.com/static/js/webwidgets/tl-widgets.js";

export const TRENDLYNE_BASE_URL = "https://trendlyne.com/web-widget";

export function getWidgetUrl(kind: TrendlyneWidgetKind, symbol?: string): string {
  switch (kind) {
    case "technicals": {
      const s = symbol ? encodeURIComponent(symbol) : "APIS";
      return `${TRENDLYNE_BASE_URL}/technical-widget/Poppins/${s}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`;
    }
    case "checklist": {
      const s = symbol ? encodeURIComponent(symbol) : "APIS";
      return `${TRENDLYNE_BASE_URL}/checklist-widget/Poppins/${s}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`;
    }
    case "ipo":
      return `${TRENDLYNE_BASE_URL}/ipo-widget/Poppins/?activeCol=006AFF&linksCol=006CFF&primary=202020&secondary=666666&positive=00a25b&negative=ff4e54`;
  }
}
