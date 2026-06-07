import { stockStoryAnimations } from "./animations";
import { stockStoryColors } from "./colors";
import { stockStoryShadows } from "./shadows";
import { stockStoryTypography } from "./typography";

export const stockStoryTokens = {
  colors: stockStoryColors,
  typography: stockStoryTypography,
  shadows: stockStoryShadows,
  animations: stockStoryAnimations,
  radius: {
    control: "8px",
    panel: "8px",
    modal: "8px",
    pill: "999px",
  },
} as const;

export type StockStoryTokens = typeof stockStoryTokens;
