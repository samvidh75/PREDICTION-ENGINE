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
    sm: "4px",
    md: "6px",
    lg: "10px",
    xl: "14px",
    full: "9999px",
  },
} as const;

export type StockStoryTokens = typeof stockStoryTokens;
